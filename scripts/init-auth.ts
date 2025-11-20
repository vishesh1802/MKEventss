import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function initAuth() {
  try {
    console.log('🔐 Initializing authentication tables...');
    
    // Create users table
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
    
    // Create index on email for faster lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
    
    console.log('✅ Authentication tables created successfully!');
  } catch (error) {
    console.error('❌ Error initializing auth tables:', error);
    process.exit(1);
  }
}

initAuth();

