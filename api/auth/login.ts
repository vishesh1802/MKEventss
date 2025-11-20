import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const { rows } = await sql`
      SELECT id, email, password_hash, name
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
    `;

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];

    // Simple password verification (in production, use bcrypt)
    // For now, we'll do a simple hash comparison
    // Note: This is a simplified version - use proper password hashing in production
    const passwordHash = crypto
      .createHash("sha256")
      .update(password + (process.env.PASSWORD_SALT || "default_salt"))
      .digest("hex");

    if (user.password_hash !== passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${user.id}, ${sessionToken}, ${expiresAt.toISOString()})
    `;

    res.status(200).json({
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

