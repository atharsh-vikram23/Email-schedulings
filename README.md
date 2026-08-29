# ReachInbox Email Scheduler

A complete, production-quality full-stack email scheduling application.

## Overview
This project is a mini version of ReachInbox's email scheduling infrastructure. It allows authenticated users to schedule bulk email campaigns, which are dispatched asynchronously using BullMQ, rate-limited via Redis, and sent via Ethereal SMTP. Elasticsearch indexes all emails for lightning-fast searching. Users are notified in real-time via Slack when they hit their hourly rate limits.

## Architecture

![Architecture](https://via.placeholder.com/800x400?text=Architecture+Diagram)
*(For a formal architecture, refer to the requirements).*

- **API Layer**: Express + Node.js + TypeScript
- **Database**: MySQL (Prisma ORM)
- **Queues/Workers**: BullMQ + Redis
- **Search**: Elasticsearch
- **Email**: Nodemailer (Ethereal SMTP)
- **Frontend**: React + Vite + Tailwind CSS

### Scheduling Architecture
When a campaign is scheduled, the backend calculates the start time and the exact delay for each individual recipient based on the start time and the specified delay interval. These are persisted to MySQL inside a database transaction to guarantee consistency. After the commit, delayed jobs are pushed into BullMQ in bulk. The `scheduledAt - Date.now()` defines the BullMQ delay.

### Restart Persistence
Because BullMQ stores delayed jobs durably in Redis, and the source of truth is MySQL, a restart of the Node.js backend or worker will not lose jobs. BullMQ inherently persists the delayed sorted sets. When the worker comes back online, it naturally processes the delayed jobs when their execution time is reached.

### Idempotency
Each scheduled email is assigned an `idempotency_key` (e.g., `campaignId-recipient-index`) which has a `UNIQUE` constraint in MySQL. Furthermore, before a worker attempts to send an email, it atomically transitions the email's state from `scheduled` to `processing` via `prisma.scheduledEmail.updateMany`. If the row was already processed, the worker ignores the job. This guarantees exactly-once delivery.

### Hourly Rate Limiting
A Redis-based atomic distributed rate limiter `INCR email-rate:senderId:YYYY-MM-DD-HH` ensures the hourly limit is strictly enforced across multiple workers. If the 201st email arrives on a limit of 200, the worker does NOT fail the job. Instead, it re-queues the job into BullMQ as a new delayed job for the next hour window and triggers a Slack notification.

### Minimum Delay
The worker implements a minimum email delay (e.g., 2000ms) by using a Redis key `last-send:senderId`. If a job is popped from the queue faster than the minimum delay, it reschedules itself into BullMQ with the remaining delay needed.

## Setup Instructions

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Google Cloud Console Project (For OAuth)
- Slack App (For OAuth)

### 1. Environment Variables
Copy `.env.example` to `.env` in both `backend` and `frontend` directories.

**Backend (.env)**
```env
DATABASE_URL=mysql://root:password@localhost:3306/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_URL=http://localhost:9200
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:4000/api/slack/callback
ETHEREAL_HOST=smtp.ethereal.email
# ...
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:4000/api
```

### 2. Start Infrastructure
Run the following at the root to spin up MySQL, Redis, and Elasticsearch:
```bash
docker compose up -d
```

### 3. Backend Setup
```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

### 4. Worker Setup
The worker processes BullMQ jobs. You can run it concurrently:
```bash
cd backend
npm run worker
```

### 5. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## External Integrations

### Google OAuth Setup
1. Go to Google Cloud Console.
2. Create Credentials > OAuth client ID.
3. Add `http://localhost:4000/api/auth/google/callback` to Authorized redirect URIs.

### Slack OAuth Setup
1. Go to [api.slack.com/apps](https://api.slack.com/apps).
2. Create App.
3. Under "OAuth & Permissions", add Redirect URL `http://localhost:4000/api/slack/callback`.
4. Add User Token Scopes: `chat:write`, `chat:write.public`.
5. Install to workspace.

### BullMQ Dashboard
Access the live queue visualization at:
`http://localhost:4000/admin/queues`

## Demo Validation Flow
1. **Google Login**: Visit frontend, login with Google.
2. **Connect Slack**: Click "Connect Slack" in the dashboard header.
3. **Compose**: Open modal, create/select sender.
4. **Upload Leads**: Upload CSV containing multiple emails.
5. **Schedule**: Set start time, delay, hourly limit, schedule it.
6. **Dashboard**: See emails populate in Scheduled tab.
7. **BullMQ**: Open the dashboard to see delayed jobs.
8. **Rate Limiting**: If emails exceed hourly limit, observe Slack notification and jobs shifting to the next hour.
9. **Search**: Use the top search bar to query Elasticsearch for recipients/subjects.
