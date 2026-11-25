
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { redis } from "../config/redis";
import { pool } from "../config/db";

const router = Router();

const CLIENT_ID = process.env.SLACK_CLIENT_ID;
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const STATE_PREFIX = "slack-oauth-state:";

// Start Slack OAuth.
router.get("/connect", async (req: Request, res: Response) => {
  try {
    if (!CLIENT_ID || !REDIRECT_URI) {
      return res.status(500).json({
        error: "Slack OAuth environment variables are missing.",
      });
    }

    const senderId = String(req.query.senderId || "");

    if (!senderId) {
      return res.status(400).json({
        error: "senderId is required.",
      });
    }

    const sender = await pool.query(
      "SELECT id FROM senders WHERE id = $1",
      [senderId]
    );

    if (sender.rows.length === 0) {
      return res.status(404).json({
        error: "Sender not found.",
      });
    }

    const state = randomBytes(32).toString("hex");

    await redis.set(
      `${STATE_PREFIX}${state}`,
      senderId,
      "EX",
      600
    );

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: "chat:write,channels:read,incoming-webhook",
      redirect_uri: REDIRECT_URI,
      state,
    });

    return res.redirect(
      `https://slack.com/oauth/v2/authorize?${params.toString()}`
    );
  } catch (error) {
    console.error("Slack connect error:", error);
    return res.status(500).json({
      error: "Could not start Slack authorization.",
    });
  }
});

// Slack sends the user back here after authorization.
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const slackError = String(req.query.error || "");

    if (slackError) {
      return res.redirect(
        `${FRONTEND_URL}/?slack=error&reason=${encodeURIComponent(slackError)}`
      );
    }

    if (!code || !state) {
      return res.status(400).send("Missing Slack authorization code or state.");
    }

    const stateKey = `${STATE_PREFIX}${state}`;
    const senderId = await redis.get(stateKey);

    if (!senderId) {
      return res.status(400).send(
        "Slack authorization expired or the state is invalid. Please try again."
      );
    }

    await redis.del(stateKey);

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      throw new Error("Slack OAuth environment variables are missing.");
    }

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    const slackResponse = await fetch(
      "https://slack.com/api/oauth.v2.access",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await slackResponse.json();

    if (!data.ok) {
      console.error("Slack OAuth exchange failed:", data.error);
      throw new Error(data.error || "Slack OAuth exchange failed.");
    }

    const webhookUrl = data.incoming_webhook?.url;
    const channelId = data.incoming_webhook?.channel_id || null;
    const teamId = data.team?.id || null;
    const teamName = data.team?.name || null;

    if (!webhookUrl) {
      throw new Error(
        "Slack did not return an incoming webhook. Check the incoming-webhook scope and authorize the app again."
      );
    }

    await pool.query(
      `INSERT INTO slack_integrations
         (sender_id, team_id, team_name, webhook_url, channel_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sender_id)
       DO UPDATE SET
         team_id = EXCLUDED.team_id,
         team_name = EXCLUDED.team_name,
         webhook_url = EXCLUDED.webhook_url,
         channel_id = EXCLUDED.channel_id,
         updated_at = NOW()`,
      [senderId, teamId, teamName, webhookUrl, channelId]
    );

    console.log(`Slack connected for sender ${senderId}`);

    return res.redirect(`${FRONTEND_URL}/?slack=connected`);
  } catch (error) {
    console.error("Slack OAuth callback error:", error);

    return res.redirect(
      `${FRONTEND_URL}/?slack=error&reason=connection_failed`
    );
  }
});

// Check whether Slack is connected for a sender.
router.get("/status", async (req: Request, res: Response) => {
  try {
    const senderId = String(req.query.senderId || "");

    if (!senderId) {
      return res.status(400).json({
        error: "senderId is required.",
      });
    }

    const result = await pool.query(
      `SELECT team_name, channel_id, created_at
       FROM slack_integrations
       WHERE sender_id = $1`,
      [senderId]
    );

    return res.json({
      connected: result.rows.length > 0,
      integration: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Slack status error:", error);
    return res.status(500).json({
      error: "Could not check Slack connection.",
    });
  }
});

// Disconnect Slack for a sender.
router.delete("/disconnect", async (req: Request, res: Response) => {
  try {
    const senderId = String(req.query.senderId || "");

    if (!senderId) {
      return res.status(400).json({
        error: "senderId is required.",
      });
    }

    await pool.query(
      "DELETE FROM slack_integrations WHERE sender_id = $1",
      [senderId]
    );

    return res.json({
      connected: false,
      message: "Slack disconnected.",
    });
  } catch (error) {
    console.error("Slack disconnect error:", error);
    return res.status(500).json({
      error: "Could not disconnect Slack.",
    });
  }
});

export default router;
