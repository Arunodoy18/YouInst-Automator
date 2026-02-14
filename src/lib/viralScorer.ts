/**
 * Viral Trend Scorer — AI-Powered Topic Ranking Engine
 *
 * Given a list of candidate topics, scores each across 7 viral dimensions
 * using Groq LLM. Returns a ranked list with score breakdowns and
 * performance reasoning.
 *
 * Scoring Dimensions:
 *  1. Curiosity Potential         — Will they NEED to keep watching?
 *  2. Emotional Trigger Strength  — Does it evoke a strong feeling?
 *  3. Niche Relevance             — Does it resonate with this audience?
 *  4. Search Demand Probability   — Are people actively Googling this?
 *  5. Shareability                — Will viewers send this to friends?
 *  6. Shock Factor                — Does it break expectations?
 *  7. Monetization Potential      — Can sponsors/affiliates attach?
 *
 * Integration points:
 *  - Orchestrator Step 5 (post-topic-generation ranking)
 *  - API /api/score-topics (manual scoring from dashboard)
 */
import Groq from "groq-sdk";
import { getNicheConfig } from "./niches";
import logger from "./logger";

const MODEL = "llama-3.3-70b-versatile";

function getGroq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── Types ────────────────────────────────────────────────────────────

export type ScorerPlatform = "YouTube" | "Instagram" | "Both";

export interface ScoreDimension {
  curiosityPotential: number;
  emotionalTriggerStrength: number;
  nicheRelevance: number;
  searchDemandProbability: number;
  shareability: number;
  shockFactor: number;
  monetizationPotential: number;
}

export interface ScoredTopic {
  topic: string;
  totalScore: number;
  breakdown: ScoreDimension;
  whyItWillPerform: string;
  rank: number;
}

export interface ScorerResult {
  rankedTopics: ScoredTopic[];
  niche: string;
  platform: ScorerPlatform;
  topPick: ScoredTopic;
  scoredAt: string;
}

// ── Dimension weights (normalised to sum ≈ 1.0) ─────────────────────
// These weights let us compute a weighted total instead of a flat avg.
// Curiosity + emotional are the biggest drivers for short-form virality.

const DIMENSION_WEIGHTS: Record<keyof ScoreDimension, number> = {
  curiosityPotential: 0.20,
  emotionalTriggerStrength: 0.18,
  nicheRelevance: 0.15,
  searchDemandProbability: 0.12,
  shareability: 0.15,
  shockFactor: 0.10,
  monetizationPotential: 0.10,
};

// ── Core scorer ──────────────────────────────────────────────────────

/**
 * Score a list of topics across 7 viral dimensions using Groq LLM.
 *
 * @param topics   - Array of topic strings (1-20 topics)
 * @param nicheId  - Niche identifier (e.g. "ai", "tech", "money")
 * @param platform - Target platform
 * @returns Ranked ScorerResult with breakdown per topic
 */
