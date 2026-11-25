
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../config/db";

const router = Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required.",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google account.",
      });
    }

    if (!payload.email_verified) {
      return res.status(401).json({
        success: false,
        message: "Please use a verified Google email.",
      });
    }

    const result = await pool.query(
      `INSERT INTO users (google_id, name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET
         google_id = EXCLUDED.google_id,
         name = EXCLUDED.name,
         avatar_url = EXCLUDED.avatar_url
       RETURNING id, name, email, avatar_url`,
      [
        payload.sub,
        payload.name || "",
        payload.email,
        payload.picture || "",
      ]
    );

    return res.json({
      success: true,
      message: "Google login successful.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Google authentication failed.",
    });
  }
});

export default router;
