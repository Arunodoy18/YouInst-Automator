/**
 * System Verification Script
 * Tests: Python, ffmpeg, ElevenLabs, Remotion, Edge TTS
 *
 * Usage: ts-node scripts/verify-system.ts
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);

interface CheckResult {
  name: string;
  status: "✅" | "⚠️" | "❌";
  message: string;
  required: boolean;
}

const results: CheckResult[] = [];

async function checkPython(): Promise<void> {
  try {
    const { stdout } = await execAsync("python --version");
    const version = stdout.trim();
    results.push({
      name: "Python",
      status: "✅",
      message: `Found: ${version}`,
      required: true,
    });
  } catch {
    results.push({
      name: "Python",
      status: "❌",
      message: "Not found. Install Python 3.8+ from python.org",
      required: true,
    });
  }
}

async function checkFFmpeg(): Promise<void> {
  try {
    const { stdout } = await execAsync("ffmpeg -version");
    const version = stdout.split("\n")[0].trim();
    results.push({
      name: "FFmpeg",
      status: "✅",
      message: `Found: ${version}`,
      required: true,
    });
  } catch {
    results.push({
      name: "FFmpeg",
      status: "❌",
      message: "Not found. Install: choco install ffmpeg",
      required: true,
    });
  }
}

async function checkVirtualEnv(): Promise<void> {
  const venvPath = path.resolve(__dirname, "../.venv");
  if (fs.existsSync(venvPath)) {
    results.push({
      name: "Python Virtual Env",
      status: "✅",
      message: "Found at .venv/",
      required: true,
    });
  } else {
    results.push({
      name: "Python Virtual Env",
      status: "⚠️",
      message: "Not found. Run: python -m venv .venv",
      required: true,
    });
  }
}

async function checkEdgeTTS(): Promise<void> {
  try {
    await execAsync("edge-tts --version");
    results.push({
      name: "Edge TTS",
      status: "✅",
      message: "Installed and working",
      required: true,
    });
  } catch {
    results.push({
      name: "Edge TTS",
      status: "⚠️",
      message: "Not found. Activate .venv and run: pip install edge-tts",
      required: true,
    });
  }
}

async function checkElevenLabs(): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    results.push({
      name: "ElevenLabs API Key",
      status: "⚠️",
      message: "Not set in .env (will use Edge TTS fallback)",
      required: false,
    });
    return;
  }

  if (apiKey.startsWith("sk_")) {
    results.push({
      name: "ElevenLabs API Key",
      status: "✅",
      message: `Configured: ${apiKey.substring(0, 10)}...`,
      required: false,
    });
  } else {
    results.push({
      name: "ElevenLabs API Key",
      status: "⚠️",
      message: "Invalid format (should start with 'sk_')",
      required: false,
    });
  }
}

async function checkRemotion(): Promise<void> {
  const packagePath = path.resolve(__dirname, "../package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    const remotionVersion = pkg.dependencies["@remotion/cli"];
    if (remotionVersion) {
      results.push({
        name: "Remotion",
        status: "✅",
        message: `Installed: ${remotionVersion}`,
        required: true,
      });
    } else {
      results.push({
        name: "Remotion",
        status: "❌",
        message: "Not found in package.json",
        required: true,
      });
    }
  } catch {
    results.push({
      name: "Remotion",
      status: "❌",
      message: "Could not read package.json",
      required: true,
    });
  }
}

async function checkGroqAPI(): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    results.push({
      name: "Groq API Key",
      status: "⚠️",
      message: "Not set in .env (required for script generation)",
      required: true,
    });
    return;
  }

  if (apiKey.startsWith("gsk_")) {
    results.push({
      name: "Groq API Key",
      status: "✅",
      message: `Configured: ${apiKey.substring(0, 10)}...`,
      required: true,
    });
  } else {
    results.push({
      name: "Groq API Key",
      status: "⚠️",
      message: "Invalid format (should start with 'gsk_')",
      required: true,
    });
  }
}

async function checkYouTubeAuth(): Promise<void> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    results.push({
      name: "YouTube OAuth",
      status: "✅",
      message: "Configured (ready for uploads)",
      required: false,
    });
  } else {
    results.push({
      name: "YouTube OAuth",
      status: "⚠️",
      message: "Not configured (uploads disabled)",
      required: false,
    });
  }
}

async function checkInstagramAuth(): Promise<void> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (accessToken && accountId) {
    results.push({
      name: "Instagram OAuth",
      status: "✅",
      message: "Configured (ready for uploads)",
      required: false,
    });
  } else {
    results.push({
      name: "Instagram OAuth",
      status: "⚠️",
      message: "Not configured (uploads disabled)",
      required: false,
    });
  }
}

async function checkOutputDirectory(): Promise<void> {
  const outputPath = path.resolve(__dirname, "../output");
  if (fs.existsSync(outputPath)) {
    const files = fs.readdirSync(outputPath);
    const videoCount = files.filter((f) =>
      fs.statSync(path.join(outputPath, f)).isDirectory()
    ).length;
    results.push({
      name: "Output Directory",
      status: "✅",
      message: `Found: ${videoCount} existing video(s)`,
      required: true,
    });
  } else {
    results.push({
      name: "Output Directory",
      status: "⚠️",
      message: "Not found (will be created automatically)",
      required: true,
    });
  }
}

async function checkClonedVoices(): Promise<void> {
  const clonedPath = path.resolve(__dirname, "../cloned-voices.json");
  if (fs.existsSync(clonedPath)) {
    try {
      const cloned = JSON.parse(fs.readFileSync(clonedPath, "utf-8"));
      const count = Object.keys(cloned).length;
      results.push({
        name: "Cloned Voices",
        status: "✅",
        message: `Found: ${count} custom voice(s)`,
        required: false,
      });
    } catch {
      results.push({
        name: "Cloned Voices",
        status: "⚠️",
        message: "File exists but could not parse",
        required: false,
      });
    }
  } else {
    results.push({
      name: "Cloned Voices",
      status: "⚠️",
      message: "No custom voices (using built-in profiles)",
      required: false,
    });
  }
}

// Main execution
async function main() {
  console.log("\n🔍 YouInst-Automator System Verification\n");
  console.log("Checking all dependencies and configurations...\n");

  // Run all checks
  await checkPython();
  await checkFFmpeg();
  await checkVirtualEnv();
  await checkEdgeTTS();
  await checkElevenLabs();
  await checkRemotion();
  await checkGroqAPI();
  await checkYouTubeAuth();
  await checkInstagramAuth();
  await checkOutputDirectory();
  await checkClonedVoices();

  // Display results
  console.log("═══════════════════════════════════════════════════════\n");

  const requiredChecks = results.filter((r) => r.required);
  const optionalChecks = results.filter((r) => !r.required);

  console.log("📦 REQUIRED COMPONENTS\n");
  requiredChecks.forEach((r) => {
    console.log(`  ${r.status} ${r.name.padEnd(25)} ${r.message}`);
  });

  console.log("\n📦 OPTIONAL COMPONENTS\n");
  optionalChecks.forEach((r) => {
    console.log(`  ${r.status} ${r.name.padEnd(25)} ${r.message}`);
  });

  console.log("\n═══════════════════════════════════════════════════════\n");

  // Summary
  const allGood = requiredChecks.every((r) => r.status === "✅");
  const hasWarnings = results.some((r) => r.status === "⚠️");
  const hasErrors = results.some((r) => r.status === "❌" && r.required);

  if (allGood) {
    console.log("✅ SYSTEM READY! All required components are working.\n");
    console.log("🚀 Start making videos:");
    console.log("   npm run video:quick\n");

    if (hasWarnings) {
      console.log("ℹ️  Optional components with warnings can be configured later.");
    }
  } else if (hasErrors) {
    console.log("❌ SYSTEM NOT READY! Fix required components first.\n");
    console.log("📖 Setup Guide: SETUP.md");
    console.log("📖 Quick Start: QUICKSTART.md\n");
  } else {
    console.log("⚠️  Some required components need attention.\n");
    console.log("📖 Setup Guide: SETUP.md\n");
  }
}

main().catch((err) => {
  console.error("Error running verification:", err);
  process.exit(1);
});
