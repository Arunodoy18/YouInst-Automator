/**
 * YouInst-Automator — Main CLI entry point
 *
 * Usage:
 *   npm run generate -- "Your topic here"
 */

import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { generateScript } from "../lib/groq";
import { generateVoice } from "../lib/tts";
import { splitScript } from "../lib/scriptSplitter";
import { transcribeWithWhisper, groupWordsIntoCaptions } from "../lib/whisper";
import { fetchBackgroundMusic } from "../lib/pixabay";
import { renderVideo } from "../lib/videoRenderer";
import { uploadToYouTube } from "../lib/youtube";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

async function main() {
  // ── 1. Read topic from CLI args ─────────────────────────────────────
  const topic = process.argv[2];
  if (!topic) {
    console.error("❌  Please provide a topic:");
    console.error('   npm run generate -- "Your topic here"');
    process.exit(1);
  }
  console.log(`\n🎬  YouInst-Automator`);
  console.log(`────────────────────────────────────────`);
  console.log(`Topic: "${topic}"\n`);

  // ── 2. Generate script via Groq ─────────────────────────────────────
  console.log("[1/7] Generating script with Groq…");
  const script = await generateScript(topic);
  console.log(`  → Title: ${script.title}`);
  console.log(`  → Script length: ${script.fullScript.length} chars\n`);

  // ── 3. Generate voice-over ───────────────────────────────────────────
  console.log("[2/7] Generating voice-over with Edge TTS…");
  const voicePath = await generateVoice(script.fullScript, OUTPUT_DIR);
  console.log();

  // ── 4. Whisper transcription for word-level timing ───────────────────
  console.log("[3/7] Transcribing with Whisper for precise timing…");
  const segments = await transcribeWithWhisper(voicePath, OUTPUT_DIR);
  const captions = groupWordsIntoCaptions(segments, 5);
  console.log(`  → ${captions.length} timed captions created\n`);

  // ── 5. Fetch background music from Pixabay ───────────────────────────
  console.log("[4/7] Fetching background music from Pixabay…");
  const bgMusicPath = await fetchBackgroundMusic(topic, OUTPUT_DIR);
  console.log();

  // ── 6. Fallback scenes (in case Whisper had issues) ──────────────────
  console.log("[5/7] Preparing scenes…");
  const scenes = splitScript(script.fullScript);
  console.log(`  → ${scenes.length} fallback scenes ready\n`);

  // ── 7. Render video with Remotion ────────────────────────────────────
  console.log("[6/7] Rendering Shorts video with Remotion…");
  const videoPath = await renderVideo(scenes, voicePath, OUTPUT_DIR, {
    captions: captions.length > 0 ? captions : undefined,
    bgMusicPath,
  });
  console.log();

  // ── 8. Upload to YouTube ─────────────────────────────────────────────
  console.log("[7/7] Uploading to YouTube…");
  const url = await uploadToYouTube(videoPath, script.title, script.description);
  console.log();

  // ── Done ──────────────────────────────────────────────────────────────
  console.log(`════════════════════════════════════════`);
  console.log(`✅  All done!`);
  console.log(`   Video : ${videoPath}`);
  console.log(`   YouTube: ${url}`);
  console.log(`════════════════════════════════════════\n`);
}

main().catch((err) => {
  console.error("\n❌  Pipeline failed:\n", err);
  process.exit(1);
});
