import { NextRequest, NextResponse } from "next/server";
import {
  scoreTopics,
  type ScorerPlatform,
  type ScorerResult,
} from "../../../../../src/lib/viralScorer";

export const dynamic = "force-dynamic";

/**
 * POST /api/score-topics
 *
 * Score a list of topics across 7 viral dimensions.
 *
 * Body:
 *   topics: string[]            — 1-20 topic strings
 *   nicheId: string             — e.g. "ai", "tech", "money"
 *   platform?: "YouTube" | "Instagram" | "Both" (default "Both")
 *
 * Returns: ScorerResult with ranked topics, breakdowns, and reasoning.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topics, nicheId, platform } = body as {
      topics?: string[];
      nicheId?: string;
      platform?: ScorerPlatform;
    };

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: "topics must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    if (!nicheId) {
      return NextResponse.json(
        { error: "nicheId is required" },
        { status: 400 }
      );
    }

    if (topics.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 topics per request" },
        { status: 400 }
      );
    }

    const result: ScorerResult = await scoreTopics(
      topics,
      nicheId,
      platform ?? "Both"
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/score-topics] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to score topics" },
      { status: 500 }
    );
  }
}
