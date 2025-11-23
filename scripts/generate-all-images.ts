/**
 * Script to generate images for all events that don't have images
 * Run this script to proactively generate images for all events
 * 
 * Usage: npx tsx scripts/generate-all-images.ts
 * 
 * Make sure vercel dev is running first!
 */

import { sql } from "@vercel/postgres";
import "dotenv/config";

interface Event {
  id: number;
  event_id: string;
  event_name: string;
  genre: string;
  venue_name?: string;
  image?: string;
}

/**
 * Generate optimized search query using OpenRouter
 */
async function enhanceSearchQuery(event: Event): Promise<string> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterApiKey) {
    // Fallback to basic query
    return generateImageSearchQuery(event);
  }

  try {
    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
    const enhancePrompt = `Generate a simple, generic search query (2-3 words MAX) for finding stock photos on Unsplash.

Focus ONLY on the genre/type, NOT the specific event name or venue.

Genre: ${event.genre || 'General'}

Return ONLY 2-3 generic words that describe the type of event. Examples:
- "music concert" (not "Weekend Wonders music")
- "food festival" (not "food festival Walker's Point")
- "sports game" (not "Champion's Challenge sports")
- "comedy show" (not "Joke Junction comedy")
- "family event" (not "family weekend wonders")

Just the genre + event type, nothing else.`;

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
        return enhancedQuery.replace(/^["']|["']$/g, '').split('\n')[0].trim();
      }
    }
  } catch (error) {
    console.warn('   ⚠️ OpenRouter enhancement failed, using default query');
  }

  return generateImageSearchQuery(event);
}

/**
 * Generate a search query for finding event images
 */
function generateImageSearchQuery(event: Event): string {
  const title = event.event_name || 'event';
  const genre = event.genre || '';
  
  // Create a search-friendly query
  const queryParts = [
    genre || title,
    'event',
    'Milwaukee'
  ].filter(Boolean);
  
  return queryParts.slice(0, 3).join(' '); // Limit to 3 words for better results
}

/**
 * Generate image for a single event
 */
