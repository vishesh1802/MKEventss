export interface NearbyPlace {
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

export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  type: 'restaurant' | 'bar' | 'all' = 'restaurant',
  radius: number = 1000
): Promise<NearbyPlace[]> {
  try {
    const response = await fetch(
      `/api/nearby-places?lat=${lat}&lon=${lon}&type=${type}&radius=${radius}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch nearby places');
    }
    
    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
}

export function getPriceLevelSymbol(priceLevel?: number): string {
  if (!priceLevel) return 'N/A';
  return '$'.repeat(priceLevel);
}

export function getDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}


