# 🎙️ ElevenLabs Voice Setup Instructions

## Step 1: Get Your ElevenLabs Voice ID

### Option A: Use Pre-made Professional Voices (Recommended)

ElevenLabs provides free professional AI voices. Here are popular ones you can use immediately:

#### **Male Voices** 🎤
- **Antoni** (Soft, Warm): `ErXwobaYiN019PkySvjV`
- **Arnold** (Deep, Authoritative): `VR6AewLTigWG4xSOukaG`
- **Adam** (Deep, Mature): `pNInz6obpgDQGcFmaJgB`
- **Sam** (Young, Energetic): `yoZ06aMxZJJ28mfd3POQ`

#### **Female Voices** 🎤  
- **Rachel** (Clear, Professional): `21m00Tcm4TlvDq8ikWAM`
- **Bella** (Confident, Smooth): `EXAVITQu4vr4xnSDxMaL`
- **Dorothy** (Pleasant, Engaging): `ThT5KcBeYPX3keUQqHPh`
- **Elli** (Young, Friendly): `MF3mGyEYCl7XYWbV9V6O`

#### **Indian Accent Voices** 🇮🇳
- **Prabhat** (Indian Male): Use Edge TTS fallback
- **Hindi Male**: Use Edge TTS `hi-IN-MadhurNeural`

### Option B: Browse Full Voice Library

1. Visit: https://elevenlabs.io/app/voice-library
2. Listen to voice previews
3. Click on a voice you like
4. Look for the **Voice ID** (e.g., `21m00Tcm4TlvDq8ikWAM`)
5. Copy it!

### Option C: Clone Your Own Voice (Requires Paid Plan)

1. Go to: https://elevenlabs.io/app/voice-lab
2. Click "Add Instant Voice Clone"
3. Upload 1-2 minute audio sample
4. Get your custom voice ID

---

## Step 2: Add Voice to Your Project

### Quick Method (Recommended)

```bash
# Windows PowerShell
ts-node scripts/add-elevenlabs-voice.ts <VOICE_ID> <NAME> <LANGUAGE>

# Examples:
ts-node scripts/add-elevenlabs-voice.ts 21m00Tcm4TlvDq8ikWAM rachel english
ts-node scripts/add-elevenlabs-voice.ts ErXwobaYiN019PkySvjV antoni english
ts-node scripts/add-elevenlabs-voice.ts VR6AewLTigWG4xSOukaG arnold english
```

### Manual Method

Edit `cloned-voices.json`:

```json
{
  "my_voice": {
    "id": "my_voice",
    "label": "My Professional Voice",
    "description": "ElevenLabs voice for videos",
    "language": "english",
    "humanize": {
      "breathPauses": true,
      "fillers": false,
      "rateVariation": true
    },
    "elevenlabs": {
      "voiceId": "YOUR_VOICE_ID_HERE",
      "modelId": "eleven_multilingual_v2"
    },
    "voice": {
      "voice": "en-IN-PrabhatNeural",
      "rate": "+5%",
      "pitch": "+1Hz"
    }
  }
}
```

---

## Step 3: Test Your Voice

```bash
# Test voice generation (creates audio only)
npm run voice:test "This is a test of my new ElevenLabs voice. How does it sound?"
```

Audio will be saved to `output/test-tts-[timestamp]/voice.mp3`

---

## Step 4: Generate Your First Video

```bash
# Generate a complete video with your voice
npm run generate -- --niche tech --voice my_voice

# Or use the full pipeline
npm run pipeline
```

Your video will be in: `output/tech-[timestamp]/final.mp4`

---

## 🎬 Available Commands

```bash
# Generate video with specific voice
npm run generate -- --niche ai --voice rachel
npm run generate -- --niche finance --voice arnold
npm run generate -- --niche tech --voice antoni

# Run full automated pipeline
npm run pipeline

# Test voice only
npm run voice:test "Your test text here"

# List all available voices
npm run voice:list
```

---

## 🔧 Voice Configuration Options

### Language Options
- `english` - Pure English
- `hinglish` - Mix of Hindi and English
- `hindi` - Pure Hindi

### Humanization Settings
```json
"humanize": {
  "breathPauses": true,      // Adds natural pauses
  "fillers": true,            // Adds "umm", "you know" style fillers
  "rateVariation": true       // Varies speaking speed
}
```

### ElevenLabs Models
- `eleven_multilingual_v2` - Best quality, multiple languages (default)
- `eleven_monolingual_v1` - English only, faster generation
- `eleven_turbo_v2` - Fastest, good quality

---

## 💰 ElevenLabs Pricing

**Free Tier** (Current):
- ✅ 10,000 characters/month
- ✅ 29 standard voices
- ✅ Instant voice cloning
- ⚠️ Limited voice library

**Creator Plan** ($22/month):
- ✅ 100,000 characters/month
- ✅ Professional voice library
- ✅ Better quality clones
- ✅ Priority generation

**Pro Plan** ($99/month):
- ✅ 500,000 characters/month
- ✅ All features unlocked

---

## 🐛 Troubleshooting

### "ElevenLabs API Key not found"
- Check `.env` file has: `ELEVENLABS_API_KEY=sk_...`
- Get key from: https://elevenlabs.io/app/settings/api-keys

### "Quota exceeded"
- Check usage: https://elevenlabs.io/app/usage
- Upgrade plan or wait for monthly reset
- System will auto-fallback to Edge TTS

### "Voice not working"
- Verify voice ID is correct (no spaces)
- Test with a simple phrase first
- Check ElevenLabs dashboard for voice status

### "Audio sounds robotic"
- Increase `stability` in voice settings (0.7-0.9)
- Enable `breathPauses` in humanization
- Use multilingual v2 model for better quality

---

## 📚 Additional Resources

- **ElevenLabs Dashboard**: https://elevenlabs.io/app
- **Voice Library**: https://elevenlabs.io/app/voice-library
- **API Documentation**: https://elevenlabs.io/docs
- **Usage & Billing**: https://elevenlabs.io/app/subscription

---

## ⭐ Recommended Voices for Content Types

**Tech/AI Content** 🤖
- Antoni (Soft, explaining)
- Arnold (Deep, authoritative)

**Finance/Business** 💼
- Adam (Mature, professional)
- Rachel (Clear, confident)

**Motivational/Inspirational** ✨
- Sam (Young, energetic)
- Bella (Confident, empowering)

**Entertainment/Story** 🎭
- Dorothy (Engaging, pleasant)
- Elli (Friendly, relatable)

**Indian/Bollywood** 🇮🇳
- Use Edge TTS: `hi-IN-MadhurNeural` (Young)
- Use Edge TTS: `hi-IN-SwaraNeural` (Female)
- Or clone your own voice!

---

**Ready to create amazing videos with ElevenLabs? Start with Step 1!** 🚀