async function generateImageForEvent(event: Event): Promise<{ success: boolean; image?: string; error?: string }> {
  try {
    // Enhance search query using OpenRouter
    const searchQuery = await enhanceSearchQuery(event);
    console.log(`   📝 Search query: "${searchQuery}"`);

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
          console.log(`   ✅ Got REAL image from Unsplash`);
        } else {
          const errorText = await unsplashResponse.text();
          // If query too specific, try a simpler fallback query
          if (unsplashResponse.status === 404) {
            console.warn(`   ⚠️ Query too specific, trying simpler fallback...`);
            const fallbackQuery = event.genre || 'event';
            try {
              const fallbackResponse = await fetch(
                `https://api.unsplash.com/photos/random?query=${encodeURIComponent(fallbackQuery)}&orientation=landscape&client_id=${unsplashApiKey}`,
                {
                  method: 'GET',
                  headers: { 'Accept-Version': 'v1' },
                }
              );
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                imageUrl = fallbackData.urls?.regular || fallbackData.urls?.full || null;
                console.log(`   ✅ Got image with fallback query: "${fallbackQuery}"`);
              }
            } catch (e) {
              // Fall through to placeholder
            }
          } else {
            console.warn(`   ⚠️ Unsplash API error (${unsplashResponse.status}): ${errorText.substring(0, 100)}`);
          }
        }
      } catch (error) {
        console.warn(`   ⚠️ Unsplash API failed: ${(error as Error).message}`);
      }
    } else {
      console.warn(`   ⚠️ UNSPLASH_ACCESS_KEY not configured - add it to .env for real images`);
    }

    // Fallback to gradient placeholder if Unsplash not configured or failed
    if (!imageUrl) {
      const genreColors: Record<string, string> = {
        'Music': '6366f1',
        'Food': 'f59e0b',
        'Sports': '10b981',
        'Art': 'ec4899',
        'Comedy': 'f97316',
        'Family': '06b6d4',
        'Business': '64748b',
      };
      
      const color = genreColors[event.genre] || '4f46e5';
      imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(event.event_name || 'Event')}&background=${color}&color=ffffff&size=512&bold=true&format=png`;
      console.log(`   📸 Using placeholder (no Unsplash key)`);
    }

    // Save image URL to event
    await sql`
      UPDATE events 
      SET image = ${imageUrl}
      WHERE id = ${event.id}
    `;

    return {
      success: true,
      image: imageUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Main function to generate images for all events
 */
async function main() {
  console.log('🎨 Starting image generation for all events...\n');

  // Check if Unsplash key is configured
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.warn('⚠️  WARNING: UNSPLASH_ACCESS_KEY not found in .env');
    console.warn('   Images will use placeholders. Add UNSPLASH_ACCESS_KEY for real photos.\n');
  } else {
    console.log('✅ Unsplash API key found - will fetch real images!\n');
  }

  try {
    // Get all events that don't have images or have placeholder images
    const { rows } = await sql`
      SELECT id, event_id, event_name, genre, venue_name, image
      FROM events
      WHERE image IS NULL 
         OR image = ''
         OR image LIKE '%placeholder%'
         OR image LIKE '%ui-avatars%'
         OR image LIKE '%via.placeholder%'
      ORDER BY id
    `;

    const events: Event[] = rows;
    const totalEvents = events.length;

    if (totalEvents === 0) {
      console.log('✅ All events already have images!');
      return;
    }

    console.log(`📊 Found ${totalEvents} events without images\n`);

    let successCount = 0;
    let failCount = 0;
    let rateLimitHit = false;
    const delayBetweenRequests = 2000; // 2 seconds between requests
    const delayAfterRateLimit = 3600000; // 1 hour in milliseconds (for Unsplash 50/hour limit)

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const progress = `[${i + 1}/${totalEvents}]`;

      console.log(`${progress} Generating image for: "${event.event_name}" (ID: ${event.id})`);

      try {
        const result = await generateImageForEvent(event);

        if (result.success) {
          successCount++;
          console.log(`   ✅ Success! Image saved.\n`);
        } else {
          failCount++;
          const errorMsg = result.error || '';
          
          // Check if it's a rate limit error
          if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit') || 
              errorMsg.includes('429') || errorMsg.includes('403')) {
            rateLimitHit = true;
            console.log(`\n⚠️  RATE LIMIT REACHED! (Unsplash allows 50 requests/hour on free tier)`);
            console.log(`\n📊 Progress so far:`);
            console.log(`   ✅ Success: ${successCount}`);
            console.log(`   ❌ Failed: ${failCount}`);
            console.log(`   📈 Processed: ${i + 1} / ${totalEvents}`);
            console.log(`   ⏳ Remaining: ${totalEvents - i - 1} events`);
            console.log(`\n💡 Options:`);
            console.log(`   1. Wait 1 hour and run script again (it will skip events with images)`);
            console.log(`   2. Upgrade Unsplash app to production tier (higher limits)`);
            console.log(`   3. Run script in batches manually`);
            console.log(`\n⏸️  Pausing script. You can resume later by running: npm run generate-images`);
            break;
          }
          
          console.log(`   ❌ Failed: ${result.error}\n`);
        }
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
          rateLimitHit = true;
          console.log(`\n⚠️  RATE LIMIT REACHED! (Unsplash allows 50 requests/hour on free tier)`);
          console.log(`\n📊 Progress so far:`);
          console.log(`   ✅ Success: ${successCount}`);
          console.log(`   ❌ Failed: ${failCount}`);
          console.log(`   📈 Processed: ${i + 1} / ${totalEvents}`);
          console.log(`   ⏳ Remaining: ${totalEvents - i - 1} events`);
          console.log(`\n💡 Options:`);
          console.log(`   1. Wait 1 hour and run script again (it will skip events with images)`);
          console.log(`   2. Upgrade Unsplash app to production tier (higher limits)`);
          console.log(`\n⏸️  Pausing script. You can resume later by running: npm run generate-images`);
          break;
        }
        throw error; // Re-throw if not rate limit
      }

      // Wait before next request (except for the last one or if rate limit hit)
      if (i < events.length - 1 && !rateLimitHit) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Total: ${totalEvents}`);

    if (successCount > 0) {
      console.log('\n✅ Image generation complete! Refresh your browser to see the new images.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
