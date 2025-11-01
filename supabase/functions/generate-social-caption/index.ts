import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate a context-aware caption for a single image
 */
async function generateCaptionForImage(
  imageUrl: string,
  imageId: string,
  categoryName: string | undefined,
  lovableApiKey: string
): Promise<{ caption: string; hashtags: string }> {
  const categoryContext = categoryName 
    ? `for a ${categoryName} business. `
    : '';

  const prompt = `Analyze this marketing image ${categoryContext}and generate:
1. A compelling, engaging social media caption (2-3 sentences) suitable for Instagram, Facebook, and LinkedIn
2. A set of 8-12 relevant, popular hashtags to maximize engagement

Keep the caption professional yet engaging, highlighting the product's appeal and value proposition.
Format your response as JSON with this exact structure:
{
  "caption": "your caption here",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;

  try {
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
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to generate caption');
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        caption: parsed.caption || 'Check out our amazing product!',
        hashtags: Array.isArray(parsed.hashtags) 
          ? parsed.hashtags.join(' ') 
          : (parsed.hashtags || 'marketing product brandnew'),
      };
    } else {
      // Fallback parsing
      const lines = aiText.split('\n').filter((line: string) => line.trim());
      return {
        caption: lines[0] || 'Check out our amazing product!',
        hashtags: 'marketing product brandnew',
      };
    }
  } catch (error) {
    console.error('Error generating caption for image:', error);
    // Return fallback caption
    return {
      caption: 'Check out our amazing product!',
      hashtags: 'marketing product brandnew',
    };
  }
}

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

    // Fetch the images with their IDs
    const { data: images, error: imagesError } = await supabase
      .from('generated_images')
      .select('id, generated_image_url, business_category_id, business_categories(name)')
      .in('id', imageIds)
      .eq('user_id', user.id);

    if (imagesError || !images || images.length === 0) {
      console.error('Error fetching images:', imagesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch images" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signed URLs for the images and generate captions
    // Use Promise.allSettled to handle partial failures gracefully
    const captionPromises = images.map(async (img: any) => {
      try {
        let signedUrl = img.generated_image_url;
        
        // If the URL is already a full URL, use it directly
        // Otherwise, try to extract the file path and create a new signed URL
        if (!signedUrl.startsWith('http://') && !signedUrl.startsWith('https://')) {
          // Extract file path from URL (format: userId/timestamp-filename)
          const urlParts = signedUrl.split('/');
          const fileName = urlParts.slice(-2).join('/'); // Get userId/filename
          
          // Get signed URL (refresh it to ensure it's valid)
          const { data: signedData, error: signedError } = await supabase.storage
            .from('generated-images')
            .createSignedUrl(fileName, 3600);
          
          if (signedError) {
            console.error('Error creating signed URL:', signedError);
            // Try to use the original URL
            signedUrl = img.generated_image_url;
          } else {
            signedUrl = signedData?.signedUrl || img.generated_image_url;
          }
        }
        
        // Generate caption for this specific image
        const { caption, hashtags } = await generateCaptionForImage(
          signedUrl,
          img.id,
          img.business_categories?.name,
          lovableApiKey
        );

        // Save to database (non-blocking - don't fail if this fails)
        let captionId = null;
        try {
          // Build insert object - image_url might not exist in schema yet
          const insertData: any = {
            user_id: user.id,
            caption,
            hashtags,
            image_ids: [img.id], // Keep for backward compatibility
          };
          
          // Only include image_url if the column exists (will be added via migration)
          // For now, we'll try with image_url, but if it fails, we'll retry without it
          insertData.image_url = signedUrl;
          
          let { data: captionRecord, error: saveError } = await supabase
            .from('social_media_captions')
            .insert(insertData)
            .select()
            .single();

          // If save fails due to missing column, retry without image_url
          const errorMsg = saveError?.message || saveError?.code || '';
          if (saveError && (errorMsg.includes('image_url') || saveError.code === '42703')) {
            console.warn('image_url column not found, saving without it');
            delete insertData.image_url;
            const retryResult = await supabase
              .from('social_media_captions')
              .insert(insertData)
              .select()
              .single();
            
            captionRecord = retryResult.data;
            saveError = retryResult.error;
          }

          if (saveError) {
            console.error('Error saving caption to database:', saveError);
          } else {
            captionId = captionRecord?.id;
          }
        } catch (dbError) {
          console.error('Database save error (non-blocking):', dbError);
        }

        return {
          image_url: signedUrl,
          caption,
          hashtags: hashtags.split(' ').filter((tag: string) => tag.trim()), // Return as array for frontend
          captionId: captionId,
        };
      } catch (error) {
        console.error(`Error processing image ${img.id}:`, error);
        // Return a fallback caption for this image
        return {
          image_url: img.generated_image_url,
          caption: 'Failed to generate caption for this image. Please try again.',
          hashtags: ['error', 'retry'],
          captionId: null,
        };
      }
    });

    const results = await Promise.allSettled(captionPromises);
    const captionResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to generate caption for image ${images[index]?.id}:`, result.reason);
        return {
          image_url: images[index]?.generated_image_url || '',
          caption: 'Failed to generate caption. Please try again.',
          hashtags: ['error'],
          captionId: null,
        };
      }
    });

    // Filter out any completely invalid results
    const validCaptions = captionResults.filter(
      (result) => result && result.caption && result.image_url
    );

    if (validCaptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to generate any captions. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        captions: validCaptions,
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