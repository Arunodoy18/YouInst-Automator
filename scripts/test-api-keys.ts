/**
 * Test All New API Keys
 * Verifies: ElevenLabs, Deepgram, SERP API
 */

import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

interface TestResult {
  service: string;
  status: "✅" | "❌";
  message: string;
}

const results: TestResult[] = [];

async function testElevenLabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "ElevenLabs",
      status: "❌",
      message: "API key not found in .env",
    });
    return;
  }

  console.log("🔊 Testing ElevenLabs API...");
  
  try {
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    const voiceCount = response.data.voices?.length || 0;
    results.push({
      service: "ElevenLabs",
      status: "✅",
      message: `Working! Found ${voiceCount} available voices`,
    });
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 401) {
      results.push({
        service: "ElevenLabs",
        status: "❌",
        message: "Invalid API key (401 Unauthorized)",
      });
    } else {
      results.push({
        service: "ElevenLabs",
        status: "❌",
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testDeepgram() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "Deepgram",
      status: "❌",
      message: "API key not found in .env",
    });
    return;
  }

  console.log("🎤 Testing Deepgram API...");
  
  try {
    // Test with project list endpoint
    const response = await axios.get("https://api.deepgram.com/v1/projects", {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    const projectCount = response.data.projects?.length || 0;
    results.push({
      service: "Deepgram",
      status: "✅",
      message: `Working! Found ${projectCount} project(s)`,
    });
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      results.push({
        service: "Deepgram",
        status: "❌",
        message: "Invalid API key (401/403)",
      });
    } else {
      results.push({
        service: "Deepgram",
        status: "❌",
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testSerpAPI() {
  const apiKey = process.env.SERP_API_KEY;
  
  if (!apiKey) {
    results.push({
      service: "SERP API",
      status: "❌",
      message: "API key not found in .env",
    });
    return;
  }

  console.log("🔍 Testing SERP API...");
  
  try {
    // Test with a simple search query
    const response = await axios.get("https://serpapi.com/account", {
      params: {
        api_key: apiKey,
      },
    });

    const searchesLeft = response.data.total_searches_left || "unknown";
    results.push({
      service: "SERP API",
      status: "✅",
      message: `Working! Searches left: ${searchesLeft}`,
    });
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 401) {
      results.push({
        service: "SERP API",
        status: "❌",
        message: "Invalid API key (401)",
      });
    } else {
      results.push({
        service: "SERP API",
        status: "❌",
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function runTests() {
  console.log("\n🧪 Testing All API Keys\n");
  console.log("═══════════════════════════════════════════\n");

  await testElevenLabs();
  await testDeepgram();
  await testSerpAPI();

  console.log("\n═══════════════════════════════════════════");
  console.log("\n📊 Test Results:\n");

  results.forEach((result) => {
    console.log(`${result.status} ${result.service.padEnd(15)} ${result.message}`);
  });

  const allPassed = results.every((r) => r.status === "✅");
  
  if (allPassed) {
    console.log("\n✅ All API keys are working!\n");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some API keys failed. Check the results above.\n");
    process.exit(1);
  }
}

runTests();
