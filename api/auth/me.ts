import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);

    // Find session and user
    const { rows } = await sql`
      SELECT u.id, u.email, u.name
      FROM users u
      INNER JOIN user_sessions s ON u.id = s.user_id
      WHERE s.session_token = ${token}
        AND s.expires_at > NOW()
    `;

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    res.status(200).json(rows[0]);
  } catch (error: any) {
    console.error("Me endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

