/**
 * Fact Content Engine — Step 3 of the Fact-Based Content Pipeline
 *
 * Takes VERIFIED research data (from factResearch.ts) and generates:
 *   - Hook (7-9 words, scroll-stopping)
 *   - Timed voice script (40-55 seconds with per-line timestamps)
 *   - On-screen text/captions (synced line-by-line with script)
 *   - YouTube/Instagram SEO metadata
 *   - CTA
 *
 * CRITICAL RULE: Uses ONLY the verified items from the research JSON.
 *   - No additions, removals, or modifications of facts
 *   - Script, captions, and overlays must reference the EXACT same names
 *   - Never hallucinate new items or replace verified ones
 */
import Groq from "groq-sdk";
import logger from "./logger";
import { getNicheConfig } from "./niches";
import type { VerifiedResearch } from "./factResearch";
import type {
  PsychologyMode,
  RetentionLevel,
  ScriptLanguage,
  IntelligenceConfig,
} from "./agentBrain";

// ── Types ────────────────────────────────────────────────────────────

export interface TimedLine {
  line: string;
  timestamp_sec: number;
}

export interface OnScreenText {
  text: string;
  timestamp_sec: number;
}

export interface FactBasedContent {
  // Core content
  hook: string;
  script: TimedLine[];
  on_screen_text: OnScreenText[];
  caption: string;
  cta: string;

  // Derived for pipeline compatibility
  topic: string;
  mainScript: string;
  fullScript: string;
  hookScore: number;

  // YouTube SEO
  ytTitle: string;
  ytDescription: string;
  ytHashtags: string[];

  // Instagram SEO
  igCaption: string;
  igHashtags: string[];

  // Source data reference
  verifiedItemNames: string[];
}

// ── Groq Client ──────────────────────────────────────────────────────

const MODEL = "llama-3.3-70b-versatile";

function getGroq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function extractJson<T>(raw: string): T {
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error(`No JSON object found in LLM response:\n${raw.slice(0, 500)}`);
  return JSON.parse(objMatch[0]) as T;
}

// ── Psychology mode style directives (shared with agentBrain) ────────

const PSYCHOLOGY_MODE_STYLE: Record<PsychologyMode, string> = {
  aggressive:
    "Use shock, fear, and urgency. Bold claims. Confrontational tone.",
  inspirational:
    "Motivational and empowering. Paint a vision of success.",
  educational:
    "Value-first delivery. Teach immediately. Position as expert.",
  controversial:
    "Challenge mainstream thinking. Take a strong stance.",
  calm:
    "Thoughtful and insightful. Measured delivery. Curiosity-driven.",
};

const RETENTION_LEVEL_PACING: Record<RetentionLevel, string> = {
  basic: "Steady pacing, clear structure.",
  enhanced: "Medium pacing with 1-2 pattern interrupts. Build tension.",
  viral:
    "FAST pacing. Open-loop every 2 sentences. Maximum dopamine triggers.",
};

const LANGUAGE_DIRECTIVE: Record<ScriptLanguage, string> = {
  english: `Write entirely in English. Natural, conversational Indian-English tone. Sound like a real person talking.`,
  hinglish: `Write in HINGLISH — a natural mix of Hindi and English, like how young Indians actually talk.
Rules:
- Mix Hindi and English naturally: "Yaar, ye tool itna powerful hai ki tu imagine bhi nahi kar sakta"
- Use casual words: yaar, bhai, dekh, sun, matlab, arey, achha, sach mein, bilkul, bas, samjha
- Keep technical terms in English (AI, app, tool, money)
- Speak like Raju Rastogi telling his friends something exciting — animated, real, from-the-heart
- Use "tu/tum" not "aap"
- Add reactions: "Arey!", "Suno!", "Dekho!", "Bhai seriously!"`,
  hindi: `Write in romanized Hindi (not Devanagari). Casual everyday Hindi. Keep tech terms in English.`,
};

// ── Step 3: Generate Content from Verified Facts ─────────────────────

/**
 * Generate a complete video content package using ONLY verified research data.
 *
 * This is the heart of the fact-based pipeline — the LLM is explicitly
 * instructed to use ONLY the items from the verified JSON, never adding,
 * removing, or modifying any facts.
 */
