/**
 * Analytics Tracker — Performance tracking + self-learning feedback loop
 *
 * Fetches real analytics from YouTube & Instagram APIs,
 * stores them in the database, and computes performance signals
 * that feed back into the Agent Brain for content optimization.
 */
import { google } from "googleapis";
import prisma from "./db";
import logger from "./logger";

// ── YouTube Analytics ────────────────────────────────────────────────

interface YouTubeVideoStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Fetch YouTube video statistics using the channel's OAuth credentials.
 */
export async function fetchYouTubeStats(
  platformVideoId: string,
  channelId: string
): Promise<YouTubeVideoStats> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) throw new Error(`Channel ${channelId} not found`);

  // Use channel-specific OAuth if available, else fall back to env vars
  const clientId = channel.clientId || process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = channel.clientSecret || process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = channel.refreshToken || process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    logger.warn("YouTube OAuth not configured for analytics");
    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2 });

  try {
    const res = await youtube.videos.list({
      part: ["statistics"],
      id: [platformVideoId],
    });

    const stats = res.data.items?.[0]?.statistics;
    if (!stats) return { views: 0, likes: 0, comments: 0, shares: 0 };

    return {
      views: parseInt(stats.viewCount || "0", 10),
      likes: parseInt(stats.likeCount || "0", 10),
      comments: parseInt(stats.commentCount || "0", 10),
      shares: 0, // YouTube API doesn't expose shares directly
    };
  } catch (err: any) {
    logger.warn(`YouTube stats fetch failed for ${platformVideoId}: ${err.message}`);
    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }
}

// ── Instagram Analytics ──────────────────────────────────────────────

interface InstagramMediaStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
}

/**
 * Fetch Instagram Reel insights using Graph API.
 */
