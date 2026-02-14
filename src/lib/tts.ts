import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Convert text to speech using the Python `edge-tts` CLI.
 * Saves the result as an MP3 file.
 */
export async function generateVoice(
  text: string,
  outputDir: string
): Promise<string> {
  const outFile = path.resolve(outputDir, "voice.mp3");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Escape double-quotes inside the text for shell safety
  const safeText = text.replace(/"/g, '\\"');

  // Use Python edge-tts CLI directly
  const command = `edge-tts --text "${safeText}" --voice "en-US-ChristopherNeural" --write-media "${outFile}"`;

  console.log("  → Running Edge TTS…");
  await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

  if (!fs.existsSync(outFile)) {
    throw new Error("TTS failed — voice.mp3 was not created.");
  }

  console.log(`  → Voice saved: ${outFile}`);
  return outFile;
}
