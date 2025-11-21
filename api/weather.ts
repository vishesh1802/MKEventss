import { VercelRequest, VercelResponse } from "@vercel/node";
import "dotenv/config";

interface WeatherResponse {
  date: string;
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lat, lon, date } = req.query;

    if (!lat || !lon || !date) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lon, date' 
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const eventDate = date as string;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Use OpenWeatherMap API (free tier: 1,000 calls/day)
    // Fallback to a mock response if API key is not set
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      // Return mock weather data for development
      console.log('⚠️ OPENWEATHER_API_KEY not set, returning mock data');
      const mockWeather: WeatherResponse = {
        date: eventDate,
        temperature: 72,
        condition: 'Partly Cloudy',
        description: 'Partly cloudy skies',
        icon: '02d',
        humidity: 65,
        windSpeed: 8,
        precipitation: 0,
      };
      return res.status(200).json(mockWeather);
    }

    // Parse event date
    const eventDateObj = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDateObj.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // OpenWeatherMap free tier supports current weather and 5-day forecast
    // For dates beyond 5 days, we'll use current weather as approximation
    let apiUrl: string;
    
    if (daysDiff <= 5 && daysDiff >= 0) {
      // Use 5-day forecast API
      apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
    } else {
      // Use current weather API for dates beyond forecast or in the past
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`;
    }

    const weatherResponse = await fetch(apiUrl);
    
    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.text();
      console.error('OpenWeatherMap API error:', errorData);
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    let weather: WeatherResponse;

    if (daysDiff <= 5 && daysDiff >= 0 && weatherData.list) {
      // Find the forecast entry closest to the event date
      const eventDateTime = new Date(eventDate);
      eventDateTime.setHours(12, 0, 0, 0); // Set to noon for comparison
      
      const closestForecast = weatherData.list.reduce((prev: any, curr: any) => {
        const prevDiff = Math.abs(new Date(prev.dt * 1000).getTime() - eventDateTime.getTime());
        const currDiff = Math.abs(new Date(curr.dt * 1000).getTime() - eventDateTime.getTime());
        return currDiff < prevDiff ? curr : prev;
      });

      weather = {
        date: eventDate,
        temperature: Math.round(closestForecast.main.temp),
        condition: closestForecast.weather[0].main,
        description: closestForecast.weather[0].description,
        icon: closestForecast.weather[0].icon,
        humidity: closestForecast.main.humidity,
        windSpeed: Math.round(closestForecast.wind?.speed || 0),
        precipitation: closestForecast.rain?.['3h'] || closestForecast.snow?.['3h'] || 0,
      };
    } else {
      // Use current weather
      weather = {
        date: eventDate,
        temperature: Math.round(weatherData.main.temp),
        condition: weatherData.weather[0].main,
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        humidity: weatherData.main.humidity,
        windSpeed: Math.round(weatherData.wind?.speed || 0),
        precipitation: weatherData.rain?.['1h'] || weatherData.snow?.['1h'] || 0,
      };
    }

    res.status(200).json(weather);
  } catch (error) {
    console.error('❌ Weather API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weather data',
      message: (error as Error).message 
    });
  }
}


