import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import "dotenv/config";
import crypto from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password
    const passwordHash = crypto
      .createHash("sha256")
      .update(password + (process.env.PASSWORD_SALT || "default_salt"))
      .digest("hex");

    // Create user
    const { rows } = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name})
      RETURNING id, email, name
    `;

    const user = rows[0];

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${user.id}, ${sessionToken}, ${expiresAt.toISOString()})
    `;

    res.status(201).json({
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("❌ Signup error:", error);
    console.error("❌ Error message:", error?.message);
    console.error("❌ Error code:", error?.code);
    console.error("❌ Error stack:", error?.stack);
    res.status(500).json({ 
      error: "Internal server error",
      message: error?.message || "Unknown error"
    });
  }
}

