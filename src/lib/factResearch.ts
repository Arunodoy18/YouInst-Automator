/**
 * Fact Research Engine — Step 1 + Step 2 of the Fact-Based Content Pipeline
 *
 * Step 1 (Research Agent):
 *   Calls the LLM with a strict research prompt to fetch real, current,
 *   verified information about a given topic. Requires cross-checking
 *   2+ independent sources. Rejects stale data older than 6 months.
 *
 * Step 2 (Normalizer):
 *   Normalizes the raw research into a clean, structured JSON object
 *   with exact names, official URLs, no placeholders, no past years.
 *
 * Output: VerifiedResearch JSON or { error: string } on failure.
 */
import Groq from "groq-sdk";
import logger from "./logger";

// ── Types ────────────────────────────────────────────────────────────

export interface VerifiedSource {
  title: string;
  url: string;
}

export interface VerifiedItem {
  name: string;
  category: string;
  why_relevant_now: string;
  official_url: string;
}

export interface VerifiedResearch {
  topic: string;
  verified_date: string;
  current_year: number;
  sources: VerifiedSource[];
  items: VerifiedItem[];
}

export interface ResearchError {
  error: string;
}

export type ResearchResult = VerifiedResearch | ResearchError;

export function isResearchError(result: ResearchResult): result is ResearchError {
  return "error" in result;
}

// ── Groq Client ──────────────────────────────────────────────────────

const MODEL = "llama-3.3-70b-versatile";

function getGroq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

// ── JSON Extractor ───────────────────────────────────────────────────

function extractJson<T>(raw: string): T {
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error(`No JSON object found in LLM response:\n${raw.slice(0, 500)}`);
  return JSON.parse(objMatch[0]) as T;
}

// ── Step 1: Research Agent ───────────────────────────────────────────

async function runResearchAgent(topic: string, nicheLabel: string): Promise<string> {
  const groq = getGroq();
  const year = getCurrentYear();
  const date = getCurrentDate();

  const prompt = `You are a RESEARCH AGENT. Your job is to fetch REAL, CURRENT, VERIFIED information from the internet.

TOPIC: "${topic}"
NICHE: ${nicheLabel}
DATE: ${date}
YEAR: ${year}

INSTRUCTIONS:
1. Search for the MOST CURRENT and RELEVANT data about this topic.
2. Find REAL products, tools, apps, companies, people, or facts — with their ACTUAL names.
3. Every item must have a REAL official URL (website, app store, or verified page).
4. Cross-check each fact against at least 2 independent sources.
5. Reject any data older than 6 months.
6. If you cannot verify a fact with confidence, DO NOT include it.
7. All information must be valid as of ${year}. Never reference past years or outdated data.

REQUIRED OUTPUT FORMAT (JSON only, no markdown, no fences):
{
  "topic": "${topic}",
  "verified_date": "${date}",
  "current_year": ${year},
  "sources": [
    { "title": "Source Name 1", "url": "https://real-source-url.com" },
    { "title": "Source Name 2", "url": "https://real-source-url.com" }
  ],
  "items": [
    {
      "name": "EXACT Real Name (e.g., 'Notion AI', not 'an AI tool')",
      "category": "category label",
      "why_relevant_now": "1 sentence why this is relevant in ${year}",
      "official_url": "https://official-website.com"
    }
  ]
}

CRITICAL RULES:
- Provide 3-7 items minimum.
- Every "name" must be the EXACT, real name — never a placeholder like "Tool X" or "App 1".
- Every "official_url" must be a real, working URL.
- If you cannot find enough verified current data, return: { "error": "INSUFFICIENT LIVE DATA — could not verify enough current facts for this topic" }
- Do NOT fabricate, guess, or hallucinate any names, URLs, or facts.
- All items must be currently active/available in ${year}.

Output ONLY valid JSON.`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.3, // Low temp for factual accuracy
    max_tokens: 2048,
  });

  return res.choices[0]?.message?.content ?? "";
}

// ── Step 2: Normalize & Validate ─────────────────────────────────────

