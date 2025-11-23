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
      // Get user's profile (one profile per user)
      const { rows } = await sql`
        SELECT profile_id as id, name, region, genres, created_at as "createdAt"
        FROM user_profiles
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (rows.length === 0) {
        // No profile exists, return empty array (frontend will create one)
        return res.status(200).json([]);
      }

      const row = rows[0];
      // Parse genres from JSON string or array
      let parsedGenres = [];
      try {
        if (typeof row.genres === 'string') {
          parsedGenres = JSON.parse(row.genres);
        } else if (Array.isArray(row.genres)) {
          parsedGenres = row.genres;
        }
      } catch (e) {
        parsedGenres = [];
      }
      
      res.status(200).json([{
        id: row.id,
        name: row.name,
        region: row.region,
        genres: parsedGenres,
        createdAt: row.createdAt,
      }]);
    } else if (req.method === "POST") {
      // Create or update user's profile (one profile per user)
      const { name, region, genres } = req.body;

      if (!name || !region) {
        return res.status(400).json({ error: "Name and region are required" });
      }

      // Check if profile already exists
      const { rows: existingRows } = await sql`
        SELECT profile_id FROM user_profiles WHERE user_id = ${user.id} LIMIT 1
      `;

      const genresArray = Array.isArray(genres) ? genres : (genres ? [genres] : []);
      const genresJson = JSON.stringify(genresArray);

      if (existingRows.length > 0) {
        // Update existing profile
        const existingProfileId = existingRows[0].profile_id;
        await sql`
          UPDATE user_profiles
          SET name = ${name}, region = ${region}, genres = ${genresJson}, updated_at = NOW()
          WHERE user_id = ${user.id} AND profile_id = ${existingProfileId}
        `;

        res.status(200).json({
          id: existingProfileId,
          name,
          region,
          genres: genresArray,
          createdAt: new Date().toISOString(),
        });
      } else {
        // Create new profile
        const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await sql`
          INSERT INTO user_profiles (user_id, profile_id, name, region, genres)
          VALUES (${user.id}, ${profileId}, ${name}, ${region}, ${genresJson})
        `;

        res.status(201).json({
          id: profileId,
          name,
          region,
          genres: genresArray,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (req.method === "PUT") {
      // Update profile
      const { profileId, name, region, genres } = req.body;

      if (!profileId) {
        return res.status(400).json({ error: "Profile ID is required" });
      }

      // Build update query dynamically
      if (name !== undefined && region !== undefined && genres !== undefined) {
        const genresArray = Array.isArray(genres) ? genres : (genres ? [genres] : []);
        const genresJson = JSON.stringify(genresArray);
        await sql`
          UPDATE user_profiles
          SET name = ${name}, region = ${region}, genres = ${genresJson}, updated_at = NOW()
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
        const genresArray = Array.isArray(genres) ? genres : (genres ? [genres] : []);
        const genresJson = JSON.stringify(genresArray);
        await sql`
          UPDATE user_profiles
          SET genres = ${genresJson}, updated_at = NOW()
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

