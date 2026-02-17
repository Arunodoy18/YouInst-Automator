# YouInst AI — Autonomous Content Studio

> Fully automated AI-powered YouTube Shorts & Instagram Reels generation platform with multi-user authentication, intelligent content engine, and one-click deployment.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 🎯 Features

### 🤖 AI Content Engine
- **Groq LLM-powered scripts** — 30-40s viral-optimized content
- **5 Psychology modes** — Aggressive, Inspirational, Educational, Controversial, Calm
- **3 Retention levels** — Basic, Enhanced, Viral
- **Fact-based intelligence** — Researched, accurate content
- **Niche rotation** — Auto-balance 7+ niches

### 🎙️ Voice & Audio
- **5 Voice profiles** — Raju (Hinglish), Madhur, Swara, Neerja, Default
- **Edge TTS** — 400+ voices, 60+ languages
- **Humanization engine** — Breath pauses, emphasis, rate variation
- **Background music** — Auto-synchronized with speech beats

### 🎥 Video Production
- **Pexels/Pixabay backgrounds** — AI-matched to topic
- **Procedural backgrounds** — Gradient animations when APIs unavailable
- **Word-level sync** — Whisper timestamps → ffmpeg subtitles
- **Retention scoring** — AI analyzes hook strength

### 📤 Multi-Platform Upload
- **YouTube Shorts** — OAuth2, auto-upload with metadata
- **Instagram Reels** — Graph API, business account posting
- **Dual-platform SEO** — Optimized titles, hashtags per platform

### 👥 Multi-User Support
- **NextAuth.js** — bcrypt password hashing, JWT sessions
- **User-scoped data** — Each user sees only their channels/videos
- **Role-based access** — Free/Pro/Enterprise plans

### 📊 Dashboard
- **Real-time pipeline status** — Job polling with live updates
- **Analytics** — Views, likes, retention per video
- **Channel management** — Multiple channels, niche configs
- **Schedule automation** — Cron-based posting (with Redis)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.8+ (for Whisper)
- ffmpeg

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/YouInst-Automator.git
cd YouInst-Automator

# Install dependencies
npm install
cd webapp && npm install && cd ..

# Configure environment
cp .env.example .env
nano .env  # Add your GROQ_API_KEY

# Generate Prisma client
npx prisma generate

# Start dashboard (dev mode)
cd webapp && npm run dev
```

Visit `http://localhost:3000` → Register → Generate your first video!

---

## 🌐 Production Deployment

### ⚡ Render (Recommended — $7/month)

**One-click deploy:**

