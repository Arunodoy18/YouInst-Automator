import prisma from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import PerformanceAnalysisPanel from "../../../components/PerformanceAnalysisPanel";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // Get all analytics with video info
  const postedVideos = await prisma.postedVideo.findMany({
    where: { status: "published" },
    include: {
      analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      renderedVideo: { include: { script: { include: { niche: true } } } },
    },
    orderBy: { postedAt: "desc" },
    take: 50,
  });

  // Aggregate stats
  const allAnalytics = postedVideos.flatMap((pv) => pv.analytics);
  const totalViews = allAnalytics.reduce((s, a) => s + a.views, 0);
  const totalLikes = allAnalytics.reduce((s, a) => s + a.likes, 0);
  const totalComments = allAnalytics.reduce((s, a) => s + a.comments, 0);
  const totalShares = allAnalytics.reduce((s, a) => s + a.shares, 0);
  const avgEngagement = totalViews > 0
    ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2)
    : "0";

  // Per-niche breakdown
  const nicheStats = new Map<string, { views: number; videos: number; likes: number }>();
  for (const pv of postedVideos) {
    const niche = pv.renderedVideo?.script?.niche?.name || "unknown";
    const stats = nicheStats.get(niche) || { views: 0, videos: 0, likes: 0 };
    const a = pv.analytics[0];
    if (a) {
      stats.views += a.views;
      stats.likes += a.likes;
    }
    stats.videos++;
    nicheStats.set(niche, stats);
  }

  // Best performing video
  const bestVideo = postedVideos
    .filter((pv) => pv.analytics.length > 0)
    .sort((a, b) => (b.analytics[0]?.views || 0) - (a.analytics[0]?.views || 0))[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-zinc-500 text-sm mt-1">Performance tracking & self-learning insights</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Views", value: formatNumber(totalViews), color: "text-blue-400" },
          { label: "Total Likes", value: formatNumber(totalLikes), color: "text-rose-400" },
          { label: "Comments", value: formatNumber(totalComments), color: "text-amber-400" },
          { label: "Shares", value: formatNumber(totalShares), color: "text-green-400" },
          { label: "Avg Engagement", value: `${avgEngagement}%`, color: "text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-zinc-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* AI Performance Analysis (client component) */}
      <PerformanceAnalysisPanel />

      <div className="grid grid-cols-2 gap-6">
        {/* Per-Niche Breakdown */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Performance by Niche
          </h3>
          <div className="space-y-3">
            {Array.from(nicheStats.entries())
              .sort((a, b) => b[1].views - a[1].views)
              .map(([niche, stats]) => (
                <div key={niche} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div>
                    <p className="font-medium text-sm">{niche}</p>
                    <p className="text-xs text-zinc-500">{stats.videos} videos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatNumber(stats.views)} views</p>
                    <p className="text-xs text-zinc-500">{formatNumber(stats.likes)} likes</p>
                  </div>
                </div>
              ))}
            {nicheStats.size === 0 && (
              <p className="text-zinc-500 text-sm">No data yet</p>
            )}
          </div>
        </div>

        {/* Best Performing */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Top Performing Video
          </h3>
          {bestVideo ? (
            <div className="space-y-3">
              <p className="font-medium">{bestVideo.renderedVideo?.script?.topic}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">Views</p>
                  <p className="text-lg font-bold text-blue-400">
                    {formatNumber(bestVideo.analytics[0]?.views || 0)}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500">Likes</p>
                  <p className="text-lg font-bold text-rose-400">
                    {formatNumber(bestVideo.analytics[0]?.likes || 0)}
                  </p>
                </div>
              </div>
              <div className="text-sm text-zinc-400">
                <p>Niche: {bestVideo.renderedVideo?.script?.niche?.name}</p>
                <p>Hook Score: {bestVideo.renderedVideo?.script?.hookScore}</p>
                {bestVideo.url && (
                  <a href={bestVideo.url} target="_blank" rel="noopener noreferrer"
                    className="text-violet-400 hover:underline">
                    View on {bestVideo.platform} →
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Post videos to see performance data</p>
          )}
        </div>
      </div>

      {/* All Videos Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="font-semibold mb-4">All Video Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2">Topic</th>
                <th className="text-left py-2">Niche</th>
                <th className="text-left py-2">Platform</th>
                <th className="text-right py-2">Views</th>
                <th className="text-right py-2">Likes</th>
                <th className="text-right py-2">Comments</th>
                <th className="text-right py-2">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {postedVideos.map((pv) => {
                const a = pv.analytics[0];
                const eng = a && a.views > 0
                  ? ((a.likes + a.comments + a.shares) / a.views * 100).toFixed(1)
                  : "—";
                return (
                  <tr key={pv.id} className="border-b border-zinc-800/50">
                    <td className="py-3 max-w-xs truncate">{pv.renderedVideo?.script?.topic || "—"}</td>
                    <td className="py-3 text-zinc-400">{pv.renderedVideo?.script?.niche?.name || "—"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        pv.platform === 'youtube' ? 'bg-red-900/30 text-red-400' : 'bg-pink-900/30 text-pink-400'
                      }`}>{pv.platform}</span>
                    </td>
                    <td className="py-3 text-right">{a ? formatNumber(a.views) : "—"}</td>
                    <td className="py-3 text-right">{a ? formatNumber(a.likes) : "—"}</td>
                    <td className="py-3 text-right">{a ? formatNumber(a.comments) : "—"}</td>
                    <td className="py-3 text-right">{eng}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
