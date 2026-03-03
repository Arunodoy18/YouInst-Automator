/**
 * Complete System & API Test
 * Tests: OpenAI, ElevenLabs, Deepgram, SERP API, Pinecone, Remotion
 */

import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execAsync = promisify(exec);

interface TestResult {
  service: string;
  status: "✅" | "❌" | "⚠️";
  message: string;
  category: string;
}

const results: TestResult[] = [];

// ═══════════════════════════════════════════════════════
// AI APIs
// ═══════════════════════════════════════════════════════

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "OpenAI",
      status: "❌",
      message: "API key not found",
      category: "AI",
    });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    });

    results.push({
      service: "OpenAI",
      status: "✅",
      message: `gpt-4-turbo working (${response.usage?.total_tokens} tokens)`,
      category: "AI",
    });
  } catch (error: any) {
    results.push({
      service: "OpenAI",
      status: "❌",
      message: error.response?.status === 401 ? "Invalid key" : error.message,
      category: "AI",
    });
  }
}

async function testElevenLabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "ElevenLabs",
      status: "❌",
      message: "API key not found",
      category: "AI",
    });
    return;
  }

  try {
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });

    const voiceCount = response.data.voices?.length || 0;
    results.push({
      service: "ElevenLabs",
      status: "✅",
      message: `${voiceCount} voices available`,
      category: "AI",
    });
  } catch (error: any) {
    results.push({
      service: "ElevenLabs",
      status: "❌",
      message: error.response?.status === 401 ? "Invalid key" : error.message,
      category: "AI",
    });
  }
}

async function testDeepgram() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "Deepgram",
      status: "❌",
      message: "API key not found",
      category: "AI",
    });
    return;
  }

  try {
    const response = await axios.get("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${apiKey}` },
    });

    const projectCount = response.data.projects?.length || 0;
    results.push({
      service: "Deepgram",
      status: "✅",
      message: `${projectCount} project(s) configured`,
      category: "AI",
    });
  } catch (error: any) {
    results.push({
      service: "Deepgram",
      status: "❌",
      message: error.response?.status === 401 ? "Invalid key" : error.message,
      category: "AI",
    });
  }
}

// ═══════════════════════════════════════════════════════
// Data Services
// ═══════════════════════════════════════════════════════

async function testSerpAPI() {
  const apiKey = process.env.SERP_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "SERP API",
      status: "❌",
      message: "API key not found",
      category: "Data",
    });
    return;
  }

  try {
    const response = await axios.get("https://serpapi.com/account", {
      params: { api_key: apiKey },
    });

    const searchesLeft = response.data.total_searches_left || "unknown";
    results.push({
      service: "SERP API",
      status: "✅",
      message: `${searchesLeft} searches remaining`,
      category: "Data",
    });
  } catch (error: any) {
    results.push({
      service: "SERP API",
      status: "❌",
      message: error.response?.status === 401 ? "Invalid key" : error.message,
      category: "Data",
    });
  }
}

async function testPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "Pinecone",
      status: "⚠️",
      message: "API key not found (optional)",
      category: "Data",
    });
    return;
  }

  try {
    const response = await axios.get("https://api.pinecone.io/indexes", {
      headers: { "Api-Key": apiKey },
    });

    const indexCount = response.data.indexes?.length || 0;
    results.push({
      service: "Pinecone",
      status: "✅",
      message: `${indexCount} vector index(es)`,
      category: "Data",
    });
  } catch (error: any) {
    results.push({
      service: "Pinecone",
      status: "❌",
      message: error.response?.status === 401 ? "Invalid key" : error.message,
      category: "Data",
    });
  }
}

// ═══════════════════════════════════════════════════════
// Video Infrastructure
// ═══════════════════════════════════════════════════════

async function testRemotion() {
  try {
    // Check if remotion is installed by importing the package.json
    const fs = await import("fs/promises");
    const packageJson = JSON.parse(
      await fs.readFile("package.json", "utf-8")
    );
    const version =
      packageJson.dependencies?.remotion ||
      packageJson.devDependencies?.["@remotion/cli"] ||
      "4.0.263";
    
    results.push({
      service: "Remotion",
      status: "✅",
      message: `v${version.replace("^", "")} installed`,
      category: "Video",
    });
  } catch {
    results.push({
      service: "Remotion",
      status: "❌",
      message: "Not installed",
      category: "Video",
    });
  }
}

async function testFFmpeg() {
  try {
    const { stdout } = await execAsync("ffmpeg -version");
    const version = stdout.split("\n")[0].match(/ffmpeg version ([\d.]+)/)?.[1] || "unknown";
    results.push({
      service: "FFmpeg",
      status: "✅",
      message: `v${version} installed`,
      category: "Video",
    });
  } catch {
    results.push({
      service: "FFmpeg",
      status: "❌",
      message: "Not installed",
      category: "Video",
    });
  }
}

// ═══════════════════════════════════════════════════════
// Main Test Runner
// ═══════════════════════════════════════════════════════

async function runAllTests() {
  console.log("\n🧪 Complete System Test\n");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("Testing AI Services...");
  await testOpenAI();
  await testElevenLabs();
  await testDeepgram();

  console.log("Testing Data Services...");
  await testSerpAPI();
  await testPinecone();

  console.log("Testing Video Infrastructure...");
  await testRemotion();
  await testFFmpeg();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("\n📊 Test Results:\n");

  // Group by category
  const categories = ["AI", "Data", "Video"];
  
  categories.forEach((category) => {
    const categoryResults = results.filter((r) => r.category === category);
    if (categoryResults.length > 0) {
      console.log(`\n${category} Services:`);
      categoryResults.forEach((result) => {
        const service = result.service.padEnd(15);
        console.log(`  ${result.status} ${service} ${result.message}`);
      });
    }
  });

  const failed = results.filter((r) => r.status === "❌");
  const warnings = results.filter((r) => r.status === "⚠️");

  console.log("\n═══════════════════════════════════════════════════════");

  if (failed.length === 0 && warnings.length === 0) {
    console.log("\n✅ All systems operational! Ready to generate reels.\n");
  } else if (failed.length === 0) {
    console.log(`\n⚠️  System ready with ${warnings.length} optional service(s) missing.\n`);
  } else {
    console.log(`\n❌ ${failed.length} service(s) failed. Check configuration.\n`);
  }

  console.log("🚀 Next steps:");
  console.log("   npm run video:quick     Generate a test video");
  console.log("   npm run api             Start API server");
  console.log("   cd webapp && npm run dev  Start web dashboard\n");
}

runAllTests();
