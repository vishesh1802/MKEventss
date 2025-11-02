import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

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
    const region: string | null = Array.isArray(regionParam) 
      ? (regionParam[0] || null) 
      : (regionParam || null);
    
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
      SELECT event_id, event_name, genre, latitude, longitude, date, ticket_price, venue_name, description
      FROM events;
    `;
    let allEvents = result.rows;
    
    // Apply filters
    if (region) {
      allEvents = allEvents.filter(ev => 
        ev.venue_name && ev.venue_name.toLowerCase().includes(region.toLowerCase())
      );
    }
    
    if (genres.length > 0) {
      allEvents = allEvents.filter(ev => genres.includes(ev.genre));
    }

    // 3️⃣ Compute similarity scores
    const recommendations = allEvents
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
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 50);

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
