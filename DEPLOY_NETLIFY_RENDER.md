# 🚀 Netlify + Render Deployment Guide

## Overview

Deploy the YouInst-Automator platform with a split architecture:
- **Frontend (Netlify):** Static Next.js dashboard - FREE tier
- **Backend (Render):** API + Workers - FREE tier

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│            Netlify (Frontend - Free)                │
│                                                      │
│  • Static Next.js dashboard                         │
│  • Video generation UI                              │
│  • Progress monitoring                              │
│  • Analytics                                        │
│                                                      │
│  Domain: yourinst-automator.netlify.app             │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTPS API Calls
                   ▼
┌─────────────────────────────────────────────────────┐
│            Render (Backend - Free)                  │
│                                                      │
│  • Node.js API (Express)                            │
│  • Background workers (BullMQ)                      │
│  • Video processing pipeline                        │
│  • PostgreSQL database                              │
│  • Redis queue                                      │
│                                                      │
│  Domain: yourinst-api.onrender.com                  │
└─────────────────────────────────────────────────────┘
```

---

## Prerequisites

- GitHub account (for CI/CD)
- Netlify account (free)
- Render account (free)
- API keys:
  - GOLPO_API_KEY
  - BOBA_ANIME_API_KEY
  - REROLL_API_KEY (optional)
  - GROQ_API_KEY

---

## Part 1: Backend Deployment (Render)

### 1.1 Create Render Services

```bash
# Login to Render: https://dashboard.render.com

# Create Web Service:
Name: yourinst-api
Environment: Node
Build Command: npm install && npm run build
Start Command: npm run start:api
```

### 1.2 Configure Environment Variables

In Render dashboard, add these environment variables:

```env
# Database (auto-provided by Render)
DATABASE_URL=postgresql://...

# Redis (auto-provided by Render)
REDIS_URL=redis://...

# AI APIs
GOLPO_API_KEY=your_key_here
BOBA_ANIME_API_KEY=your_key_here
REROLL_API_KEY=your_key_here
GROQ_API_KEY=your_groq_key

# VoiceBox
VOICEBOX_MODEL_PATH=/opt/render/project/src/models/voicebox

# Node environment
NODE_ENV=production
PORT=10000
```

### 1.3 Create Background Worker

```bash
# Create new Background Worker in Render:
Name: yourinst-worker
Build Command: npm install && npm run build
Start Command: npm run start:worker
```

Use the same environment variables as the API service.

### 1.4 Add PostgreSQL Database

```bash
# In Render dashboard:
Create > PostgreSQL
Name: yourinst-db
Plan: Free (Shared)

# Link to API service automatically
```

### 1.5 Add Redis Instance

```bash
# In Render dashboard:
Create > Redis
Name: yourinst-redis
Plan: Free (Shared)

# Link to API and Worker services
```

---

## Part 2: Frontend Deployment (Netlify)

### 2.1 Prepare Next.js for Static Export

Update [webapp/next.config.js](webapp/next.config.js):

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static export
  distDir: 'out',
  images: {
    unoptimized: true,  // Required for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://yourinst-api.onrender.com',
  },
}

module.exports = nextConfig
```

### 2.2 Create Netlify Configuration

Create `netlify.toml` in project root:

```toml
[build]
  base = "webapp"
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "18"
  NEXT_PUBLIC_API_URL = "https://yourinst-api.onrender.com"

[[redirects]]
  from = "/api/*"
  to = "https://yourinst-api.onrender.com/api/:splat"
  status = 200
  force = true

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 2.3 Deploy to Netlify

```bash
# Option 1: GitHub Integration (Recommended)
1. Push code to GitHub
2. Login to Netlify: https://app.netlify.com
3. Click "New site from Git"
4. Select your GitHub repository
5. Configure:
   - Base directory: webapp
   - Build command: npm run build
   - Publish directory: out
6. Add environment variable:
   - NEXT_PUBLIC_API_URL = https://yourinst-api.onrender.com
7. Deploy!

# Option 2: Netlify CLI
npm install -g netlify-cli
cd webapp
netlify login
netlify init
netlify deploy --prod
```

---

## Part 3: API Server Setup

### 3.1 Create API Entry Point

Create `src/api/server.ts`:

```typescript
import express from "express";
import cors from "cors";
import { generateAIVideo } from "../lib/aiOrchestrator";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate video endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { script, topic, style, enhance, includeSubtitles } = req.body;
    
    const result = await generateAIVideo({
      script,
      topic,
      style: style || "general",
      voice: "default",
      outputDir: `/tmp/${Date.now()}`,
      enhance: enhance || false,
      includeSubtitles: includeSubtitles || false,
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});
```

### 3.2 Update package.json Scripts

Add these scripts to [package.json](package.json):

```json
{
  "scripts": {
    "start:api": "ts-node src/api/server.ts",
    "start:worker": "ts-node src/workers/videoWorker.ts",
    "build": "tsc",
    "deploy:render": "git push render main"
  }
}
```

---

## Part 4: Testing

### 4.1 Test Backend API

```bash
# Test health endpoint
curl https://yourinst-api.onrender.com/health

# Test video generation
curl -X POST https://yourinst-api.onrender.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Test video generation",
    "topic": "Test",
    "style": "anime"
  }'
```

### 4.2 Test Frontend

```bash
# Visit your Netlify URL
open https://yourinst-automator.netlify.app

# Check API connection in browser console
fetch('https://yourinst-api.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Part 5: CI/CD Setup

### 5.1 GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      # Render auto-deploys on push

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd webapp && npm ci
      - run: cd webapp && npm run build
      # Netlify auto-deploys on push
```

---

## Cost Breakdown

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **Netlify** | Free | $0/mo | 100GB bandwidth, 300 build minutes |
| **Render API** | Free | $0/mo | 750 hours/mo, sleeps after 15min |
| **Render PostgreSQL** | Free | $0/mo | 1GB storage, 97 connections |
| **Render Redis** | Free | $0/mo | 25MB memory |
| **Total** | | **$0/mo** | Great for testing/MVP |

**Upgrade Path:**
- Netlify Pro: $19/mo (1TB bandwidth)
- Render Starter: $7/mo (persistent, no sleep)
- Render Standard: $50/mo (4GB RAM, auto-scaling)

---

## Monitoring

### Render Dashboard
- CPU/Memory usage
- Request logs
- Error tracking
- Database metrics

### Netlify Dashboard
- Deploy previews
- Build logs
- Analytics
- Form submissions

---

## Troubleshooting

### Backend won't start
```bash
# Check Render logs
# Common issues:
- Missing environment variables
- Python version mismatch (VoiceBox needs 3.9+)
- FFmpeg not installed (add to Dockerfile)
```

### Frontend API calls fail
```bash
# Check CORS settings in src/api/server.ts
app.use(cors({
  origin: 'https://yourinst-automator.netlify.app',
  credentials: true
}));
```

### Database connection errors
```bash
# Verify DATABASE_URL in Render dashboard
# Check PostgreSQL instance is running
```

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Netlify
3. ✅ Test end-to-end video generation
4. ✅ Set up custom domain (optional)
5. ✅ Configure monitoring alerts
6. ✅ Add authentication (Clerk, Auth0)

---

## Resources

- **Netlify Docs:** https://docs.netlify.com
- **Render Docs:** https://render.com/docs
- **Next.js Static Export:** https://nextjs.org/docs/pages/building-your-application/deploying/static-exports
- **Express.js:** https://expressjs.com

---

**Need Help?**
- Render Discord: https://render.com/discord
- Netlify Community: https://answers.netlify.com
