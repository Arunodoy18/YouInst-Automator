# 🎙️ ElevenLabs Voice Guide for Indian/Bollywood Content

Your ElevenLabs API key is configured, but has limited API permissions. Here's everything you need to know about available voices.

---

## 🔑 Your Current API Key Status

**API Key Found:** ✅ `sk_e13e49...` (configured in `.env`)  
**Permission Level:** Limited (cannot list voices via API)  
**Current Usage:** Working for voice generation ✅

---

## 🌟 How to Check YOUR Available Voices

### Method 1: ElevenLabs Web Dashboard (Recommended)

1. Go to: https://elevenlabs.io/app/voice-library
2. Login with your account
3. You'll see:
   - **Your Cloned Voices** - Any custom voices you've created
   - **Voice Library** - All available voices (free + premium)
   - **Professional Voice Clones** - Celebrity/actor voices (if subscribed)

### Method 2: Check Your Subscription Tier

Visit: https://elevenlabs.io/app/subscription

**Free Tier:**
- 10,000 characters/month
- Access to 29 standard voices
- Voice cloning (instant voice)

**Starter ($5/month):**
- 30,000 characters/month
- All standard voices
- Better voice cloning

**Creator ($22/month):**
- 100,000 characters/month
- Professional voice clones
- **May include Bollywood actor voices**

**Pro/Enterprise:**
- Higher limits
- Celebrity voice library
- Custom voice cloning

---

## 🇮🇳 Indian/Hindi Voices Typically Available

ElevenLabs standard library includes voices that work well for Indian content:

### Best Voices for Indian Accent:

| Voice Name | Voice ID | Description | Best For |
|------------|----------|-------------|----------|
| **Antoni** | `ErXwobaYiN019PkySvjV` | Smooth, well-balanced, professional | General content (currently used for Raju profile) |
| **Josh** | `TxGEqnHWrfWFTfGW9XjX` | Young, energetic American male | Tech/motivation content |
| **Arnold** | `VR6AewLTigWG4xSOukaG` | Strong, assertive masculine | Authority/serious topics |
| **Adam** | `pNInz6obpgDQGcFmaJgB` | Deep, professional narrator | Documentary style |
| **Sam** | `yoZ06aMxZJJ28mfd3POQ` | Dynamic, raspy voice | Energetic content |

### Multilingual Voices (Support Hindi):

ElevenLabs' `eleven_multilingual_v2` model can handle:
- ✅ English
- ✅ Hindi
- ✅ Hinglish (mixed)
- ✅ 28+ other languages

**Note:** For authentic Indian accent, you may need to:
1. Clone an Indian voice (upload 1-10 minutes of audio)
2. Or subscribe to access professional voice library

---

## 🎬 Bollywood Actor Voices

### Are Celebrity Voices Available?

**Standard tier:** ❌ No Bollywood actor voices in free/starter  
**Creator+ tier:** ⚠️ May have some professional voices  
**Enterprise tier:** ✅ Custom voice cloning of any actor (with rights)

### Popular Bollywood Voices (If Available):

ElevenLabs periodically adds professional voice clones. Check your dashboard for:
- Amitabh Bachchan style voices
- Shah Rukh Khan style voices
- Akshay Kumar style voices
- Other Indian celebrity clones

**As of Feb 2026:** ElevenLabs has expanded their Indian voice library, but specific Bollywood actors depend on your subscription and their partnership agreements.

---

## 🎤 How to Clone a Bollywood Voice (DIY)

If you have audio of an actor's voice (legally obtained):

### Step 1: Get Clean Audio
- 1-10 minutes of clear speech
- No background music
- Single speaker only
- Good quality recording

### Step 2: Clone in Dashboard
1. Go to: https://elevenlabs.io/app/voice-lab
2. Click "Instant Voice Cloning"
3. Upload your audio file
4. Name your voice (e.g., "Bollywood_Actor_Style")
5. ElevenLabs will generate a voice ID

### Step 3: Add to Your Project

Once cloned, add to `src/lib/tts.ts`:

