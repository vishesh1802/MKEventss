import { VercelRequest, VercelResponse } from "@vercel/node";
import "dotenv/config";

/**
 * AI Enhancement API using OpenRouter
 * 
 * This endpoint uses OpenRouter API to provide AI-powered features:
 * - Generate event descriptions
 * - Create personalized event summaries
 * - Answer questions about events
 * - Provide event recommendations with explanations
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, eventData, userPreferences, question } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing required parameter: action' });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    
    // Debug logging
    console.log('🔍 Environment check:');
    console.log('  OPENROUTER_API_KEY exists:', !!openRouterApiKey);
    console.log('  OPENROUTER_API_KEY length:', openRouterApiKey?.length || 0);
    console.log('  OPENROUTER_API_KEY first 10 chars:', openRouterApiKey?.substring(0, 10) || 'N/A');
    console.log('  All env vars with OPENROUTER:', Object.keys(process.env).filter(k => k.includes('OPENROUTER')));
    
    if (!openRouterApiKey) {
      // Return mock response for development
      console.log('⚠️ OPENROUTER_API_KEY not set, returning mock response');
      return res.status(200).json({
        response: getMockResponse(action, eventData, userPreferences, question),
        model: 'mock',
      });
    }

    // Determine which model to use (you can make this configurable)
    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
    
    let prompt = '';
    
    switch (action) {
      case 'generate_description':
        prompt = generateDescriptionPrompt(eventData);
        break;
      case 'personalized_summary':
        prompt = personalizedSummaryPrompt(eventData, userPreferences);
        break;
      case 'answer_question':
        prompt = answerQuestionPrompt(eventData, question);
        break;
      case 'recommendation_explanation':
        prompt = recommendationExplanationPrompt(eventData, userPreferences);
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://mkevents.app',
        'X-Title': 'MKEvents',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for MKEvents, a Milwaukee event discovery platform. Provide concise, friendly, and informative responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenRouter API');
    }

    res.status(200).json({
      response: data.choices[0].message.content,
      model: data.model || model,
      usage: data.usage,
    });
  } catch (error) {
    console.error('❌ AI Enhancement API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      message: (error as Error).message 
    });
  }
}

// Prompt generators
function generateDescriptionPrompt(eventData: any): string {
  return `Generate an engaging, concise event description (2-3 sentences) for this Milwaukee event:

Title: ${eventData.title || eventData.event_name}
Genre: ${eventData.genre}
Date: ${eventData.date}
Venue: ${eventData.venue_name || eventData.region}
Price: ${eventData.price === 0 ? 'Free' : `$${eventData.price}`}
${eventData.description ? `Current description: ${eventData.description}` : ''}

Make it exciting and informative, highlighting what makes this event special.`;
}

function personalizedSummaryPrompt(eventData: any, userPreferences: any): string {
  const preferences = userPreferences?.genres?.length 
    ? `User likes: ${userPreferences.genres.join(', ')}`
    : 'No specific preferences';
  
  return `Create a personalized summary (2-3 sentences) for this event based on user preferences:

Event: ${eventData.title || eventData.event_name}
Genre: ${eventData.genre}
Date: ${eventData.date}
Venue: ${eventData.venue_name || eventData.region}
${preferences}

Explain why this event might interest the user based on their preferences.`;
}

function answerQuestionPrompt(eventData: any, question: string): string {
  return `Answer this question about the event:

Event: ${eventData.title || eventData.event_name}
Genre: ${eventData.genre}
Date: ${eventData.date}
Venue: ${eventData.venue_name || eventData.region}
Price: ${eventData.price === 0 ? 'Free' : `$${eventData.price}`}
Description: ${eventData.description || 'No description available'}

Question: ${question}

Provide a helpful, accurate answer. If you don't know, say so politely.`;
}

function recommendationExplanationPrompt(eventData: any, userPreferences: any): string {
  const preferences = userPreferences?.genres?.length 
    ? `User likes: ${userPreferences.genres.join(', ')}`
    : 'No specific preferences';
  
  return `Explain why this event is recommended for the user (1-2 sentences):

Event: ${eventData.title || eventData.event_name}
Genre: ${eventData.genre}
Date: ${eventData.date}
Venue: ${eventData.venue_name || eventData.region}
${preferences}

Be specific about why this matches their interests.`;
}

// Mock responses for development
function getMockResponse(action: string, eventData: any, userPreferences: any, question?: string): string {
  switch (action) {
    case 'generate_description':
      return `Join us for ${eventData.title || 'this exciting event'} in ${eventData.venue_name || eventData.region}! This ${eventData.genre.toLowerCase()} event promises an unforgettable experience. Don't miss out!`;
    case 'personalized_summary':
      return `This ${eventData.genre.toLowerCase()} event matches your interests perfectly! It's happening on ${eventData.date} at ${eventData.venue_name || eventData.region}.`;
    case 'answer_question':
      return `Based on the event information, ${question || 'the answer to your question'} is available in the event details.`;
    case 'recommendation_explanation':
      return `This event is recommended because it's a ${eventData.genre.toLowerCase()} event, which aligns with your preferences.`;
    default:
      return 'Mock response';
  }
}

