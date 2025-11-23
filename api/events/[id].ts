import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

/**
 * API endpoint for individual event operations
 * 
 * GET /api/events/[id] - Get event details
 * GET /api/events/[id]?image=true - Get event image URL
 * PUT /api/events/[id] - Update event image URL (body: { image_url: string })
 * DELETE /api/events/[id] - Remove event image (query: ?action=delete-image)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;
    const { image } = req.query; // For GET image requests
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Extract numeric ID from event_id (event_id might be like "abc123", we need to match by id or event_id)
    const numericId = parseInt(id);
    
    let eventResult;
    if (!isNaN(numericId)) {
      // Try to find by numeric id first
      eventResult = await sql`
        SELECT * FROM events WHERE id = ${numericId} OR event_id = ${id} LIMIT 1;
      `;
    } else {
      // Try to find by event_id string
      eventResult = await sql`
        SELECT * FROM events WHERE event_id = ${id} LIMIT 1;
      `;
    }

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];
    const actualEventId = event.id;

    // Handle GET image request
    if (req.method === "GET" && image === 'true') {
      // Get event image URL only
      return res.status(200).json({
        image: event.image || null,
      });
    }

    // Handle PUT image update
    if (req.method === "PUT" && req.body?.image_url) {
      const { image_url } = req.body;

      if (!image_url || typeof image_url !== "string") {
        return res.status(400).json({ error: "image_url is required and must be a string" });
      }

      // Validate URL format
      try {
        new URL(image_url);
      } catch {
        return res.status(400).json({ error: "Invalid image URL format" });
      }

      await sql`
        UPDATE events 
        SET image = ${image_url}
        WHERE id = ${actualEventId}
      `;

      return res.status(200).json({
        success: true,
        message: "Event image updated successfully",
        image: image_url,
      });
    }

    // Handle DELETE image
    if (req.method === "DELETE" && req.query.action === 'delete-image') {
      // Remove event image
      await sql`
        UPDATE events 
        SET image = NULL
        WHERE id = ${actualEventId}
      `;

      return res.status(200).json({
        success: true,
        message: "Event image removed successfully",
      });
    }

    // Default: GET event details
    if (req.method === "GET") {
      // Ensure image field is included
      return res.status(200).json({
        ...event,
        image: event.image || null,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("❌ Event API Error:", error);
    return res.status(500).json({ 
      error: (error as Error).message 
    });
  }
}
