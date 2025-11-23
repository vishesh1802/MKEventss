/**
 * Event image generation utilities using OpenRouter API
 */

export interface GenerateImageOptions {
  eventId: number;
  model?: string;
  prompt?: string;
}

export interface GenerateImageResponse {
  success: boolean;
  message?: string;
  event_id?: number;
  image?: string;
  model?: string;
  prompt?: string;
}

/**
 * Generate an image for an event using OpenRouter
 */
export async function generateEventImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  try {
    const response = await fetch("/api/events/image/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id: options.eventId,
        model: options.model,
        prompt: options.prompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error || error.message || "Failed to generate image";
      
      // Handle billing limit specifically
      if (response.status === 402 || errorMessage.includes('billing') || errorMessage.includes('limit')) {
        throw new Error("Billing limit reached. Please add payment method to your OpenAI account.");
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating event image:", error);
    throw error;
  }
}

/**
 * Generate images for multiple events
 */
export async function generateImagesForEvents(
  eventIds: number[],
  options?: { model?: string; delay?: number }
): Promise<GenerateImageResponse[]> {
  const results: GenerateImageResponse[] = [];
  const delay = options?.delay || 1000; // Default 1 second delay between requests

  for (const eventId of eventIds) {
    try {
      const result = await generateEventImage({
        eventId,
        model: options?.model,
      });
      results.push(result);
      
      // Wait before next request to avoid rate limiting
      if (eventIds.indexOf(eventId) < eventIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Failed to generate image for event ${eventId}:`, error);
      results.push({
        success: false,
        message: (error as Error).message,
        event_id: eventId,
      });
    }
  }

  return results;
}

/**
 * Available image generation models on OpenRouter
 */
export const IMAGE_MODELS = {
  'dall-e-3': 'openai/dall-e-3',
  'dall-e-2': 'openai/dall-e-2',
  'stable-diffusion-xl': 'stability-ai/stable-diffusion-xl',
  'flux-pro': 'black-forest-labs/flux-pro',
  'flux-dev': 'black-forest-labs/flux-dev',
} as const;

export type ImageModel = typeof IMAGE_MODELS[keyof typeof IMAGE_MODELS];

