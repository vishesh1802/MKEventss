import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

interface Review {
  id: number;
  user_id: number;
  event_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      // Get reviews for an event
      const { event_id } = req.query;

      if (!event_id) {
        return res.status(400).json({ error: "event_id is required" });
      }

      // Get event ID from events table using the provided id (could be event.id or event.event_id)
      const eventResult = await sql`
        SELECT id FROM events 
        WHERE id = ${Number(event_id)} OR event_id = ${String(event_id)}
        LIMIT 1
      `;
      
      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const actualEventId = eventResult.rows[0].id;

      // Fetch ALL reviews for this event (no user filtering)
      const { rows } = await sql`
        SELECT 
          er.id,
          er.user_id,
          er.event_id,
          er.rating,
          er.review_text,
          er.created_at,
          er.updated_at,
          u.name as user_name
        FROM event_reviews er
        LEFT JOIN users u ON er.user_id = u.id
        WHERE er.event_id = ${actualEventId}
        ORDER BY er.created_at DESC
      `;

      console.log(`📊 Reviews for event ${actualEventId} (from query param ${event_id}): Found ${rows.length} reviews`);
      
      // Debug: Check all reviews in database for this event_id to see if there's a mismatch
      const allReviewsDebug = await sql`
        SELECT er.id, er.user_id, er.event_id, er.rating, u.name as user_name
        FROM event_reviews er
        LEFT JOIN users u ON er.user_id = u.id
        WHERE er.event_id = ${actualEventId}
      `;
      console.log(`📊 Database check - All reviews with event_id=${actualEventId}:`, allReviewsDebug.rows);
      
      if (rows.length > 0) {
        console.log(`📊 Review details:`, rows.map((r: any) => ({ 
          id: r.id, 
          user_id: r.user_id, 
          user_name: r.user_name || 'Unknown', 
          rating: r.rating,
          event_id: r.event_id
        })));
      } else {
        console.log(`⚠️ No reviews found for event_id=${actualEventId}`);
      }

      // Calculate average rating
      const ratings = rows.map((r: Review) => r.rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0;
      const totalReviews = rows.length;

      return res.status(200).json({
        reviews: rows,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
      });
    } else if (req.method === "POST") {
      // Submit a review
      const { event_id, rating, review_text } = req.body;
      const userId = (req as any).user?.id; // Assuming user is attached by auth middleware

      if (!event_id || !rating) {
        return res.status(400).json({ error: "event_id and rating are required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Check if user is logged in via session
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.replace("Bearer ", "") || null;
      
      let userIdFromSession: number | null = null;
      
      if (sessionToken) {
        const sessionResult = await sql`
          SELECT user_id FROM user_sessions 
          WHERE session_token = ${sessionToken} 
          AND expires_at > NOW()
          LIMIT 1
        `;
        
        if (sessionResult.rows.length > 0) {
          userIdFromSession = sessionResult.rows[0].user_id;
        }
      }

      if (!userIdFromSession) {
        return res.status(401).json({ error: "You must be logged in to submit a review" });
      }

      // Get event ID from events table
      const eventResult = await sql`
        SELECT id FROM events 
        WHERE id = ${Number(event_id)} OR event_id = ${String(event_id)}
        LIMIT 1
      `;
      
      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const actualEventId = eventResult.rows[0].id;

      // Check if user already reviewed this event
      const existingReview = await sql`
        SELECT id FROM event_reviews 
        WHERE user_id = ${userIdFromSession} AND event_id = ${actualEventId}
        LIMIT 1
      `;

      console.log(`📝 Submitting review: user_id=${userIdFromSession}, event_id=${actualEventId}, existing=${existingReview.rows.length > 0}`);

      if (existingReview.rows.length > 0) {
        // Update existing review
        await sql`
          UPDATE event_reviews
          SET rating = ${Number(rating)},
              review_text = ${review_text || null},
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userIdFromSession} AND event_id = ${actualEventId}
        `;
        console.log(`✅ Updated existing review for user ${userIdFromSession}`);
      } else {
        // Insert new review
        const insertResult = await sql`
          INSERT INTO event_reviews (user_id, event_id, rating, review_text)
          VALUES (${userIdFromSession}, ${actualEventId}, ${Number(rating)}, ${review_text || null})
          RETURNING id
        `;
        console.log(`✅ Created new review ID: ${insertResult.rows[0]?.id} for user ${userIdFromSession}`);
      }
      
      // Verify all reviews for this event after insert/update
      const verifyReviews = await sql`
        SELECT er.user_id, er.rating, u.name as user_name 
        FROM event_reviews er
        LEFT JOIN users u ON er.user_id = u.id
        WHERE er.event_id = ${actualEventId}
      `;
      console.log(`📊 All reviews for event ${actualEventId} after save:`, verifyReviews.rows.map((r: any) => ({
        user_id: r.user_id,
        user_name: r.user_name || 'Unknown',
        rating: r.rating
      })));

      return res.status(200).json({ success: true, message: "Review submitted successfully" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Reviews API Error:", error);
    return res.status(500).json({
      error: "Failed to process review request",
      message: (error as Error).message,
    });
  }
}