1. Push to GitHub
2. [Deploy to Render](https://render.com/deploy) → Connect repo
3. Fill in environment variables
4. Deploy (5 min build)

**📖 Full guide:** [RENDER.md](./RENDER.md)

### ⚠️ Why NOT Netlify/Vercel?

This app requires:
- ✅ Long-running processes (5+ min renders)
- ✅ Persistent filesystem (SQLite)
- ✅ Docker (Python + ffmpeg)
- ✅ Server-side rendering

Netlify/Vercel are serverless (10s timeout) and can't run this architecture.

---

## 📁 Project Structure

```
YouInst-Automator/
├── src/                        # Engine code
│   ├── lib/
│   │   ├── orchestrator.ts     # 13-step pipeline
│   │   ├── agentBrain.ts       # AI script generation
│   │   ├── factContentEngine.ts # Researched content
│   │   ├── tts.ts              # Voice synthesis
│   │   ├── videoRenderer.ts    # ffmpeg render
│   │   ├── youtubeUploader.ts  # YouTube OAuth
│   │   └── instagramUploader.ts # Instagram Graph API
│   ├── workers/                # BullMQ background workers
│   └── cli/                    # generate.ts command
├── webapp/                     # Next.js 14 dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/            # API routes (generate, channels, etc.)
│   │   │   ├── dashboard/      # Protected dashboard pages
│   │   │   ├── login/          # Auth pages
│   │   │   └── register/
│   │   ├── components/         # React components
│   │   └── lib/
│   │       ├── auth.ts         # NextAuth config
│   │       └── apiAuth.ts      # API auth helper
├── prisma/
│   └── schema.prisma           # 14 models (User, Channel, Niche, etc.)
├── Dockerfile.webapp           # Production Docker image
├── docker-compose.yml          # Multi-service stack
├── render.yaml                 # Render Blueprint
└── RENDER.md                   # Deployment guide
```

---

## 🔑 Environment Variables

See [.env.example](./.env.example) for full list.

**Required:**
- `GROQ_API_KEY` — [Free at console.groq.com](https://console.groq.com)
- `NEXTAUTH_SECRET` — Random 64-char string
- `NEXTAUTH_URL` — Your app URL

**Optional:**
- YouTube OAuth credentials (for Shorts upload)
- Instagram access token (for Reels upload)
- Pexels/Pixabay API keys (for backgrounds)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TailwindCSS 4 |
| **Backend** | Next.js API routes, TypeScript 5.7 |
| **Database** | SQLite (better-sqlite3), Prisma 7 |
| **Auth** | NextAuth.js 4, bcrypt |
| **AI** | Groq (Llama 3.3 70B) |
| **TTS** | Edge TTS (Microsoft Azure) |
| **STT** | OpenAI Whisper |
| **Video** | ffmpeg-static, fluent-ffmpeg |
| **Upload** | YouTube Data API v3, Instagram Graph API |
| **Queue** | BullMQ + Redis (optional) |
| **Deploy** | Docker, Render |

---

## 📊 Database Schema

14 Prisma models:
- **User** — Multi-tenant auth
- **Channel** — YouTube/Instagram accounts
- **Niche** — Content categories (AI, Money, Tech, etc.)
- **GeneratedScript** — AI-generated scripts
- **RenderedVideo** — Final video files
- **PostedVideo** — Upload records
- **Analytics** — Performance metrics
- **JobLog** — Pipeline execution tracking
- **ContentIntelligenceConfig** — Psychology/retention settings
- **NicheUsageLog** — Rotation tracking
- **Schedule** — Cron automation
- **TrendKeyword**, **Hook**, **Webhook**

---

## 🎬 Pipeline Flow

```
1. Topic Selection → AI picks/validates topic
2. Hook Generation → 5 ultra-retention hooks
3. Script Generation → AgentBrain (30-40s script)
4. TTS → Edge TTS with humanization
5. Whisper → Word-level timestamps
6. Background Selection → Pexels/procedural
7. Video Render → ffmpeg composite
8. Retention Scoring → AI quality check
9. Metadata Generation → SEO optimization
10. YouTube Upload → OAuth2 Shorts API
11. Instagram Upload → Graph API Reels
12. Analytics Logging → Track performance
13. Database Commit → Save all records
```

**Duration:** ~5 minutes per video (includes AI inference, TTS, Whisper, render)

---

## 🔧 Development Commands

```bash
# CLI pipeline
npm run generate -- ai "how to make money with AI"

# Start webapp
npm run webapp

# Build webapp
npm run webapp:build

# Workers (requires Redis)
npm run workers

# Database
npm run db:studio    # Prisma Studio GUI
npm run db:generate  # Regenerate client
```

---

## 📈 Roadmap

- [ ] PostgreSQL support (multi-region scaling)
- [ ] TikTok upload integration
- [ ] Custom voice cloning
- [ ] A/B testing framework
- [ ] Webhook integrations (Zapier, Make)
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

PRs welcome! Please:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a PR

---

## 📄 License

MIT License — See [LICENSE](./LICENSE)

---

## 🙏 Credits

Built with:
- [Groq](https://groq.com) — Blazing-fast LLM inference
- [Next.js](https://nextjs.org) — React framework
- [Prisma](https://prisma.io) — Type-safe ORM
- [Edge TTS](https://github.com/rany2/edge-tts) — Free TTS voices
- [Whisper](https://github.com/openai/whisper) — Speech-to-text
- [Pexels](https://pexels.com) — Free stock videos

---

**Made with ❤️ for content creators**