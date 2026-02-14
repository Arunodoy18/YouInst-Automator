/**
 * Agent Brain — AI Content Intelligence Layer
 *
 * Central orchestrator that uses Groq LLM to:
 * 1. Pick trending topics per niche
 * 2. Generate optimized scripts with psychological triggers
 * 3. Create platform-specific SEO metadata
 * 4. Score hook quality
 * 5. Self-improve based on analytics feedback
 */
import Groq from "groq-sdk";
import { getNicheConfig, NicheConfig } from "./niches";
import logger from "./logger";

const MODEL = "llama-3.3-70b-versatile";

function getGroq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── Types ────────────────────────────────────────────────────────────

export interface AgentScript {
  topic: string;
  hook: string;
  mainScript: string;
  cta: string;
  fullScript: string;
  // YouTube SEO
  ytTitle: string;
  ytDescription: string;
  ytHashtags: string[];
  // Instagram SEO
  igCaption: string;
  igHashtags: string[];
  // Quality score
  hookScore: number;
}

export type HookPlatform = "YouTube" | "Instagram" | "Both";

export interface RankedHook {
  hook: string;
  trigger: string;
  score: number;
}

export interface TopicSuggestion {
  topic: string;
  angle: string;
  viralScore: number;
}

// ── Psychology Mode & Retention Level ────────────────────────────────

export type PsychologyMode = "aggressive" | "inspirational" | "educational" | "controversial" | "calm";
export type RetentionLevel = "basic" | "enhanced" | "viral";

export interface IntelligenceConfig {
  psychologyMode: PsychologyMode;
  retentionLevel: RetentionLevel;
}

const PSYCHOLOGY_MODE_TRIGGERS: Record<PsychologyMode, string[]> = {
  aggressive: ["shock_claim", "fear_of_missing_out", "urgency", "pain_agitation"],
  inspirational: ["identity_shift", "authority_position", "future_pacing", "value_bomb"],
  educational: ["value_bomb", "curiosity_loop", "authority_position"],
  controversial: ["pattern_interrupt", "shock_claim", "identity_shift", "pain_agitation"],
  calm: ["curiosity_loop", "value_bomb", "future_pacing"],
};

const PSYCHOLOGY_MODE_STYLE: Record<PsychologyMode, string> = {
  aggressive: "Use shock, fear, and urgency. Bold claims. Confrontational tone. Make them feel they CANNOT ignore this.",
  inspirational: "Motivational and empowering. Authority-based. Paint a vision of success. Make them feel capable.",
  educational: "Value-first delivery. Teach immediately. Position as expert. Informative but engaging.",
  controversial: "Challenge mainstream thinking. Take a strong stance. Provoke debate. Polarizing but authentic.",
  calm: "Thoughtful and insightful. Measured delivery. Curiosity-driven. Smart and composed tone.",
};

const RETENTION_LEVEL_CONFIG: Record<RetentionLevel, { triggerCount: number; pacingNote: string; temperature: number }> = {
  basic: {
    triggerCount: 1,
    pacingNote: "Steady pacing, clear structure, minimal pattern interrupts.",
    temperature: 0.7,
  },
  enhanced: {
    triggerCount: 2,
    pacingNote: "Medium pacing with 1-2 pattern interrupts. Emotional hooks in the middle. Build tension.",
    temperature: 0.85,
  },
  viral: {
    triggerCount: 3,
    pacingNote: "FAST pacing. Open-loop every 2 sentences. Multiple pattern interrupts. Emotional peaks every 5 seconds. Cliffhanger energy throughout. Maximum dopamine triggers.",
    temperature: 1.0,
  },
};

const DEFAULT_INTELLIGENCE: IntelligenceConfig = {
  psychologyMode: "aggressive",
  retentionLevel: "enhanced",
};

// ── Helpers ──────────────────────────────────────────────────────────

function extractJson<T>(raw: string): T {
  // Try to find JSON object or array in the response
  const objMatch = raw.match(/\{[\s\S]*\}/);
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  const match = objMatch || arrMatch;
  if (!match) throw new Error(`No JSON found in LLM response:\n${raw.slice(0, 500)}`);
  return JSON.parse(match[0]) as T;
}

// ── Psychological trigger prompts ────────────────────────────────────

const TRIGGER_PROMPTS: Record<string, string> = {
  curiosity_loop:
    "Open a curiosity loop in the first sentence — make the viewer NEED to keep watching to close the loop.",
  pattern_interrupt:
    "Start with a pattern interrupt — say something unexpected or counterintuitive that breaks the scroll.",
  shock_claim:
    "Lead with a shocking/bold claim backed by a real fact or statistic.",
  fear_of_missing_out:
    "Create FOMO — make the viewer feel they're behind if they don't know this.",
  value_bomb:
    "Deliver massive value immediately — a concrete tip, tool, or strategy they can use today.",
  identity_shift:
    "Challenge the viewer's identity — make them want to become the type of person who knows this.",
  urgency:
    "Create a sense of urgency — this information is time-sensitive or the window is closing.",
  greed_trigger:
    "Tap into the desire for wealth/success — show them what's possible.",
  authority_position:
    "Position yourself as an insider/authority — you know something most people don't.",
  future_pacing:
    "Paint a vivid picture of the future — what the world looks like if they act (or don't).",
  pain_agitation:
    "Agitate a pain point — make them feel the problem deeply before offering the solution.",
};

