/**
 * YouInst-Automator — CLI Test Harness
 *
 * Comprehensive CLI for development, testing, and debugging.
 *
 * Commands:
 *   generate <nicheId> [topic]     — Run full 13-step pipeline
 *   status                         — System health + recent jobs
 *   niches                         — List available niches
 *   jobs [count]                   — Show recent job logs
 *   test-tts <text>                — Test TTS voice generation
 *   test-facts <topic> <niche>     — Test fact research engine
 *   test-retention <script>        — Test retention scorer
 *   test-bg <mode>                 — Test procedural background
 *
 * Usage:
 *   npx ts-node src/cli/generate.ts generate ai
 *   npx ts-node src/cli/generate.ts generate tech "5 AI tools replacing jobs"
 *   npx ts-node src/cli/generate.ts status
 *   npx ts-node src/cli/generate.ts niches
 *   npx ts-node src/cli/generate.ts jobs 10
 *   npx ts-node src/cli/generate.ts test-tts "Hello world, this is a test"
 */

import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import prisma from "../lib/db";
import { NICHE_IDS, getNicheConfig } from "../lib/niches";
import { runFullPipeline } from "../lib/orchestrator";
import { isRedisConfigured } from "../lib/scheduler";

const OUTPUT_DIR = path.resolve(__dirname, "../../output");

// ── Command Router ───────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "generate":
      await cmdGenerate(args.slice(1));
      break;
    case "status":
      await cmdStatus();
      break;
    case "niches":
      await cmdNiches();
      break;
    case "jobs":
      await cmdJobs(parseInt(args[1]) || 10);
      break;
    case "test-tts":
      await cmdTestTTS(args.slice(1).join(" "));
      break;
    case "test-facts":
      await cmdTestFacts(args[1], args[2]);
      break;
    case "test-retention":
      await cmdTestRetention(args.slice(1).join(" "));
      break;
    case "test-bg":
      await cmdTestBackground(args[1]);
      break;
    case "help":
    default:
      printHelp();
      break;
  }
}

// ── Commands ─────────────────────────────────────────────────────────

