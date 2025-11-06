import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Extract numeric ID from event_id (event_id might be like "abc123", we need to match by id or event_id)
    const numericId = parseInt(id);
    
    let result;
    if (!isNaN(numericId)) {
      // Try to find by numeric id first
      result = await sql`
        SELECT * FROM events WHERE id = ${numericId} OR event_id = ${id} LIMIT 1;
      `;
    } else {
      // Try to find by event_id string
      result = await sql`
        SELECT * FROM events WHERE event_id = ${id} LIMIT 1;
      `;
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("❌ DB Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}

