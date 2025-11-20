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
  // Create users table for authentication
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  
  // Create user_profiles table for storing user profiles
  await sql`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      region VARCHAR(255) NOT NULL,
      genres TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, profile_id)
    );
  `;
  
  // Create user_sessions table for managing login sessions
  await sql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Helpful indexes to speed up lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_genre ON events(genre);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_history_user_event ON user_history(user_id, event_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);`;
  console.log('✅ Tables ensured');
}

// Fetch all events
export async function getEvents(limit = 20) {
  const { rows } = await sql`SELECT * FROM events ORDER BY date LIMIT ${limit};`;
  return rows;
}
