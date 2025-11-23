import { sql } from '@vercel/postgres';
import 'dotenv/config';

(async () => {
  try {
    console.log('🔄 Adding image column to events table...');
    
    // Check if column exists
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'image';
    `;
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Image column already exists');
    } else {
      // Add column
      await sql`ALTER TABLE events ADD COLUMN image TEXT;`;
      console.log('✅ Image column added successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
