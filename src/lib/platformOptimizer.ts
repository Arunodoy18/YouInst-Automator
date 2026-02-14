/**
 * Platform Optimizer — YouTube + Instagram specific SEO optimization
 *
 * Ensures metadata meets each platform's requirements and best practices:
 * - YouTube: Title length, description structure, hashtag limits
 * - Instagram: Caption formatting, hashtag strategy, emoji optimization
 */
import type { AgentScript } from "./agentBrain";
import { getNicheConfig } from "./niches";
import logger from "./logger";

// ── Platform Limits ──────────────────────────────────────────────────

const YT_TITLE_MAX = 100;
const YT_DESC_MAX = 5000;
const YT_HASHTAG_MAX = 15;         // YouTube supports up to 15 hashtags
const YT_HASHTAG_RECOMMENDED = 5;  // but 3-5 is optimal

const IG_CAPTION_MAX = 2200;
const IG_HASHTAG_MAX = 30;
const IG_HASHTAG_RECOMMENDED = 20; // 15-20 is the sweet spot

// ── YouTube Optimization ─────────────────────────────────────────────

export interface OptimizedYouTubeData {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
}

export function optimizeForYouTube(
  script: AgentScript,
  nicheId: string
): OptimizedYouTubeData {
  const niche = getNicheConfig(nicheId);

  // Title: ensure under limit, add emoji if missing
  let title = script.ytTitle || script.topic;
  if (title.length > YT_TITLE_MAX) {
    title = title.slice(0, YT_TITLE_MAX - 3) + "…";
  }

  // Description: structured format
  const hashtagBlock = (script.ytHashtags || niche.hashtags.youtube)
    .slice(0, YT_HASHTAG_RECOMMENDED)
    .join(" ");

  const description = [
    script.ytDescription || script.hook,
    "",
    `🎯 ${niche.ctaTemplates[0] || "Follow for more!"}`,
    "",
    hashtagBlock,
    "",
    "#Shorts",
  ]
    .join("\n")
    .slice(0, YT_DESC_MAX);

  // Tags: combine hashtags as tags (without #)
  const tags = [
    ...(script.ytHashtags || []),
    ...niche.hashtags.youtube,
    "shorts",
    niche.label.toLowerCase(),
  ]
    .map((t) => t.replace(/^#/, "").toLowerCase())
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .slice(0, YT_HASHTAG_MAX);

  // Category: map niches to YouTube category IDs
  const categoryMap: Record<string, string> = {
    tech: "28",           // Science & Technology
    ai: "28",
    "ai-motivation": "22", // People & Blogs
    "finance-tech": "22",
    "future-tech": "28",
    productivity: "26",    // Howto & Style
    startup: "22",
  };

  return {
    title,
    description,
    tags,
    categoryId: categoryMap[nicheId] || "22",
  };
}

// ── Instagram Optimization ───────────────────────────────────────────

export interface OptimizedInstagramData {
  caption: string;
  hashtags: string[];
  pinnedCommentSuggestion: string;
}

export function optimizeForInstagram(
  script: AgentScript,
  nicheId: string
): OptimizedInstagramData {
  const niche = getNicheConfig(nicheId);

  // Build caption: hook + CTA + gap + hashtags
  const mainCaption = script.igCaption || `${script.hook}\n\n${script.cta}`;

  // Hashtag strategy: mix of script hashtags + niche defaults
  const allHashtags = [
    ...(script.igHashtags || []),
    ...niche.hashtags.instagram,
  ]
    .map((t) => (t.startsWith("#") ? t : `#${t}`).toLowerCase())
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .slice(0, IG_HASHTAG_RECOMMENDED);

  const hashtagBlock = allHashtags.join(" ");

  // Full caption with line breaks for readability
  const caption = [
    mainCaption,
    "",
    ".", // Instagram line break trick
    "",
    hashtagBlock,
  ]
    .join("\n")
    .slice(0, IG_CAPTION_MAX);

  // Pinned comment suggestion (CTA in comments performs better)
  const pinnedCommentSuggestion =
    niche.ctaTemplates[Math.floor(Math.random() * niche.ctaTemplates.length)] +
    " 👇";

  return {
    caption,
    hashtags: allHashtags,
    pinnedCommentSuggestion,
  };
}

// ── Combined Platform Optimization ───────────────────────────────────

export interface PlatformOptimizedData {
  youtube: OptimizedYouTubeData;
  instagram: OptimizedInstagramData;
}

export function optimizeForAllPlatforms(
  script: AgentScript,
  nicheId: string
): PlatformOptimizedData {
  logger.info(`Optimizing metadata for all platforms — niche: ${nicheId}`);
  return {
    youtube: optimizeForYouTube(script, nicheId),
    instagram: optimizeForInstagram(script, nicheId),
  };
}
