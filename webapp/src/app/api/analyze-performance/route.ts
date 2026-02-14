import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  analyzePerformance,
  collectChannelMetrics,
  type VideoMetrics,
  type PerformanceAnalysis,
} from "../../../../../src/lib/performanceOptimizer";

export const dynamic = "force-dynamic";

/**
 * GET /api/analyze-performance
 *
 * Run a full AI-powered performance analysis on the user's channel.
 * Pulls metrics from the database (last 30 days by default).
 *
 * Query params:
 *   lookbackDays?: number (default 30)
 *
 * Returns: PerformanceAnalysis
 */
export async function GET(req: NextRequest) {
  try {
    const lookbackDays = parseInt(
      req.nextUrl.searchParams.get("lookbackDays") ?? "30",
      10
    );

    // Get user's channel (multi-user: use session)
    const channel = await prisma.channel.findFirst();
    if (!channel) {
      return NextResponse.json(
        { error: "No channel found. Create a channel first." },
        { status: 404 }
      );
    }

    const metrics = await collectChannelMetrics(channel.id, lookbackDays);
    const analysis = await analyzePerformance(metrics);

    return NextResponse.json({
      analysis,
      metricsCollected: metrics.length,
      channelId: channel.id,
    });
  } catch (err: any) {
    console.error("[api/analyze-performance] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "Analysis failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analyze-performance
 *
 * Analyze manually-provided metrics (for ad-hoc / external data analysis).
 *
 * Body:
 *   metrics: VideoMetrics[]  — array of video metric objects
 *
 * Returns: PerformanceAnalysis
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { metrics } = body as { metrics?: VideoMetrics[] };

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: "metrics must be a non-empty array of VideoMetrics objects" },
        { status: 400 }
      );
    }

    if (metrics.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 videos per analysis request" },
        { status: 400 }
      );
    }

    const analysis: PerformanceAnalysis = await analyzePerformance(metrics);

    return NextResponse.json({
      analysis,
      metricsProvided: metrics.length,
    });
  } catch (err: any) {
    console.error("[api/analyze-performance] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "Analysis failed" },
      { status: 500 }
    );
  }
}
