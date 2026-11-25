
import { Router } from "express";
import { pool } from "../config/db";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { email, displayName } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid sender email.",
      });
    }

    const result = await pool.query(
      `INSERT INTO senders (email, display_name)
       VALUES ($1, $2)
       RETURNING id, email, display_name`,
      [email.trim().toLowerCase(), displayName || "ReachInbox Sender"]
    );

    return res.status(201).json({
      success: true,
      message: "Sender created successfully.",
      sender: result.rows[0],
    });
  } catch (error) {
    console.error("Sender creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create sender.",
    });
  }
});

export default router;
