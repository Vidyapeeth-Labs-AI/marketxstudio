import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageIds } = await req.json();

    if (!imageIds || imageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images selected" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the images
    const { data: images, error: imagesError } = await supabase
      .from('generated_images')
      .select('generated_image_url, business_category_id, business_categories(name)')
      .in('id', imageIds)
      .eq('user_id', user.id);

    if (imagesError || !images || images.length === 0) {
      console.error('Error fetching images:', imagesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch images" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signed URLs for the images
    const imageUrls = await Promise.all(
      images.map(async (img: any) => {
        const { data } = await supabase.storage
          .from('generated-images')
          .createSignedUrl(img.generated_image_url.split('/').pop(), 3600);
        return data?.signedUrl || '';
      })
    );

    // Create prompt for AI
    const categoryNames = images.map((img: any) => img.business_categories?.name || 'product').join(', ');
    const prompt = `Analyze these ${images.length} marketing image(s) for ${categoryNames}. Generate:
1. A compelling, engaging social media caption (2-3 sentences) suitable for Instagram, Facebook, and LinkedIn
2. A set of 8-12 relevant, popular hashtags to maximize engagement

Keep the caption professional yet engaging, highlighting the product's appeal and value proposition.
Format your response as JSON with this exact structure:
{
  "caption": "your caption here",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageUrls.filter(url => url).map(url => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to generate caption" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let caption = '';
    let hashtags: string[] = [];

    try {
      // Try to extract JSON from the response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        caption = parsed.caption || '';
        hashtags = parsed.hashtags || [];
      } else {
        // Fallback parsing
        caption = aiText.split('\n')[0] || 'Check out our amazing product!';
        hashtags = ['marketing', 'product', 'brandnew'];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      caption = 'Check out our amazing product!';
      hashtags = ['marketing', 'product', 'brandnew'];
    }

    // Save to database
    const { data: captionRecord, error: saveError } = await supabase
      .from('social_media_captions')
      .insert({
        user_id: user.id,
        caption,
        hashtags: hashtags.join(' '),
        image_ids: imageIds,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving caption:', saveError);
      return new Response(
        JSON.stringify({ error: "Failed to save caption" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        caption,
        hashtags,
        captionId: captionRecord.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});