
import { Worker, DelayedError } from "bullmq";
import { redis } from "../config/redis";
import { pool } from "../config/db";
import { transporter } from "../config/mailer";
import { indexEmail } from "../config/elasticsearch";

const HOURLY_EMAIL_LIMIT =
  Number(process.env.HOURLY_EMAIL_LIMIT) || 100;

console.log("Hourly email limit:", HOURLY_EMAIL_LIMIT);

// Keep Elasticsearch synchronized with the database.
async function syncEmailToSearch(emailId: string) {
  try {
    const result = await pool.query(
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
       WHERE e.id = $1`,
      [emailId]
    );

    if (result.rows.length > 0) {
      await indexEmail(result.rows[0]);
    }
  } catch (error) {
    console.error("Elasticsearch synchronization error:", error);
  }
}

// Send a Slack notification when the hourly limit is reached.
async function notifySlackHourlyLimit(
  senderId: string,
  senderEmail: string,
  nextHour: Date
) {
  const hourWindow = new Date(
    Math.floor(Date.now() / 3600000) * 3600000
  );

  const notificationKey =
    `slack-alert:${senderId}:${hourWindow.toISOString()}`;

  let notificationReserved = false;

  try {
    const integration = await pool.query(
      `SELECT webhook_url
       FROM slack_integrations
       WHERE sender_id = $1`,
      [senderId]
    );

    if (integration.rows.length === 0) {
      console.log("Slack not connected. Skipping notification.");
      return;
    }

    const ttl = Math.max(
      1,
      Math.ceil((nextHour.getTime() - Date.now()) / 1000)
    );

    const reserved = await redis.set(
      notificationKey,
      "pending",
      "EX",
      ttl,
      "NX"
    );

    if (reserved !== "OK") {
      return;
    }

    notificationReserved = true;

    const webhookUrl = integration.rows[0].webhook_url;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text:
          `⚠️ *ReachInbox hourly sending limit reached*\n` +
          `Sender: ${senderEmail}\n` +
          `Hourly limit: ${HOURLY_EMAIL_LIMIT} emails\n` +
          `Remaining emails have been postponed until ` +
          `${nextHour.toLocaleString()}.`,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Slack webhook returned HTTP ${response.status}`
      );
    }

    await redis.set(
      notificationKey,
      "sent",
      "EX",
      ttl
    );

    console.log(
      `Slack notification sent for ${senderEmail}.`
    );
  } catch (error) {
    if (notificationReserved) {
      await redis.del(notificationKey).catch((redisError) => {
        console.error(
          "Could not release Slack notification lock:",
          redisError
        );
      });
    }

    console.error("Slack notification failed:", error);
  }
}

const emailWorker = new Worker(
  "email-queue",
  async (job, token) => {
    const { emailId } = job.data;

    const result = await pool.query(
      `SELECT e.*, s.email AS sender_email
       FROM emails e
       JOIN senders s ON e.sender_id = s.id
       WHERE e.id = $1`,
      [emailId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Email ${emailId} was not found`);
    }

    const email = result.rows[0];

    if (email.status === "sent") {
      console.log(`Email ${emailId} was already sent. Skipping.`);
      return;
    }

    const now = new Date();

    const hourWindow = new Date(
      Math.floor(now.getTime() / 3600000) * 3600000
    );

    // Atomically reserve a sender's hourly sending slot.
    const reservation = await pool.query(
      `INSERT INTO sender_hourly_usage
         (sender_id, hour_window, sent_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (sender_id, hour_window)
       DO UPDATE SET
         sent_count = sender_hourly_usage.sent_count + 1
       WHERE sender_hourly_usage.sent_count < $3
       RETURNING sent_count`,
      [email.sender_id, hourWindow, HOURLY_EMAIL_LIMIT]
    );

    // Reschedule if the sender has reached the hourly limit.
    if (reservation.rows.length === 0) {
      const nextHour = new Date(
        hourWindow.getTime() + 3600000
      );

      await pool.query(
        `UPDATE emails
         SET scheduled_at = $2,
             updated_at = NOW()
         WHERE id = $1 AND status != 'sent'`,
        [emailId, nextHour]
      );

      await syncEmailToSearch(emailId);

      console.log(
        `Hourly limit reached for ${email.sender_email}. ` +
        `Email ${emailId} postponed until ${nextHour.toISOString()}`
      );

      await notifySlackHourlyLimit(
        email.sender_id,
        email.sender_email,
        nextHour
      );

      await job.moveToDelayed(nextHour.getTime(), token);
      throw new DelayedError();
    }

    let reservationHeld = true;
    let smtpAccepted = false;

    try {
      await pool.query(
        `UPDATE emails
         SET status = 'processing',
             updated_at = NOW()
         WHERE id = $1`,
        [emailId]
      );

      await syncEmailToSearch(emailId);

      const info = await transporter.sendMail({
        from: email.sender_email,
        to: email.recipient_email,
        subject: email.subject,
        text: email.body,
      });

      smtpAccepted = true;

      await pool.query(
        `UPDATE emails
         SET status = 'sent',
             sent_at = NOW(),
             updated_at = NOW(),
             failure_reason = NULL
         WHERE id = $1`,
        [emailId]
      );

      await syncEmailToSearch(emailId);

      console.log(`Email sent: ${email.recipient_email}`);
      console.log(`SMTP message ID: ${info.messageId}`);

      reservationHeld = false;
    } catch (error) {
      if (reservationHeld && !smtpAccepted) {
        await pool.query(
          `UPDATE sender_hourly_usage
           SET sent_count = GREATEST(sent_count - 1, 0)
           WHERE sender_id = $1 AND hour_window = $2`,
          [email.sender_id, hourWindow]
        );

        await pool.query(
          `UPDATE emails
           SET status = 'scheduled',
               failure_reason = $2,
               updated_at = NOW()
           WHERE id = $1 AND status != 'sent'`,
          [
            emailId,
            error instanceof Error
              ? error.message
              : "Email sending failed",
          ]
        );

        await syncEmailToSearch(emailId);
      }

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    limiter: {
      max: 1,
      duration: Number(process.env.MIN_SEND_INTERVAL_MS) || 1000,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully.`);
});

emailWorker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);

  if (job && job.attemptsMade >= Number(job.opts.attempts || 1)) {
    const emailId = job.data.emailId;

    await pool.query(
      `UPDATE emails
       SET status = 'failed',
           failure_reason = $2,
           updated_at = NOW()
       WHERE id = $1 AND status != 'sent'`,
      [emailId, error.message]
    );

    await syncEmailToSearch(emailId);
  }
});

console.log("Email worker is running.");

export default emailWorker;
