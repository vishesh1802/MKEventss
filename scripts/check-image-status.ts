/**
 * Script to check how many events still need images
 * 
 * Usage: npx tsx scripts/check-image-status.ts
 */

import { sql } from "@vercel/postgres";
import "dotenv/config";

async function main() {
  console.log('📊 Checking image generation status...\n');

  try {
    // Get total events
    const { rows: totalRows } = await sql`SELECT COUNT(*) as count FROM events`;
    const totalEvents = parseInt(totalRows[0].count, 10);

    // Get events without images
    const { rows: noImageRows } = await sql`
      SELECT COUNT(*) as count
      FROM events
      WHERE image IS NULL 
         OR image = ''
         OR image LIKE '%placeholder%'
         OR image LIKE '%ui-avatars%'
         OR image LIKE '%via.placeholder%'
    `;
    const eventsWithoutImages = parseInt(noImageRows[0].count, 10);

    // Get events with real images (from Unsplash)
    const { rows: realImageRows } = await sql`
      SELECT COUNT(*) as count
      FROM events
      WHERE image IS NOT NULL 
         AND image != ''
         AND image NOT LIKE '%placeholder%'
         AND image NOT LIKE '%ui-avatars%'
         AND image NOT LIKE '%via.placeholder%'
         AND image LIKE 'https://images.unsplash.com%'
    `;
    const eventsWithRealImages = parseInt(realImageRows[0].count, 10);

    // Get events with placeholder images
    const { rows: placeholderRows } = await sql`
      SELECT COUNT(*) as count
      FROM events
      WHERE image IS NOT NULL 
         AND image != ''
         AND (image LIKE '%placeholder%' OR image LIKE '%ui-avatars%' OR image LIKE '%via.placeholder%')
    `;
    const eventsWithPlaceholders = parseInt(placeholderRows[0].count, 10);

    console.log('📈 Image Generation Status:');
    console.log('═══════════════════════════════════════════');
    console.log(`   Total Events: ${totalEvents}`);
    console.log(`   ✅ With Real Images: ${eventsWithRealImages}`);
    console.log(`   📸 With Placeholders: ${eventsWithPlaceholders}`);
    console.log(`   ❌ Without Images: ${eventsWithoutImages}`);
    console.log('═══════════════════════════════════════════');
    
    const progress = totalEvents > 0 ? ((eventsWithRealImages / totalEvents) * 100).toFixed(1) : 0;
    console.log(`\n📊 Progress: ${progress}% complete`);
    
    if (eventsWithoutImages > 0) {
      console.log(`\n💡 Next batch command:`);
      console.log(`   npm run generate-images-batch 50 ${totalEvents - eventsWithoutImages}`);
    } else {
      console.log(`\n✅ All events have images!`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

