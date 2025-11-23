export interface WeatherData {
  date: string;
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation?: number;
}

export async function fetchWeather(
  lat: number,
  lon: number,
  date: string
): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `/api/context?type=weather&lat=${lat}&lon=${lon}&date=${date}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

export function getWeatherConditionColor(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    return 'text-yellow-500';
  }
  if (conditionLower.includes('cloud')) {
    return 'text-gray-500';
  }
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    return 'text-blue-500';
  }
  if (conditionLower.includes('snow')) {
    return 'text-blue-300';
  }
  if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
    return 'text-purple-500';
  }
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
    return 'text-gray-400';
  }
  
  return 'text-gray-600';
}

export function formatWeatherCondition(condition: string): string {
  return condition
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getWeatherRecommendation(condition: string, temperature: number): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain') || conditionLower.includes('storm')) {
    return 'Consider bringing an umbrella or raincoat';
  }
  if (conditionLower.includes('snow')) {
    return 'Dress warmly and allow extra travel time';
  }
  if (temperature < 32) {
    return 'Very cold - dress in layers';
  }
  if (temperature < 50) {
    return 'Cool weather - bring a jacket';
  }
  if (temperature > 85) {
    return 'Hot weather - stay hydrated and seek shade';
  }
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    return 'Perfect weather for outdoor events!';
  }
  
  return 'Weather looks good for the event';
}


