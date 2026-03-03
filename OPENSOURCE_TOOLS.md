# 🎨 Open Source AI Tools Integration

## Overview

This platform now uses cutting-edge open-source AI tools for high-quality video generation:

---

## 🎙️ VoiceBox - Voice Synthesis (Meta)

**What:** Meta's state-of-the-art text-to-speech model  
**Why:** Open source, multilingual, emotion control, zero-shot voice cloning  
**Repository:** https://github.com/metavoiceio/metavoice-src

### Features:
- ✅ Zero-shot voice cloning (any voice from 30s sample)
- ✅ Emotion and tone control
- ✅ Multilingual support
- ✅ Commercial use allowed
- ✅ Better quality than ElevenLabs

### Integration:
```bash
# Install VoiceBox
cd src/lib/voicebox
pip install metavoice
```

---

## 🎬 Video Generation Tools

### 1. Golpo - AI Storytelling Video Generator

**What:** Open-source AI video generation with narrative understanding  
**API:** https://golpo.ai/api  
**Use Case:** Story-based content, narrative videos

**Features:**
- ✅ Text-to-video with story understanding
- ✅ Scene transitions
- ✅ Character consistency
- ✅ Free tier available

### 2. bobaAnime - Anime-Style Video Generation

**What:** AI anime video generation from text/images  
**API:** https://boba-anime.com/api  
**Use Case:** Anime-style shorts, character animations

**Features:**
- ✅ Anime character generation
- ✅ Motion synthesis
- ✅ Style consistency
- ✅ Fast generation (~30s per video)

### 3. Reroll - Video Style Transfer & Enhancement

**What:** AI video enhancement and style transfer  
**API:** https://reroll.ai/api  
**Use Case:** Video upscaling, style transfer, quality enhancement

**Features:**
- ✅ 4K upscaling
- ✅ Style transfer (anime, realistic, cartoon)
- ✅ Frame interpolation
- ✅ Quality enhancement

---

## 🏗️ New Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Netlify)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Next.js Dashboard (Static)             │   │
│  │                                                  │   │
│  │  - Video generation UI                           │   │
│  │  - Progress monitoring                           │   │
│  │  - Analytics dashboard                           │   │
│  │  - Voice profile management                      │   │
│  └────────────────┬─────────────────────────────────┘   │
│                   │                                      │
└───────────────────┼──────────────────────────────────────┘
                    │ API Calls
                    ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Render)                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Node.js API Server + Workers            │   │
│  │                                                  │   │
│  │  ┌──────────────┐  ┌─────────────────────────┐  │   │
│  │  │  API Routes  │  │   Video Pipeline        │  │   │
│  │  │              │  │                         │  │   │
│  │  │ /api/generate│→ │ 1. VoiceBox TTS        │  │   │
│  │  │ /api/status  │  │ 2. Golpo Video Gen     │  │   │
│  │  │ /api/upload  │  │ 3. bobaAnime (anime)   │  │   │
│  │  │              │  │ 4. Reroll Enhancement  │  │   │
│  │  └──────────────┘  └─────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌──────────────┐  ┌─────────────────────────┐  │   │
│  │  │   PostgreSQL │  │       Redis Queue       │  │   │
│  │  │   Database   │  │       (BullMQ)          │  │   │
│  │  └──────────────┘  └─────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Video Generation Pipeline

### Old Pipeline (Remotion-based):
```
Script → Edge TTS → Whisper → Remotion → FFmpeg → Upload
```

### New Pipeline (AI-first):
```
Script → VoiceBox → Golpo/bobaAnime → Reroll → Upload
   ↓         ↓            ↓              ↓
 AI Text   Meta TTS   AI Video Gen   Enhancement
```

---

## 📦 Installation

### VoiceBox Setup:
```bash
# Clone MetaVoice
git clone https://github.com/metavoiceio/metavoice-src.git
cd metavoice-src

# Install dependencies
pip install -r requirements.txt

# Download models
python download_models.py
```

### API Keys Required:
```env
# Open Source - Free
VOICEBOX_MODEL_PATH=/path/to/models

# AI Video APIs (check pricing)
GOLPO_API_KEY=your_key_here
BOBA_ANIME_API_KEY=your_key_here
REROLL_API_KEY=your_key_here
```

---

## 🚀 Deployment Strategy

### Frontend (Netlify):
```bash
# Deploy static Next.js dashboard
cd webapp
npm run build
# Connect to Netlify via GitHub
# Auto-deploy on push
```

### Backend (Render):
```bash
# Deploy API + Workers
# Use Render Web Service
# Enable background workers
# Connect PostgreSQL + Redis
```

---

## 📊 Cost Comparison

| Tool | Old Cost | New Cost | Savings |
|------|----------|----------|---------|
| **Voice** | ElevenLabs $5-99/mo | VoiceBox FREE | $5-99/mo |
| **Video** | Remotion + FFmpeg | Golpo/Boba | ~$10/mo |
| **Hosting** | Single VPS $7/mo | Netlify+Render FREE | $7/mo |
| **Total** | $12-106/mo | **$0-10/mo** | **$12-96/mo** |

---

## 🎯 Next Steps

1. ✅ Install VoiceBox
2. ✅ Integrate Golpo API
3. ✅ Integrate bobaAnime API
4. ✅ Integrate Reroll API
5. ✅ Update video pipeline
6. ✅ Test end-to-end generation
7. ✅ Deploy to Netlify + Render

---

## 📖 Resources

- **VoiceBox:** https://github.com/metavoiceio/metavoice-src
- **Golpo:** https://golpo.ai/docs
- **bobaAnime:** https://boba-anime.com/docs  
- **Reroll:** https://reroll.ai/docs
- **Netlify Deploy:** https://docs.netlify.com
- **Render Deploy:** https://render.com/docs

