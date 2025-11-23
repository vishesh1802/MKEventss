import { sql } from '@vercel/postgres';
import 'dotenv/config';

(async () => {
  try {
    console.log('🔍 Checking database for image column and images...\n');
    
    // Check if image column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'image';
    `;
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ Image column does NOT exist in events table');
      console.log('📝 Adding image column...');
      await sql`ALTER TABLE events ADD COLUMN image TEXT;`;
      console.log('✅ Image column added successfully\n');
    } else {
      console.log('✅ Image column exists\n');
    }
    
    // Check how many events have images
    const imageCheck = await sql`
      SELECT 
        COUNT(*) as total_events,
        COUNT(image) as events_with_images,
        COUNT(*) FILTER (WHERE image IS NOT NULL AND image != '') as events_with_non_empty_images
      FROM events;
    `;
    
    console.log('📊 Image Statistics:');
    console.log(`   Total events: ${imageCheck.rows[0].total_events}`);
    console.log(`   Events with image field set: ${imageCheck.rows[0].events_with_images}`);
    console.log(`   Events with non-empty images: ${imageCheck.rows[0].events_with_non_empty_images}\n`);
    
    // Show a few sample events with their image status
    const samples = await sql`
      SELECT id, event_name, image 
      FROM events 
      LIMIT 5;
    `;
    
    console.log('📋 Sample events:');
    samples.rows.forEach((event: any) => {
      console.log(`   Event ${event.id}: ${event.event_name}`);
      console.log(`      Image: ${event.image || '(none)'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

