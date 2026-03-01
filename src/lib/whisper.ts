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
 * Common tech/brand name misrecognitions Whisper makes with base model.
 * Applied after transcription as a safety net.
 */
const CAPTION_CORRECTIONS: [RegExp, string][] = [
  [/\bcloud\b/g, "Claude"],
  [/\bClaude's\b/g, "Claude's"],
  [/\bopen a i\b/gi, "OpenAI"],
  [/\bopen ai\b/gi, "OpenAI"],
  [/\bopen-ai\b/gi, "OpenAI"],
  [/\bgit hub\b/gi, "GitHub"],
  [/\bco-?pilot\b/gi, "Copilot"],
  [/\bco pilot\b/gi, "Copilot"],
  [/\bcodex\b/gi, "Codex"],
  [/\bgpt-?4o\b/gi, "GPT-4o"],
  [/\bgpt-?4\b/gi, "GPT-4"],
  [/\bgpt-?3\b/gi, "GPT-3"],
  [/\banthropic\b/gi, "Anthropic"],
  [/\bgemini\b/gi, "Gemini"],
  [/\bllm\b/gi, "LLM"],
  [/\bllms\b/gi, "LLMs"],
  [/\bapi\b/gi, "API"],
  [/\bapis\b/gi, "APIs"],
];

function correctCaptionText(text: string): string {
  let fixed = text;
  for (const [pattern, replacement] of CAPTION_CORRECTIONS) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

/**
 * Run Whisper on an audio file to get word-level timestamps.
 * Uses the "base" model for speed (good enough for TTS audio).
 * Returns segments with word-level timing.
 *
 * @param audioPath   - Path to the audio file
 * @param outputDir   - Directory to store whisper_output.json
 * @param initialPrompt - Optional: script text / keywords to prime Whisper vocabulary
 *                        Pass the generated script so Whisper recognises brand names correctly.
 */
export async function transcribeWithWhisper(
  audioPath: string,
  outputDir: string,
  initialPrompt?: string
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

  // Escape the prompt for injection into the Python script string
  const escapedPrompt = (initialPrompt || "").slice(0, 400).replace(/\\/g, "\\\\").replace(/"/g, "\\'");

  const pythonScript = `
import whisper
import json

model = whisper.load_model("base")
prompt_text = "${escapedPrompt}"
result = model.transcribe("${audioPosix}", word_timestamps=True, initial_prompt=prompt_text if prompt_text else None)

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

  // Use virtual environment Python if available (Windows: .venv\Scripts\python.exe, Unix: .venv/bin/python)
  // Use process.cwd() to get project root, not __dirname (which points to dist/lib after compilation)
  const projectRoot = process.cwd();
  const venvPythonWin = path.resolve(projectRoot, ".venv/Scripts/python.exe");
  const venvPythonUnix = path.resolve(projectRoot, ".venv/bin/python");
  let pythonCmd = "python";
  if (fs.existsSync(venvPythonWin)) {
    pythonCmd = `"${venvPythonWin}"`;
  } else if (fs.existsSync(venvPythonUnix)) {
    pythonCmd = `"${venvPythonUnix}"`;
  }

  try {
    await execAsync(`${pythonCmd} "${scriptFile}"`, {
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

  // Post-process: fix brand/tech name misrecognitions (e.g. "cloud" → "Claude")
  for (const seg of segments) {
    seg.text = correctCaptionText(seg.text);
    for (const w of seg.words) {
      w.word = correctCaptionText(w.word);
    }
  }

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
