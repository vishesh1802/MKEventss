import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

// Map coordinates to regions based on clustering
function getVenueRegion(lat: number, lon: number): string | null {
  // Downtown (lat ~43.038-43.045, lon ~-87.92 to -87.89)
  if (lat >= 43.038 && lat <= 43.045 && lon >= -87.92 && lon <= -87.89) {
    return 'Downtown';
  }
  
  // Third Ward / South (lat 43.0335-43.0345, lon -87.9335 to -87.9325)
  // Expanded range to include new venues
  if (lat >= 43.0335 && lat <= 43.0345 && lon >= -87.9335 && lon <= -87.9325) {
    return 'Third Ward';
  }
  
  // Walker's Point (lat 43.0515-43.053, lon -87.906 to -87.904)
  // Expanded range to include new venues (including -87.905)
  if (lat >= 43.0515 && lat <= 43.053 && lon >= -87.906 && lon <= -87.904) {
    return 'Walker\'s Point';
  }
  
  // East Side / UWM (lat 43.0755-43.077, lon -87.881 to -87.879)
  // Extended range to include UWM Campus at -87.88
  // For negative numbers: -87.881 < -87.88 < -87.879
  // So we need lon >= -87.881 && lon <= -87.879 to include -87.88
  // Actually, -87.88 is between -87.881 and -87.879, so the range should work
  // But to be safe, let's extend slightly: -87.881 to -87.879 (which includes -87.88)
  if (lat >= 43.0755 && lat <= 43.077 && lon >= -87.881 && lon <= -87.879) {
    return 'East Side';
  }
  
  // Also check for venues exactly at -87.88 (UWM Campus, East Side Community Center)
  if (lat >= 43.0755 && lat <= 43.077 && Math.abs(lon - (-87.88)) < 0.001) {
    return 'East Side';
  }
  
  return null;
}

