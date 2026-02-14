import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Generate a soft ambient background music track using ffmpeg synthesis.
 * Creates a pleasant low-frequency pad that works behind voice-overs.
 * Returns the path to the generated MP3 file, or null on failure.
 */
export async function fetchBackgroundMusic(
  _query: string,
  outputDir: string
): Promise<string | null> {
  const outFile = path.resolve(outputDir, "bg_music.mp3");

  // Resolve ffmpeg from ffmpeg-static
  let ffmpegPath = "ffmpeg";
  try {
    ffmpegPath = require("ffmpeg-static");
  } catch {
    /* fall back to system ffmpeg */
  }

  console.log("  → Generating ambient background music with ffmpeg…");

  // Generate 90 seconds of soft ambient pad:
  // Pink noise → heavy lowpass → gentle volume = dreamy ambient background
  const cmd = [
    `"${ffmpegPath}"`,
    `-y`,
    `-f lavfi -i "anoisesrc=d=90:c=pink:r=44100:a=0.02"`,
    `-af "lowpass=f=300,highpass=f=60,volume=0.15"`,
    `-codec:a libmp3lame -b:a 128k`,
    `"${outFile}"`,
  ].join(" ");

  try {
    await execAsync(cmd, { timeout: 30000 });
    if (fs.existsSync(outFile)) {
      console.log(`  → Background music saved: ${outFile}`);
      return outFile;
    }
  } catch (err: any) {
    console.log(`  → Background music generation failed: ${err.message}`);
  }

  return null;
}
