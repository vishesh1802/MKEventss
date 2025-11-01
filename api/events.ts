import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { rows } = await sql`SELECT NOW() AS time;`;
    res.status(200).json({ message: "✅ Connected to DB!", time: rows[0].time });
  } catch (error) {
    console.error("❌ DB Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
}
