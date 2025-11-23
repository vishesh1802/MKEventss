import { VercelRequest, VercelResponse } from "@vercel/node";
import "dotenv/config";

interface Place {
  name: string;
  address: string;
  rating?: number;
  priceLevel?: number;
  distance: number;
  types: string[];
  placeId?: string;
  lat: number;
  lng: number;
}

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

/**
 * Combined API endpoint for event context (weather + nearby places)
 * 
 * GET /api/context?type=weather&lat=...&lon=...&date=...
 * GET /api/context?type=places&lat=...&lon=...&type=restaurant|bar
 */
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
    const { type, lat, lon, date, placeType = 'restaurant', radius = 1000 } = req.query;

    if (!type || (type !== 'weather' && type !== 'places')) {
      return res.status(400).json({ 
        error: 'Missing or invalid type parameter. Must be "weather" or "places"' 
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Handle weather request
    if (type === 'weather') {
      if (!date) {
        return res.status(400).json({ 
          error: 'Missing required parameter: date' 
        });
      }

      const eventDate = date as string;

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

      return res.status(200).json(weather);
    }

    // Handle places request
    if (type === 'places') {
      const placeTypeStr = placeType as string;
      const searchRadius = parseInt(radius as string) || 1000;

      // Use Google Places API if available, otherwise return mock data
      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
      
      if (!googleApiKey) {
        // Return mock nearby places for development
        console.log('⚠️ GOOGLE_PLACES_API_KEY not set, returning mock data');
        const mockPlaces: Place[] = [
          {
            name: 'Milwaukee Restaurant',
            address: '123 Main St, Milwaukee, WI',
            rating: 4.5,
            priceLevel: 2,
            distance: 0.3,
            types: ['restaurant', 'food'],
            lat: latitude + 0.001,
            lng: longitude + 0.001,
          },
          {
            name: 'Local Bar & Grill',
            address: '456 Oak Ave, Milwaukee, WI',
            rating: 4.2,
            priceLevel: 1,
            distance: 0.5,
            types: ['bar', 'restaurant'],
            lat: latitude - 0.001,
            lng: longitude + 0.001,
          },
          {
            name: 'Downtown Eatery',
            address: '789 Pine St, Milwaukee, WI',
            rating: 4.7,
            priceLevel: 3,
            distance: 0.7,
            types: ['restaurant', 'fine_dining'],
            lat: latitude + 0.002,
            lng: longitude - 0.001,
          },
        ];
        
        // Filter by type if specified
        const filteredPlaces = placeTypeStr === 'all' 
          ? mockPlaces 
          : mockPlaces.filter(p => 
              placeTypeStr === 'restaurant' 
                ? p.types.includes('restaurant') || p.types.includes('food')
                : p.types.includes('bar')
            );
        
        return res.status(200).json({ places: filteredPlaces });
      }

      // Determine place type for Google Places API
      let placeTypeQuery = '';
      if (placeTypeStr === 'restaurant') {
        placeTypeQuery = 'restaurant';
      } else if (placeTypeStr === 'bar') {
        placeTypeQuery = 'bar';
      } else {
        placeTypeQuery = 'restaurant|bar';
      }

      // Use Google Places API Nearby Search
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${searchRadius}&type=${placeTypeQuery}&key=${googleApiKey}`;

      const placesResponse = await fetch(placesUrl);
      
      if (!placesResponse.ok) {
        throw new Error(`Places API error: ${placesResponse.status}`);
      }

      const placesData = await placesResponse.json();

      if (placesData.status === 'ZERO_RESULTS') {
        return res.status(200).json({ places: [] });
      }

      if (placesData.status !== 'OK') {
        throw new Error(`Places API error: ${placesData.status}`);
      }

      // Calculate distance and format results
      const places: Place[] = placesData.results.slice(0, 10).map((place: any) => {
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = ((place.geometry.location.lat - latitude) * Math.PI) / 180;
        const dLon = ((place.geometry.location.lng - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((place.geometry.location.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km

        return {
          name: place.name,
          address: place.vicinity || place.formatted_address || 'Address not available',
          rating: place.rating,
          priceLevel: place.price_level,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
          types: place.types || [],
          placeId: place.place_id,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        };
      });

      // Sort by distance
      places.sort((a, b) => a.distance - b.distance);

      return res.status(200).json({ places });
    }

    return res.status(400).json({ error: 'Invalid type parameter' });
  } catch (error) {
    console.error('❌ Context API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch context data',
      message: (error as Error).message 
    });
  }
}