export async function generateFactContent(
  research: VerifiedResearch,
  nicheId: string,
  intelligence?: IntelligenceConfig
): Promise<FactBasedContent> {
  const groq = getGroq();
  const niche = getNicheConfig(nicheId);
  const mode = intelligence?.psychologyMode ?? "aggressive";
  const retention = intelligence?.retentionLevel ?? "enhanced";
  const lang = intelligence?.language ?? "hinglish";

  const verifiedDataJson = JSON.stringify(research, null, 2);
  const itemNames = research.items.map((i) => i.name);
  const year = research.current_year;

  const prompt = `You are an ELITE short-form video content generator.

Your job: Create a complete YouTube Shorts / Instagram Reels content package using ONLY the verified data below.

═══════════════════════════════════
VERIFIED DATA (use ONLY these facts):
${verifiedDataJson}
═══════════════════════════════════

TOPIC: "${research.topic}"
NICHE: ${niche.label}
YEAR: ${year}
STYLE: ${PSYCHOLOGY_MODE_STYLE[mode]}
PACING: ${RETENTION_LEVEL_PACING[retention]}

LANGUAGE:
${LANGUAGE_DIRECTIVE[lang]}

═══════════════════════════════════
CONTENT REQUIREMENTS:
═══════════════════════════════════

1. HOOK (5-8 words):
   - Must stop the scroll in under 2 seconds
   - Reference a SPECIFIC item from the verified data by its EXACT name
   - No generic hooks like "You won't believe this"

2. VOICE SCRIPT (30-40 seconds when read aloud, ~70-90 words):
   - Each line = 1 spoken sentence with a timestamp (seconds from start)
   - Use ONLY the items from the verified data — mention each by EXACT name
   - COMPLETELY HUMAN conversational delivery — like you're telling your best friend
   - Sound like a real person talking excitedly, NOT a narrator or AI
   - Use reactions, short sentences, informal language
   - Never say "in ${year - 1}" or reference any past year
   - Every fact stated must come directly from the verified items

3. ON-SCREEN TEXT (synced with script):
   - Short overlay text (3-7 words) displayed during each script line
   - Must match the script content — same names, same facts
   - Timestamps must align with the corresponding script line

4. CAPTION (for YouTube description / Instagram):
   - 2-3 lines summarizing the video
   - Include the EXACT names from verified data
   - End with a CTA

5. CTA (Call-to-Action):
   - 1 sentence, niche-relevant
   - Encourage follow/subscribe/comment

6. SEO:
   - YouTube title: ≤100 characters, keyword-rich, curiosity-driven
   - YouTube description: 2-3 lines + hashtags
   - YouTube hashtags: 5-8 relevant tags
   - Instagram caption: Hook + emoji + hashtag block
   - Instagram hashtags: 15-20 mixed tags

═══════════════════════════════════
ABSOLUTE RULES — VIOLATION = FAILURE:
═══════════════════════════════════
- Use ONLY items from the verified data JSON. Do NOT add new items.
- Do NOT remove any items from the verified data.
- Do NOT modify, rename, or paraphrase any item names.
- The script, on-screen text, and caption must all reference the EXACT SAME names.
- Never mention any year before ${year}.
- Every claim in the script must trace back to the verified items.
- If the verified data has 5 items, the script must mention all 5.
- Total script MUST be 30-40 seconds when read aloud (70-90 words MAX).

OUTPUT (JSON only, no markdown, no fences):
{
  "hook": "5-8 word hook referencing a specific verified item",
  "script": [
    { "line": "First spoken sentence.", "timestamp_sec": 0 },
    { "line": "Second spoken sentence.", "timestamp_sec": 5 },
    { "line": "Continue until 30-40 seconds total.", "timestamp_sec": 10 }
  ],
  "on_screen_text": [
    { "text": "Short overlay text", "timestamp_sec": 0 },
    { "text": "Next overlay", "timestamp_sec": 5 }
  ],
  "caption": "Video caption with real names and CTA",
  "cta": "Follow for more daily insights!",
  "hookScore": 90,
  "ytTitle": "Catchy YouTube Title",
  "ytDescription": "Description with hashtags",
  "ytHashtags": ["#Tag1", "#Tag2"],
  "igCaption": "Instagram caption with emojis and hashtags",
  "igHashtags": ["#tag1", "#tag2"]
}`;

  logger.info(
    `[FactContent] Generating content for "${research.topic}" with ${itemNames.length} verified items`
  );

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.7,
    max_tokens: 3000,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  logger.info(`[FactContent] Raw response received (${raw.length} chars)`);

  const parsed = extractJson<{
    hook: string;
    script: TimedLine[];
    on_screen_text: OnScreenText[];
    caption: string;
    cta: string;
    hookScore: number;
    ytTitle: string;
    ytDescription: string;
    ytHashtags: string[];
    igCaption: string;
    igHashtags: string[];
  }>(raw);

  // ── Validation: ensure script references verified items ──
  const scriptText = parsed.script.map((s) => s.line).join(" ");
  const mentionedItems = itemNames.filter(
    (name) => scriptText.toLowerCase().includes(name.toLowerCase())
  );

  if (mentionedItems.length < Math.min(2, itemNames.length)) {
    logger.warn(
      `[FactContent] Warning: script only mentions ${mentionedItems.length}/${itemNames.length} verified items`
    );
  } else {
    logger.info(
      `[FactContent] Verified item coverage: ${mentionedItems.length}/${itemNames.length} items referenced in script`
    );
  }

  // ── Assemble mainScript and fullScript for pipeline compatibility ──
  const mainScript = parsed.script.map((s) => s.line).join(" ");
  const fullScript = `${parsed.hook} ${mainScript} ${parsed.cta}`;

  // Merge niche hashtags as fallback
  const ytHashtags =
    parsed.ytHashtags?.length > 0 ? parsed.ytHashtags : niche.hashtags.youtube;
  const igHashtags =
    parsed.igHashtags?.length > 0 ? parsed.igHashtags : niche.hashtags.instagram;

  const content: FactBasedContent = {
    hook: parsed.hook,
    script: parsed.script,
    on_screen_text: parsed.on_screen_text,
    caption: parsed.caption,
    cta: parsed.cta,
    topic: research.topic,
    mainScript,
    fullScript,
    hookScore: parsed.hookScore ?? 80,
    ytTitle: parsed.ytTitle,
    ytDescription: parsed.ytDescription,
    ytHashtags,
    igCaption: parsed.igCaption,
    igHashtags,
    verifiedItemNames: itemNames,
  };

  logger.info(
    `[FactContent] Content generated: hook="${content.hook}" | ` +
      `script=${content.script.length} lines | ` +
      `onscreen=${content.on_screen_text.length} overlays | ` +
      `hookScore=${content.hookScore}`
  );

  return content;
}
