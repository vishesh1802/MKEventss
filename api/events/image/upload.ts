import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

/**
 * API endpoint for uploading event images
 * 
 * This endpoint accepts image URLs and stores them.
 * For actual file uploads, you would need to integrate with:
 * - Cloudinary (recommended)
 * - AWS S3
 * - Vercel Blob Storage
 * - Imgur API
 * 
 * POST /api/events/image/upload
 * Body: { event_id: number, image_url: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_id, image_url } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: "event_id is required" });
    }

    if (!image_url || typeof image_url !== "string") {
      return res.status(400).json({ error: "image_url is required and must be a string" });
    }

    // Validate URL format
    try {
      new URL(image_url);
    } catch {
      return res.status(400).json({ error: "Invalid image URL format" });
    }

    // Find event by id or event_id
    const numericId = parseInt(String(event_id));
    let eventResult;
    
    if (!isNaN(numericId)) {
      eventResult = await sql`
        SELECT id FROM events 
        WHERE id = ${numericId} OR event_id = ${String(event_id)} 
        LIMIT 1
      `;
    } else {
      eventResult = await sql`
        SELECT id FROM events 
        WHERE event_id = ${String(event_id)} 
        LIMIT 1
      `;
    }

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const actualEventId = eventResult.rows[0].id;

    // Update event with image URL
    await sql`
      UPDATE events 
      SET image = ${image_url}
      WHERE id = ${actualEventId}
    `;

    return res.status(200).json({
      success: true,
      message: "Event image uploaded successfully",
      event_id: actualEventId,
      image: image_url,
    });
  } catch (error) {
    console.error("❌ Image Upload API Error:", error);
    return res.status(500).json({
      error: "Failed to upload image",
      message: (error as Error).message,
    });
  }
}

