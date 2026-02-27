import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const execAsync = promisify(exec);

/* ── Voice Configuration ──────────────────────────────────────────── */

export interface VoiceConfig {
  /** Edge TTS voice identifier */
  voice: string;
  /** Speaking rate adjustment (e.g. "+5%", "-10%") */
  rate: string;
  /** Pitch adjustment (e.g. "+2Hz", "-5Hz") */
  pitch: string;
}

/* ── Voice Profiles ───────────────────────────────────────────────── */

export interface VoiceProfile {
  id: string;
  label: string;
  description: string;
  voice: VoiceConfig;
  /** Language tag for script generation */
  language: "english" | "hinglish" | "hindi";
  /** Natural speech humanization settings */
  humanize: {
    /** Insert micro-pauses ("..." → natural breath) between sentences */
    breathPauses: boolean;
    /** Add filler markers for the LLM (yaar, bhai, arey) */
    fillers: boolean;
    /** Vary rate within the script (speed up/slow down for emphasis) */
    rateVariation: boolean;
  };
  /** Optional: Use ElevenLabs voice cloning (requires ELEVENLABS_API_KEY) */
  elevenlabs?: {
    voiceId: string;
    modelId?: string;
  };
}

/**
 * Pre-built voice profiles.
 * "raju" is inspired by Raju Rastogi from 3 Idiots —
 * young, expressive Hindi male (Sharman Joshi style), bilingual Hinglish delivery.
 */
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  raju_hindi: {
    id: "raju_hindi",
    label: "Raju Rastogi (Pure Hindi)",
    description: "Raju from 3 Idiots - Young, energetic, pure Hindi with cinema accent (Sharman Joshi style)",
    voice: {
      voice: "hi-IN-MadhurNeural", // Young Hindi male, closest to Sharman Joshi
      rate: "+8%",                  // Slightly fast — excited, energetic like Raju
      pitch: "+3Hz",                // Higher pitch — youthful, animated
    },
    language: "hindi",
    humanize: {
      breathPauses: true,
      fillers: true,              // Hindi fillers: "yaar", "bhai", "arey"
      rateVariation: true,
    },
  },
  raju_english: {
    id: "raju_english",
    label: "Raju Rastogi (English)",
    description: "Raju from 3 Idiots - Young energetic Indian-English accent (Sharman Joshi style)",
    voice: {
      voice: "en-IN-PrabhatNeural", // Indian-English male
      rate: "+8%",                  // Fast, energetic delivery
      pitch: "+3Hz",                // Youthful pitch
    },
    language: "english",
    humanize: {
      breathPauses: true,
      fillers: false,             // Clean English, no Hindi fillers
      rateVariation: true,
    },
  },
  salman_hindi: {
    id: "salman_hindi",
    label: "Salman Khan (Hindi)",
    description: "Salman Khan cinema style - Deep, authoritative Hindi with Bollywood star accent",
    voice: {
      voice: "hi-IN-MadhurNeural",  // Using MadhurNeural with lower settings for depth
      rate: "+0%",                  // Normal pace — confident, controlled
      pitch: "-4Hz",                // Lower pitch — authoritative, masculine Salman style
    },
    language: "hindi",
    humanize: {
      breathPauses: true,
      fillers: true,              // Hindi cinema style fillers
      rateVariation: true,
    },
  },
  salman_english: {
    id: "salman_english",
    label: "Salman Khan (English)",
    description: "Salman Khan cinema style - Deep, confident Indian-English with Bollywood star accent",
    voice: {
      voice: "en-IN-PrabhatNeural", // Indian-English male
      rate: "+2%",                  // Moderate pace — confident delivery
      pitch: "-2Hz",                // Lower pitch — authoritative
    },
    language: "english",
    humanize: {
      breathPauses: true,
      fillers: false,             // Clean English, no Hindi fillers
      rateVariation: true,
    },
  },
  raju: {
    id: "raju",
    label: "Raju Rastogi (Legacy)",
    description: "[DEPRECATED] Use raju_hindi or raju_english instead",
    voice: {
      voice: "hi-IN-MadhurNeural",
      rate: "+8%",
      pitch: "+3Hz",
    },
    language: "hindi",
    humanize: {
      breathPauses: true,
      fillers: true,
      rateVariation: true,
    },
  },
  default: {
    id: "default",
    label: "Default (Indian English)",
    description: "Warm, friendly Indian-English male — neutral professional tone",
    voice: {
      voice: "en-IN-PrabhatNeural",
      rate: "+2%",
      pitch: "+1Hz",
    },
    language: "english",
    humanize: {
      breathPauses: true,
      fillers: false,
      rateVariation: false,
    },
  },
  madhur: {
    id: "madhur",
    label: "Madhur (Hindi)",
    description: "Young Hindi male — energetic casual Hindi",
    voice: {
      voice: "hi-IN-MadhurNeural",
      rate: "+5%",
      pitch: "+1Hz",
    },
    language: "hindi",
    humanize: {
      breathPauses: true,
      fillers: true,
      rateVariation: false,
    },
  },
  swara: {
    id: "swara",
    label: "Swara (Hindi Female)",
    description: "Hindi female voice — authoritative, clear",
    voice: {
      voice: "hi-IN-SwaraNeural",
      rate: "+3%",
      pitch: "-1Hz",
    },
    language: "hinglish",
    humanize: {
      breathPauses: true,
      fillers: false,
      rateVariation: false,
    },
  },
  neerja: {
    id: "neerja",
    label: "Neerja (English Female)",
    description: "Indian-English female — warm, professional",
    voice: {
      voice: "en-IN-NeerjaNeural",
      rate: "+2%",
      pitch: "+0Hz",
    },
    language: "english",
    humanize: {
      breathPauses: true,
      fillers: false,
      rateVariation: false,
    },
  },
};

