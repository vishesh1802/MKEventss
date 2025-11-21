/**
 * AI Utility Functions using OpenRouter API
 * 
 * Provides AI-powered features for event discovery:
 * - Generate event descriptions
 * - Create personalized summaries
 * - Answer questions about events
 * - Explain recommendations
 */

export interface AIEnhancementOptions {
  action: 'generate_description' | 'personalized_summary' | 'answer_question' | 'recommendation_explanation';
  eventData?: {
    title?: string;
    event_name?: string;
    genre?: string;
    date?: string;
    venue_name?: string;
    region?: string;
    price?: number;
    description?: string;
  };
  userPreferences?: {
    genres?: string[];
    region?: string;
  };
  question?: string;
}

export interface AIResponse {
  response: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function enhanceWithAI(options: AIEnhancementOptions): Promise<AIResponse | null> {
  try {
    const response = await fetch('/api/ai-enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get AI enhancement');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling AI enhancement:', error);
    return null;
  }
}

/**
 * Generate an AI-powered event description
 */
export async function generateEventDescription(eventData: AIEnhancementOptions['eventData']): Promise<string | null> {
  const result = await enhanceWithAI({
    action: 'generate_description',
    eventData,
  });
  
  return result?.response || null;
}

/**
 * Create a personalized event summary based on user preferences
 */
export async function getPersonalizedSummary(
  eventData: AIEnhancementOptions['eventData'],
  userPreferences: AIEnhancementOptions['userPreferences']
): Promise<string | null> {
  const result = await enhanceWithAI({
    action: 'personalized_summary',
    eventData,
    userPreferences,
  });
  
  return result?.response || null;
}

/**
 * Answer a question about an event using AI
 */
export async function answerEventQuestion(
  eventData: AIEnhancementOptions['eventData'],
  question: string
): Promise<string | null> {
  const result = await enhanceWithAI({
    action: 'answer_question',
    eventData,
    question,
  });
  
  return result?.response || null;
}

/**
 * Get an AI explanation for why an event is recommended
 */
export async function getRecommendationExplanation(
  eventData: AIEnhancementOptions['eventData'],
  userPreferences: AIEnhancementOptions['userPreferences']
): Promise<string | null> {
  const result = await enhanceWithAI({
    action: 'recommendation_explanation',
    eventData,
    userPreferences,
  });
  
  return result?.response || null;
}


