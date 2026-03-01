# 🚀 QUICK START: Make Your First Video in 3 Minutes

## ✅ System Status

- **Remotion**: ✅ Installed (version 4.0.263)
- **ElevenLabs**: ✅ API Key configured
- **Python Virtual Env**: ✅ Ready (in `.venv`)
- **ffmpeg**: ✅ Required for rendering

---

## 🎬 Method 1: Make a Video RIGHT NOW (Fastest)

```powershell
# Step 1: Activate Python environment (needed for Whisper captions)
.\.venv\Scripts\Activate.ps1

# Step 2: Generate your first video!
npm run video:quick
```

**That's it!** Your video will be at: `output/tech-[timestamp]/final.mp4`

---

## 🎙️ Method 2: Use ElevenLabs Professional Voice

### Step 1: Add a Professional Voice (Pick One)

```powershell
# Rachel (Clear, Professional Female)
npm run voice:add-elevenlabs 21m00Tcm4TlvDq8ikWAM rachel english

# Antoni (Soft, Warm Male)
npm run voice:add-elevenlabs ErXwobaYiN019PkySvjV antoni english

# Arnold (Deep, Authoritative Male)
npm run voice:add-elevenlabs VR6AewLTigWG4xSOukaG arnold english

# Bella (Confident, Smooth Female)
npm run voice:add-elevenlabs EXAVITQu4vr4xnSDxMaL bella english
```

### Step 2: Test the Voice

```powershell
npm run voice:test "This is a test of my new ElevenLabs voice. It sounds amazing!"
```

Listen to: `output/test-tts-[timestamp]/voice.mp3`

### Step 3: Generate Video with Your Voice

```powershell
npm run generate -- --niche tech --voice rachel
# or
npm run generate -- --niche ai --voice antoni
# or
npm run generate -- --niche finance --voice arnold
```

---

## 🎥 Method 3: Full Automated Pipeline

Run the complete autonomous pipeline that:
- ✅ Generates AI script
- ✅ Creates voice with ElevenLabs
- ✅ Renders video with Remotion
- ✅ Adds animated captions
- ✅ Uploads to YouTube & Instagram

```powershell
npm run pipeline
```

---

## 📊 Available Niches

Choose from these content niches:

```bash
--niche tech         # Technology & Gadgets
--niche ai           # Artificial Intelligence
--niche finance      # Finance & Money
--niche productivity # Life Hacks & Productivity
--niche motivation   # Inspirational Content
--niche history      # Historical Facts
--niche science      # Science & Space
```

---

## 🎛️ Advanced Options

### Custom Voice & Language

```powershell
# Pure Hindi with cloned voice
npm run generate -- --niche tech --voice raju_cloned --language hindi

# English with professional voice
npm run generate -- --niche ai --voice rachel --language english

# Hinglish mix
npm run generate -- --niche finance --voice antoni --language hinglish
```

### Psychology & Retention Modes

```powershell
# Aggressive viral style
npm run generate -- --niche tech --psychology aggressive --retention viral

# Calm educational style
npm run generate -- --niche science --psychology calm --retention basic

# Inspirational motivational
npm run generate -- --niche motivation --psychology inspirational --retention enhanced
```

---

## 📁 Output Structure

Every video generates:

```
output/
  └── tech-1234567890/
      ├── voice.mp3              ← ElevenLabs audio
      ├── whisper_output.json    ← Word-level captions
      ├── final.mp4              ← Rendered video (1080x1920)
      ├── metadata.json          ← Video info
      ├── script.txt             ← AI-generated script
      └── background.mp4         ← Background visuals
```

---

## 🔍 Check Video Quality

Open the video in:
- **Windows**: VLC Player, Movies & TV
- **Mac**: QuickTime, VLC
- **Upload**: YouTube Shorts, Instagram Reels

---

## 🎨 Customize Remotion Templates

Your video templates are here:
- **Main**: `src/remotion/VideoTemplate.tsx`
- **Root**: `src/remotion/Root.tsx`

Edit these to change:
- Caption styles
- Animations
- Colors
- Transitions
- Effects

---

## 🐛 Common Issues

### Error: "Python not found"
```powershell
# Install Python 3.8+
# Then create venv:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Error: "ffmpeg not found"
```powershell
# Install ffmpeg via Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

### Error: "ElevenLabs quota exceeded"
- Check usage: https://elevenlabs.io/app/usage
- System will auto-fallback to Edge TTS (free)
- Upgrade plan for more characters

---

## 📚 Full Documentation

- **Video Guide**: [VIDEO_GENERATION_GUIDE.md](./VIDEO_GENERATION_GUIDE.md)
- **ElevenLabs Setup**: [ELEVENLABS_SETUP.md](./ELEVENLABS_SETUP.md)
- **Voice Cloning**: [ELEVENLABS_VOICE_GUIDE.md](./ELEVENLABS_VOICE_GUIDE.md)
- **Cinema Quality**: [CINEMA_QUALITY_GUIDE.md](./CINEMA_QUALITY_GUIDE.md)

---

## ✨ What Makes Your System Special

### 🤖 AI-Powered
- Groq LLM for viral scripts
- Trend scanning & keyword research
- Fact verification & research
- Performance learning & optimization

### 🎙️ Voice Options
- **ElevenLabs**: Professional AI voices
- **Voice Cloning**: Clone any voice
- **Edge TTS**: 400+ free voices
- **Humanization**: Natural speech patterns

### 🎥 Cinema Quality
- **Remotion**: React-based video rendering
- **Whisper**: Precise word-level captions
- **Animations**: Smooth, professional effects
- **Backgrounds**: Pexels stock video + procedural

### 📤 Auto-Upload
- YouTube Shorts (OAuth2)
- Instagram Reels (Graph API)
- Optimized metadata per platform

---

## 🚀 Ready? Start Now!

```powershell
# Quick start (uses default voice)
.\.venv\Scripts\Activate.ps1
npm run video:quick

# Or with professional ElevenLabs voice
npm run voice:add-elevenlabs 21m00Tcm4TlvDq8ikWAM rachel english
npm run generate -- --niche tech --voice rachel
```

**Check `output/` folder for your video!** 🎉

---

**Questions?** Read the full guides or check existing output examples in `output/` folder.
