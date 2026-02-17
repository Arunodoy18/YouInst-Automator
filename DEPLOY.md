# YouInst AI — Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                    VPS / Server                   │
│                                                   │
│  ┌─────────────┐  ┌────────────┐  ┌───────────┐  │
│  │   Webapp     │  │  Workers   │  │   Redis   │  │
│  │  (Next.js)   │  │  (BullMQ)  │  │  (Queue)  │  │
│  │  Port 3000   │  │  Pipeline  │  │  Port 6379│  │
│  │             │←→│  TTS+Video │←→│           │  │
│  │  Dashboard  │  │  Upload    │  │           │  │
│  └──────┬──────┘  └────────────┘  └───────────┘  │
│         │                                         │
│    ┌────┴─────┐                                   │
│    │  SQLite  │  (shared volume)                  │
│    └──────────┘                                   │
│                                                   │
│    ┌──────────┐                                   │
│    │  Nginx   │ ← reverse proxy (optional)        │
│    │  :80/443 │ → localhost:3000                   │
│    └──────────┘                                   │
└──────────────────────────────────────────────────┘
```

---

## Option 1: VPS Deploy (Recommended)

Best for this project because of system dependencies (Python, ffmpeg, Whisper).

### Step 1: Get a VPS

| Provider      | Recommended Plan | Cost/mo |
|---------------|-----------------|---------|
| **Hetzner**   | CX32 (4 vCPU, 8GB) | ~$7 |
| **DigitalOcean** | Droplet (4 vCPU, 8GB) | ~$48 |
| **AWS Lightsail** | 4GB | ~$20 |
| **Contabo**   | VPS S (4 vCPU, 8GB) | ~$7 |

**Minimum specs:** 2 vCPU, 4GB RAM, 40GB disk (Whisper + ffmpeg need RAM)

### Step 2: Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Install Docker Compose (v2)
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 3: Clone & Configure

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/YouInst-Automator.git
cd YouInst-Automator

# Create .env from example
cp .env.example .env
nano .env
```

Fill in your `.env`:
```env
GROQ_API_KEY=gsk_your_key_here
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
PIXABAY_API_KEY=your_key
PEXELS_API_KEY=your_key
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id
NEXTAUTH_SECRET=generate-a-random-64-char-string
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=file:/app/data/youinst.db
```

### Step 4: Deploy

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f webapp
docker compose logs -f workers
```

### Step 5: Reverse Proxy (Nginx + SSL)

```bash
# Install Nginx + Certbot
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx config
cat > /etc/nginx/sites-available/youinst << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/youinst /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Get SSL certificate (free)
certbot --nginx -d yourdomain.com
```

---

## Option 2: Render (Recommended Easy Deploy)

The easiest way to deploy — one service handles everything (dashboard + API + pipeline).

### Why NOT split frontend/backend across Netlify + Render?

This app is a **monolith** — Next.js API routes import engine code directly (orchestrator, TTS, ffmpeg). Splitting breaks it:
- Netlify/Vercel serverless functions timeout at 10-26s — pipeline takes 5+ min
- SQLite needs persistent disk — serverless has no filesystem
- CORS + cookie headaches with auth across two origins

**Just deploy the whole thing on Render as one service.**

### Step 1: Push to GitHub

```bash
git init
git add -A
git commit -m "deploy"
git remote add origin https://github.com/YOUR_USERNAME/YouInst-Automator.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `youinst-ai`
   - **Region**: Oregon (or nearest)
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile.webapp`
   - **Docker Context**: `.`
   - **Plan**: Starter ($7/mo) or Standard ($25/mo for faster renders)
4. Add a **Disk**:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB
5. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `gsk_your_key` |
| `NEXTAUTH_SECRET` | *(click Generate)* |
| `NEXTAUTH_URL` | `https://youinst-ai.onrender.com` |
| `DATABASE_URL` | `file:/app/data/youinst.db` |
| `YOUTUBE_CLIENT_ID` | your value |
| `YOUTUBE_CLIENT_SECRET` | your value |
| `YOUTUBE_REFRESH_TOKEN` | your value |
| `INSTAGRAM_ACCESS_TOKEN` | your value |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | your value |
| `PEXELS_API_KEY` | your value |

6. Click **Deploy** — takes ~5 min to build

### Step 3: Verify

- Visit `https://youinst-ai.onrender.com` → landing page
- Register at `/register`
- Go to `/dashboard/generate` → run a pipeline

> **Note:** Render free tier spins down after 15 min idle. Starter ($7/mo) stays always-on. The `render.yaml` blueprint in the repo root auto-configures everything if you use Render's "Blueprint" deploy.

### Alternative: Railway

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

Set environment variables in Railway dashboard. Charges per usage (~$5-20/mo).

---

## Option 3: Your Own PC (Windows — Current Setup)

Already working! For 24/7 operation:

```powershell
# Start Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:alpine

# Enable Redis in .env
# Uncomment: REDIS_URL=redis://localhost:6379

# Build webapp
cd webapp; npm run build

# Start webapp (production)
npx next start -p 3000

# Start workers (new terminal)
cd ..; npx ts-node src/workers/index.ts
```

---

## Common Operations

### Update Deployment
```bash
cd YouInst-Automator
git pull
docker compose up -d --build
```

### Run Pipeline Manually (from server)
```bash
docker compose exec workers npx ts-node src/cli/generate.ts generate ai
```

### View Database
```bash
docker compose exec webapp npx prisma studio
```

### Backup Database
```bash
docker compose cp webapp:/app/data/youinst.db ./backup-$(date +%Y%m%d).db
```

### Reset Everything
```bash
docker compose down -v  # -v removes volumes (data)
docker compose up -d --build
```

---

## Domain + DNS Setup

1. Buy a domain (Namecheap, Cloudflare, GoDaddy)
2. Point A record → your server IP
3. Wait for DNS propagation (5-30 min)
4. Run `certbot --nginx -d yourdomain.com` for SSL

---

## Monitoring

```bash
# Check if services are running
docker compose ps

# Memory usage
docker stats

# Disk usage
df -h

# Check logs for errors
docker compose logs --tail=50 workers | grep -i error
```

---

## Cost Breakdown (Cheapest Production Setup)

| Item | Cost/mo |
|------|---------|
| Hetzner CX32 VPS | ~$7 |
| Domain | ~$1 |
| Groq API | Free tier |
| Total | **~$8/mo** |
