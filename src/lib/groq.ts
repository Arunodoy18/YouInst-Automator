import OpenAI from "openai";

export interface ScriptResult {
  hook: string;
  mainScript: string;
  cta: string;
  title: string;
  description: string;
  fullScript: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateScript(topic: string): Promise<ScriptResult> {
  const prompt = `You are a viral YouTube Shorts scriptwriter.

Given the topic: "${topic}"

Generate a YouTube Shorts script with EXACTLY this JSON structure (no markdown, no code fences, ONLY raw JSON):

{
  "hook": "A powerful 1-sentence hook to grab attention in the first 2 seconds",
  "mainScript": "The main body of the script, 4-6 sentences, punchy and engaging",
  "cta": "A clear call-to-action sentence like 'Follow for more' or 'Like and subscribe'",
  "title": "A catchy YouTube Shorts title (max 70 chars)",
  "description": "A YouTube description with hashtags (max 200 chars)"
}

Rules:
- Write for spoken delivery (natural, conversational)
- Keep total script under 60 seconds when read aloud
- Make it dramatic and engaging
- Output ONLY valid JSON, nothing else`;

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4-turbo-preview",
    temperature: 0.9,
    max_tokens: 1024,
  });

  const raw = chatCompletion.choices[0]?.message?.content ?? "";

  // Extract JSON from the response (handles markdown fences if model ignores instruction)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`OpenAI did not return valid JSON.\nRaw response:\n${raw}`);
  }

  let parsed: Omit<ScriptResult, "fullScript">;
  try {
    parsed = JSON.parse(jsonMatch[0]) as Omit<ScriptResult, "fullScript">;
  } catch (e: any) {
    throw new Error(`OpenAI JSON parse failed: ${e.message}\nExtracted:\n${jsonMatch[0]}`);
  }

  const fullScript = `${parsed.hook} ${parsed.mainScript} ${parsed.cta}`;

  return { ...parsed, fullScript };
}
