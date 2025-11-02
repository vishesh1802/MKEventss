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
  // Create user_history for recommendations if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS user_history (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id VARCHAR(64) NOT NULL,
      visit_date TEXT,
      rating DOUBLE PRECISION,
      UNIQUE (user_id, event_id)
    );
  `;
  // Helpful indexes to speed up lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_genre ON events(genre);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_history_user_event ON user_history(user_id, event_id);`;
  console.log('✅ Tables ensured');
}

// Fetch all events
export async function getEvents(limit = 20) {
  const { rows } = await sql`SELECT * FROM events ORDER BY date LIMIT ${limit};`;
  return rows;
}