```typescript
bollywood_voice: {
  id: "bollywood_voice",
  label: "Bollywood Actor Voice",
  description: "Custom cloned Bollywood actor style voice",
  voice: {
    voice: "hi-IN-MadhurNeural", // Fallback Edge TTS
    rate: "+5%",
    pitch: "+2Hz",
  },
  language: "hinglish",
  humanize: {
    breathPauses: true,
    fillers: true,
    rateVariation: true,
  },
  elevenlabs: {
    voiceId: "YOUR_CLONED_VOICE_ID_HERE", // From dashboard
    modelId: "eleven_multilingual_v2",
  },
},
```

---

## 🔧 Current Configuration in Your Project

Your `src/lib/tts.ts` has these profiles:

### 1. **raju** (Raju Rastogi - 3 Idiots style)
```typescript
voice: "hi-IN-MadhurNeural" (Edge TTS backup)
elevenlabs: {
  voiceId: "ErXwobaYiN019PkySvjV", // Antoni voice
  modelId: "eleven_multilingual_v2"
}
```
**Status:** ✅ Works with your API key  
**Style:** Young, expressive, Hinglish casual

### 2. **default** (Indian English)
```typescript
voice: "en-IN-PrabhatNeural" (Edge TTS)
```
**Status:** ✅ Works (uses free Edge TTS, no ElevenLabs needed)

### 3. **madhur** (Hindi)
```typescript
voice: "hi-IN-MadhurNeural" (Edge TTS)
```
**Status:** ✅ Works (Edge TTS only)

---

## 🎯 Recommended Actions

### Option 1: Use Current Setup (Free)
Your current "raju" profile uses **Antoni** voice from ElevenLabs, which is available on free tier. It's a professional, smooth voice that can sound Indian with proper Hindi/Hinglish text.

**Try it now:**
```bash
npm run generate
# Select "raju" voice profile
```

### Option 2: Clone Your Own Bollywood Voice
1. Record or obtain 2-5 minutes of clean Hindi speech (your own voice or licensed audio)
2. Upload to ElevenLabs voice lab
3. Add the voice ID to your config
4. Test with your scripts

### Option 3: Check Voice Library
1. Login to ElevenLabs dashboard
2. Browse Voice Library: https://elevenlabs.io/voice-library
3. Filter by:
   - Language: Hindi
   - Accent: Indian
   - Gender: Male/Female
4. Note the voice IDs you like
5. Add them to `tts.ts`

### Option 4: Upgrade Subscription
If you need professional Bollywood actor voices:
- Upgrade to Creator tier ($22/month)
- Access professional voice library
- Check if specific actors are available

---

## 🧪 Test Your Current Voice

Let me create a test script:

```bash
# Test current raju voice with ElevenLabs
npx ts-node src/cli/test-voice.ts
```

Would you like me to:
1. ✅ Create a test script to try your current ElevenLabs voice?
2. ✅ Show you how to add more voices once you find them in dashboard?
3. ✅ Configure alternative Indian voices using free Edge TTS?

---

## 📊 Voice Comparison: ElevenLabs vs Edge TTS

| Feature | ElevenLabs | Edge TTS (Free) |
|---------|-----------|-----------------|
| **Quality** | ⭐⭐⭐⭐⭐ Natural, human-like | ⭐⭐⭐ Good, slightly robotic |
| **Cost** | $0-$22+/month | Free (unlimited) |
| **Indian Voices** | Limited (need cloning) | ✅ Native Hindi voices |
| **Customization** | High (cloning, tuning) | Limited |
| **Languages** | 29+ including Hindi | 100+ including Hindi |
| **Best For** | Premium content, podcasts | Bulk content, testing |

**Your Current Setup Uses Both:**
- Primary: ElevenLabs (Antoni voice for quality)
- Fallback: Edge TTS (if ElevenLabs fails)

---

## 🎬 Next Steps

1. **Check your ElevenLabs dashboard** for available voices
2. **Test current setup** - Generate a video with "raju" voice
3. **Clone custom voice** if you have audio of desired Bollywood voice
4. **Let me know** which voices you find, and I'll help integrate them!

**Want me to create a voice test script?** I can generate sample audio with different voices so you can compare quality. 🎙️
