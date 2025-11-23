import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

/**
 * API endpoint for managing event images
 * 
 * GET /api/events/[id]/image - Get event image URL
 * PUT /api/events/[id]/image - Update event image URL
 * DELETE /api/events/[id]/image - Remove event image
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

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Find event by id or event_id
    const numericId = parseInt(id);
    let eventResult;
    
    if (!isNaN(numericId)) {
      eventResult = await sql`
        SELECT id FROM events 
        WHERE id = ${numericId} OR event_id = ${id} 
        LIMIT 1
      `;
    } else {
      eventResult = await sql`
        SELECT id FROM events 
        WHERE event_id = ${id} 
        LIMIT 1
      `;
    }

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const actualEventId = eventResult.rows[0].id;

    if (req.method === "GET") {
      // Get event image URL
      const eventData = await sql`
        SELECT image FROM events WHERE id = ${actualEventId}
      `;

      return res.status(200).json({
        image: eventData.rows[0]?.image || null,
      });
    } else if (req.method === "PUT") {
      // Update event image URL
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
    } else if (req.method === "DELETE") {
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
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("❌ Event Image API Error:", error);
    return res.status(500).json({
      error: "Failed to process image request",
      message: (error as Error).message,
    });
  }
}