// ── Topic Generation ─────────────────────────────────────────────────

export async function generateTopics(
  nicheId: string,
  trendKeywords: string[] = [],
  performanceData?: { bestTopics: string[]; worstTopics: string[] },
  count: number = 5
): Promise<TopicSuggestion[]> {
  const niche = getNicheConfig(nicheId);
  const groq = getGroq();

  const trendContext = trendKeywords.length > 0
    ? `\nCurrently trending keywords in this niche: ${trendKeywords.join(", ")}`
    : "";

  const performanceContext = performanceData
    ? `\nPast best-performing topics (get MORE of these): ${performanceData.bestTopics.join(", ")}
Past worst-performing topics (AVOID these patterns): ${performanceData.worstTopics.join(", ")}`
    : "";

  const prompt = `You are a viral content strategist for ${niche.label} niche short-form video.

Your job: Generate ${count} unique, specific video topics that are HIGHLY LIKELY to go viral.

Niche seed topics for inspiration: ${niche.topicSeeds.join(", ")}
${trendContext}
${performanceContext}

Rules:
- Each topic should be a specific, concrete angle (not vague)
- Topics should sound like they'd make someone stop scrolling
- Include a mix of educational, controversial, and aspirational angles
- Score each topic's viral potential 1-100

Output ONLY valid JSON array, nothing else:
[
  { "topic": "specific topic title", "angle": "educational|controversial|aspirational|listicle|story", "viralScore": 85 }
]`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 1.0,
    max_tokens: 1024,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  try {
    return extractJson<TopicSuggestion[]>(raw);
  } catch (err) {
    logger.error("Failed to parse topics from Groq", { raw: raw.slice(0, 300) });
    // Fallback: return seed topics
    return niche.topicSeeds.slice(0, count).map((t) => ({
      topic: t,
      angle: "educational",
      viralScore: 50,
    }));
  }
}

// ── Full Script Generation (with triggers + SEO) ─────────────────────

export async function generateAgentScript(
  topic: string,
  nicheId: string,
  options?: { useHookGenerator?: boolean; platform?: HookPlatform; intelligence?: IntelligenceConfig }
): Promise<AgentScript> {
  const niche = getNicheConfig(nicheId);
  const groq = getGroq();
  const intel = options?.intelligence ?? DEFAULT_INTELLIGENCE;

  // Select triggers based on psychology mode + retention level
  const modeTriggers = PSYCHOLOGY_MODE_TRIGGERS[intel.psychologyMode];
  const retentionCfg = RETENTION_LEVEL_CONFIG[intel.retentionLevel];
  const selectedTriggers = modeTriggers
    .sort(() => Math.random() - 0.5)
    .slice(0, retentionCfg.triggerCount);

  const triggerInstructions = selectedTriggers
    .map((t) => TRIGGER_PROMPTS[t] || "")
    .filter(Boolean)
    .join("\n");

  const modeStyle = PSYCHOLOGY_MODE_STYLE[intel.psychologyMode];

  const prompt = `You are an elite viral short-form video scriptwriter for the ${niche.label} niche.

TOPIC: "${topic}"

STYLE DIRECTIVE: ${modeStyle}

PSYCHOLOGICAL HOOKS TO USE:
${triggerInstructions}

RETENTION ENGINEERING:
${retentionCfg.pacingNote}

Generate a complete YouTube Shorts / Instagram Reels script package.

RULES FOR THE SCRIPT:
- Hook (first sentence): Must grab attention in under 3 seconds. Short, punchy, emotional.
- Main script: 4-6 sentences. Conversational tone, not robotic. Short sentences. Each adds value.
- CTA: 1 sentence. Niche-relevant call-to-action.
- Total script when read aloud: 30-60 seconds.

RULES FOR SEO:
- YouTube title: ≤100 characters, keyword-rich, curiosity-driven
- YouTube description: 2-3 lines with keywords, end with hashtags
- YouTube hashtags: 5-8 relevant hashtags
- Instagram caption: Hook-based, emoji-optimized, 3-4 lines then hashtag block
- Instagram hashtags: 15-20 diverse hashtags (mix of popular + niche)

Output ONLY this JSON (no markdown, no fences):
{
  "hook": "...",
  "mainScript": "...",
  "cta": "...",
  "ytTitle": "...",
  "ytDescription": "...",
  "ytHashtags": ["#tag1", "#tag2"],
  "igCaption": "...",
  "igHashtags": ["#tag1", "#tag2"],
  "hookScore": 85
}

hookScore: rate the hook's scroll-stopping power from 1-100.`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: retentionCfg.temperature,
    max_tokens: 2048,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  const parsed = extractJson<Omit<AgentScript, "topic" | "fullScript">>(raw);

  // Optionally upgrade hook via dedicated hook generator
  let bestHook = parsed.hook;
  let bestHookScore = parsed.hookScore;
  if (options?.useHookGenerator) {
    try {
      const hooks = await generateHooks(topic, nicheId, options.platform ?? "Both");
      if (hooks.length > 0 && hooks[0].score > bestHookScore) {
        bestHook = hooks[0].hook;
        bestHookScore = hooks[0].score;
        logger.info("Hook upgraded by hook generator", {
          original: parsed.hook,
          upgraded: bestHook,
          scoreDelta: hooks[0].score - parsed.hookScore,
        });
      }
    } catch (err) {
      logger.warn("Hook generator failed, using default hook", { error: String(err) });
    }
  }

  const fullScript = `${bestHook} ${parsed.mainScript} ${parsed.cta}`;

  // Merge niche hashtags as fallback
  const ytHashtags = parsed.ytHashtags?.length
    ? parsed.ytHashtags
    : niche.hashtags.youtube;
  const igHashtags = parsed.igHashtags?.length
    ? parsed.igHashtags
    : niche.hashtags.instagram;

  return {
    topic,
    ...parsed,
    hook: bestHook,
    hookScore: bestHookScore,
    fullScript,
    ytHashtags,
    igHashtags,
  };
}

