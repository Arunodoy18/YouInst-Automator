import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/intelligence
 * Fetch content intelligence settings for the user's channel.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channel = await prisma.channel.findFirst({
      where: { userId: user.id },
      include: { intelligenceConfig: true },
    });

    if (!channel) {
      return NextResponse.json({
        config: {
          psychologyMode: "aggressive",
          retentionLevel: "enhanced",
          nicheRotationEnabled: false,
        },
        channelId: null,
      });
    }

    const config = channel.intelligenceConfig ?? {
      psychologyMode: "aggressive",
      retentionLevel: "enhanced",
      nicheRotationEnabled: false,
    };

    // Get niche rotation summary if rotation is enabled
    let rotationSummary: any[] = [];
    if (config.nicheRotationEnabled) {
      const lookbackStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const usageLogs = await prisma.nicheUsageLog.findMany({
        where: { channelId: channel.id, usedAt: { gte: lookbackStart } },
        orderBy: { usedAt: "desc" },
      });

      const map = new Map<string, { count: number; lastUsed: Date; totalViews: number }>();
      for (const log of usageLogs) {
        const existing = map.get(log.nicheId);
        if (!existing) {
          map.set(log.nicheId, { count: 1, lastUsed: log.usedAt, totalViews: log.views });
        } else {
          existing.count++;
          existing.totalViews += log.views;
        }
      }

      rotationSummary = Array.from(map.entries()).map(([nicheId, data]) => ({
        nicheId,
        usageCount: data.count,
        lastUsed: data.lastUsed.toISOString(),
        avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
      }));
    }

    return NextResponse.json({
      config: {
        psychologyMode: config.psychologyMode,
        retentionLevel: config.retentionLevel,
        nicheRotationEnabled: config.nicheRotationEnabled,
      },
      channelId: channel.id,
      rotationSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/intelligence
 * Update content intelligence settings.
 *
 * Body: {
 *   psychologyMode: "aggressive" | "inspirational" | "educational" | "controversial" | "calm",
 *   retentionLevel: "basic" | "enhanced" | "viral",
 *   nicheRotationEnabled: boolean
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { psychologyMode, retentionLevel, nicheRotationEnabled } = body;

    // Validate
    const validModes = ["aggressive", "inspirational", "educational", "controversial", "calm"];
    const validRetention = ["basic", "enhanced", "viral"];

    if (psychologyMode && !validModes.includes(psychologyMode)) {
      return NextResponse.json({ error: `Invalid psychologyMode. Valid: ${validModes.join(", ")}` }, { status: 400 });
    }
    if (retentionLevel && !validRetention.includes(retentionLevel)) {
      return NextResponse.json({ error: `Invalid retentionLevel. Valid: ${validRetention.join(", ")}` }, { status: 400 });
    }

    // Get or create channel
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let channel = await prisma.channel.findFirst({ where: { userId: user.id } });
    if (!channel) {
      channel = await prisma.channel.create({
        data: { userId: user.id, name: "Default Channel", platform: "youtube" },
      });
    }

    // Upsert intelligence config
    const config = await prisma.contentIntelligenceConfig.upsert({
      where: { channelId: channel.id },
      update: {
        ...(psychologyMode !== undefined && { psychologyMode }),
        ...(retentionLevel !== undefined && { retentionLevel }),
        ...(nicheRotationEnabled !== undefined && { nicheRotationEnabled }),
      },
      create: {
        channelId: channel.id,
        psychologyMode: psychologyMode ?? "aggressive",
        retentionLevel: retentionLevel ?? "enhanced",
        nicheRotationEnabled: nicheRotationEnabled ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        psychologyMode: config.psychologyMode,
        retentionLevel: config.retentionLevel,
        nicheRotationEnabled: config.nicheRotationEnabled,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