async function normalizeResearch(rawResearchJson: string, topic: string): Promise<string> {
  const groq = getGroq();
  const year = getCurrentYear();
  const date = getCurrentDate();

  const prompt = `You are a DATA NORMALIZER. Your job is to clean and validate research data.

RAW RESEARCH DATA:
${rawResearchJson}

TOPIC: "${topic}"
CURRENT YEAR: ${year}
CURRENT DATE: ${date}

INSTRUCTIONS:
1. Validate every item has an exact real name (not a placeholder).
2. Validate every URL looks like a real official website.
3. Remove any items that reference past years, deprecated products, or unverifiable claims.
4. Ensure "why_relevant_now" explains relevance in ${year}, not any past year.
5. Standardize all names to their official brand names.
6. Ensure 3-7 high-quality items remain after filtering.
7. If fewer than 3 items pass validation, return an error.

OUTPUT (JSON only, no markdown, no fences):
{
  "topic": "${topic}",
  "verified_date": "${date}",
  "current_year": ${year},
  "sources": [
    { "title": "Source Name", "url": "https://source-url.com" }
  ],
  "items": [
    {
      "name": "Exact Official Name",
      "category": "category",
      "why_relevant_now": "Why this matters in ${year}",
      "official_url": "https://official-url.com"
    }
  ]
}

If validation fails: { "error": "VALIDATION FAILED — insufficient verified items" }

RULES:
- NO placeholders like "Tool 1", "App X", "Example Corp".
- NO years before ${year} in any text field.
- Every URL must look like a real domain (not example.com or placeholder.url).
- Output ONLY valid JSON.`;

  const res = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.1, // Very low temp for strict validation
    max_tokens: 2048,
  });

  return res.choices[0]?.message?.content ?? "";
}

// ── Combined: Research + Normalize ───────────────────────────────────

/**
 * Execute the full fact research pipeline:
 *   Step 1 → Research Agent (fetch verified facts)
 *   Step 2 → Normalizer (validate + clean)
 *
 * Returns a VerifiedResearch object or a ResearchError.
 */
export async function fetchVerifiedFacts(
  topic: string,
  nicheLabel: string
): Promise<ResearchResult> {
  logger.info(`[FactResearch] Starting research for: "${topic}"`);

  // ── Step 1: Research ──
  let rawResearch: string;
  try {
    rawResearch = await runResearchAgent(topic, nicheLabel);
    logger.info(`[FactResearch] Step 1 complete — raw research received (${rawResearch.length} chars)`);
  } catch (err: any) {
    logger.error(`[FactResearch] Step 1 failed: ${err.message}`);
    return { error: `Research agent failed: ${err.message}` };
  }

  // Quick check: did the LLM itself return an error?
  try {
    const quickParse = extractJson<any>(rawResearch);
    if (quickParse.error) {
      logger.warn(`[FactResearch] Research agent returned error: ${quickParse.error}`);
      return { error: quickParse.error };
    }
  } catch {
    // If we can't parse it, let the normalizer try to clean it up
  }

  // ── Step 2: Normalize ──
  let normalizedRaw: string;
  try {
    normalizedRaw = await normalizeResearch(rawResearch, topic);
    logger.info(`[FactResearch] Step 2 complete — normalized (${normalizedRaw.length} chars)`);
  } catch (err: any) {
    logger.error(`[FactResearch] Step 2 failed: ${err.message}`);
    return { error: `Normalizer failed: ${err.message}` };
  }

  // ── Parse final result ──
  try {
    const result = extractJson<VerifiedResearch | ResearchError>(normalizedRaw);

    if ("error" in result) {
      logger.warn(`[FactResearch] Normalizer returned error: ${result.error}`);
      return result;
    }

    // Final validation: ensure we have real items
    const verified = result as VerifiedResearch;
    if (!verified.items || verified.items.length < 2) {
      return { error: "INSUFFICIENT DATA — fewer than 2 verified items after normalization" };
    }

    // Strip any items that still look like placeholders
    verified.items = verified.items.filter((item) => {
      const isPlaceholder =
        /^(tool|app|product|company|item)\s*\d/i.test(item.name) ||
        /example\.com|placeholder/i.test(item.official_url) ||
        item.name.length < 2;
      if (isPlaceholder) {
        logger.warn(`[FactResearch] Stripped placeholder item: "${item.name}"`);
      }
      return !isPlaceholder;
    });

    if (verified.items.length < 2) {
      return { error: "INSUFFICIENT DATA — items were mostly placeholders" };
    }

    logger.info(
      `[FactResearch] Success — ${verified.items.length} verified items: ${verified.items.map((i) => i.name).join(", ")}`
    );
    return verified;
  } catch (err: any) {
    logger.error(`[FactResearch] Final JSON parse failed: ${err.message}`);
    return { error: `JSON parse failed: ${err.message}` };
  }
}
