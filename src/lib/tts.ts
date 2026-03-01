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

/* ── Dynamic Cloned Voices ────────────────────────────────────────── */

/** Runtime registry: merged built-in + cloned voices */
const ALL_PROFILES: Record<string, VoiceProfile> = { ...VOICE_PROFILES };

/**
 * Load cloned voice profiles from cloned-voices.json.
 * Call this at startup or before voice resolution.
 * Safe to call multiple times — merges into ALL_PROFILES.
 */
export function loadClonedVoices(): void {
  const clonedPath = path.resolve(__dirname, "../../cloned-voices.json");
  if (!fs.existsSync(clonedPath)) return;

  try {
    const cloned: Record<string, VoiceProfile> = JSON.parse(
      fs.readFileSync(clonedPath, "utf-8")
    );
    for (const [id, profile] of Object.entries(cloned)) {
      ALL_PROFILES[id] = profile;
    }
    const count = Object.keys(cloned).length;
    if (count > 0) {
      console.log(`  → Loaded ${count} cloned voice profile(s) from cloned-voices.json`);
    }
  } catch {
    // Silently ignore parse errors
  }
}

// Auto-load on import
loadClonedVoices();

/** Get a voice profile by ID (falls back to "raju" as default).
 *  Checks both built-in and cloned voice profiles. */
export function getVoiceProfile(profileId?: string): VoiceProfile {
  if (!profileId) return ALL_PROFILES.raju ?? VOICE_PROFILES.raju;
  return ALL_PROFILES[profileId] ?? VOICE_PROFILES.raju;
}

/** Get all available voice profiles (built-in + cloned) */
export function getAllVoiceProfiles(): Record<string, VoiceProfile> {
  return { ...ALL_PROFILES };
}

/* ── Humanization Engine ──────────────────────────────────────────── */

/**
 * Apply human-like speech patterns to text before sending to TTS.
 * Keeps delivery natural — avoids over-engineering that makes voices robotic:
 *   - Removes "..." patterns (Edge TTS reads them as identical mechanical gaps)
 *   - Adds light comma-beats before natural connector words only
 *   - Lets Edge TTS's neural model handle prosody/emphasis naturally
 */
function humanizeText(text: string, profile: VoiceProfile): string {
  let processed = text;

  // Strip any pre-existing "..." — Edge TTS reads them as literal gaps
  // which creates the mechanical robotic cadence. Remove them entirely.
  processed = processed.replace(/\s*\.\.\.\s*/g, " ");

  if (profile.humanize.breathPauses) {
    // Insert a light comma-pause ONLY before connector words that naturally
    // benefit from a brief breath beat. Do NOT pause after every sentence end —
    // Edge TTS's neural model already handles "." "!" "?" as natural prosodic breaks.
    processed = processed.replace(
      /\s+(but|because|and that's|which means|so now|the thing is)\b/gi,
      ", $1"
    );
  }

  // NOTE: The old rateVariation logic wrapped power words as "... word ..."
  // which sandwiched identical robotic gaps around every "never", "impossible", etc.
  // Removed — Edge TTS's neural model stresses these words naturally on its own.

  // Clean up any double commas introduced above
  processed = processed.replace(/(,\s*){2,}/g, ", ");

  return processed.trim();
}

/* ── Main TTS Function ────────────────────────────────────────────── */

/* ── Audio Smoothing Post-Processor ──────────────────────────────── */

/**
 * Apply broadcast-quality audio processing to any generated voice file.
 * Makes the voice sound silky smooth and professional:
 *   - High-pass filter: removes low rumble (< 100Hz)
 *   - Loudness normalization: EBU R128 -16 LUFS (broadcast standard)
 *   - Soft compressor: glues dynamics without squashing the voice
 *   - Presence EQ: subtle 3kHz boost for clarity and warmth
 *   - Brick-wall limiter: prevents clipping at 0dBFS
 */
export async function smoothAudio(inputFile: string): Promise<string> {
  if (!fs.existsSync(inputFile)) return inputFile;

  const dir = path.dirname(inputFile);
  const ext = path.extname(inputFile);
  const base = path.basename(inputFile, ext);
  const smoothedFile = path.join(dir, `${base}_smooth${ext}`);

  // Full broadcast-grade filter chain
  const filterChain = [
    "highpass=f=100",                                                           // remove low rumble
    "acompressor=threshold=-24dB:ratio=3:attack=5:release=80:makeup=2",         // soft compression
    "equalizer=f=250:width_type=o:width=2:g=-1",                                // reduce boxiness
    "equalizer=f=3000:width_type=o:width=2:g=1.5",                              // presence & clarity
    "loudnorm=I=-16:LRA=8:TP=-1.5",                                             // EBU R128 loudness
    "alimiter=limit=0.95:attack=5:release=50",                                  // brick-wall limiter
  ].join(",");

  const cmd = `ffmpeg -y -i "${inputFile}" -af "${filterChain}" -q:a 2 "${smoothedFile}"`;

  try {
    await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    if (fs.existsSync(smoothedFile)) {
      // Replace original with smoothed version
      fs.renameSync(smoothedFile, inputFile);
      console.log(`  → Audio smoothed: EQ + compression + loudnorm applied`);
    }
  } catch {
    // If ffmpeg post-processing fails, keep original unsmoothed audio
    if (fs.existsSync(smoothedFile)) fs.unlinkSync(smoothedFile);
    console.warn(`  ⚠  Audio smoothing skipped (ffmpeg not available in PATH)`);
  }

  return inputFile;
}

/**
 * Generate voice using ElevenLabs API (for voice cloning).
 * Requires ELEVENLABS_API_KEY environment variable.
 * Uses smoothness-optimised voice settings for natural, cinematic delivery.
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
      // ── Smoothness-optimised settings ──────────────────────────────
      stability: 0.80,          // High stability → consistent, smooth delivery (was 0.5)
      similarityBoost: 0.85,    // Stay close to cloned voice (was 0.75)
      style: 0.20,              // Low style exaggeration → natural, not over-acted (was 0.5)
      useSpeakerBoost: true,    // Enhances voice clarity and presence
      // ───────────────────────────────────────────────────────────────
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
      // Apply broadcast-quality audio smoothing
      await smoothAudio(outFile);
      console.log(`  → Voice saved: ${outFile} (ElevenLabs, smoothed, humanized=${profile.humanize.breathPauses})`);
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

  // Apply broadcast-quality audio smoothing to Edge TTS output too
  await smoothAudio(outFile);

  console.log(`  → Voice saved: ${outFile} (Edge TTS, smoothed, humanized=${profile.humanize.breathPauses})`);
  return outFile;
}