async function cmdGenerate(args: string[]) {
  const nicheId = args[0];
  const topicOverride = args[1];
  const voiceProfileId = args[2] || "raju";
  const languageOverride = args[3] || undefined;

  if (!nicheId || !NICHE_IDS.includes(nicheId)) {
    console.error(`\n  Usage: generate <nicheId> [topic] [voiceProfile] [language]`);
    console.error(`  Available niches: ${NICHE_IDS.join(", ")}`);
    console.error(`  Voice profiles: raju (default), default, madhur, swara, neerja`);
    console.error(`  Languages: hinglish (default), english, hindi\n`);
    process.exit(1);
  }

  // Auto-create user/channel/niche for CLI
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: "cli@youinst.local", name: "CLI User" },
    });
  }

  let channel = await prisma.channel.findFirst({ where: { userId: user.id } });
  if (!channel) {
    channel = await prisma.channel.create({
      data: { userId: user.id, name: "Default Channel", platform: "youtube" },
    });
  }

  let niche = await prisma.niche.findFirst({
    where: { channelId: channel.id, name: nicheId },
  });
  if (!niche) {
    niche = await prisma.niche.create({
      data: { channelId: channel.id, name: nicheId },
    });
  }

  console.log(`\n  YouInst AI \u2014 Full Pipeline`);
  console.log(`  ${"=".repeat(40)}`);
  console.log(`  Niche   : ${nicheId} (${getNicheConfig(nicheId).label})`);
  console.log(`  Channel : ${channel.name}`);
  console.log(`  Voice   : ${voiceProfileId}`);
  console.log(`  Language: ${languageOverride || "auto (from voice profile)"}`);
  console.log(`  Redis   : ${isRedisConfigured() ? "connected" : "disabled (direct mode)"}`);
  if (topicOverride) console.log(`  Topic   : "${topicOverride}"`);
  console.log();

  const startTime = Date.now();

  const result = await runFullPipeline(
    nicheId,
    niche.id,
    channel.id,
    undefined,
    topicOverride,
    voiceProfileId,
    languageOverride
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n  ${"=".repeat(40)}`);
  console.log(`  Pipeline complete! (${elapsed}s)`);
  console.log(`  Topic: "${result.topic}"`);
  for (const upload of result.uploads) {
    console.log(`  ${upload.platform}: ${upload.url}`);
  }
  if (result.uploads.length === 0) {
    console.log(`  No uploads (check logs for errors)`);
  }
  console.log(`  ${"=".repeat(40)}\n`);
}

async function cmdStatus() {
  console.log(`\n  YouInst AI \u2014 System Status`);
  console.log(`  ${"=".repeat(40)}`);

  // Environment
  const envChecks = [
    { key: "GROQ_API_KEY", set: !!process.env.GROQ_API_KEY },
    { key: "YOUTUBE_REFRESH_TOKEN", set: !!process.env.YOUTUBE_REFRESH_TOKEN },
    { key: "INSTAGRAM_ACCESS_TOKEN", set: !!process.env.INSTAGRAM_ACCESS_TOKEN },
    { key: "PIXABAY_API_KEY", set: !!process.env.PIXABAY_API_KEY },
    { key: "PEXELS_API_KEY", set: !!process.env.PEXELS_API_KEY },
    { key: "REDIS_URL", set: isRedisConfigured() },
  ];

  console.log(`\n  Environment:`);
  for (const check of envChecks) {
    const icon = check.set ? "[OK]" : "[MISSING]";
    console.log(`    ${icon} ${check.key}`);
  }

  // Database counts
  const [users, channels, scripts, videos, posted, jobs] = await Promise.all([
    prisma.user.count(),
    prisma.channel.count(),
    prisma.generatedScript.count(),
    prisma.renderedVideo.count(),
    prisma.postedVideo.count({ where: { status: "published" } }),
    prisma.jobLog.count(),
  ]);

  console.log(`\n  Database:`);
  console.log(`    Users     : ${users}`);
  console.log(`    Channels  : ${channels}`);
  console.log(`    Scripts   : ${scripts}`);
  console.log(`    Videos    : ${videos}`);
  console.log(`    Posted    : ${posted}`);
  console.log(`    Jobs      : ${jobs}`);

  // Recent job
  const lastJob = await prisma.jobLog.findFirst({
    orderBy: { startedAt: "desc" },
  });
  if (lastJob) {
    console.log(`\n  Last Job:`);
    console.log(`    Type   : ${lastJob.jobType}`);
    console.log(`    Status : ${lastJob.status}`);
    console.log(`    Time   : ${lastJob.startedAt.toISOString()}`);
    if (lastJob.errorLog) console.log(`    Error  : ${lastJob.errorLog}`);
  }

  // Disk usage
  if (fs.existsSync(OUTPUT_DIR)) {
    const outputFiles = fs.readdirSync(OUTPUT_DIR);
    console.log(`\n  Output: ${outputFiles.length} directories in output/`);
  }

  console.log(`\n  ${"=".repeat(40)}\n`);
}

async function cmdNiches() {
  console.log(`\n  Available Niches:`);
  console.log(`  ${"-".repeat(50)}`);
  for (const id of NICHE_IDS) {
    const config = getNicheConfig(id);
    console.log(`  ${id.padEnd(18)} ${config.label}`);
    console.log(`  ${"".padEnd(18)} Seeds: ${config.topicSeeds.slice(0, 3).join(", ")}`);
  }
  console.log();
}

async function cmdJobs(count: number) {
  const jobs = await prisma.jobLog.findMany({
    orderBy: { startedAt: "desc" },
    take: count,
  });

  console.log(`\n  Recent Jobs (${jobs.length}):`);
  console.log(`  ${"-".repeat(70)}`);
  console.log(`  ${"ID".padEnd(12)} ${"Type".padEnd(18)} ${"Status".padEnd(12)} ${"Time".padEnd(20)}`);
  console.log(`  ${"-".repeat(70)}`);

  for (const job of jobs) {
    const id = job.id.substring(0, 10) + "..";
    const time = job.startedAt.toISOString().replace("T", " ").substring(0, 19);
    const statusIcon = job.status === "completed" ? "[OK]" : job.status === "failed" ? "[FAIL]" : "[...]";
    console.log(`  ${id.padEnd(12)} ${job.jobType.padEnd(18)} ${statusIcon.padEnd(12)} ${time}`);
    if (job.errorLog) {
      console.log(`  ${"".padEnd(12)} ${"Error: ".padEnd(18)} ${job.errorLog.substring(0, 50)}`);
    }
  }
  console.log();
}

async function cmdTestTTS(text: string) {
  if (!text) {
    console.error(`\n  Usage: test-tts "Your text here"\n`);
    process.exit(1);
  }

  const { generateVoice } = await import("../lib/tts");
  const testDir = path.resolve(OUTPUT_DIR, `test-tts-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  console.log(`\n  Testing TTS...`);
  console.log(`  Text: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);

  const voicePath = await generateVoice(text, testDir);
  const stats = fs.statSync(voicePath);
  console.log(`  Output: ${voicePath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(1)} KB\n`);
}

async function cmdTestFacts(topic: string, niche: string) {
  if (!topic || !niche) {
    console.error(`\n  Usage: test-facts "topic" "niche"\n`);
    process.exit(1);
  }

  const { fetchVerifiedFacts, isResearchError } = await import("../lib/factResearch");

  console.log(`\n  Testing Fact Research...`);
  console.log(`  Topic: "${topic}"`);
  console.log(`  Niche: ${niche}\n`);

  const result = await fetchVerifiedFacts(topic, niche);

  if (isResearchError(result)) {
    console.log(`  Error: ${result.error}\n`);
  } else {
    console.log(`  Topic: ${result.topic}`);
    console.log(`  Items: ${result.items.length}`);
    for (const item of result.items) {
      console.log(`    - ${item.name}: ${item.category} (${item.official_url})`);
    }
    if (result.sources.length > 0) {
      console.log(`  Sources: ${result.sources.map(s => s.title).join(", ")}`);
    }
    console.log();
  }
}

async function cmdTestRetention(script: string) {
  if (!script) {
    console.error(`\n  Usage: test-retention "Your script text here"\n`);
    process.exit(1);
  }

  const { scoreRetention } = await import("../lib/retentionScorer");

  console.log(`\n  Testing Retention Scorer...`);
  console.log(`  Script: "${script.substring(0, 80)}${script.length > 80 ? "..." : ""}"\n`);

  const report = await scoreRetention({
    hook: script.split(".")[0] || script,
    script,
    visual_pacing: "tunnel mode, high intensity",
    cta: "Follow for more",
    topic: "test",
    niche: "tech",
  });

  console.log(`  Score: ${report.retention_score}/100`);
  console.log(`  Breakdown:`);
  for (const [key, value] of Object.entries(report.breakdown)) {
    console.log(`    ${key}: ${value}`);
  }
  if (report.weak_points.length > 0) {
    console.log(`  Weak Points: ${report.weak_points.join("; ")}`);
  }
  console.log();
}

async function cmdTestBackground(mode: string) {
  const validModes = ["tunnel", "particles", "waveform", "grid_runner"];
  if (!mode || !validModes.includes(mode)) {
    console.error(`\n  Usage: test-bg <${validModes.join("|")}>\n`);
    process.exit(1);
  }

  const { generateProceduralBackground } = await import("../lib/proceduralBackground");
  const testDir = path.resolve(OUTPUT_DIR, `test-bg-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  console.log(`\n  Testing Procedural Background...`);
  console.log(`  Mode: ${mode}\n`);

  const bgPath = await generateProceduralBackground(testDir, mode as any);
  const stats = fs.statSync(bgPath);
  console.log(`  Output: ${bgPath}`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB\n`);
}

function printHelp() {
  console.log(`
  YouInst AI \u2014 CLI Test Harness
  ${"=".repeat(50)}

  Commands:
    generate <nicheId> [topic]     Run full 13-step pipeline
    status                         System health + diagnostics
    niches                         List available niches
    jobs [count]                   Show recent job logs
    test-tts <text>                Test TTS voice generation
    test-facts <topic> <niche>     Test fact research engine
    test-retention <script>        Test retention scorer
    test-bg <mode>                 Test procedural background

  Examples:
    npx ts-node src/cli/generate.ts generate ai
    npx ts-node src/cli/generate.ts generate tech "5 AI tools"
    npx ts-node src/cli/generate.ts status
    npx ts-node src/cli/generate.ts niches
    npx ts-node src/cli/generate.ts jobs 20
    npx ts-node src/cli/generate.ts test-tts "Hello world"
    npx ts-node src/cli/generate.ts test-facts "AI tools" "Artificial Intelligence"
    npx ts-node src/cli/generate.ts test-bg tunnel

  Available niches: ${NICHE_IDS.join(", ")}
  `);
}

// ── Run ──────────────────────────────────────────────────────────────

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  });
