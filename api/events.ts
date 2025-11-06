import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get all events (no limit) - frontend will filter by date
    const { rows } = await sql`SELECT * FROM events ORDER BY date;`;
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ DB Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