/** Get a voice profile by ID (falls back to "raju" as default) */
export function getVoiceProfile(profileId?: string): VoiceProfile {
  if (!profileId) return VOICE_PROFILES.raju;
  return VOICE_PROFILES[profileId] ?? VOICE_PROFILES.raju;
}

/* ── Humanization Engine ──────────────────────────────────────────── */

/**
 * Apply human-like speech patterns to text before sending to TTS.
 * Makes the voice sound natural, not robotic:
 *   - Adds breath pauses (commas / ellipses for natural prosody)
 *   - Inserts micro-pauses between sentences
 *   - Adds emphasis markers on key words
 */
function humanizeText(text: string, profile: VoiceProfile): string {
  let processed = text;

  if (profile.humanize.breathPauses) {
    // Add micro pause after short sentences (for breath effect)
    processed = processed.replace(/([.!?])\s+/g, "$1 ... ");

    // Add slight pause before impactful words
    processed = processed.replace(
      /\b(but|because|actually|seriously|honestly|listen|look|imagine|think about it)\b/gi,
      ", $1"
    );

    // Add pause after numbers/stats for impact
    processed = processed.replace(/(\d+[%KMBkm]?)\s/g, "$1, ");
  }

  if (profile.humanize.rateVariation) {
    // For edge-tts we can't vary rate mid-stream, but we can add
    // emphasis via pauses: slow down on key claims
    processed = processed.replace(
      /\b(never|always|everyone|nobody|impossible|guaranteed|secret|truth|shocking|insane|crazy)\b/gi,
      "... $1 ..."
    );
  }

  // Clean up multiple consecutive pauses / commas
  processed = processed.replace(/(\.\.\.\s*){2,}/g, "... ");
  processed = processed.replace(/(,\s*){2,}/g, ", ");
  processed = processed.replace(/,\s*\.\.\./g, "...");

  return processed.trim();
}

/* ── Main TTS Function ────────────────────────────────────────────── */

/**
 * Generate voice using ElevenLabs API (for voice cloning).
 * Requires ELEVENLABS_API_KEY environment variable.
 */
async function generateVoiceElevenLabs(
  text: string,
  outputFile: string,
  voiceId: string,
  modelId: string = "eleven_multilingual_v2"
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not set in environment");
  }

  const client = new ElevenLabsClient({ apiKey });

  console.log(`  → Generating voice with ElevenLabs (voiceId: ${voiceId}, model: ${modelId})…`);

  const audioStream = await client.textToSpeech.stream(voiceId, {
    text,
    modelId: modelId,
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true,
    },
  });

  // Write stream to file
  const writeStream = fs.createWriteStream(outputFile);
  for await (const chunk of audioStream) {
    writeStream.write(chunk);
  }
  writeStream.end();

  // Wait for write to complete
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });

  console.log(`  → ElevenLabs voice saved: ${outputFile}`);
}

/**
 * Convert text to speech using the Python `edge-tts` CLI.
 * Saves the result as an MP3 file.
 *
 * If the voice profile has ElevenLabs configured and ELEVENLABS_API_KEY
 * is set, uses ElevenLabs for authentic voice cloning.
 *
 * @param text - Script text to speak
 * @param outputDir - Output directory for voice.mp3
 * @param voiceConfig - Partial voice config overrides (legacy)
 * @param profileId - Voice profile ID ("raju", "default", "madhur", "swara", "neerja")
 */
export async function generateVoice(
  text: string,
  outputDir: string,
  voiceConfig?: Partial<VoiceConfig>,
  profileId?: string
): Promise<string> {
  const outFile = path.resolve(outputDir, "voice.mp3");

  // Resolve voice: profile takes precedence, then voiceConfig overrides, then default
  const profile = getVoiceProfile(profileId);
  const cfg: VoiceConfig = {
    ...profile.voice,
    ...voiceConfig,
  };

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Apply humanization to make speech sound natural
  const processedText = humanizeText(text, profile);

  // ── Check if ElevenLabs is available and configured ────────────────
  if (profile.elevenlabs && process.env.ELEVENLABS_API_KEY) {
    try {
      await generateVoiceElevenLabs(
        processedText,
        outFile,
        profile.elevenlabs.voiceId,
        profile.elevenlabs.modelId
      );
      console.log(`  → Voice saved: ${outFile} (ElevenLabs, humanized=${profile.humanize.breathPauses})`);
      return outFile;
    } catch (err: any) {
      console.warn(`  ⚠️  ElevenLabs failed (${err.message}), falling back to Edge TTS…`);
      // Fall through to Edge TTS
    }
  }

  // ── Fallback to Edge TTS ───────────────────────────────────────────
  // Escape double-quotes inside the text for shell safety
  const safeText = processedText.replace(/"/g, '\\"');

  // Build edge-tts command with voice config
  const command = [
    `edge-tts`,
    `--text "${safeText}"`,
    `--voice "${cfg.voice}"`,
    `--rate="${cfg.rate}"`,
    `--pitch="${cfg.pitch}"`,
    `--write-media "${outFile}"`,
  ].join(" ");

  console.log(`  → Running Edge TTS (${cfg.voice}, rate=${cfg.rate}, profile=${profile.id})…`);
  await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

  if (!fs.existsSync(outFile)) {
    throw new Error("TTS failed — voice.mp3 was not created.");
  }

  console.log(`  → Voice saved: ${outFile} (humanized=${profile.humanize.breathPauses})`);
  return outFile;
}
