import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface WhisperSegment {
  text: string;
  start: number; // seconds
  end: number;   // seconds
  words: WordTimestamp[];
}

/**
 * Run Whisper on an audio file to get word-level timestamps.
 * Uses the "base" model for speed (good enough for TTS audio).
 * Returns segments with word-level timing.
 */
export async function transcribeWithWhisper(
  audioPath: string,
  outputDir: string
): Promise<WhisperSegment[]> {
  const jsonOutput = path.resolve(outputDir, "whisper_output.json");
  const scriptFile = path.resolve(outputDir, "_whisper_run.py");

  // Resolve ffmpeg path from ffmpeg-static so Whisper can decode audio
  let ffmpegDir = "";
  try {
    const ffmpegPath: string = require("ffmpeg-static");
    ffmpegDir = path.dirname(ffmpegPath);
  } catch { /* fall back to system ffmpeg */ }

  // Write a temporary Python script file (avoids shell escaping nightmares)
  // Use forward slashes in paths to avoid Python raw-string issues
  const audioPosix = audioPath.replace(/\\/g, "/");
  const jsonPosix = jsonOutput.replace(/\\/g, "/");

  const pythonScript = `
import whisper
import json

model = whisper.load_model("base")
result = model.transcribe("${audioPosix}", word_timestamps=True)

segments = []
for seg in result["segments"]:
    words = []
    for w in seg.get("words", []):
        words.append({
            "word": w["word"].strip(),
            "start": round(w["start"], 3),
            "end": round(w["end"], 3)
        })
    segments.append({
        "text": seg["text"].strip(),
        "start": round(seg["start"], 3),
        "end": round(seg["end"], 3),
        "words": words
    })

with open("${jsonPosix}", "w", encoding="utf-8") as f:
    json.dump(segments, f, ensure_ascii=False, indent=2)

print("OK")
`.trim();

  fs.writeFileSync(scriptFile, pythonScript, "utf-8");

  console.log("  → Running Whisper transcription (word-level)…");

  // Prepend ffmpeg-static dir to PATH so Whisper can find ffmpeg
  const env = { ...process.env };
  if (ffmpegDir) {
    // Windows uses "Path" not "PATH" — find the actual key
    const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") || "PATH";
    env[pathKey] = ffmpegDir + path.delimiter + (env[pathKey] || "");
  }

  try {
    await execAsync(`python "${scriptFile}"`, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600000, // 10 minutes — first run downloads ~139MB model
      env,
    });
  } finally {
    // Clean up temp script
    if (fs.existsSync(scriptFile)) fs.unlinkSync(scriptFile);
  }

  if (!fs.existsSync(jsonOutput)) {
    throw new Error("Whisper failed — no JSON output created.");
  }

  const raw = fs.readFileSync(jsonOutput, "utf-8");
  const segments: WhisperSegment[] = JSON.parse(raw);

  console.log(`  → Whisper found ${segments.length} segments, ${segments.reduce((n, s) => n + s.words.length, 0)} words`);

  return segments;
}

/**
 * Group words into timed caption lines (3-6 words each)
 * for display as animated captions in the video.
 */
export function groupWordsIntoCaptions(
  segments: WhisperSegment[],
  wordsPerCaption: number = 5
): { text: string; start: number; end: number }[] {
  // Flatten all words
  const allWords: WordTimestamp[] = [];
  for (const seg of segments) {
    allWords.push(...seg.words);
  }

  const captions: { text: string; start: number; end: number }[] = [];

  for (let i = 0; i < allWords.length; i += wordsPerCaption) {
    const chunk = allWords.slice(i, i + wordsPerCaption);
    if (chunk.length === 0) continue;

    captions.push({
      text: chunk.map((w) => w.word).join(" "),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
    });
  }

  return captions;
}
