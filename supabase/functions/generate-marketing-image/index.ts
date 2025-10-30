import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let userId = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      userId = payload.sub || '';
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { productImageUrl, categoryName, modelTypeName } = await req.json();

    // Ensure the AI gateway can access the product image by converting it to a base64 data URL
    let inputImageUrl = productImageUrl;
    try {
      const parsed = new URL(productImageUrl);
      const segments = parsed.pathname.split('/');
      const publicIdx = segments.findIndex((s) => s === 'public');
      if (publicIdx > -1 && segments[publicIdx + 1] && segments[publicIdx + 2]) {
        const bucket = segments[publicIdx + 1];
        const filePath = segments.slice(publicIdx + 2).join('/');
        // Use service role key to download private file safely
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: blob, error: dlErr } = await adminClient.storage
          .from(bucket)
          .download(filePath);
        if (!dlErr && blob) {
          const ab = await blob.arrayBuffer();
          const u8 = new Uint8Array(ab);
          let binary = '';
          for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
          const base64 = btoa(binary);
          inputImageUrl = `data:image/png;base64,${base64}`;
        }
      }
    } catch (e) {
      console.warn('Could not convert product image to base64, using provided URL');
    }

    console.log('Generating image for user:', userId);
    console.log('Category:', categoryName, 'Model:', modelTypeName);

    // Check and deduct credits
    const { data: creditsData, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      throw new Error('Failed to fetch credits');
    }

    if (creditsData.credits < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AI prompt based on category and model type
    const prompt = `Create a professional marketing image for a ${categoryName} product. 
    The image should feature a ${modelTypeName.toLowerCase()} model showcasing the product in an elegant, 
    high-quality commercial photography style. The composition should be well-lit with professional lighting, 
    clean background, and focus on making the product look premium and desirable. 
    Style: commercial photography, professional, high-end marketing material.`;

    console.log('Calling AI Gateway with prompt');

    // Call Lovable AI Gateway (Nano Banana)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: inputImageUrl
                 }
               }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error('No image generated from AI');
    }

    console.log('Image generated successfully');

    // Convert base64 to blob and upload to storage
    const base64Data = generatedImageUrl.split(',')[1];
    const imageBlob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `${userId}/${Date.now()}-generated.png`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('generated-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload generated image');
    }

    // Create a signed URL so the image can be viewed in the app
    const { data: signed, error: signedErr } = await supabaseClient.storage
      .from('generated-images')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

    if (signedErr) {
      console.error('Signed URL error:', signedErr);
      throw new Error('Failed to create signed URL');
    }

    console.log('Image uploaded to storage:', fileName);

    // Get category and model IDs
    const { data: categoryData } = await supabaseClient
      .from('business_categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    const { data: modelData } = await supabaseClient
      .from('model_types')
      .select('id')
      .eq('name', modelTypeName)
      .single();

    // Save to database
    const { error: insertError } = await supabaseClient
      .from('generated_images')
      .insert({
        user_id: userId,
        business_category_id: categoryData?.id,
        model_type_id: modelData?.id,
        original_image_url: productImageUrl,
        generated_image_url: signed.signedUrl
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save image record');
    }

    // Deduct credit
    const { error: updateError } = await supabaseClient
      .from('user_credits')
      .update({ credits: creditsData.credits - 1 })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Credits update error:', updateError);
    }

    console.log('Generation complete');

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl: signed.signedUrl,
        creditsRemaining: creditsData.credits - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-marketing-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
