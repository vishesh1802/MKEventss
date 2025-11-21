/**
 * Quick test script to verify OpenRouter API key is working
 * 
 * Run with: node test-openrouter.js
 */

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  console.log('🔍 Testing OpenRouter API Key...\n');
  
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY not found in environment variables');
    console.log('💡 Make sure you have .env.local file with OPENROUTER_API_KEY=your-key');
    process.exit(1);
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 15) + '...');
  console.log('📡 Testing API endpoint...\n');
  
  try {
    // Test the local API endpoint
    const response = await fetch('http://localhost:3000/api/ai-enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate_description',
        eventData: {
          title: 'Test Jazz Event',
          genre: 'Music',
          date: '2025-10-15',
          venue_name: 'Test Venue',
          price: 25,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 Response:');
    console.log('─'.repeat(50));
    console.log('Model:', data.model || 'unknown');
    console.log('Response:', data.response);
    console.log('─'.repeat(50));
    
    if (data.model === 'mock') {
      console.log('\n⚠️  WARNING: Getting mock response!');
      console.log('💡 This means the API key is not being used.');
      console.log('💡 Check:');
      console.log('   1. Is .env.local in the root directory?');
      console.log('   2. Did you restart the dev server after adding the key?');
      console.log('   3. Is the API key correct?');
    } else {
      console.log('\n✅ SUCCESS! API key is working!');
      console.log('🎉 You are getting real AI responses.');
      
      if (data.usage) {
        console.log('\n📈 Token Usage:');
        console.log('   Prompt tokens:', data.usage.prompt_tokens);
        console.log('   Completion tokens:', data.usage.completion_tokens);
        console.log('   Total tokens:', data.usage.total_tokens);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error testing API:');
    console.error(error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Your dev server is running (npm run dev)');
    console.log('   2. The server is on http://localhost:3000');
    console.log('   3. Vercel dev server is running if using Vercel');
    process.exit(1);
  }
}

// Load environment variables
import('dotenv').then((dotenv) => {
  dotenv.config();
  dotenv.config({ path: '.env.local', override: true });
  testOpenRouter();
}).catch(() => {
  // If dotenv fails, try without it (for ESM)
  testOpenRouter();
});