// ── Hook Optimizer ───────────────────────────────────────────────────

export async function optimizeHook(
  currentHook: string,
  topic: string,
  nicheId: string
): Promise<{ hook: string; score: number }> {
  const niche = getNicheConfig(nicheId);
  const groq = getGroq();

  const prompt = `You are a hook optimization specialist for ${niche.label} short-form video.

Current hook: "${currentHook}"
Topic: "${topic}"

Improve this hook for maximum scroll-stopping power.
Rules:
- Under 15 words
- Must create instant curiosity or shock
- Conversational, not clickbait
- Should work in the first 3 seconds of video

Output ONLY JSON:
{ "hook": "improved hook text", "score": 90 }`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.95,
    max_tokens: 256,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  try {
    return extractJson<{ hook: string; score: number }>(raw);
  } catch {
    return { hook: currentHook, score: 70 };
  }
}

// ── Pinned Comment Generator (Instagram) ─────────────────────────────

// ── Hook Generator (5 ultra-high-retention hooks) ────────────────────

export async function generateHooks(
  topic: string,
  nicheId: string,
  platform: HookPlatform = "Both",
  psychologyMode?: PsychologyMode
): Promise<RankedHook[]> {
  const niche = getNicheConfig(nicheId);
  const groq = getGroq();
  const mode = psychologyMode ?? "aggressive";

  const modeDirective = PSYCHOLOGY_MODE_STYLE[mode];

  const prompt = `You are a viral short-form content hook specialist.

Generate 5 ultra-high-retention hooks for a short-form video.

Topic: "${topic}"
Niche: ${niche.label}
Platform: ${platform}

STYLE: ${modeDirective}

Hook Rules:
- Maximum 10 words.
- No greetings.
- No filler.
- No "In this video".
- Must trigger curiosity or urgency.
- Use psychological triggers:
    - Fear of missing out
    - Authority shock
    - Pattern interrupt
    - Direct benefit
    - Controversial claim
- Must stop scrolling in under 2 seconds.
- Conversational tone.
- Short and punchy.
- Avoid robotic language.

Return hooks ranked from most aggressive to least aggressive.

Output ONLY this JSON array (no markdown, no fences):
[
  { "hook": "...", "trigger": "fomo|authority_shock|pattern_interrupt|direct_benefit|controversial_claim", "score": 95 },
  { "hook": "...", "trigger": "...", "score": 90 }
]

score: rate scroll-stopping power 1-100. Return exactly 5 hooks.`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 1.0,
    max_tokens: 512,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  try {
    const hooks = extractJson<RankedHook[]>(raw);
    // Ensure sorted by score descending (most aggressive first)
    return hooks.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch (err) {
    logger.error("Failed to parse hooks from Groq", { raw: raw.slice(0, 300) });
    // Fallback: return a single generic hook
    return [
      { hook: `This ${niche.label.toLowerCase()} secret changes everything`, trigger: "pattern_interrupt", score: 60 },
    ];
  }
}

// ── Pinned Comment Generator (Instagram) ─────────────────────────────

export async function generatePinnedComment(
  topic: string,
  nicheId: string
): Promise<string> {
  const niche = getNicheConfig(nicheId);
  const groq = getGroq();

  const prompt = `Generate a pinned comment for an Instagram Reel about "${topic}" in the ${niche.label} niche.

Rules:
- 1-2 sentences
- Encourage discussion
- Include 1-2 relevant emojis
- Sound authentic, not corporate

Output ONLY the comment text, nothing else.`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.9,
    max_tokens: 128,
  });

  return res.choices[0]?.message?.content?.trim() ?? "What do you think? 🤔 Let me know below!";
}
