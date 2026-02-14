/**
 * Trend Intelligence Engine
 *
 * Discovers trending topics via:
 * 1. YouTube Data API search (high-view, low-competition detection)
 * 2. Agent Brain topic generation (Groq)
 * Stores trending keywords with scores in the database.
 */
import { google } from "googleapis";
import prisma from "./db";
import { generateTopics } from "./agentBrain";
import logger from "./logger";

// ── YouTube Trending Discovery ───────────────────────────────────────

interface YouTubeTrendResult {
  keyword: string;
  viewEstimate: number;
  competition: "low" | "medium" | "high";
  score: number;
}

/**
 * Search YouTube for trending Shorts in a niche, analyze view counts
 * and competition level, return scored keywords.
 */
export async function discoverYouTubeTrends(
  niche: string,
  seedQueries: string[],
  maxResults: number = 10
): Promise<YouTubeTrendResult[]> {
  const apiKey = process.env.GROQ_API_KEY; // We'll use the YouTube API key if available
  const ytApiKey = process.env.YOUTUBE_API_KEY;

  // If no YouTube API key, fall back to agent-generated topics
  if (!ytApiKey) {
    logger.info("No YOUTUBE_API_KEY set, using agent-based trend discovery");
    return seedQueries.slice(0, maxResults).map((kw) => ({
      keyword: kw,
      viewEstimate: 0,
      competition: "medium" as const,
      score: 50,
    }));
  }

  const youtube = google.youtube({ version: "v3", auth: ytApiKey });
  const results: YouTubeTrendResult[] = [];

  for (const query of seedQueries.slice(0, 3)) {
    try {
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: `${query} #shorts`,
        type: ["video"],
        videoDuration: "short",
        order: "viewCount",
        maxResults: 5,
        publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const videoIds = (searchRes.data.items || [])
        .map((item) => item.id?.videoId)
        .filter(Boolean) as string[];

      if (videoIds.length === 0) continue;

      // Get video statistics
      const statsRes = await youtube.videos.list({
        part: ["statistics", "snippet"],
        id: videoIds,
      });

      for (const video of statsRes.data.items || []) {
        const views = parseInt(video.statistics?.viewCount || "0", 10);
        const title = video.snippet?.title || "";

        // Extract keywords from title
        const keywords = title
          .replace(/[#@]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 3)
          .join(" ");

        if (!keywords) continue;

        // Score: higher views + recency = higher score
        // Competition: based on number of results
        const score = Math.min(100, Math.round(Math.log10(views + 1) * 15));
        const competition = views > 1_000_000 ? "high" : views > 100_000 ? "medium" : "low";

        results.push({
          keyword: keywords,
          viewEstimate: views,
          competition,
          score,
        });
      }
    } catch (err: any) {
      logger.warn(`YouTube search failed for "${query}": ${err.message}`);
    }
  }

  // Deduplicate and sort by score
  const seen = new Set<string>();
  return results
    .filter((r) => {
      const key = r.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ── Store Trends in DB ───────────────────────────────────────────────

export async function storeTrends(
  nicheId: string,
  trends: YouTubeTrendResult[]
): Promise<void> {
  for (const trend of trends) {
    await prisma.trendKeyword.upsert({
      where: {
        id: `${nicheId}-${trend.keyword.toLowerCase().replace(/\s+/g, "-")}`,
      },
      create: {
        id: `${nicheId}-${trend.keyword.toLowerCase().replace(/\s+/g, "-")}`,
        nicheId,
        keyword: trend.keyword,
        score: trend.score,
        source: "youtube",
        viewEstimate: trend.viewEstimate,
        competition: trend.competition,
      },
      update: {
        score: trend.score,
        viewEstimate: trend.viewEstimate,
        competition: trend.competition,
        updatedAt: new Date(),
      },
    });
  }
  logger.info(`Stored ${trends.length} trend keywords for niche ${nicheId}`);
}

// ── Get Best Unused Keywords ─────────────────────────────────────────

export async function getBestKeywords(
  nicheId: string,
  limit: number = 5
): Promise<string[]> {
  const keywords = await prisma.trendKeyword.findMany({
    where: {
      nicheId,
      usedCount: { lt: 3 }, // Don't reuse keywords too much
    },
    orderBy: [
      { score: "desc" },
      { usedCount: "asc" },
    ],
    take: limit,
  });

  return keywords.map((k) => k.keyword);
}

// ── Full Trend Scan (combines YouTube + Agent) ───────────────────────

export async function runTrendScan(
  nicheId: string,
  seedQueries: string[]
): Promise<string[]> {
  logger.info(`Running trend scan for niche: ${nicheId}`);

  // 1. YouTube API trends
  const ytTrends = await discoverYouTubeTrends(nicheId, seedQueries);

  // 2. Agent-generated topics (always works, no API needed)
  const agentTopics = await generateTopics(
    nicheId,
    ytTrends.map((t) => t.keyword)
  );

  // Merge all keywords
  const allTrends: YouTubeTrendResult[] = [
    ...ytTrends,
    ...agentTopics.map((t) => ({
      keyword: t.topic,
      viewEstimate: 0,
      competition: "medium" as const,
      score: t.viralScore,
    })),
  ];

  // Store in DB
  await storeTrends(nicheId, allTrends);

  logger.info(`Trend scan complete: ${allTrends.length} keywords found`);
  return allTrends.map((t) => t.keyword);
}
