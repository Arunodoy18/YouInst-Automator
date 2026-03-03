# 🚀 Quick Start - Open Source AI Video Generation

## 1. Install VoiceBox (Meta's TTS)

```bash
# Activate Python virtual environment
.venv\Scripts\activate

# Install VoiceBox
pip install metavoice

# Or use npm script
npm run install:voicebox
```

## 2. Configure API Keys

Create `.env` file from template:

```bash
cp .env.example .env
```

Add these API keys to `.env`:

```env
# Required
GROQ_API_KEY=gsk_your_key_here

# Open Source AI Tools (at least one video API required)
GOLPO_API_KEY=your_golpo_key           # Get at: https://golpo.ai/signup
BOBA_ANIME_API_KEY=your_boba_key       # Get at: https://boba-anime.com/signup
REROLL_API_KEY=your_reroll_key         # Optional, for enhancement

# VoiceBox (local, no API key needed)
VOICEBOX_MODEL_PATH=./models/voicebox
```

## 3. Test the Pipeline

```bash
# Run comprehensive test
npm run test:ai

# This will:
# ✓ Check VoiceBox installation
# ✓ Verify API connections (Golpo, bobaAnime, Reroll)
# ✓ Generate test video (~30 seconds)
# ✓ Show results in output/ folder
```

## 4. Generate Your First Video

### Option A: Using API Server (Recommended for Production)

```bash
# Start API server
npm run api

# In another terminal, make a request
curl -X POST http://localhost:10000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Discover the future of AI video generation",
    "topic": "AI Technology",
    "style": "cinematic",
    "enhance": false,
    "includeSubtitles": true
  }'
```

### Option B: Using CLI (Quickest for Testing)

```typescript
// test-generate.ts
import { generateAIVideo } from "./src/lib/aiOrchestrator";

const result = await generateAIVideo({
  script: "Discover the future of AI video generation with open source tools",
  topic: "AI Technology",
  style: "cinematic",        // or "anime", "general"
  outputDir: "./output/test",
  enhance: true,             // Use Reroll for 4K upscaling
  includeSubtitles: true,    // Add animated captions
});

console.log("Video:", result.videoPath);
```

## 5. Style Options

### General/Cinematic Style (Golpo)
```javascript
{
  style: "cinematic",
  enhance: true,             // Upscale to 4K
  includeSubtitles: true
}
```

### Anime Style (bobaAnime)
```javascript
{
  style: "anime",
  enhance: false,            // bobaAnime already high quality
  includeSubtitles: true
}
```

## 6. Deploy to Production

### Deploy Backend (Render)

```bash
# Push to Render
git push render main

# Or use Docker
docker build -t yourinst-api -f Dockerfile.engine .
docker run -p 10000:10000 yourinst-api
```

### Deploy Frontend (Netlify)

```bash
cd webapp
npm run build

# Deploy
netlify deploy --prod
```

See [DEPLOY_NETLIFY_RENDER.md](DEPLOY_NETLIFY_RENDER.md) for detailed deployment guide.

---

## 📊 Pipeline Comparison

| Feature | Old (Remotion) | **New (Open Source)** |
|---------|----------------|----------------------|
| **TTS** | ElevenLabs ($5-99/mo) | **VoiceBox (FREE)** |
| **Video** | Remotion + FFmpeg | **Golpo/bobaAnime** |
| **Enhancement** | Manual FFmpeg | **Reroll AI** |
| **Quality** | 1080p | **4K with enhancement** |
| **Speed** | ~2-3 min | **~30-60 sec** |
| **Cost** | $12-106/mo | **$0-10/mo** |

---

## 🛠️ Troubleshooting

### VoiceBox installation fails

```bash
# Make sure Python 3.9+ is installed
python --version

# Activate virtual environment first
.venv\Scripts\activate

# Try manual installation
pip install --upgrade pip
pip install metavoice
```

### API connection errors

```bash
# Check API keys in .env
cat .env | grep API_KEY

# Test API health
curl https://api.golpo.ai/v1/health \
  -H "Authorization: Bearer YOUR_KEY"
```

### Video generation timeout

```bash
# Increase timeout in aiOrchestrator.ts (line ~XX)
# Or use background workers for long videos
npm run start:worker
```

---

## 📚 Documentation

- [OPENSOURCE_TOOLS.md](OPENSOURCE_TOOLS.md) - Tool details and architecture
- [DEPLOY_NETLIFY_RENDER.md](DEPLOY_NETLIFY_RENDER.md) - Deployment guide
- [VIDEO_GENERATION_GUIDE.md](VIDEO_GENERATION_GUIDE.md) - Original guide (legacy)

---

## 🎯 Next Steps

1. ✅ Generate test video: `npm run test:ai`
2. ✅ Try different styles (cinematic, anime)
3. ✅ Customize voice settings in voicebox.ts
4. ✅ Add custom backgrounds and effects
5. ✅ Deploy to Netlify + Render
6. ✅ Scale with background workers

---

**Need Help?**

- Check logs in `logs/` folder
- Join Discord: [Your Discord Link]
- Report issues: GitHub Issues
