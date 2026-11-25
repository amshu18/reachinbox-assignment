
import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../config/db";
import { emailQueue } from "../config/queue";
import { indexEmail } from "../config/elasticsearch";

const router = Router();

router.post("/schedule", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      recipients,
      subject,
      body,
      startTime,
      delayBetweenEmails = 0,
      senderId,
    } = req.body;

    if (
      !Array.isArray(recipients) ||
      recipients.length === 0 ||
      !subject ||
      !body ||
      !startTime ||
      !senderId
    ) {
      return res.status(400).json({
        success: false,
        message: "Recipients, subject, body, startTime and senderId are required.",
      });
    }

    const scheduledStart = new Date(startTime);

    if (
      Number.isNaN(scheduledStart.getTime()) ||
      scheduledStart.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid future start time.",
      });
    }

    if (
      !Number.isInteger(delayBetweenEmails) ||
      delayBetweenEmails < 0 ||
      delayBetweenEmails > 3600000
    ) {
      return res.status(400).json({
        success: false,
        message: "Delay must be between 0 and 3600000 milliseconds.",
      });
    }

    const senderResult = await client.query(
      "SELECT id FROM senders WHERE id = $1",
      [senderId]
    );

    if (senderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sender not found.",
      });
    }

    const validRecipients = recipients
      .filter(
        (email: unknown) =>
          typeof email === "string" &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      )
      .map((email: string) => email.trim().toLowerCase());

    const uniqueRecipients = [...new Set(validRecipients)];

    if (uniqueRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid recipient email addresses were provided.",
      });
    }

    await client.query("BEGIN");

    const scheduledEmails = [];

    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      const idempotencyKey = randomUUID();

      const scheduledAt = new Date(
        scheduledStart.getTime() + i * delayBetweenEmails
      );

      const result = await client.query(
        `INSERT INTO emails
          (sender_id, recipient_email, subject, body, scheduled_at, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, recipient_email, scheduled_at, status`,
        [senderId, recipient, subject, body, scheduledAt, idempotencyKey]
      );

      scheduledEmails.push({
        ...result.rows[0],
        idempotencyKey,
      });
    }

    await client.query("COMMIT");

    try {
      for (const email of scheduledEmails) {
        await emailQueue.add(
          "send-email",
          {
            emailId: email.id,
          },
          {
            jobId: email.id,
            delay: Math.max(
              0,
              new Date(email.scheduled_at).getTime() - Date.now()
            ),
          }
        );
      }
    } catch (queueError) {
      console.error("Queue scheduling error:", queueError);

      await pool.query(
        `UPDATE emails
         SET status = 'failed',
             failure_reason = 'Queue scheduling failed',
             updated_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [scheduledEmails.map((email) => email.id)]
      );

      return res.status(500).json({
        success: false,
        message: "Emails were saved but could not be added to the queue.",
      });
    }

    // Index scheduled emails in Elasticsearch.
    try {
      const indexResult = await pool.query(
        `SELECT
           e.id,
           e.recipient_email,
           e.subject,
           e.body,
           e.status,
           e.scheduled_at,
           e.sent_at,
           s.email AS sender_email
         FROM emails e
         LEFT JOIN senders s ON e.sender_id = s.id
         WHERE e.id = ANY($1::uuid[])`,
        [scheduledEmails.map((email) => email.id)]
      );

      for (const email of indexResult.rows) {
        await indexEmail(email);
      }

      console.log(`${indexResult.rows.length} email(s) indexed in Elasticsearch.`);
    } catch (indexError) {
      console.error("Elasticsearch indexing error:", indexError);
    }

    return res.status(201).json({
      success: true,
      message: `${scheduledEmails.length} emails scheduled successfully.`,
      emails: scheduledEmails,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Email scheduling error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule emails.",
    });
  } finally {
    client.release();
  }
});

// Get scheduled or sent emails for the dashboard.
router.get("/", async (req, res) => {
  try {
    const status = String(req.query.status || "scheduled");

    if (!["scheduled", "sent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be scheduled or sent.",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
         e.id,
         e.recipient_email,
         e.subject,
         e.body,
         e.scheduled_at,
         e.sent_at,
         e.status,
         e.failure_reason,
         s.email AS sender_email
       FROM emails e
       LEFT JOIN senders s ON e.sender_id = s.id
       WHERE e.status = $1
       ORDER BY e.scheduled_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM emails WHERE status = $1`,
      [status]
    );

    return res.json({
      success: true,
      status,
      total: Number(countResult.rows[0].count),
      page,
      limit,
      emails: result.rows,
    });
  } catch (error) {
    console.error("Email listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve emails.",
    });
  }
});

export default router;
