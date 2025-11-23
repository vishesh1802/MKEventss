import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

/**
 * API endpoint for generating event images using OpenRouter + Unsplash
 * 
 * Uses OpenRouter to generate optimized image search queries
 * Then uses Unsplash API (free) to fetch relevant images
 * Falls back to placeholder images if APIs not available
 * 
 * POST /api/events/image/generate
 * Body: { event_id: number, prompt?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_id, prompt } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: "event_id is required" });
    }

    // Find event by id or event_id
    const numericId = parseInt(String(event_id));
    let eventResult;
    
    if (!isNaN(numericId)) {
      eventResult = await sql`
        SELECT * FROM events 
        WHERE id = ${numericId} OR event_id = ${String(event_id)} 
        LIMIT 1
      `;
    } else {
      eventResult = await sql`
        SELECT * FROM events 
        WHERE event_id = ${String(event_id)} 
        LIMIT 1
      `;
    }

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];
    const actualEventId = event.id;

    // Check if event already has a real image (not placeholder)
    const existingImage = event.image;
    if (existingImage && 
        existingImage.trim() !== '' && 
        !existingImage.includes('placeholder') && 
        !existingImage.includes('ui-avatars') && 
        !existingImage.includes('via.placeholder')) {
      console.log(`⏭️  Event ${actualEventId} already has image, skipping generation`);
      return res.status(200).json({
        success: true,
        message: "Event already has an image",
        event_id: actualEventId,
        image: existingImage,
        skipped: true,
      });
    }

    // Use OpenRouter to generate an optimized image search query
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    let searchQuery = prompt || generateImageSearchQuery(event);

    // Enhance search query using OpenRouter if available
    if (openRouterApiKey && !prompt) {
      try {
        const model = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
        const enhancePrompt = `Generate a short, concise search query (2-4 words) for finding a high-quality stock photo for this event:
        
Event: ${event.event_name || 'Event'}
Genre: ${event.genre || 'General'}
Venue: ${event.venue_name || 'Milwaukee'}

Return ONLY the search query, nothing else. Examples: "music concert stage", "food festival crowd", "sports game stadium"`;

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://mkevents.app',
            'X-Title': 'MKEvents',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: enhancePrompt,
              },
            ],
            max_tokens: 20,
            temperature: 0.7,
          }),
        });

        if (openRouterResponse.ok) {
          const openRouterData = await openRouterResponse.json();
          if (openRouterData.choices?.[0]?.message?.content) {
            const enhancedQuery = openRouterData.choices[0].message.content.trim();
            // Clean up the response (remove quotes, extra text)
            searchQuery = enhancedQuery.replace(/^["']|["']$/g, '').split('\n')[0].trim();
            console.log(`✨ OpenRouter enhanced search query: "${searchQuery}"`);
          }
        }
      } catch (error) {
        console.warn('OpenRouter query enhancement failed, using default:', error);
      }
    }

    console.log(`🎨 Generating image for event ${actualEventId}`);
    console.log(`📝 Search query: ${searchQuery}`);

    // Try Unsplash API (free) to get relevant images
    const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;
    let imageUrl: string | null = null;

    if (unsplashApiKey) {
      try {
        // Use Unsplash API to get a relevant image
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchQuery)}&orientation=landscape&client_id=${unsplashApiKey}`,
          {
            method: 'GET',
            headers: {
              'Accept-Version': 'v1',
            },
          }
        );

        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json();
          imageUrl = unsplashData.urls?.regular || unsplashData.urls?.full || null;
          console.log(`✅ Got REAL image from Unsplash: ${imageUrl}`);
        } else {
          const errorText = await unsplashResponse.text();
          console.warn(`⚠️ Unsplash API error (${unsplashResponse.status}): ${errorText}`);
        }
      } catch (error) {
        console.warn('⚠️ Unsplash API failed:', error);
      }
    }

    // Fallback to gradient placeholder if Unsplash not configured or failed
    if (!imageUrl) {
      const genreColors: Record<string, string> = {
        'Music': '6366f1,8b5cf6', // Indigo to purple
        'Food': 'f59e0b,ef4444', // Amber to red
        'Sports': '10b981,059669', // Green
        'Art': 'ec4899,be185d', // Pink
        'Comedy': 'f97316,ea580c', // Orange
        'Family': '06b6d4,0891b2', // Cyan
        'Business': '64748b,475569', // Slate
      };
      
      const colors = genreColors[event.genre] || '4f46e5,7c3aed'; // Default: indigo to purple
      imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(event.event_name || 'Event')}&background=${colors.split(',')[0]}&color=ffffff&size=512&bold=true&format=png`;
      
      if (!unsplashApiKey) {
        console.log(`📸 Using placeholder (Unsplash not configured - add UNSPLASH_ACCESS_KEY for real images)`);
      } else {
        console.warn(`📸 Using placeholder (Unsplash failed - check your API key)`);
      }
    }

    // Save image URL to event
    await sql`
      UPDATE events 
      SET image = ${imageUrl}
      WHERE id = ${actualEventId}
    `;

    console.log(`✅ Image saved for event ${actualEventId}`);

    return res.status(200).json({
      success: true,
      message: "Image generated successfully",
      event_id: actualEventId,
      image: imageUrl,
      source: unsplashApiKey ? "unsplash" : "placeholder",
      searchQuery: searchQuery,
    });
  } catch (error) {
    console.error("❌ Image Generation API Error:", error);
    return res.status(500).json({
      error: "Failed to generate image",
      message: (error as Error).message,
    });
  }
}

/**
 * Generate a search query for finding event images
 */
function generateImageSearchQuery(event: any): string {
  const title = event.event_name || 'event';
  const genre = event.genre || '';
  const venue = event.venue_name || 'Milwaukee';
  
  // Create a search-friendly query
  const queryParts = [
    genre || title,
    'event',
    'Milwaukee'
  ].filter(Boolean);
  
  return queryParts.slice(0, 3).join(' '); // Limit to 3 words for better results
}