// Parse date from "M/D/YY" format to Date object
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Match M/D/YY or MM/DD/YY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return null;
  
  const month = parseInt(match[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(match[2], 10);
  const year = 2000 + parseInt(match[3], 10); // Assume 20YY format
  
  return new Date(year, month, day);
}

// Check if event date is today or in the future
function isFutureEvent(dateStr: string): boolean {
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
  eventDate.setHours(0, 0, 0, 0);
  
  return eventDate >= today;
}

// Simple genre similarity function
function genreSimilarity(g1: string, g2: string): number {
  if (!g1 || !g2) return 0;
  return g1.trim().toLowerCase() === g2.trim().toLowerCase() ? 1 : 0.5;
}

// Approximate geographical distance (in km)
function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user_idParam = req.query.user_id;
    const user_id: string = Array.isArray(user_idParam)
      ? (user_idParam[0] ?? "user_1")
      : (user_idParam ?? "user_1");

    // Get filters
    const regionParam = req.query.region;
    let region: string | null = Array.isArray(regionParam) 
      ? (regionParam[0] || null) 
      : (regionParam || null);
    
    // Decode URL-encoded spaces (+ becomes space)
    if (region) {
      region = decodeURIComponent(region.replace(/\+/g, ' '));
    }
    
    console.log('API received region:', region, 'from query:', req.query.region);
    
    const genresParam = req.query.genres;
    const genres: string[] = Array.isArray(genresParam)
      ? genresParam.flatMap(g => g.split(','))
      : (genresParam ? genresParam.split(',') : []);

    // Compute date range (today → +5 days)
    const today = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(today.getDate() + 5);

    const todayStr = today.toISOString().split("T")[0];
    const fiveDaysStr = fiveDaysLater.toISOString().split("T")[0];

    // 1️⃣ Get user's history
    let userHistory: any[] = [];
    try {
      const result = await sql`
        SELECT u.user_id, u.event_id, e.genre, e.latitude, e.longitude
        FROM user_history u
        JOIN events e ON u.event_id = e.event_id
        WHERE u.user_id = ${user_id}
        LIMIT 10;
      `;
      userHistory = result.rows;
    } catch (historyError: any) {
      console.error('Error fetching user history:', historyError.message);
      // Return empty recommendations if no history instead of error
      return res.status(200).json({
        user: user_id,
        date_range: { from: todayStr, to: fiveDaysStr },
        recommendations: [],
        message: "No history found for this user."
      });
    }

    if (userHistory.length === 0) {
      return res.status(200).json({
        user: user_id,
        date_range: { from: todayStr, to: fiveDaysStr },
        recommendations: [],
        message: "No history found for this user."
      });
    }

        // 2️⃣ Get all events, then filter in memory (safer for Vercel Postgres)
        const result = await sql`
          SELECT id, event_id, event_name, genre, latitude, longitude, date, ticket_price, venue_name, description
          FROM events;
        `;
    let allEvents = result.rows;
    
    // Filter out past events - only show events from today onwards
    const beforeDateFilter = allEvents.length;
    allEvents = allEvents.filter(ev => isFutureEvent(ev.date));
    console.log(`Date filter (future events only): ${beforeDateFilter} -> ${allEvents.length} events`);
    
    // Apply filters
    if (region) {
      const beforeCount = allEvents.length;
      // Debug: check a few sample venues
      const sampleVenues = allEvents.slice(0, 5).map(ev => ({
        venue: ev.venue_name,
        lat: ev.latitude,
        lon: ev.longitude,
        region: getVenueRegion(Number(ev.latitude), Number(ev.longitude))
      }));
      console.log(`Sample venues before filter:`, sampleVenues);
      console.log(`Looking for region: "${region}"`);
      
      allEvents = allEvents.filter(ev => {
        const venueRegion = getVenueRegion(Number(ev.latitude), Number(ev.longitude));
        return venueRegion === region;
      });
      console.log(`Region filter "${region}": ${beforeCount} -> ${allEvents.length} events`);
      
      if (allEvents.length === 0 && beforeCount > 0) {
        // Debug: show what regions we actually have
        const uniqueRegions = new Set();
        const futureEvents = result.rows.filter(ev => isFutureEvent(ev.date));
        futureEvents.forEach(ev => {
          const r = getVenueRegion(Number(ev.latitude), Number(ev.longitude));
          if (r) uniqueRegions.add(r);
        });
        console.log(`Available regions in future events:`, Array.from(uniqueRegions));
      }
    }
    
    if (genres.length > 0) {
      const beforeCount = allEvents.length;
      allEvents = allEvents.filter(ev => genres.includes(ev.genre));
      console.log(`Genre filter "${genres.join(',')}": ${beforeCount} -> ${allEvents.length} events`);
    }

    // 3️⃣ Compute similarity scores
    let recommendations = allEvents
      .map((ev) => {
        let score = 0;

        for (const past of userHistory) {
          const genreScore = genreSimilarity(past.genre, ev.genre);
          const dist = distance(
            Number(past.latitude),
            Number(past.longitude),
            Number(ev.latitude),
            Number(ev.longitude)
          );
          const regionScore = dist < 10 ? 1 : dist < 50 ? 0.8 : 0.3;
          score += genreScore * 0.7 + regionScore * 0.3;
        }

        return {
          ...ev,
          similarity_score: score / userHistory.length,
        };
      })
      .sort((a, b) => b.similarity_score - a.similarity_score);

    // If multiple genres are selected, interleave results to show diversity
    if (genres.length > 1) {
      const groupedByGenre: { [key: string]: any[] } = {};
      recommendations.forEach((ev: any) => {
        const genre = ev.genre;
        if (!groupedByGenre[genre]) {
          groupedByGenre[genre] = [];
        }
        groupedByGenre[genre].push(ev);
      });

      // Interleave events from each genre
      const interleaved: any[] = [];
      const maxLength = Math.max(...Object.values(groupedByGenre).map(arr => arr.length));
      
      for (let i = 0; i < maxLength; i++) {
        genres.forEach(genre => {
          if (groupedByGenre[genre] && groupedByGenre[genre][i]) {
            interleaved.push(groupedByGenre[genre][i]);
          }
        });
      }
      
      recommendations = interleaved.slice(0, 50);
    } else {
      recommendations = recommendations.slice(0, 50);
    }

    return res.status(200).json({
      user: user_id,
      date_range: { from: todayStr, to: fiveDaysStr },
      recommendations,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
