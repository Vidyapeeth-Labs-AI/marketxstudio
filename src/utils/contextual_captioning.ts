/**
 * Contextual Captioning Utility
 * 
 * This file provides a clean interface for generating context-aware captions
 * for images. The implementation can be easily swapped when integrating a
 * real captioning model or switching AI providers.
 */

export interface CaptionRequest {
  imageUrl: string;
  imageId: string;
  categoryName?: string;
}

export interface CaptionResponse {
  image_url: string;
  caption: string;
  hashtags: string;
}

export interface CaptioningAPI {
  /**
   * Generate captions for multiple images
   * Each image gets its own contextually-aware caption
   */
  generateCaptions(requests: CaptionRequest[]): Promise<CaptionResponse[]>;
}

/**
 * Default implementation using OpenAI-compatible endpoint
 * This can be swapped with any other captioning service
 */
export class DefaultCaptioningAPI implements CaptioningAPI {
  constructor(
    private apiKey: string,
    private apiUrl: string = 'https://ai.gateway.lovable.dev/v1/chat/completions',
    private model: string = 'google/gemini-2.5-flash'
  ) {}

  async generateCaptions(requests: CaptionRequest[]): Promise<CaptionResponse[]> {
    // Generate caption for each image individually for better context awareness
    const captionPromises = requests.map((request) => 
      this.generateCaptionForImage(request)
    );

    return Promise.all(captionPromises);
  }

  private async generateCaptionForImage(request: CaptionRequest): Promise<CaptionResponse> {
    const categoryContext = request.categoryName 
      ? `for a ${request.categoryName} business. `
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
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: request.imageUrl }
                }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '';

      // Parse AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          image_url: request.imageUrl,
          caption: parsed.caption || 'Check out our amazing product!',
          hashtags: Array.isArray(parsed.hashtags) 
            ? parsed.hashtags.join(' ') 
            : (parsed.hashtags || 'marketing product brandnew'),
        };
      } else {
        // Fallback parsing
        const lines = aiText.split('\n').filter(line => line.trim());
        return {
          image_url: request.imageUrl,
          caption: lines[0] || 'Check out our amazing product!',
          hashtags: 'marketing product brandnew',
        };
      }
    } catch (error) {
      console.error('Error generating caption for image:', error);
      // Return fallback caption
      return {
        image_url: request.imageUrl,
        caption: 'Check out our amazing product!',
        hashtags: 'marketing product brandnew',
      };
    }
  }
}

/**
 * Factory function to create a captioning API instance
 * This allows easy swapping of implementations
 */
export function createCaptioningAPI(
  apiKey: string,
  apiUrl?: string,
  model?: string
): CaptioningAPI {
  return new DefaultCaptioningAPI(apiKey, apiUrl, model);
}

