import { NextRequest, NextResponse } from "next/server";
import {
  generateHooks,
  type HookPlatform,
  type RankedHook,
} from "../../../../../src/lib/agentBrain";

export const dynamic = "force-dynamic";

/**
 * POST /api/hooks
 * Generate 5 ultra-high-retention hooks for a given topic + niche.
 *
 * Body: { topic: string, nicheId: string, platform?: "YouTube"|"Instagram"|"Both" }
 * Returns: { hooks: RankedHook[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, nicheId, platform } = body as {
      topic?: string;
      nicheId?: string;
      platform?: HookPlatform;
    };

    if (!topic || !nicheId) {
      return NextResponse.json(
        { error: "topic and nicheId are required" },
        { status: 400 }
      );
    }

    const hooks: RankedHook[] = await generateHooks(
      topic,
      nicheId,
      platform ?? "Both"
    );

    return NextResponse.json({ hooks });
  } catch (err: any) {
    console.error("[api/hooks] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to generate hooks" },
      { status: 500 }
    );
  }
}
