# 🎬 Video Generation Guide with ElevenLabs & Remotion

## ✅ Your System Status

**Remotion:** Already installed and configured  
**ElevenLabs:** API key configured in `.env`  
**Integration:** Fully automated pipeline ready

---

## 🎙️ Using ElevenLabs Voices

### Option 1: Use Built-in Cloned Voices (Recommended)

ElevenLabs provides pre-made professional voices. Update your voice profile:

```json
// In cloned-voices.json or voice profiles
{
  "my_voice": {
    "id": "my_voice",
    "label": "Professional AI Voice",
    "description": "ElevenLabs AI voice",
    "language": "english",
    "humanize": {
      "breathPauses": true,
      "fillers": false,
      "rateVariation": true
    },
    "elevenlabs": {
      "voiceId": "YOUR_ELEVENLABS_VOICE_ID",
      "modelId": "eleven_multilingual_v2"
    }
  }
}
```

### Option 2: Get Voice IDs from ElevenLabs

1. Go to: https://elevenlabs.io/app/voice-library
2. Find a voice you like
3. Click "Add to Lab" or "Use Voice"
4. Copy the Voice ID (looks like: `21m00Tcm4TlvDq8ikWAM`)

### Popular ElevenLabs Voice IDs

```javascript
// Male voices
"21m00Tcm4TlvDq8ikWAM"  // Rachel (clear, professional)
"ErXwobaYiN019PkySvjV"  // Antoni (soft, warm)
"VR6AewLTigWG4xSOukaG"  // Arnold (deep, authoritative)

// Female voices
"EXAVITQu4vr4xnSDxMaL"  // Bella (confident, smooth)
"ThT5KcBeYPX3keUQqHPh"  // Dorothy (pleasant, engaging)
```

---

## 🚀 Generate Videos (3 Methods)

### Method 1: Quick CLI Generation

```bash
# Generate a single video with ElevenLabs voice
npm run generate -- --niche tech --voice my_voice
npm run generate -- --niche ai --voice raju_cloned
npm run generate -- --niche finance --voice default
```

### Method 2: Full Pipeline (Recommended)

```bash
# Run complete pipeline: generate script + render + upload
npm run pipeline
```

This automatically:
- ✅ Generates AI script with Groq
- ✅ Creates voice with ElevenLabs (or Edge TTS fallback)
- ✅ Renders video with Remotion
- ✅ Adds captions and effects
- ✅ Uploads to YouTube & Instagram

### Method 3: Test Voice First

```bash
# Test an ElevenLabs voice before making a full video
npm run voice:test-raju "This is a test of the voice system"
```

---

## 🎥 How Video Generation Works

Your pipeline automatically:

1. **AI Script Generation** → Groq LLM creates viral script
2. **Voice Synthesis** → ElevenLabs generates audio (falls back to Edge TTS if needed)
3. **Whisper Transcription** → Creates precise word-level captions
4. **Remotion Rendering** → Composites video with:
   - Background visuals (Pexels/procedural)
   - Animated captions
   - Background music
   - Cinema-quality effects
5. **Platform Upload** → YouTube Shorts + Instagram Reels

---

## ⚙️ Configure ElevenLabs for All Videos

To make ALL videos use ElevenLabs by default, update your voice profiles:

```typescript
// src/lib/tts.ts - Add ElevenLabs to existing profiles
{
  raju_hindi: {
    ...
    elevenlabs: {
      voiceId: "YOUR_VOICE_ID",
      modelId: "eleven_multilingual_v2"
    }
  }
}
```

---

## 📊 Check Video Output

All generated videos are saved in:
```
output/
  ├── tech-1234567890/
  │   ├── voice.mp3          (ElevenLabs audio)
  │   ├── whisper_output.json (captions)
  │   ├── final.mp4           (rendered video)
  │   └── metadata.json
  └── ai-9876543210/
```

---

## 🎬 Advanced: Custom Remotion Templates

Your Remotion templates are in:
- `src/remotion/Root.tsx` → Main composition registry
- `src/remotion/VideoTemplate.tsx` → Video template with captions

To customize visuals, edit `VideoTemplate.tsx`.

---

## 🐛 Troubleshooting

**ElevenLabs not working?**
- Check API key in `.env`: `ELEVENLABS_API_KEY=sk_...`
- Verify your subscription tier allows voice generation
- System will auto-fallback to Edge TTS if ElevenLabs fails

**Want better voices?**
- Upgrade to ElevenLabs Creator ($22/mo) for pro voices
- Or use free multilingual v2 voices

**Videos not rendering?**
- Ensure ffmpeg is installed: `ffmpeg -version`
- Check output folder permissions
- Review logs in `logs/` directory

---

## 🚀 Quick Start (Make Your First Video Now)

```bash
# 1. Activate Python environment (for Whisper)
.venv\Scripts\Activate.ps1

# 2. Generate a video with ElevenLabs
npm run generate -- --niche tech

# 3. Check output folder for your video!
# File will be at: output/tech-[timestamp]/final.mp4
```

**That's it!** Your Remotion + ElevenLabs pipeline is ready to create videos automatically.
