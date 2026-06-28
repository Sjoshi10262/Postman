# Deployment Guide — Postman Clone

This guide describes how to run and deploy the API Client Platform (Postman Clone) locally using Docker Compose, or deploy it to production platforms.

---

## 1. Local Deployment (Docker Compose)

The easiest way to run the entire service locally with a single command is via Docker Compose.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Steps
1. Navigate to the project root directory:
   ```bash
   cd postman-clone
   ```
2. Build and start the containers:
   ```bash
   docker compose up --build
   ```
3. Once running:
   - **Frontend App**: Access at `http://localhost:3000`
   - **Backend API**: Access at `http://localhost:8000`
   - **API Documentation**: Access at `http://localhost:8000/docs`

### Persisting Database
The database is backed by SQLite (`postman.db`). The compose file uses a Docker volume named `backend-data` mapped to `/app` to ensure your collections, environments, and history are preserved when containers restart.

To force-seed the database back to default sample data, you can start the containers with the `SEED_DB` variable set to `true`:
```bash
SEED_DB=true docker compose up
```

---

## 2. Cloud Production Deployment

### Backend (Render, Railway, or Fly.io)
You can deploy the FastAPI application using the provided `Dockerfile`.

1. **Source Code**: Link your GitHub repository to your cloud provider (e.g., Render or Railway).
2. **Root Directory**: Select `postman-clone/backend` (or the root if deployed from a subdirectory).
3. **Environment Variables**:
   - `PORT`: `8000` (automatically managed by some platforms).
   - `ALLOWED_ORIGINS`: Set to your deployed frontend URL (e.g. `https://your-frontend.vercel.app`).
   - `DATABASE_URL`: (Optional) Use Postgres database URL if you wish to run a persistent managed database instead of SQLite. E.g., `postgresql://user:pass@host:port/dbname`.
   - `SEED_DB`: `false` (set to `true` on first launch if you want to initialize it with sample collections).

### Frontend (Vercel)
Vercel is optimized for Next.js, and deploying the frontend folder takes only a few clicks:

1. **Sign in to Vercel**: Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. **Import Project**: Click **Add New** > **Project**, select the Git repository containing this code, and click **Import**.
3. **Configure Project Settings**:
   - **Framework Preset**: Next.js (detected automatically).
   - **Root Directory**: Click *Edit* and select `postman-clone/frontend` (since the frontend code is in that folder).
4. **Environment Variables**: Expand the environment variables section and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: The URL of your deployed backend service (e.g., `https://postman-clone-backend.onrender.com`).
5. **Deploy**: Click the **Deploy** button. Vercel will build and host your Next.js frontend!

