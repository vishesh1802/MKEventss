import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';

// Load env from .env, then override with .env.local if it exists
loadEnv();
loadEnv({ path: '.env.local', override: true });

// Create table if not exists
export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(64) UNIQUE,
      event_name TEXT,
      genre TEXT,
      venue_name TEXT,
      date TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      description TEXT,
      organizer TEXT,
      ticket_price TEXT
    );
  `;
  console.log('✅ Tables ensured');
}

// Fetch all events
export async function getEvents(limit = 20) {
  const { rows } = await sql`SELECT * FROM events ORDER BY date LIMIT ${limit};`;
  return rows;
}