export async function fetchInstagramStats(
  platformVideoId: string,
  channelId: string
): Promise<InstagramMediaStats> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel?.accessToken) {
    logger.warn("Instagram access token not configured");
    return { views: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
  }

  const url = `https://graph.instagram.com/v19.0/${platformVideoId}/insights?metric=plays,likes,comments,shares,reach&access_token=${channel.accessToken}`;

  try {
    const res = await fetch(url);
    const data: any = await res.json();

    if (data.error) {
      logger.warn(`IG insights error: ${data.error.message}`);
      return { views: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
    }

    const metrics: Record<string, number> = {};
    for (const item of data.data || []) {
      metrics[item.name] = item.values?.[0]?.value || 0;
    }

    return {
      views: metrics.plays || 0,
      likes: metrics.likes || 0,
      comments: metrics.comments || 0,
      shares: metrics.shares || 0,
      reach: metrics.reach || 0,
    };
  } catch (err: any) {
    logger.warn(`Instagram stats fetch failed: ${err.message}`);
    return { views: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
  }
}

// ── Store Analytics Snapshot ─────────────────────────────────────────

export async function storeAnalytics(
  postedVideoId: string,
  stats: { views: number; likes: number; comments: number; shares: number; retention?: number; ctr?: number }
): Promise<void> {
  await prisma.analytics.create({
    data: {
      postedVideoId,
      views: stats.views,
      likes: stats.likes,
      comments: stats.comments,
      shares: stats.shares,
      retention: stats.retention || null,
      ctr: stats.ctr || null,
    },
  });
  logger.info(`Stored analytics for posted video ${postedVideoId}: ${stats.views} views`);
}

// ── Fetch & Store (combined) ─────────────────────────────────────────

export async function fetchAndStoreAnalytics(
  postedVideoDbId: string
): Promise<void> {
  const posted = await prisma.postedVideo.findUnique({
    where: { id: postedVideoDbId },
    include: { channel: true },
  });

  if (!posted || !posted.platformVideoId) {
    logger.warn(`Posted video ${postedVideoDbId} not found or missing platform ID`);
    return;
  }

  let stats: { views: number; likes: number; comments: number; shares: number };

  if (posted.platform === "youtube") {
    stats = await fetchYouTubeStats(posted.platformVideoId, posted.channelId);
  } else if (posted.platform === "instagram") {
    const igStats = await fetchInstagramStats(posted.platformVideoId, posted.channelId);
    stats = igStats;
  } else {
    logger.warn(`Unknown platform: ${posted.platform}`);
    return;
  }

  await storeAnalytics(postedVideoDbId, stats);
}

// ── Performance Feedback for Agent Brain ─────────────────────────────

export interface PerformanceFeedback {
  bestTopics: string[];
  worstTopics: string[];
  avgViews: number;
  avgEngagement: number;
  topHooks: string[];
}

/**
 * Analyze all posted videos for a niche and compute performance feedback
 * that can be fed back into the Agent Brain for self-improvement.
 */
export async function getPerformanceFeedback(
  nicheDbId: string,
  lookbackDays: number = 30
): Promise<PerformanceFeedback> {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  // Get all scripts with their videos and analytics for this niche
  const scripts = await prisma.generatedScript.findMany({
    where: {
      nicheId: nicheDbId,
      createdAt: { gte: since },
    },
    include: {
      renderedVideo: {
        include: {
          postedVideos: {
            include: {
              analytics: {
                orderBy: { fetchedAt: "desc" },
                take: 1, // Latest analytics snapshot
              },
            },
          },
        },
      },
    },
  });

  // Score each script by its best analytics
  interface ScoredScript {
    topic: string;
    hook: string;
    views: number;
    engagement: number; // (likes + comments + shares) / views
  }

  const scored: ScoredScript[] = [];

  for (const script of scripts) {
    const analytics = script.renderedVideo?.postedVideos
      ?.flatMap((pv) => pv.analytics) || [];

    if (analytics.length === 0) continue;

    const best = analytics.reduce((a, b) => (a.views > b.views ? a : b));

    const engagement =
      best.views > 0
        ? (best.likes + best.comments + best.shares) / best.views
        : 0;

    scored.push({
      topic: script.topic,
      hook: script.hook,
      views: best.views,
      engagement,
    });
  }

  if (scored.length === 0) {
    return {
      bestTopics: [],
      worstTopics: [],
      avgViews: 0,
      avgEngagement: 0,
      topHooks: [],
    };
  }

  // Sort by views
  scored.sort((a, b) => b.views - a.views);

  const topN = Math.max(1, Math.floor(scored.length * 0.25));
  const bottomN = Math.max(1, Math.floor(scored.length * 0.25));

  const avgViews = scored.reduce((s, v) => s + v.views, 0) / scored.length;
  const avgEngagement = scored.reduce((s, v) => s + v.engagement, 0) / scored.length;

  return {
    bestTopics: scored.slice(0, topN).map((s) => s.topic),
    worstTopics: scored.slice(-bottomN).map((s) => s.topic),
    avgViews: Math.round(avgViews),
    avgEngagement: Math.round(avgEngagement * 10000) / 100, // as percentage
    topHooks: scored.slice(0, 3).map((s) => s.hook),
  };
}

// ── Batch Analytics Fetch ────────────────────────────────────────────

/**
 * Fetch analytics for all recently posted videos that haven't been
 * checked in the last N hours.
 */
export async function fetchAllPendingAnalytics(
  hoursThreshold: number = 6
): Promise<number> {
  const threshold = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

  const pending = await prisma.postedVideo.findMany({
    where: {
      status: "published",
      platformVideoId: { not: null },
      OR: [
        {
          analytics: {
            none: {},
          },
        },
        {
          analytics: {
            every: {
              fetchedAt: { lt: threshold },
            },
          },
        },
      ],
    },
  });

  let fetched = 0;
  for (const pv of pending) {
    try {
      await fetchAndStoreAnalytics(pv.id);
      fetched++;
    } catch (err: any) {
      logger.warn(`Analytics fetch failed for ${pv.id}: ${err.message}`);
    }
  }

  logger.info(`Fetched analytics for ${fetched}/${pending.length} posted videos`);
  return fetched;
}
