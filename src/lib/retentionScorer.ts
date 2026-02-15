/**
 * Retention Scorer — AI-powered content quality evaluation
 *
 * Evaluates short-form video content on 6 dimensions:
 *   1. Hook strength (0-20)
 *   2. Curiosity gap (0-20)
 *   3. Information density (0-15)
 *   4. Visual motion synergy (0-15)
 *   5. Voice engagement (0-15)
 *   6. CTA effectiveness (0-15)
 *
 * Total retention score: 0-100
 *
 * Also outputs:
 *   - Weak points (what hurts retention)
 *   - Improvement suggestions (for this video)
 *   - Recommended changes for next video (self-improving loop)
 *
 * Feeds back into the orchestrator for auto-improvement.
 */
import Groq from "groq-sdk";
import logger from "./logger";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface RetentionScoreBreakdown {
  hook_strength: number;         // 0-20
  curiosity_gap: number;         // 0-20
  information_density: number;   // 0-15
  visual_motion_synergy: number; // 0-15
  voice_engagement: number;      // 0-15
  cta_effectiveness: number;     // 0-15
}

export interface RetentionReport {
  retention_score: number;       // 0-100 (sum of all dimensions)
  breakdown: RetentionScoreBreakdown;
  weak_points: string[];
  improvement_suggestions: string[];
  recommended_changes_for_next_video: string[];
}

export interface RetentionInput {
  hook: string;
  script: string;
  visual_pacing: string;         // Description of visual style
  cta: string;
  topic: string;
  niche: string;
}

/* ── Groq Client ──────────────────────────────────────────────────── */

const MODEL = "llama-3.3-70b-versatile";

function getGroq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function extractJson<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in LLM response:\n${raw.slice(0, 500)}`);
  return JSON.parse(match[0]) as T;
}

/* ── Public API ────────────────────────────────────────────────────── */

/**
 * Score content retention quality using AI analysis.
 *
 * @param input  The content components to evaluate
 * @returns RetentionReport with score, breakdown, and improvement suggestions
 */
export async function scoreRetention(
  input: RetentionInput
): Promise<RetentionReport> {
  const groq = getGroq();

  const prompt = `You are a short-form content retention analyst. Your job is to evaluate video content for maximum viewer retention.

═══════════════════════════════════
CONTENT TO EVALUATE:
═══════════════════════════════════

TOPIC: "${input.topic}"
NICHE: ${input.niche}

HOOK: "${input.hook}"

SCRIPT:
${input.script}

VISUAL PACING: ${input.visual_pacing}

CTA: "${input.cta}"

═══════════════════════════════════
EVALUATION CRITERIA:
═══════════════════════════════════

Score each dimension on its scale:

1. HOOK STRENGTH (0-20):
   - Does it stop the scroll in under 2 seconds?
   - Is it specific (names, numbers) vs generic?
   - Does it create instant emotional response?
   - Would YOU stop scrolling for this?

2. CURIOSITY GAP (0-20):
   - Does it create an open loop that demands closure?
   - Is there an "I NEED to know" feeling?
   - Are there multiple curiosity hooks throughout?
   - Does it sustain curiosity till the end?

3. INFORMATION DENSITY (0-15):
   - Is every sentence adding new value?
   - No filler, no fluff, no repeated points?
   - Is the pacing right (not too fast, not too slow)?
   - Would the viewer feel smarter after watching?

4. VISUAL MOTION SYNERGY (0-15):
   - Does the pacing description match the topic energy?
   - Would the visual style enhance or distract from the message?
   - Is the background appropriate for the niche?
   - Would text overlays be readable?

5. VOICE ENGAGEMENT (0-15):
   - Is the script written for natural spoken delivery?
   - Are there natural pause points?
   - Is the tone matching the content (curious, energetic, calm)?
   - Would it sound good with a warm, friendly narrator?

6. CTA EFFECTIVENESS (0-15):
   - Is the CTA specific and actionable?
   - Does it feel like a natural conclusion (not forced)?
   - Does it align with the niche and platform?
   - Would it actually drive followers/engagement?

═══════════════════════════════════
OUTPUT (JSON only, no markdown, no fences):
═══════════════════════════════════

{
  "retention_score": 0,
  "breakdown": {
    "hook_strength": 0,
    "curiosity_gap": 0,
    "information_density": 0,
    "visual_motion_synergy": 0,
    "voice_engagement": 0,
    "cta_effectiveness": 0
  },
  "weak_points": [
    "Specific issue 1",
    "Specific issue 2"
  ],
  "improvement_suggestions": [
    "Concrete suggestion 1 for THIS video",
    "Concrete suggestion 2"
  ],
  "recommended_changes_for_next_video": [
    "Strategic change 1 for future videos",
    "Strategic change 2"
  ]
}

RULES:
- Be BRUTALLY honest. Do not inflate scores.
- Every weak point must be specific and actionable.
- Suggestions must be concrete (not vague like "make it better").
- retention_score MUST equal the sum of all breakdown values.
- Output ONLY valid JSON.`;

  logger.info(`[RetentionScorer] Scoring content for: "${input.topic}"`);

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.3, // Low temp for consistent, analytical scoring
    max_tokens: 1500,
  });

  const raw = res.choices[0]?.message?.content ?? "";

  try {
    const report = extractJson<RetentionReport>(raw);

    // Validate score sum
    if (report.breakdown) {
      const sum =
        report.breakdown.hook_strength +
        report.breakdown.curiosity_gap +
        report.breakdown.information_density +
        report.breakdown.visual_motion_synergy +
        report.breakdown.voice_engagement +
        report.breakdown.cta_effectiveness;
      report.retention_score = sum; // Force consistency
    }

    // Ensure arrays exist
    report.weak_points = report.weak_points ?? [];
    report.improvement_suggestions = report.improvement_suggestions ?? [];
    report.recommended_changes_for_next_video = report.recommended_changes_for_next_video ?? [];

    logger.info(
      `[RetentionScorer] Score: ${report.retention_score}/100 | ` +
        `Hook: ${report.breakdown.hook_strength}/20 | ` +
        `Curiosity: ${report.breakdown.curiosity_gap}/20 | ` +
        `Density: ${report.breakdown.information_density}/15 | ` +
        `Visual: ${report.breakdown.visual_motion_synergy}/15 | ` +
        `Voice: ${report.breakdown.voice_engagement}/15 | ` +
        `CTA: ${report.breakdown.cta_effectiveness}/15`
    );

    if (report.weak_points.length > 0) {
      logger.info(`[RetentionScorer] Weak points: ${report.weak_points.join("; ")}`);
    }

    return report;
  } catch (err: any) {
    logger.error(`[RetentionScorer] JSON parse failed: ${err.message}`);
    // Return a neutral fallback score
    return {
      retention_score: 50,
      breakdown: {
        hook_strength: 10,
        curiosity_gap: 10,
        information_density: 8,
        visual_motion_synergy: 8,
        voice_engagement: 7,
        cta_effectiveness: 7,
      },
      weak_points: ["Retention scoring failed — using default scores"],
      improvement_suggestions: [],
      recommended_changes_for_next_video: [],
    };
  }
}
