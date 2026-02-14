/**
 * Performance Optimizer — AI-Powered Content Analysis & Self-Learning Engine
 *
 * Consumes real video metrics from the Analytics table and uses Groq LLM
 * to produce structured, actionable optimisation recommendations that
 * feed back into the pipeline's intelligence config.
 *
 * Analysis outputs:
 *   - What worked / what failed
 *   - Hook effectiveness rating
 *   - Ideal video length recommendation
 *   - Best performing niche
 *   - Engagement pattern detection
 *   - 3 concrete improvements for the next video
 *   - Hook style recommendation
 *   - Script pacing adjustment
 *   - Niche weighting adjustment
 *
 * Integration:
 *   - Orchestrator Step 1 (enriched performance feedback)
 *   - Dashboard /api/analyze-performance
 *   - Scheduled cron job (daily self-learning digest)
 */
import Groq from "groq-sdk";
import prisma from "./db";
import logger from "./logger";

const MODEL = "llama-3.3-70b-versatile";

function getGroq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── Types ────────────────────────────────────────────────────────────

export interface VideoMetrics {
  videoId: string;
  topic: string;
  hook: string;
  nicheId: string;
  platform: string;
  views: number;
  likes: number;
  watchTimeSec: number;
  retentionRate: number;      // 0-100 %
  comments: number;
  shares: number;
  clickThroughRate: number;   // 0-100 %
  hookScore: number;
  scriptLength: number;       // word count
  postedAt: string;
}

export interface PerformanceAnalysis {
  // ── Diagnostics ──
  whatWorked: string[];
  whatFailed: string[];
  hookEffectiveness: {
    rating: "excellent" | "good" | "average" | "poor";
    score: number;          // 1-100
    explanation: string;
  };
  idealVideoLength: {
    recommendedSec: number;
    reasoning: string;
  };
  bestPerformingNiche: {
    nicheId: string;
    avgScore: number;
    reason: string;
  };
  engagementPatterns: string[];

  // ── Recommendations ──
  improvements: [string, string, string];    // exactly 3
  hookStyleRecommendation: {
    style: string;
    example: string;
    reasoning: string;
  };
  scriptPacingAdjustment: {
    currentAssessment: string;
    recommendation: string;
    targetRetentionLevel: "basic" | "enhanced" | "viral";
  };
  nicheWeightingAdjustment: {
    increaseWeight: string[];   // niche IDs to boost
    decreaseWeight: string[];   // niche IDs to lower
    reasoning: string;
  };

  // ── Meta ──
  videoCount: number;
  analysisDate: string;
  confidenceLevel: "high" | "medium" | "low";
}

// ── Collect metrics from DB ──────────────────────────────────────────

/**
 * Pull the last N videos' metrics for a channel, joining across
 * PostedVideo → Analytics + GeneratedScript.
 */
export async function collectChannelMetrics(
  channelId: string,
  lookbackDays: number = 30,
  limit: number = 50
): Promise<VideoMetrics[]> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const postedVideos = await prisma.postedVideo.findMany({
    where: {
      channelId,
      status: "published",
      postedAt: { gte: since },
    },
    include: {
      analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      renderedVideo: {
        include: { script: true },
      },
    },
    orderBy: { postedAt: "desc" },
    take: limit,
  });

  const metrics: VideoMetrics[] = [];

  for (const pv of postedVideos) {
    const a = pv.analytics[0];
    const script = pv.renderedVideo?.script;
    if (!a || !script) continue;

    const wordCount = (script.fullScript || "").split(/\s+/).length;
    // Estimate watch time from retention if not explicitly stored
    const estimatedDurationSec = Math.round(wordCount * 0.45); // ~2.2 words/sec for TTS
    const watchTimeSec = a.retention
      ? Math.round(estimatedDurationSec * (a.retention / 100))
      : 0;

    metrics.push({
      videoId: pv.id,
      topic: script.topic,
      hook: script.hook,
      nicheId: script.nicheId,
      platform: pv.platform,
      views: a.views,
      likes: a.likes,
      watchTimeSec,
      retentionRate: a.retention ?? 0,
      comments: a.comments,
      shares: a.shares,
      clickThroughRate: a.ctr ?? 0,
      hookScore: script.hookScore ?? 0,
      scriptLength: wordCount,
      postedAt: pv.postedAt?.toISOString() ?? pv.createdAt.toISOString(),
    });
  }

  return metrics;
}

