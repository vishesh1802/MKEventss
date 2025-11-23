/**
 * Script to generate images for events in batches (to avoid rate limits)
 * 
 * Usage: 
 *   npx tsx scripts/generate-images-batch.ts [batch-size] [start-from]
 * 
 * Examples:
 *   npx tsx scripts/generate-images-batch.ts 50    # Process 50 events
 *   npx tsx scripts/generate-images-batch.ts 50 50  # Process next 50 events (starting from 50)
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
        return enhancedQuery.replace(/^["']|["']$/g, '').split('\n')[0].trim();
      }
    }
  } catch (error) {
    // Silent fail, use default
  }

  return generateImageSearchQuery(event);
}

/**
 * Generate a search query for finding event images
 */
function generateImageSearchQuery(event: Event): string {
  const genre = event.genre || '';
  
  const queryParts = [
    genre || 'event',
    'event',
  ].filter(Boolean);
  
  return queryParts.slice(0, 2).join(' ');
}

/**
 * Generate image for a single event
 */
async function generateImageForEvent(event: Event): Promise<{ success: boolean; image?: string; error?: string }> {
  try {
    const searchQuery = await enhanceSearchQuery(event);

    const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;
    let imageUrl: string | null = null;

    if (unsplashApiKey) {
      try {
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
        } else {
          // Check for rate limit
          if (unsplashResponse.status === 403 || unsplashResponse.status === 429) {
            throw new Error(`Rate limit reached (${unsplashResponse.status}). Unsplash free tier allows 50 requests/hour.`);
          }
          
          // Try fallback query
          if (unsplashResponse.status === 404) {
            const fallbackQuery = event.genre || 'event';
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
            }
          }
        }
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
          throw error;
        }
      }
    }

    // Fallback to placeholder if no image found
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
 * Main function to generate images in batches
 */
async function main() {
  // Parse command line arguments
  const batchSize = parseInt(process.argv[2] || '50', 10);
  const startFrom = parseInt(process.argv[3] || '0', 10);

  console.log('🎨 Starting batch image generation...\n');
  console.log(`📦 Batch size: ${batchSize}`);
  console.log(`📍 Starting from: ${startFrom}\n`);

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.warn('⚠️  WARNING: UNSPLASH_ACCESS_KEY not found in .env');
    console.warn('   Images will use placeholders. Add UNSPLASH_ACCESS_KEY for real photos.\n');
  } else {
    console.log('✅ Unsplash API key found - will fetch real images!\n');
  }

  try {
    // Get events that don't have images, with limit and offset
    // Note: OFFSET applies to the filtered results (events without images), not all events
    const { rows } = await sql`
      SELECT id, event_id, event_name, genre, venue_name, image
      FROM events
      WHERE image IS NULL 
         OR image = ''
         OR image LIKE '%placeholder%'
         OR image LIKE '%ui-avatars%'
         OR image LIKE '%via.placeholder%'
      ORDER BY id
      LIMIT ${batchSize}
      OFFSET ${startFrom}
    `;
    
    // If no results and startFrom > 0, it means we've processed all events without images
    // Let's check if there are any remaining events without images
    if (rows.length === 0 && startFrom > 0) {
      const { rows: checkRows } = await sql`
        SELECT COUNT(*) as count
        FROM events
        WHERE image IS NULL 
           OR image = ''
           OR image LIKE '%placeholder%'
           OR image LIKE '%ui-avatars%'
           OR image LIKE '%via.placeholder%'
      `;
      const remaining = parseInt(checkRows[0].count, 10);
      if (remaining === 0) {
        console.log('✅ All events without images have been processed!');
        console.log('   All remaining events already have images.');
        return;
      } else {
        console.log(`⚠️  No events found at offset ${startFrom}, but ${remaining} events still need images.`);
        console.log(`   Try starting from offset 0: npm run generate-images-batch 50 0`);
        return;
      }
    }

    const events: Event[] = rows;
    const totalEvents = events.length;

    if (totalEvents === 0) {
      console.log('✅ No events found to process!');
      console.log('   All events in this range already have images.');
      return;
    }

    console.log(`📊 Processing ${totalEvents} events (${startFrom + 1} to ${startFrom + totalEvents})\n`);

    let successCount = 0;
    let failCount = 0;
    let rateLimitHit = false;
    const delayBetweenRequests = 2000; // 2 seconds between requests

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const globalIndex = startFrom + i + 1;
      const progress = `[${i + 1}/${totalEvents}] (Global: ${globalIndex})`;

      console.log(`${progress} Generating image for: "${event.event_name}" (ID: ${event.id})`);

      try {
        const result = await generateImageForEvent(event);

        if (result.success) {
          successCount++;
          console.log(`   ✅ Success! Image saved.\n`);
        } else {
          failCount++;
          const errorMsg = result.error || '';
          
          if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit') || 
              errorMsg.includes('429') || errorMsg.includes('403')) {
            rateLimitHit = true;
            console.log(`\n⚠️  RATE LIMIT REACHED!\n`);
            console.log(`📊 Batch Summary:`);
            console.log(`   ✅ Success: ${successCount}`);
            console.log(`   ❌ Failed: ${failCount}`);
            console.log(`   📈 Processed in this batch: ${i + 1} / ${totalEvents}`);
            console.log(`\n💡 Next Steps:`);
            console.log(`   1. Wait 1 hour for rate limit to reset`);
            console.log(`   2. Run: npx tsx scripts/generate-images-batch.ts ${batchSize} ${startFrom + i + 1}`);
            console.log(`      (This will resume from where it stopped)`);
            break;
          }
          
          console.log(`   ❌ Failed: ${result.error}\n`);
        }
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
          rateLimitHit = true;
          console.log(`\n⚠️  RATE LIMIT REACHED!\n`);
          console.log(`📊 Batch Summary:`);
          console.log(`   ✅ Success: ${successCount}`);
          console.log(`   ❌ Failed: ${failCount}`);
          console.log(`   📈 Processed in this batch: ${i + 1} / ${totalEvents}`);
          console.log(`\n💡 Next Steps:`);
          console.log(`   1. Wait 1 hour for rate limit to reset`);
          console.log(`   2. Run: npx tsx scripts/generate-images-batch.ts ${batchSize} ${startFrom + i + 1}`);
          break;
        }
        throw error;
      }

      // Wait before next request (except for the last one or if rate limit hit)
      if (i < events.length - 1 && !rateLimitHit) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
    }

    console.log('\n📊 Batch Complete:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Processed: ${totalEvents}`);

    if (!rateLimitHit && totalEvents === batchSize) {
      // Check if there are more events to process
      const { rows: remainingRows } = await sql`
        SELECT COUNT(*) as count
        FROM events
        WHERE image IS NULL 
           OR image = ''
           OR image LIKE '%placeholder%'
           OR image LIKE '%ui-avatars%'
           OR image LIKE '%via.placeholder%'
      `;
      const remaining = parseInt(remainingRows[0].count, 10);
      
      if (remaining > 0) {
        console.log(`\n💡 Next batch:`);
        console.log(`   Run: npx tsx scripts/generate-images-batch.ts ${batchSize} ${startFrom + totalEvents}`);
        console.log(`   (${remaining} events remaining)`);
      } else {
        console.log('\n✅ All events have images!');
      }
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

