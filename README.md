# ReachInbox – Email Outreach Management System

ReachInbox is a full-stack email outreach application designed to help users compose, schedule, manage, and search email campaigns from a single dashboard.

## Features

- **Google Authentication:** Sign in using Google OAuth.
- **Email Composition:** Compose emails with recipients, subject, and message body.
- **Multiple Recipients:** Add multiple email addresses or import recipients from CSV/TXT files.
- **Email Scheduling:** Schedule emails for a future date and time.
- **Background Processing:** BullMQ and Redis manage asynchronous email delivery.
- **Rate Limiting:** Controls email delivery frequency and delays queued jobs when the hourly limit is reached.
- **Email Dashboard:** View scheduled and sent emails.
- **Email Search:** Search email records using Elasticsearch.
- **Slack Integration:** Includes Slack OAuth and notification integration for hourly sending limits.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Queue | Redis, BullMQ |
| Search | Elasticsearch |
| Authentication | Google OAuth |
| Email | Nodemailer, Ethereal SMTP |
| Notifications | Slack Incoming Webhooks |
| Development | Docker Compose |

## Architecture

1. The React frontend communicates with the Express backend through REST APIs.
2. Google OAuth handles user authentication.
3. Email details and scheduling information are stored in PostgreSQL.
4. BullMQ adds email jobs to a Redis-backed queue.
5. A background worker processes jobs and sends emails through the configured SMTP service.
6. Rate limiting controls email delivery and delays jobs when necessary.
7. Elasticsearch indexes email records to support search.
8. Slack integration can notify users when the hourly sending limit is reached.

## Project Structure

```text
reachinbox-assignment/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── routes/
│   │   ├── workers/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js and npm
- Docker Desktop
- Google OAuth credentials
- SMTP credentials
- Slack app credentials (for Slack integration)

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/amshu18/reachinbox-assignment.git
cd reachinbox-assignment
```

### 2. Start supporting services

```bash
docker compose up -d
```

This starts the services configured in Docker Compose. Ensure PostgreSQL, Redis and Elasticsearch are available.

### 3. Configure the backend

Create `backend/.env` with the required database, Redis, Elasticsearch, SMTP, Google OAuth and Slack configuration.

Do not commit real credentials or API keys.

### 4. Install backend dependencies

```bash
cd backend
npm install
```

Start the backend:

```bash
npm run dev
```

### 5. Configure the frontend

Create `frontend/.env` and configure the Google OAuth client ID and any frontend environment variables required by the application.

### 6. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## Testing

The application was tested locally for:

- Google sign-in and sign-out.
- Email composition and recipient validation.
- Multiple email recipients.
- Scheduling emails for future delivery.
- Viewing scheduled and sent emails.
- Searching email records.
- Background job processing.
- Hourly rate limiting and delayed job handling.
- Persistence of email records after backend restart.

**Note:** Email delivery currently uses Ethereal SMTP for testing. Ethereal is a test email service; messages should be inspected through its preview rather than assumed to arrive in a real recipient inbox.

## Author

**Amshu Spoorthi**

GitHub: https://github.com/amshu18  
Repository: https://github.com/amshu18/reachinbox-assignment
