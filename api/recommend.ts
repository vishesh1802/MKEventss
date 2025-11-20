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
    
    const genresParam = req.query.genres;
    const genres: string[] = Array.isArray(genresParam)
      ? genresParam.flatMap(g => g.split(','))
      : (genresParam ? genresParam.split(',') : []);

    console.log('🎯 Recommendation request:', {
      user_id,
      region,
      genres,
      genresCount: genres.length
    });

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
      userHistory = result.rows || [];
    } catch (error: any) {
      // Continue without history - we'll show all events instead
      userHistory = [];
    }

    // 2️⃣ Get all events, then filter in memory (safer for Vercel Postgres)
    let allEvents: any[] = [];
    try {
      const { rows } = await sql`SELECT * FROM events;`;
      allEvents = rows || [];
      
      // If no events found, return empty recommendations
      if (!allEvents || allEvents.length === 0) {
        return res.status(200).json({
          user: user_id,
          date_range: { from: todayStr, to: fiveDaysStr },
          recommendations: [],
        });
      }
    } catch (eventsError: any) {
      console.error("❌ Error fetching events:", eventsError);
      console.error("Error code:", eventsError?.code);
      console.error("Error message:", eventsError?.message);
      // If table doesn't exist or query fails, return empty recommendations
      if (eventsError?.code === '42P01' || 
          eventsError?.message?.includes('does not exist') ||
          eventsError?.message?.includes('relation') && eventsError?.message?.includes('does not exist')) {
        return res.status(200).json({
          user: user_id,
          date_range: { from: todayStr, to: fiveDaysStr },
          recommendations: [],
        });
      }
      throw eventsError;
    }

    if (userHistory.length === 0) {
      // If no user history, return all future events (or filtered events)
      const futureEvents = allEvents.filter(ev => {
        try {
          return ev.date && isFutureEvent(ev.date);
        } catch {
          return false;
        }
      });
      
      // Apply filters
      let filteredEvents = futureEvents;
      if (region) {
        filteredEvents = filteredEvents.filter(ev => {
          try {
            const lat = ev.latitude != null ? Number(ev.latitude) : null;
            const lon = ev.longitude != null ? Number(ev.longitude) : null;
            if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return false;
            const venueRegion = getVenueRegion(lat, lon);
            return venueRegion === region;
          } catch {
            return false;
          }
        });
      }
      if (genres.length > 0) {
        filteredEvents = filteredEvents.filter(ev => {
          if (!ev.genre) return false;
          // Case-insensitive matching and handle partial matches (e.g., "Food" matches "Food & Drink")
          return genres.some(selectedGenre => {
            const evGenreLower = ev.genre.toLowerCase().trim();
            const selectedGenreLower = selectedGenre.toLowerCase().trim();
            // Exact match
            if (evGenreLower === selectedGenreLower) return true;
            // Partial match: if selected genre is contained in event genre or vice versa
            if (evGenreLower.includes(selectedGenreLower) || selectedGenreLower.includes(evGenreLower)) return true;
            return false;
          });
        });
      }
      
      // Return events with default scores
      const recommendations = filteredEvents
        .map(ev => ({
          ...ev,
          similarity_score: 0.5, // Default score when no history
        }))
        .slice(0, 50);
      
      return res.status(200).json({
        user: user_id,
        date_range: { from: todayStr, to: fiveDaysStr },
        recommendations,
      });
    }
    
    // Filter out past events - only show events from today onwards
    const beforeDateFilter = allEvents.length;
    allEvents = allEvents.filter(ev => {
      try {
        return ev.date && isFutureEvent(ev.date);
      } catch {
        return false;
      }
    });
    // Apply filters
    if (region) {
      allEvents = allEvents.filter(ev => {
        const lat = ev.latitude != null ? Number(ev.latitude) : null;
        const lon = ev.longitude != null ? Number(ev.longitude) : null;
        if (lat == null || lon == null) return false;
        const venueRegion = getVenueRegion(lat, lon);
        return venueRegion === region;
      });
    }
    
    if (genres.length > 0) {
      allEvents = allEvents.filter(ev => {
        if (!ev.genre) return false;
        // Case-insensitive matching and handle partial matches (e.g., "Food" matches "Food & Drink")
        return genres.some(selectedGenre => {
          const evGenreLower = ev.genre.toLowerCase().trim();
          const selectedGenreLower = selectedGenre.toLowerCase().trim();
          // Exact match
          if (evGenreLower === selectedGenreLower) return true;
          // Partial match: if selected genre is contained in event genre or vice versa
          if (evGenreLower.includes(selectedGenreLower) || selectedGenreLower.includes(evGenreLower)) return true;
          return false;
        });
      });
    }

    // 3️⃣ Compute similarity scores
    let recommendations = allEvents
      .map((ev) => {
        let score = 0;

        if (userHistory.length > 0) {
          for (const past of userHistory) {
            const genreScore = genreSimilarity(past.genre, ev.genre);
            const pastLat = past.latitude != null ? Number(past.latitude) : null;
            const pastLon = past.longitude != null ? Number(past.longitude) : null;
            const evLat = ev.latitude != null ? Number(ev.latitude) : null;
            const evLon = ev.longitude != null ? Number(ev.longitude) : null;
            
            if (pastLat != null && pastLon != null && evLat != null && evLon != null) {
              const dist = distance(pastLat, pastLon, evLat, evLon);
              const regionScore = dist < 10 ? 1 : dist < 50 ? 0.8 : 0.3;
              score += genreScore * 0.7 + regionScore * 0.3;
            } else {
              // If coordinates are missing, just use genre score
              score += genreScore;
            }
          }
          if (userHistory.length > 0) {
            score = score / userHistory.length;
          }
        } else {
          // Default score when no history
          score = 0.5;
        }

        return {
          ...ev,
          similarity_score: score,
        };
      })
      .sort((a, b) => b.similarity_score - a.similarity_score);

    // If multiple genres are selected, interleave results to show diversity
    if (genres.length > 1 && recommendations.length > 0) {
      // Group events by matching selected genre (handle partial matches)
      const groupedBySelectedGenre: { [key: string]: any[] } = {};
      genres.forEach(selectedGenre => {
        groupedBySelectedGenre[selectedGenre] = [];
      });
      
      recommendations.forEach((ev: any) => {
        if (!ev.genre) return;
        const evGenreLower = ev.genre.toLowerCase().trim();
        // Find which selected genre(s) this event matches
        genres.forEach(selectedGenre => {
          const selectedGenreLower = selectedGenre.toLowerCase().trim();
          if (evGenreLower === selectedGenreLower || 
              evGenreLower.includes(selectedGenreLower) || 
              selectedGenreLower.includes(evGenreLower)) {
            groupedBySelectedGenre[selectedGenre].push(ev);
          }
        });
      });

      console.log('🎭 Genre grouping:', Object.keys(groupedBySelectedGenre).map(genre => ({
        genre,
        count: groupedBySelectedGenre[genre].length
      })));

      // Interleave events from each selected genre
      const interleaved: any[] = [];
      const genreLengths = Object.values(groupedBySelectedGenre).map(arr => arr.length);
      const maxLength = genreLengths.length > 0 ? Math.max(...genreLengths) : 0;
      
      if (maxLength > 0) {
        for (let i = 0; i < maxLength; i++) {
          genres.forEach(selectedGenre => {
            if (groupedBySelectedGenre[selectedGenre] && groupedBySelectedGenre[selectedGenre][i]) {
              interleaved.push(groupedBySelectedGenre[selectedGenre][i]);
            }
          });
        }
        recommendations = interleaved.slice(0, 50);
      }
    } else {
      recommendations = recommendations.slice(0, 50);
    }
    
    console.log('📊 Final recommendations:', {
      total: recommendations.length,
      genres: Array.from(new Set(recommendations.map((r: any) => r.genre))),
      selectedGenres: genres
    });

    return res.status(200).json({
      user: user_id,
      date_range: { from: todayStr, to: fiveDaysStr },
      recommendations,
    });
  } catch (error: any) {
    console.error("❌ Recommendation API Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:", error?.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error?.message || "Internal server error",
        code: error?.code,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }
}