export async function scoreTopics(
  topics: string[],
  nicheId: string,
  platform: ScorerPlatform = "Both"
): Promise<ScorerResult> {
  if (topics.length === 0) {
    throw new Error("scoreTopics: at least one topic is required");
  }

  const niche = getNicheConfig(nicheId);
  const groq = getGroq();

  // Cap at 20 to keep prompt manageable
  const cappedTopics = topics.slice(0, 20);
  const topicList = cappedTopics.map((t, i) => `${i + 1}. "${t}"`).join("\n");

  const prompt = `You are a viral trend detection AI specialising in short-form video (YouTube Shorts / Instagram Reels).

Given the topics below, score EACH topic on these 7 dimensions from 1–100:

1. **Curiosity Potential** — Will a viewer NEED to keep watching to satisfy their curiosity?
2. **Emotional Trigger Strength** — How strongly does it evoke fear, excitement, outrage, hope, or awe?
3. **Niche Relevance** — How well does it resonate with the ${niche.label} audience specifically?
4. **Search Demand Probability** — Are people likely actively searching for this topic right now?
5. **Shareability** — Would someone tag a friend or send this to a group chat?
6. **Shock Factor** — Does it break expectations or present something genuinely surprising?
7. **Monetization Potential** — Could sponsors, affiliates, or products naturally attach to this topic?

TOPICS:
${topicList}

Niche: ${niche.label}
Platform: ${platform}

Return ONLY this JSON (no markdown, no fences, no explanation outside the JSON):
[
  {
    "topic": "exact topic text",
    "curiosityPotential": 85,
    "emotionalTriggerStrength": 78,
    "nicheRelevance": 92,
    "searchDemandProbability": 70,
    "shareability": 88,
    "shockFactor": 65,
    "monetizationPotential": 72,
    "whyItWillPerform": "1-2 sentence explanation of why this topic will go viral on ${platform}"
  }
]

RULES:
- Return one object per topic, in the same order as the input list.
- Scores must be integers 1-100. Be harsh — most topics should score 40-80. Only truly exceptional topics earn 90+.
- The "whyItWillPerform" should be specific to the topic and platform, not generic.
- Do NOT add extra fields or commentary outside the JSON array.`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.6, // Lower temp for consistent scoring
    max_tokens: 4096,
  });

  const raw = res.choices[0]?.message?.content ?? "";

  let parsed: Array<{
    topic: string;
    curiosityPotential: number;
    emotionalTriggerStrength: number;
    nicheRelevance: number;
    searchDemandProbability: number;
    shareability: number;
    shockFactor: number;
    monetizationPotential: number;
    whyItWillPerform: string;
  }>;

  try {
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error("No JSON array found");
    parsed = JSON.parse(arrMatch[0]);
  } catch (err) {
    logger.error("viralScorer: Failed to parse Groq response", { raw: raw.slice(0, 500) });
    // Fallback: assign neutral scores
    parsed = cappedTopics.map((t) => ({
      topic: t,
      curiosityPotential: 50,
      emotionalTriggerStrength: 50,
      nicheRelevance: 50,
      searchDemandProbability: 50,
      shareability: 50,
      shockFactor: 50,
      monetizationPotential: 50,
      whyItWillPerform: "Could not score — using neutral fallback.",
    }));
  }

  // Build scored topics with weighted totals
  const scoredTopics: ScoredTopic[] = parsed.map((entry) => {
    const breakdown: ScoreDimension = {
      curiosityPotential: clamp(entry.curiosityPotential),
      emotionalTriggerStrength: clamp(entry.emotionalTriggerStrength),
      nicheRelevance: clamp(entry.nicheRelevance),
      searchDemandProbability: clamp(entry.searchDemandProbability),
      shareability: clamp(entry.shareability),
      shockFactor: clamp(entry.shockFactor),
      monetizationPotential: clamp(entry.monetizationPotential),
    };

    const totalScore = computeWeightedScore(breakdown);

    return {
      topic: entry.topic,
      totalScore,
      breakdown,
      whyItWillPerform: entry.whyItWillPerform || "",
      rank: 0, // assigned after sorting
    };
  });

  // Sort by weighted total descending
  scoredTopics.sort((a, b) => b.totalScore - a.totalScore);
  scoredTopics.forEach((t, i) => (t.rank = i + 1));

  const result: ScorerResult = {
    rankedTopics: scoredTopics,
    niche: niche.label,
    platform,
    topPick: scoredTopics[0],
    scoredAt: new Date().toISOString(),
  };

  logger.info(
    `viralScorer: Scored ${scoredTopics.length} topics for ${niche.label}/${platform} — ` +
      `top pick: "${result.topPick.topic}" (${result.topPick.totalScore})`
  );

  return result;
}

// ── Quick pick — score & return the single best topic ────────────────

/**
 * Convenience wrapper: scores topics and returns the #1 ranked topic string.
 * Used by the orchestrator when it has multiple candidate topics.
 */
export async function pickBestTopic(
  topics: string[],
  nicheId: string,
  platform: ScorerPlatform = "Both"
): Promise<{ topic: string; score: number; reason: string }> {
  if (topics.length === 1) {
    return { topic: topics[0], score: 50, reason: "Only one candidate — auto-selected." };
  }

  const result = await scoreTopics(topics, nicheId, platform);
  const top = result.topPick;
  return {
    topic: top.topic,
    score: top.totalScore,
    reason: top.whyItWillPerform,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Clamp a score to the 1-100 range */
function clamp(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n || 50)));
}

/** Compute weighted total from dimension scores */
function computeWeightedScore(breakdown: ScoreDimension): number {
  let total = 0;
  for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    total += (breakdown[key as keyof ScoreDimension] ?? 50) * weight;
  }
  return Math.round(total);
}
