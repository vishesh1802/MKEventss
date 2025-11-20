import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get all events (no limit) - frontend will filter by date
    const { rows } = await sql`SELECT * FROM events ORDER BY date;`;
    res.status(200).json(rows);
  } catch (error: any) {
    console.error("❌ Events API Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:", error?.stack);
    
    // If table doesn't exist, return empty array instead of error
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.log('⚠️ Events table does not exist, returning empty array');
      return res.status(200).json([]);
    }
    
    res.status(500).json({ 
      error: error?.message || "Internal server error",
      code: error?.code,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