// ── Core AI analysis ─────────────────────────────────────────────────

/**
 * Feed collected metrics into Groq LLM and get a structured
 * PerformanceAnalysis with diagnostics + recommendations.
 */
export async function analyzePerformance(
  metrics: VideoMetrics[]
): Promise<PerformanceAnalysis> {
  if (metrics.length === 0) {
    return emptyAnalysis("No videos with analytics data found.");
  }

  const groq = getGroq();

  // ── Pre-compute summaries so the LLM has clean data ──
  const totalViews = metrics.reduce((s, m) => s + m.views, 0);
  const avgViews = Math.round(totalViews / metrics.length);
  const avgRetention = avg(metrics.map((m) => m.retentionRate));
  const avgCTR = avg(metrics.map((m) => m.clickThroughRate));
  const avgLikes = avg(metrics.map((m) => m.likes));
  const avgComments = avg(metrics.map((m) => m.comments));
  const avgShares = avg(metrics.map((m) => m.shares));
  const avgWatchTime = avg(metrics.map((m) => m.watchTimeSec));
  const avgScriptWords = avg(metrics.map((m) => m.scriptLength));

  // Per-niche breakdown
  const nicheMap = new Map<string, { views: number[]; retention: number[]; engagement: number[] }>();
  for (const m of metrics) {
    if (!nicheMap.has(m.nicheId)) nicheMap.set(m.nicheId, { views: [], retention: [], engagement: [] });
    const n = nicheMap.get(m.nicheId)!;
    n.views.push(m.views);
    n.retention.push(m.retentionRate);
    const eng = m.views > 0 ? ((m.likes + m.comments + m.shares) / m.views) * 100 : 0;
    n.engagement.push(eng);
  }

  const nicheBreakdown = Array.from(nicheMap.entries())
    .map(([id, d]) => ({
      nicheId: id,
      count: d.views.length,
      avgViews: Math.round(avg(d.views)),
      avgRetention: round2(avg(d.retention)),
      avgEngagement: round2(avg(d.engagement)),
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  // Top 5 / bottom 5 videos
  const sorted = [...metrics].sort((a, b) => b.views - a.views);
  const topVideos = sorted.slice(0, Math.min(5, sorted.length));
  const bottomVideos = sorted.slice(-Math.min(5, sorted.length));

  // ── Build prompt ──
  const prompt = `You are a content performance optimization AI specialising in short-form video (YouTube Shorts / Instagram Reels).

Analyze the following aggregated metrics from ${metrics.length} videos over the last 30 days, then produce a structured analysis.

═══ AGGREGATE METRICS ═══
Total views: ${totalViews.toLocaleString()}
Average views per video: ${avgViews.toLocaleString()}
Average retention rate: ${avgRetention}%
Average click-through rate: ${avgCTR}%
Average likes: ${Math.round(avgLikes)}
Average comments: ${Math.round(avgComments)}
Average shares: ${Math.round(avgShares)}
Average watch time: ${Math.round(avgWatchTime)}s
Average script length: ${Math.round(avgScriptWords)} words

═══ NICHE BREAKDOWN ═══
${nicheBreakdown.map((n) => `• ${n.nicheId}: ${n.count} videos, ${n.avgViews} avg views, ${n.avgRetention}% retention, ${n.avgEngagement}% engagement`).join("\n")}

═══ TOP ${topVideos.length} VIDEOS ═══
${topVideos.map((v, i) => `${i + 1}. "${v.topic}" [${v.platform}] — ${v.views} views, ${v.retentionRate}% retention, hook: "${v.hook}" (hookScore: ${v.hookScore}), ${v.scriptLength} words`).join("\n")}

═══ BOTTOM ${bottomVideos.length} VIDEOS ═══
${bottomVideos.map((v, i) => `${i + 1}. "${v.topic}" [${v.platform}] — ${v.views} views, ${v.retentionRate}% retention, hook: "${v.hook}" (hookScore: ${v.hookScore}), ${v.scriptLength} words`).join("\n")}

═══ YOUR TASK ═══
Identify:
1. What worked? (list 2-4 specific observations from the top videos)
2. What failed? (list 2-4 specific observations from the bottom videos)
3. Hook effectiveness — rate overall hook quality, explain what makes the top hooks work
4. Ideal video length — based on retention vs. script length correlation
5. Best performing niche — which niche should get more weight?
6. Engagement patterns — any time-of-day, topic type, or structural patterns?

Provide:
1. Exactly 3 specific improvements for the next video
2. Hook style recommendation with an example hook
3. Script pacing adjustment — current assessment + recommended retention level ("basic" | "enhanced" | "viral")
4. Niche weighting adjustment — which niches to increase/decrease + reasoning

Available niche IDs: ${nicheBreakdown.map((n) => n.nicheId).join(", ")}

Output ONLY this JSON (no markdown fences, no explanation outside JSON):
{
  "whatWorked": ["...", "..."],
  "whatFailed": ["...", "..."],
  "hookEffectiveness": {
    "rating": "excellent|good|average|poor",
    "score": 78,
    "explanation": "..."
  },
  "idealVideoLength": {
    "recommendedSec": 42,
    "reasoning": "..."
  },
  "bestPerformingNiche": {
    "nicheId": "...",
    "avgScore": 82,
    "reason": "..."
  },
  "engagementPatterns": ["...", "..."],
  "improvements": ["...", "...", "..."],
  "hookStyleRecommendation": {
    "style": "...",
    "example": "...",
    "reasoning": "..."
  },
  "scriptPacingAdjustment": {
    "currentAssessment": "...",
    "recommendation": "...",
    "targetRetentionLevel": "basic|enhanced|viral"
  },
  "nicheWeightingAdjustment": {
    "increaseWeight": ["nicheId1"],
    "decreaseWeight": ["nicheId2"],
    "reasoning": "..."
  }
}`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.4, // Low temp for analytical consistency
    max_tokens: 4096,
  });

  const raw = res.choices[0]?.message?.content ?? "";

  try {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error("No JSON object in response");
    const parsed = JSON.parse(objMatch[0]);

    // Normalise + fill defaults
    const analysis: PerformanceAnalysis = {
      whatWorked: ensureArray(parsed.whatWorked),
      whatFailed: ensureArray(parsed.whatFailed),
      hookEffectiveness: {
        rating: validateEnum(parsed.hookEffectiveness?.rating, ["excellent", "good", "average", "poor"], "average"),
        score: clamp(parsed.hookEffectiveness?.score ?? 50),
        explanation: parsed.hookEffectiveness?.explanation ?? "",
      },
      idealVideoLength: {
        recommendedSec: clamp(parsed.idealVideoLength?.recommendedSec ?? 45, 15, 90),
        reasoning: parsed.idealVideoLength?.reasoning ?? "",
      },
      bestPerformingNiche: {
        nicheId: parsed.bestPerformingNiche?.nicheId ?? nicheBreakdown[0]?.nicheId ?? "unknown",
        avgScore: clamp(parsed.bestPerformingNiche?.avgScore ?? 50),
        reason: parsed.bestPerformingNiche?.reason ?? "",
      },
      engagementPatterns: ensureArray(parsed.engagementPatterns),
      improvements: normalise3(parsed.improvements),
      hookStyleRecommendation: {
        style: parsed.hookStyleRecommendation?.style ?? "",
        example: parsed.hookStyleRecommendation?.example ?? "",
        reasoning: parsed.hookStyleRecommendation?.reasoning ?? "",
      },
      scriptPacingAdjustment: {
        currentAssessment: parsed.scriptPacingAdjustment?.currentAssessment ?? "",
        recommendation: parsed.scriptPacingAdjustment?.recommendation ?? "",
        targetRetentionLevel: validateEnum(
          parsed.scriptPacingAdjustment?.targetRetentionLevel,
          ["basic", "enhanced", "viral"],
          "enhanced"
        ),
      },
      nicheWeightingAdjustment: {
        increaseWeight: ensureArray(parsed.nicheWeightingAdjustment?.increaseWeight),
        decreaseWeight: ensureArray(parsed.nicheWeightingAdjustment?.decreaseWeight),
        reasoning: parsed.nicheWeightingAdjustment?.reasoning ?? "",
      },
      videoCount: metrics.length,
      analysisDate: new Date().toISOString(),
      confidenceLevel: metrics.length >= 20 ? "high" : metrics.length >= 5 ? "medium" : "low",
    };

    logger.info(
      `performanceOptimizer: Analyzed ${metrics.length} videos — ` +
        `hook ${analysis.hookEffectiveness.rating} (${analysis.hookEffectiveness.score}), ` +
        `best niche: ${analysis.bestPerformingNiche.nicheId}, ` +
        `target retention: ${analysis.scriptPacingAdjustment.targetRetentionLevel}`
    );

    return analysis;
  } catch (err) {
    logger.error("performanceOptimizer: Failed to parse Groq response", { raw: raw.slice(0, 500) });
    return emptyAnalysis("LLM parse failure — using neutral defaults.");
  }
}

// ── Full channel analysis (DB → AI → result) ────────────────────────

/**
 * One-call convenience: collect metrics from DB and run the full analysis.
 */
export async function analyzeChannelPerformance(
  channelId: string,
  lookbackDays: number = 30
): Promise<PerformanceAnalysis> {
  const metrics = await collectChannelMetrics(channelId, lookbackDays);
  return analyzePerformance(metrics);
}

// ── Manual analysis (from API body) ──────────────────────────────────

/**
 * Accept externally-provided metrics (e.g. from the dashboard form)
 * and run the analysis, without touching the DB.
 */
export async function analyzeProvidedMetrics(
  metrics: VideoMetrics[]
): Promise<PerformanceAnalysis> {
  return analyzePerformance(metrics);
}

// ── Helpers ──────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function clamp(n: number, min = 1, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n || 0)));
}
function ensureArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}
function normalise3(v: unknown): [string, string, string] {
  const arr = ensureArray(v);
  return [
    arr[0] ?? "Increase hook aggression with a pattern interrupt opener",
    arr[1] ?? "Shorten script to under 45 seconds for better retention",
    arr[2] ?? "Test a different niche this week for audience expansion",
  ];
}
function validateEnum<T extends string>(val: unknown, allowed: T[], fallback: T): T {
  if (typeof val === "string" && allowed.includes(val as T)) return val as T;
  return fallback;
}

function emptyAnalysis(reason: string): PerformanceAnalysis {
  return {
    whatWorked: [reason],
    whatFailed: [],
    hookEffectiveness: { rating: "average", score: 50, explanation: reason },
    idealVideoLength: { recommendedSec: 45, reasoning: "Default — insufficient data." },
    bestPerformingNiche: { nicheId: "unknown", avgScore: 50, reason },
    engagementPatterns: [],
    improvements: [
      "Collect more analytics data before optimising",
      "Ensure retention and CTR tracking is enabled",
      "Post at least 5 videos before running analysis",
    ],
    hookStyleRecommendation: { style: "pattern_interrupt", example: "Nobody talks about this…", reasoning: reason },
    scriptPacingAdjustment: { currentAssessment: "Insufficient data", recommendation: "Keep current settings", targetRetentionLevel: "enhanced" },
    nicheWeightingAdjustment: { increaseWeight: [], decreaseWeight: [], reasoning: reason },
    videoCount: 0,
    analysisDate: new Date().toISOString(),
    confidenceLevel: "low",
  };
}
