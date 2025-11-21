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
    const { lat, lon, type = 'restaurant', radius = 1000 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Missing required parameters: lat, lon' 
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const placeType = type as string;
    const searchRadius = parseInt(radius as string) || 1000;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

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
      const filteredPlaces = placeType === 'all' 
        ? mockPlaces 
        : mockPlaces.filter(p => 
            placeType === 'restaurant' 
              ? p.types.includes('restaurant') || p.types.includes('food')
              : p.types.includes('bar')
          );
      
      return res.status(200).json({ places: filteredPlaces });
    }

    // Determine place type for Google Places API
    let placeTypeQuery = '';
    if (placeType === 'restaurant') {
      placeTypeQuery = 'restaurant';
    } else if (placeType === 'bar') {
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

    res.status(200).json({ places });
  } catch (error) {
    console.error('❌ Nearby Places API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch nearby places',
      message: (error as Error).message 
    });
  }
}


