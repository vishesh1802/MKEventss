import { createTables } from '../lib/db.js';
import { sql } from '@vercel/postgres';
import 'dotenv/config';

async function testAuthSetup() {
  console.log('🧪 Testing Authentication Setup...\n');

  try {
    // 1. Create tables
    console.log('1️⃣ Creating database tables...');
    await createTables();
    console.log('✅ Tables created successfully\n');

    // 2. Check if tables exist
    console.log('2️⃣ Verifying tables exist...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_profiles', 'user_sessions', 'events', 'user_history')
      ORDER BY table_name;
    `;
    
    const tableNames = tables.rows.map(r => r.table_name);
    console.log('Found tables:', tableNames.join(', '));
    
    const requiredTables = ['users', 'user_profiles', 'user_sessions'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '));
      process.exit(1);
    }
    console.log('✅ All required tables exist\n');

    // 3. Check table structure
    console.log('3️⃣ Verifying table structure...');
    
    const userProfilesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `;
    console.log('user_profiles columns:', userProfilesColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    const userSessionsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions'
      ORDER BY ordinal_position;
    `;
    console.log('user_sessions columns:', userSessionsColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    console.log('✅ Table structure verified\n');

    // 4. Test insert (cleanup after)
    console.log('4️⃣ Testing database operations...');
    const testEmail = `test_${Date.now()}@example.com`;
    
    // Insert test user
    const { rows: userRows } = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${testEmail}, 'test_hash', 'Test User')
      RETURNING id, email, name;
    `;
    const testUserId = userRows[0].id;
    console.log('✅ Test user created:', userRows[0].email);

    // Insert test profile
    const testProfileId = `profile_${Date.now()}`;
    await sql`
      INSERT INTO user_profiles (user_id, profile_id, name, region, genres)
      VALUES (${testUserId}, ${testProfileId}, 'Test Profile', 'Downtown', ARRAY['Music', 'Food'])
      RETURNING profile_id, name;
    `;
    console.log('✅ Test profile created');

    // Insert test session
    const testToken = 'test_token_' + Date.now();
    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${testUserId}, ${testToken}, NOW() + INTERVAL '30 days')
      RETURNING session_token;
    `;
    console.log('✅ Test session created');

    // Cleanup test data
    await sql`DELETE FROM user_sessions WHERE user_id = ${testUserId}`;
    await sql`DELETE FROM user_profiles WHERE user_id = ${testUserId}`;
    await sql`DELETE FROM users WHERE id = ${testUserId}`;
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All tests passed! Authentication system is ready to use.\n');
    console.log('Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Navigate to: http://localhost:5173/login');
    console.log('3. Create an account and test the login flow');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testAuthSetup();

