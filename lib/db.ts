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
      ticket_price TEXT,
      image TEXT
    );
  `;
  
  // Add image column if it doesn't exist (migration for existing tables)
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image'
      ) THEN
        ALTER TABLE events ADD COLUMN image TEXT;
      END IF;
    END $$;
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
  
  // Migrate password column to password_hash if needed
  await sql`
    DO $$ 
    BEGIN
      -- If password column exists but password_hash doesn't, rename it
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE users RENAME COLUMN password TO password_hash;
      END IF;
      
      -- If password_hash doesn't exist at all, add it
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
      END IF;
      
      -- Remove password column if it still exists (after migration)
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
      ) THEN
        ALTER TABLE users DROP COLUMN password;
      END IF;
    END $$;
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
      genres TEXT DEFAULT '[]',
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
  
  // Create event_reviews table for reviews and ratings
  await sql`
    CREATE TABLE IF NOT EXISTS event_reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, event_id)
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
  await sql`CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON event_reviews(event_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_reviews_user ON event_reviews(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_reviews_user_event ON event_reviews(user_id, event_id);`;
  console.log('✅ Tables ensured');
}

// Fetch all events
export async function getEvents(limit = 20) {
  const { rows } = await sql`SELECT * FROM events ORDER BY date LIMIT ${limit};`;
  return rows;
}
