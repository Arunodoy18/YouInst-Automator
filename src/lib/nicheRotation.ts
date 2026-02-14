/**
 * Niche Rotation Engine — Intelligent niche selection
 *
 * Implements a weighted-probability rotation algorithm:
 * - Tracks niche usage over last 7 days
 * - Penalizes recently used niches
 * - Boosts high-performing niches
 * - Prevents content fatigue via cooldown
 */
import prisma from "./db";
import logger from "./logger";
import { NICHE_IDS } from "./niches";

// ── Types ────────────────────────────────────────────────────────────

export interface NicheWeight {
  nicheId: string;
  weight: number;
  reason: string;
  lastUsedDaysAgo: number | null;
  avgViews: number;
}

export interface RotationResult {
  selectedNicheId: string;
  weights: NicheWeight[];
  rotationEnabled: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

const LOOKBACK_DAYS = 7;
const BASE_WEIGHT = 100;
const RECENCY_PENALTY_FACTOR = 0.3;   // 30% reduction per day recency (day 0 = max penalty)
const PERFORMANCE_BOOST_FACTOR = 1.5; // 50% boost for top performers
const UNDERPERFORM_PENALTY = 0.6;     // 40% penalty for underperformers
const COOLDOWN_DAYS = 1;              // Minimum days before re-using a niche

// ── Core Algorithm ───────────────────────────────────────────────────

/**
 * Select the best niche for today using intelligent rotation.
 * 
 * Algorithm:
 * 1. Load usage history for last 7 days
 * 2. Load performance data per niche
 * 3. Score each niche:
 *    - Start with BASE_WEIGHT (100)
 *    - If used yesterday: reduce by 70% (COOLDOWN)
 *    - If used 2 days ago: reduce by 40%
 *    - If high performing (top 33%): boost by 50%
 *    - If underperforming (bottom 33%): reduce by 40%
 * 4. Weighted random selection from scored niches
 */
export async function selectNicheWithRotation(
  channelId: string,
  activeNicheIds?: string[]
): Promise<RotationResult> {
  const niches = activeNicheIds ?? NICHE_IDS;
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // 1. Get usage history
  const usageLogs = await prisma.nicheUsageLog.findMany({
    where: {
      channelId,
      usedAt: { gte: lookbackStart },
    },
    orderBy: { usedAt: "desc" },
  });

  // Build usage map: nicheId → most recent usage + count
  const usageMap = new Map<string, { lastUsed: Date; count: number; totalViews: number; totalEngagement: number }>();
  for (const log of usageLogs) {
    const existing = usageMap.get(log.nicheId);
    if (!existing) {
      usageMap.set(log.nicheId, {
        lastUsed: log.usedAt,
        count: 1,
        totalViews: log.views,
        totalEngagement: log.engagement,
      });
    } else {
      existing.count++;
      existing.totalViews += log.views;
      existing.totalEngagement += log.engagement;
    }
  }

  // 2. Compute performance scores for ranking
  const performanceScores: { nicheId: string; score: number }[] = [];
  for (const nicheId of niches) {
    const usage = usageMap.get(nicheId);
    if (usage && usage.count > 0) {
      // Score = avg views * (1 + engagement rate)
      const avgViews = usage.totalViews / usage.count;
      const avgEngagement = usage.totalEngagement / usage.count;
      performanceScores.push({ nicheId, score: avgViews * (1 + avgEngagement) });
    } else {
      // Never used in window — give neutral score
      performanceScores.push({ nicheId, score: 0 });
    }
  }

  performanceScores.sort((a, b) => b.score - a.score);
  const topThreshold = Math.ceil(niches.length / 3);
  const topPerformers = new Set(performanceScores.slice(0, topThreshold).filter(p => p.score > 0).map(p => p.nicheId));
  const bottomPerformers = new Set(performanceScores.slice(-topThreshold).filter(p => p.score > 0).map(p => p.nicheId));

  // 3. Score each niche
  const weights: NicheWeight[] = [];

  for (const nicheId of niches) {
    let weight = BASE_WEIGHT;
    let reason = "base";

    const usage = usageMap.get(nicheId);
    let lastUsedDaysAgo: number | null = null;

    if (usage) {
      const msSinceUse = now.getTime() - usage.lastUsed.getTime();
      lastUsedDaysAgo = Math.floor(msSinceUse / (24 * 60 * 60 * 1000));

      // Recency penalty — stronger the more recent
      if (lastUsedDaysAgo < COOLDOWN_DAYS) {
        weight *= (1 - RECENCY_PENALTY_FACTOR * 3); // Heavy penalty for same-day or yesterday
        reason = "cooldown (used today/yesterday)";
      } else if (lastUsedDaysAgo <= 2) {
        weight *= (1 - RECENCY_PENALTY_FACTOR * 2);
        reason = "recent (2 days ago)";
      } else if (lastUsedDaysAgo <= 4) {
        weight *= (1 - RECENCY_PENALTY_FACTOR);
        reason = "somewhat recent";
      } else {
        reason = "rested (5+ days)";
      }

      // Overuse penalty — more uses in window = lower weight
      if (usage.count >= 3) {
        weight *= 0.5;
        reason += " + overused";
      }
    } else {
      // Never used — slight boost for freshness
      weight *= 1.2;
      reason = "never used (fresh)";
    }

    // Performance adjustments
    if (topPerformers.has(nicheId)) {
      weight *= PERFORMANCE_BOOST_FACTOR;
      reason += " + top performer";
    } else if (bottomPerformers.has(nicheId)) {
      weight *= UNDERPERFORM_PENALTY;
      reason += " + underperforming";
    }

    const avgViews = usage ? Math.round(usage.totalViews / usage.count) : 0;

    weights.push({
      nicheId,
      weight: Math.max(1, Math.round(weight)), // Minimum weight of 1
      reason,
      lastUsedDaysAgo,
      avgViews,
    });
  }

  // 4. Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedNicheId = niches[0]; // fallback

  for (const w of weights) {
    random -= w.weight;
    if (random <= 0) {
      selectedNicheId = w.nicheId;
      break;
    }
  }

  logger.info("Niche rotation result", {
    selected: selectedNicheId,
    weights: weights.map(w => `${w.nicheId}:${w.weight}`).join(", "),
  });

  return {
    selectedNicheId,
    weights,
    rotationEnabled: true,
  };
}

// ── Log Niche Usage ──────────────────────────────────────────────────

/**
 * Record that a niche was used for content generation.
 * Called after a video is uploaded, with performance data backfilled later.
 */
export async function logNicheUsage(
  channelId: string,
  nicheId: string,
  views: number = 0,
  engagement: number = 0
): Promise<void> {
  await prisma.nicheUsageLog.create({
    data: { channelId, nicheId, views, engagement },
  });
}

/**
 * Backfill performance data into niche usage logs from analytics.
 * Called periodically to update weights with real performance data.
 */
export async function backfillNichePerformance(channelId: string): Promise<void> {
  const recentUsages = await prisma.nicheUsageLog.findMany({
    where: {
      channelId,
      views: 0, // Only unupdated ones
    },
    orderBy: { usedAt: "desc" },
    take: 50,
  });

  for (const usage of recentUsages) {
    // Find posted videos for this niche around the usage time
    const windowStart = new Date(usage.usedAt.getTime() - 60 * 60 * 1000); // 1hr before
    const windowEnd = new Date(usage.usedAt.getTime() + 24 * 60 * 60 * 1000); // 24hr after

    const postedVideos = await prisma.postedVideo.findMany({
      where: {
        channelId,
        status: "published",
        postedAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
        renderedVideo: {
          include: {
            script: { select: { nicheId: true, niche: { select: { name: true } } } },
          },
        },
      },
    });

    // Match by niche name
    const matchingVideo = postedVideos.find(
      pv => pv.renderedVideo?.script?.niche?.name === usage.nicheId
    );

    if (matchingVideo?.analytics?.[0]) {
      const a = matchingVideo.analytics[0];
      const views = a.views;
      const engagement = views > 0 ? (a.likes + a.comments + a.shares) / views : 0;

      await prisma.nicheUsageLog.update({
        where: { id: usage.id },
        data: { views, engagement },
      });
    }
  }

  logger.info(`Backfilled niche performance for channel ${channelId}`);
}

// ── Rotation Summary ─────────────────────────────────────────────────

/**
 * Get a summary of niche rotation state for the dashboard.
 */
export async function getRotationSummary(
  channelId: string
): Promise<{ nicheId: string; usageCount: number; lastUsed: Date | null; avgViews: number }[]> {
  const lookbackStart = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const usageLogs = await prisma.nicheUsageLog.findMany({
    where: {
      channelId,
      usedAt: { gte: lookbackStart },
    },
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

  return NICHE_IDS.map(nicheId => {
    const data = map.get(nicheId);
    return {
      nicheId,
      usageCount: data?.count ?? 0,
      lastUsed: data?.lastUsed ?? null,
      avgViews: data ? Math.round(data.totalViews / data.count) : 0,
    };
  });
}
