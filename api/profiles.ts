import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";

// Helper to get user from session token
async function getUserFromToken(token: string) {
  const { rows } = await sql`
    SELECT u.id, u.email, u.name
    FROM users u
    INNER JOIN user_sessions s ON u.id = s.user_id
    WHERE s.session_token = ${token}
      AND s.expires_at > NOW()
  `;
  return rows.length > 0 ? rows[0] : null;
}

// GET /api/profiles - Get all profiles for authenticated user
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  try {
    if (req.method === "GET") {
      // Get all profiles for user
      const { rows } = await sql`
        SELECT profile_id as id, name, region, genres, created_at as "createdAt"
        FROM user_profiles
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;

      res.status(200).json(rows.map(row => ({
        id: row.id,
        name: row.name,
        region: row.region,
        genres: row.genres || [],
        createdAt: row.createdAt,
      })));
    } else if (req.method === "POST") {
      // Create new profile
      const { name, region, genres } = req.body;

      if (!name || !region) {
        return res.status(400).json({ error: "Name and region are required" });
      }

      const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await sql`
        INSERT INTO user_profiles (user_id, profile_id, name, region, genres)
        VALUES (${user.id}, ${profileId}, ${name}, ${region}, ${sql.array(genres || [])})
      `;

      res.status(201).json({
        id: profileId,
        name,
        region,
        genres: genres || [],
        createdAt: new Date().toISOString(),
      });
    } else if (req.method === "PUT") {
      // Update profile
      const { profileId, name, region, genres } = req.body;

      if (!profileId) {
        return res.status(400).json({ error: "Profile ID is required" });
      }

      // Build update query dynamically
      if (name !== undefined && region !== undefined && genres !== undefined) {
        await sql`
          UPDATE user_profiles
          SET name = ${name}, region = ${region}, genres = ${sql.array(genres)}, updated_at = NOW()
          WHERE user_id = ${user.id} AND profile_id = ${profileId}
        `;
      } else if (name !== undefined) {
        await sql`
          UPDATE user_profiles
          SET name = ${name}, updated_at = NOW()
          WHERE user_id = ${user.id} AND profile_id = ${profileId}
        `;
      } else if (region !== undefined) {
        await sql`
          UPDATE user_profiles
          SET region = ${region}, updated_at = NOW()
          WHERE user_id = ${user.id} AND profile_id = ${profileId}
        `;
      } else if (genres !== undefined) {
        await sql`
          UPDATE user_profiles
          SET genres = ${sql.array(genres)}, updated_at = NOW()
          WHERE user_id = ${user.id} AND profile_id = ${profileId}
        `;
      } else {
        return res.status(400).json({ error: "No updates provided" });
      }

      res.status(200).json({ message: "Profile updated successfully" });
    } else if (req.method === "DELETE") {
      // Delete profile
      const { profileId } = req.query;

      if (!profileId || typeof profileId !== "string") {
        return res.status(400).json({ error: "Profile ID is required" });
      }

      await sql`
        DELETE FROM user_profiles
        WHERE user_id = ${user.id} AND profile_id = ${profileId}
      `;

      res.status(200).json({ message: "Profile deleted successfully" });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Profiles API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

