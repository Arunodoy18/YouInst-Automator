/**
 * Quick Setup: Add ElevenLabs Voice to Your Profile
 *
 * Usage:
 *   ts-node scripts/add-elevenlabs-voice.ts <voiceId> <profileName> <language>
 *
 * Example:
 *   ts-node scripts/add-elevenlabs-voice.ts 21m00Tcm4TlvDq8ikWAM rachel english
 *
 * Get voice IDs from: https://elevenlabs.io/app/voice-library
 */

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
  🎙️  Add ElevenLabs Voice to Profile
  ─────────────────────────────────────

  Usage:
    ts-node scripts/add-elevenlabs-voice.ts <voiceId> <profileName> <language>

  Example:
    ts-node scripts/add-elevenlabs-voice.ts 21m00Tcm4TlvDq8ikWAM rachel english

  Popular ElevenLabs Voice IDs:
    21m00Tcm4TlvDq8ikWAM  - Rachel (clear, professional female)
    ErXwobaYiN019PkySvjV  - Antoni (soft, warm male)
    VR6AewLTigWG4xSOukaG  - Arnold (deep, authoritative male)
    EXAVITQu4vr4xnSDxMaL  - Bella (confident, smooth female)
    ThT5KcBeYPX3keUQqHPh  - Dorothy (pleasant, engaging female)

  Languages:
    english, hindi, hinglish

  Get more voices: https://elevenlabs.io/app/voice-library
  `);
  process.exit(1);
}

const [voiceId, profileName, language] = args;

// Validate language
if (!["english", "hindi", "hinglish"].includes(language)) {
  console.error(`  ❌ Invalid language: ${language}`);
  console.error(`     Must be: english, hindi, or hinglish`);
  process.exit(1);
}

// Load existing cloned voices
const clonedPath = path.resolve(__dirname, "../cloned-voices.json");
let clonedVoices: Record<string, any> = {};

if (fs.existsSync(clonedPath)) {
  try {
    clonedVoices = JSON.parse(fs.readFileSync(clonedPath, "utf-8"));
  } catch {
    console.warn("  ⚠️  Could not parse cloned-voices.json, creating new file...");
  }
}

// Create new profile with ElevenLabs configuration
const newProfile = {
  id: profileName,
  label: `${profileName.charAt(0).toUpperCase() + profileName.slice(1)} (ElevenLabs)`,
  description: `ElevenLabs voice: ${voiceId}`,
  language: language,
  humanize: {
    breathPauses: true,
    fillers: language === "hindi" || language === "hinglish",
    rateVariation: true,
  },
  elevenlabs: {
    voiceId: voiceId,
    modelId: "eleven_multilingual_v2",
  },
  // Fallback Edge TTS if ElevenLabs fails
  voice: {
    voice: language === "hindi" ? "hi-IN-MadhurNeural" : "en-IN-PrabhatNeural",
    rate: "+5%",
    pitch: "+1Hz",
  },
};

// Add to cloned voices
clonedVoices[profileName] = newProfile;

// Save back to file
fs.writeFileSync(clonedPath, JSON.stringify(clonedVoices, null, 2), "utf-8");

console.log(`
  ✅ ElevenLabs voice added successfully!

  Profile Name: ${profileName}
  Voice ID:     ${voiceId}
  Language:     ${language}
  Model:        eleven_multilingual_v2

  🎬 Test the voice:
     npm run voice:test "This is a test of my new voice!"

  🚀 Generate a video with this voice:
     npm run generate -- --niche tech --voice ${profileName}

  📝 Profile saved to: cloned-voices.json
`);
