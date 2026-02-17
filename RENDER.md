# 🚀 Deploy to Render (Production)

## Why Render?

✅ **Long-running processes** — render jobs take 5+ min (Netlify/Vercel timeout at 10s)  
✅ **Persistent disk** — SQLite needs filesystem storage  
✅ **Docker support** — runs Python, ffmpeg, Whisper natively  
✅ **Auto-deploy** — push to GitHub → auto-rebuild  
✅ **$7/month** — Starter plan with always-on service

---

## Prerequisites

- [ ] GitHub account
- [ ] Render account (free signup at [render.com](https://render.com))
- [ ] Your API keys ready:
  - Groq API key (`gsk_...`) — [Free at console.groq.com](https://console.groq.com)
  - (Optional) YouTube OAuth credentials
  - (Optional) Instagram Graph API token
  - (Optional) Pexels/Pixabay API keys

---

## Step 1: Push to GitHub

```bash
cd C:\dev\YouInst-Automator

# Initialize git (if not already done)
git init
git add -A
git commit -m "production deploy"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YouInst-Automator.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Render

### Option A: One-Click Blueprint (Easiest)

1. Go to [render.com](https://render.com) → **Dashboard**
2. Click **New** → **Blueprint**
3. Select **Connect a repository** → authorize GitHub
4. Choose `YouInst-Automator` repo
5. Render detects `render.yaml` automatically ✨
6. Fill in required environment variables:
   - `GROQ_API_KEY`: `gsk_your_key_here`
   - `NEXTAUTH_URL`: `https://youinst-ai.onrender.com` (update with YOUR service name)
   - YouTube/Instagram/Pexels keys (optional)
7. Click **Apply** → Deploy starts (~5 min build)

### Option B: Manual Setup

1. **New** → **Web Service**
2. Connect GitHub repo
3. Configure:
   - **Name**: `youinst-ai` (or your choice)
   - **Region**: Oregon (or nearest)
   - **Branch**: `main`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile.webapp`
   - **Docker Context**: `.`
   - **Plan**: Starter ($7/mo) → *Upgrade to Standard ($25/mo) for 2GB RAM = faster renders*
4. **Add Disk**:
   - Mount Path: `/app/data`
   - Size: 5 GB
5. **Environment Variables** (see table below)
6. **Create Web Service**

---

## Environment Variables

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | `file:/app/data/youinst.db` | |
| `NEXTAUTH_SECRET` | *(click Generate)* | 64-char random string |
| `NEXTAUTH_URL` | `https://YOUR-SERVICE.onrender.com` | Update after deploy |
| `GROQ_API_KEY` | `gsk_...` | **Required** — [Get free key](https://console.groq.com) |
| `YOUTUBE_CLIENT_ID` | Your OAuth client ID | Optional |
| `YOUTUBE_CLIENT_SECRET` | Your OAuth secret | Optional |
| `YOUTUBE_REFRESH_TOKEN` | Your refresh token | Optional |
| `INSTAGRAM_ACCESS_TOKEN` | Your long-lived token | Optional |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Your IG business ID | Optional |
| `PEXELS_API_KEY` | Your Pexels key | Optional (for backgrounds) |
| `PIXABAY_API_KEY` | Your Pixabay key | Optional (for backgrounds) |

---

## Step 3: Verify Deployment

Once deployed, visit:

- **Landing page**: `https://YOUR-SERVICE.onrender.com/`
- **Health check**: `https://YOUR-SERVICE.onrender.com/api/health`
- **Register**: `https://YOUR-SERVICE.onrender.com/register`

Expected health check response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T...",
  "counts": { "users": 0, "channels": 0, ... }
}
```

---

## Step 4: First User Setup

1. Go to `/register`
2. Create your account (auto-creates default channel)
3. Share the URL with your friend → they register separately
4. Each user sees only their own content (multi-tenant auth ✅)

---

## Monitoring & Maintenance

### View Logs
```
Render Dashboard → Your service → Logs
```

### Update App
```bash
git add -A
git commit -m "update"
git push
# Render auto-deploys in ~3 min
```

### Scale Up (if needed)
```
Dashboard → Settings → Instance Type → Upgrade to Standard
```
Standard plan: 2 GB RAM, 1 vCPU — **much faster video renders**

### Database Backup
Render Dashboard → Disk → **Download Snapshot** (saves `youinst.db`)

---

## Troubleshooting

### ❌ Service won't start
- Check **Logs** tab for errors
- Verify `GROQ_API_KEY` is set correctly
- Ensure `NEXTAUTH_URL` matches your service URL

### ❌ "Unauthorized" on `/dashboard`
- Clear browser cookies
- Go to `/login` and sign in
- Middleware protects all `/dashboard/*` routes

### ❌ Pipeline timeouts
- Upgrade to **Standard plan** ($25/mo) for 2 GB RAM
- Check Groq API quota at [console.groq.com](https://console.groq.com)

### ❌ SQLite locked errors
- Only one instance can write to SQLite
- Don't manually scale to >1 instance (Render Starter = 1 instance by default)

---

## Cost Breakdown

| Item | Cost/mo |
|------|---------|
| Render Starter (512 MB) | $7 |
| Render Standard (2 GB) | $25 |
| Disk storage (5 GB) | $1 |
| Groq API | Free tier |
| **Total (Starter)** | **$8/mo** |
| **Total (Standard)** | **$26/mo** |

---

## Why NOT Netlify/Vercel?

| Issue | Why it breaks |
|-------|---------------|
| **Serverless timeout** | 10s (free) / 26s (pro) — pipeline takes 5+ min |
| **No filesystem** | SQLite needs persistent disk |
| **No Python/ffmpeg** | Whisper + video render need system deps |
| **Split CORS** | Frontend/backend on different domains breaks NextAuth |

Render runs the full Next.js app (UI + API + engine) as **one Docker container** = everything works.

---

## Next Steps

- [ ] Set up custom domain (Render supports free SSL)
- [ ] Add scheduled jobs (cron) for auto-posting
- [ ] Monitor via Render metrics dashboard
- [ ] Add Sentry/LogRocket for error tracking
- [ ] Scale to Standard plan when traffic grows

**You're live!** 🎉
