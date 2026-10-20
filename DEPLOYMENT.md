# Serverless Cloud Deployment Guide: Cubelelo Tracker

This guide details how to deploy the **Cubelelo Price Tracker & Telegram Notifier** to any serverless cloud platform with zero hassle.

---

## 🚀 Recommended Platforms

| Platform | Best For | Free Tier / Pricing | Type |
|---|---|---|---|
| **Google Cloud Run** | High reliability, 0-scale, Google ecosystem | 2 million requests/month free | Container Serverless |
| **Railway** | Quickest 1-click git deploy, continuous deployment | $5 free trial credits monthly | Container Serverless |
| **Render** | Free hobby tier with auto-deploy on git push | Free tier available | Managed Web Service |
| **Fly.io** | Low latency, global regions | Generous free allowance | MicroVM Serverless |

---

## 1. Deploying to Google Cloud Run (Fast & Scalable)

Google Cloud Run scales containers to zero when idle and instantly spins up upon incoming requests.

### Prerequisites
- [Google Cloud SDK (`gcloud`) installed](https://cloud.google.com/sdk/docs/install)
- A Google Cloud Project with billing enabled

### Deployment Commands

1. Authenticate and select your project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Deploy directly from source (Cloud Run automatically builds using the included `Dockerfile`):
   ```bash
   gcloud run deploy cubelelo-tracker \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,TELEGRAM_TOKEN="YOUR_BOT_TOKEN",TELEGRAM_CHAT_ID="YOUR_CHAT_ID"
   ```

3. Note down the returned service URL (e.g. `https://cubelelo-tracker-xyz.a.run.app`).

### Set up Cloud Scheduler (Keep Automated Checks Running)
Because Cloud Run scales to 0 instances when idle, use **Google Cloud Scheduler** to ping your tracker every 30 minutes for $0:

```bash
gcloud scheduler jobs create http cubelelo-price-check \
  --schedule="*/30 * * * *" \
  --uri="https://YOUR_CLOUD_RUN_URL/api/cron/check" \
  --http-method=POST \
  --time-zone="Asia/Kolkata"
```

---

## 2. Deploying to Railway

1. Install the Railway CLI or visit [railway.app](https://railway.app).
2. Create a new project and select **Deploy from GitHub repo** (or run `railway init` and `railway up`).
3. Under **Variables**, add:
   - `NODE_ENV`: `production`
   - `TELEGRAM_TOKEN`: `your_telegram_bot_token`
   - `TELEGRAM_CHAT_ID`: `your_telegram_chat_id`
   - `PORT`: Railway sets this automatically.
4. Railway builds the app with the included `Dockerfile` and gives you a live public URL!

---

## 3. Deploying to Render

1. Create a free account on [render.com](https://render.com).
2. Click **New +** -> **Blueprint** and connect your repository (Render will automatically detect `render.yaml`).
3. Alternatively, click **New Web Service**:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `TELEGRAM_TOKEN`: your Telegram token
   - `TELEGRAM_CHAT_ID`: your chat ID
   - `DATA_DIR`: `/tmp/cubelelo_data`
5. Click **Create Web Service**.

---

## 4. Deploying with Docker Anywhere

You can build and run the container on any VPS or container runtime:

```bash
# 1. Build the container image
docker build -t cubelelo-tracker .

# 2. Run the container
docker run -d \
  --name cubelelo-tracker \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e TELEGRAM_TOKEN="your_bot_token" \
  -e TELEGRAM_CHAT_ID="your_chat_id" \
  -v cubelelo_data:/app/data \
  cubelelo-tracker
```

---

## 5. Automated Price Checks in Serverless (Scale-to-Zero)

When deployed on serverless tiers that scale down to zero when idle, in-memory `setInterval` timers are paused. 

To ensure continuous price checking, use any of these free methods:

### Method A: GitHub Actions (100% Free & Included)
This repository includes `.github/workflows/cron.yml`.
1. Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add secret `APP_URL`: your deployed URL (e.g. `https://my-cube-tracker.run.app`).
3. (Optional) Add secret `CRON_SECRET` if you set `CRON_SECRET` on your server.
4. GitHub Actions will automatically ping `/api/cron/check` every 30 minutes!

### Method B: Free External Web Cron
1. Go to [cron-job.org](https://cron-job.org) or [easycron.com](https://www.easycron.com) (free).
2. Create a new cron job:
   - **URL**: `https://YOUR_APP_URL/api/cron/check`
   - **Method**: `POST`
   - **Schedule**: Every 15 or 30 minutes
   - If `CRON_SECRET` is used, add header: `Authorization: Bearer YOUR_SECRET`

---

## 📋 Environment Variables Reference

| Variable | Required? | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port for the HTTP server to listen on. Cloud providers set this automatically. |
| `NODE_ENV` | Recommended | `development` | Set to `production` in cloud environments to serve pre-built assets. |
| `TELEGRAM_TOKEN` | Required for alerts | Empty | Telegram Bot API token from `@BotFather`. |
| `TELEGRAM_CHAT_ID` | Required for alerts | Empty | Chat or user ID to receive notifications. |
| `CRON_SECRET` | Optional | Empty | When set, requests to `/api/cron/check` require `Authorization: Bearer <token>` or `?secret=<token>`. |
| `DATA_DIR` | Optional | `./data` (or `/tmp`) | Directory path where product data and alert history JSON are saved. |
| `APP_URL` | Optional | Empty | Public domain/URL of your deployed instance. |

---

## 🩺 Health & Diagnostic Endpoints

- **`/api/health`** or **`/healthz`**: Returns `200 OK` with JSON uptime, port, and service status for container health probes.
- **`/api/status`**: Returns overall tracking metrics, configured bot username, and alerts count.
- **`/api/deployment-info`**: Returns current runtime metadata (node version, environment, memory, port).
- **`/api/cron/check`**: POST endpoint that triggers price check across all tracked cubes and dispatches Telegram notifications for any cubes below target.
