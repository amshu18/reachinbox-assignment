
import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/db";
import { redis } from "./config/redis";
import { emailQueue } from "./config/queue";

import emailRoutes from "./routes/emailRoutes";
import senderRoutes from "./routes/senderRoutes";
import searchRoutes from "./routes/searchRoutes";
import authRoutes from "./routes/authRoutes";
import slackRoutes from "./routes/slackRoutes";

import "./workers/emailWorker";

import { ensureEmailIndex, indexEmail } from "./config/elasticsearch";

// Bull Board imports
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json());

// API routes
app.use("/api/emails", emailRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/slack", slackRoutes);

// Google authentication
app.use("/auth", authRoutes);

// Bull Board dashboard
app.use("/admin/queues", serverAdapter.getRouter());

app.get("/", (req, res) => {
  res.json({
    message: "ReachInbox API is running!",
    status: "success",
  });
});

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    const redisStatus = await redis.ping();

    res.json({
      status: "success",
      database: "connected",
      redis: redisStatus === "PONG" ? "connected" : "not connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      status: "error",
      message: "A service connection failed",
    });
  }
});

// Restore scheduled emails missing from BullMQ.
async function recoverScheduledEmails() {
  const result = await pool.query(
    `SELECT id, scheduled_at
     FROM emails
     WHERE status = 'scheduled'
     ORDER BY scheduled_at ASC`
  );

  let recoveredCount = 0;

  for (const email of result.rows) {
    const existingJob = await emailQueue.getJob(email.id);

    if (!existingJob) {
      const delay = Math.max(
        0,
        new Date(email.scheduled_at).getTime() - Date.now()
      );

      await emailQueue.add(
        "send-email",
        { emailId: email.id },
        {
          jobId: email.id,
          delay,
        }
      );

      recoveredCount++;
      console.log(`Recovered scheduled email: ${email.id}`);
    }
  }

  console.log(
    `Email recovery completed. ${recoveredCount} job(s) restored.`
  );
}

// Initialize Elasticsearch
async function initializeEmailSearch() {
  await ensureEmailIndex();

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
     LEFT JOIN senders s ON e.sender_id = s.id`
  );

  for (const email of result.rows) {
    await indexEmail(email);
  }

  console.log(
    `Elasticsearch initialized. ${result.rows.length} email(s) indexed.`
  );
}

// Start application
async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully!");

    await redis.ping();
    console.log("Redis connected successfully!");

    await initializeEmailSearch();

    await recoverScheduledEmails();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(
        `Bull Board available at http://localhost:${PORT}/admin/queues`
      );
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

startServer();
