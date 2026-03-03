/**
 * VoiceBox TTS Integration (Meta's Open Source TTS)
 * Replaces Edge TTS and ElevenLabs with open-source alternative
 * 
 * Features:
 * - Zero-shot voice cloning
 * - Emotion control
 * - Multilingual support
 * - Commercial use allowed
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export interface VoiceBoxConfig {
  voiceId?: string;           // Voice sample for cloning
  speed?: number;             // 0.5 - 2.0
  emotion?: "neutral" | "happy" | "sad" | "angry" | "excited";
  language?: "en" | "hi" | "es" | "fr" | "de";
  modelPath?: string;         // Path to VoiceBox models
}

export interface VoiceBoxOptions {
  text: string;
  outputPath: string;
  config?: VoiceBoxConfig;
}

const DEFAULT_CONFIG: VoiceBoxConfig = {
  speed: 1.0,
  emotion: "neutral",
  language: "en",
  modelPath: process.env.VOICEBOX_MODEL_PATH || "./models/voicebox",
};

/**
 * Generate speech using VoiceBox (Meta's TTS)
 */
export async function generateVoiceBox(options: VoiceBoxOptions): Promise<string> {
  const config: VoiceBoxConfig = { ...DEFAULT_CONFIG, ...options.config };
  const { text, outputPath } = options;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("  [VoiceBox] Generating speech...");
  console.log(`    Text: ${text.substring(0, 50)}...`);
  console.log(`    Emotion: ${config.emotion}`);
  console.log(`    Language: ${config.language}`);

  // Check if VoiceBox is installed
  const venvPython = getVoiceBoxPython();
  
  try {
    // Create Python script for VoiceBox generation
    const scriptPath = path.join(outputDir, "_voicebox_run.py");
    const script = generateVoiceBoxScript(text, outputPath, config);
    fs.writeFileSync(scriptPath, script, "utf-8");

    // Execute VoiceBox
    await execAsync(`${venvPython} "${scriptPath}"`, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000, // 2 minutes
    });

    // Clean up script
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error("VoiceBox failed to generate audio file");
    }

    const stats = fs.statSync(outputPath);
    console.log(`  [VoiceBox] ✓ Generated ${(stats.size / 1024).toFixed(1)} KB`);
    
    return outputPath;
  } catch (error: any) {
    console.error(`  [VoiceBox] Error: ${error.message}`);
    throw new Error(`VoiceBox generation failed: ${error.message}`);
  }
}

/**
 * Generate Python script for VoiceBox
 */
function generateVoiceBoxScript(
  text: string,
  outputPath: string,
  config: VoiceBoxConfig
): string {
  const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, " ");
  
  return `
import sys
import os
from pathlib import Path

# Add VoiceBox to path
voicebox_path = "${config.modelPath}"
if os.path.exists(voicebox_path):
    sys.path.insert(0, voicebox_path)

try:
    from metavoice import MetaVoice
    
    # Initialize VoiceBox
    model = MetaVoice(model_path="${config.modelPath}")
    
    # Generate speech
    audio = model.synthesize(
        text="${escapedText}",
        speed=${config.speed},
        emotion="${config.emotion}",
        language="${config.language}"
    )
    
    # Save to file
    model.save_audio(audio, "${outputPath.replace(/\\/g, "/")}")
    
    print("OK")
except ImportError as e:
    print(f"VoiceBox not installed: {e}", file=sys.stderr)
    print("Install with: pip install metavoice", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;
}

/**
 * Get Python interpreter with VoiceBox installed
 */
function getVoiceBoxPython(): string {
  const projectRoot = process.cwd();
  const venvPythonWin = path.resolve(projectRoot, ".venv/Scripts/python.exe");
  const venvPythonUnix = path.resolve(projectRoot, ".venv/bin/python");

  if (fs.existsSync(venvPythonWin)) {
    return `"${venvPythonWin}"`;
  } else if (fs.existsSync(venvPythonUnix)) {
    return `"${venvPythonUnix}"`;
  }
  
  return "python3";
}

/**
 * Check if VoiceBox is installed
 */
export async function isVoiceBoxInstalled(): Promise<boolean> {
  try {
    const python = getVoiceBoxPython();
    await execAsync(`${python} -c "import metavoice; print('OK')"`, {
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install VoiceBox
 */
export async function installVoiceBox(): Promise<void> {
  console.log("[VoiceBox] Installing MetaVoice...");
  const python = getVoiceBoxPython();
  
  try {
    await execAsync(`${python} -m pip install metavoice`, {
      timeout: 300000, // 5 minutes
    });
    console.log("[VoiceBox] ✓ Installation complete");
  } catch (error: any) {
    throw new Error(`VoiceBox installation failed: ${error.message}`);
  }
}

/**
 * Clone voice from sample (zero-shot)
 */
export async function cloneVoiceBox(
  sampleAudioPath: string,
  voiceName: string
): Promise<string> {
  console.log(`[VoiceBox] Cloning voice from: ${sampleAudioPath}`);
  
  const voiceId = `voicebox_${voiceName}_${Date.now()}`;
  const outputPath = path.join(process.cwd(), "voices", `${voiceId}.json`);
  
  const python = getVoiceBoxPython();
  const scriptPath = path.join(process.cwd(), "_voicebox_clone.py");
  
  const script = `
from metavoice import MetaVoice

model = MetaVoice()
voice_embedding = model.extract_voice_embedding("${sampleAudioPath.replace(/\\/g, "/")}")
model.save_voice_embedding(voice_embedding, "${outputPath.replace(/\\/g, "/")}")

print("Clone complete: ${voiceId}")
`;

  fs.writeFileSync(scriptPath, script, "utf-8");
  
  try {
    await execAsync(`${python} "${scriptPath}"`, {
      timeout: 120000,
    });
    fs.unlinkSync(scriptPath);
    
    console.log(`[VoiceBox] ✓ Voice cloned: ${voiceId}`);
    return voiceId;
  } catch (error: any) {
    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    throw new Error(`Voice cloning failed: ${error.message}`);
  }
}
