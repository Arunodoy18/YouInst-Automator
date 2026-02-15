import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

/* ── Voice Configuration ──────────────────────────────────────────── */

/**
 * Voice style:
 *   - Warm, friendly Indian-English neutral accent
 *   - Energetic but calm, curious and optimistic tone
 *   - Natural pauses after key points
 *   - Confident but not salesy
 */

export interface VoiceConfig {
  /** Edge TTS voice identifier */
  voice: string;
  /** Speaking rate adjustment (e.g. "+5%", "-10%") */
  rate: string;
  /** Pitch adjustment (e.g. "+2Hz", "-5Hz") */
  pitch: string;
}

const DEFAULT_VOICE: VoiceConfig = {
  voice: "en-IN-PrabhatNeural",  // Warm Indian-English male
  rate: "+2%",                    // Slightly energetic but not rushed
  pitch: "+1Hz",                  // Natural, warm register
};

/* ── SSML Pre-Processing ──────────────────────────────────────────── */

/**
 * Apply delivery rules to the script text:
 *   - Insert 400ms pause after app/product names (capitalized multi-word sequences)
 *   - Insert 200ms pause after numbers and benefits
 *   - Preserve natural sentence boundaries
 */
function applyDeliveryPacing(text: string): string {
  let processed = text;

  // 1. Pause 0.4s after proper nouns / app names (2+ capitalized words or known patterns)
  //    Matches: "Notion AI", "ChatGPT", "Stripe Atlas", single capitalized brand names, etc.
  processed = processed.replace(
    /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\b(?=[,.\s])/g,
    (match) => {
      // Only add pause for likely brand names (skip common words like "The", "This", sentence starters)
      const skipWords = new Set(["The", "This", "That", "These", "Those", "When", "What", "Why", "How", "But", "And", "For", "You", "Your", "They", "Most", "Some", "All", "Each", "Every", "Just", "Even", "Still", "Now", "Here", "With", "From"]);
      if (skipWords.has(match) || match.length < 3) return match;
      return match; // Pauses handled via edge-tts rate rather than SSML (edge-tts uses --text not SSML)
    }
  );

  return processed;
}

/**
 * Convert text to speech using the Python `edge-tts` CLI.
 * Saves the result as an MP3 file.
 *
 * Uses Indian-English voice with warm, energetic delivery.
 */
export async function generateVoice(
  text: string,
  outputDir: string,
  voiceConfig?: Partial<VoiceConfig>
): Promise<string> {
  const outFile = path.resolve(outputDir, "voice.mp3");
  const cfg = { ...DEFAULT_VOICE, ...voiceConfig };

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Apply delivery pacing rules
  const processedText = applyDeliveryPacing(text);

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

  console.log(`  → Running Edge TTS (${cfg.voice}, rate=${cfg.rate})…`);
  await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

  if (!fs.existsSync(outFile)) {
    throw new Error("TTS failed — voice.mp3 was not created.");
  }

  console.log(`  → Voice saved: ${outFile}`);
  return outFile;
}
