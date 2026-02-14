import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const trends = await prisma.trendKeyword.findMany({
    include: { niche: { select: { name: true } } },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  // Group by niche
  const byNiche = new Map<string, typeof trends>();
  for (const t of trends) {
    const niche = t.niche?.name || "unknown";
    if (!byNiche.has(niche)) byNiche.set(niche, []);
    byNiche.get(niche)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Trend Keywords</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Discovered via YouTube API + Agent Brain — sorted by viral score
        </p>
      </div>

      {trends.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No trend keywords discovered yet</p>
          <p className="text-zinc-600 text-sm">Run a pipeline or trigger a trend scan to discover keywords</p>
        </div>
      ) : (
        Array.from(byNiche.entries()).map(([niche, keywords]) => (
          <div key={niche} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 capitalize">{niche}</h3>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    kw.score >= 70 ? 'bg-green-900/20 border-green-800 text-green-400' :
                    kw.score >= 40 ? 'bg-amber-900/20 border-amber-800 text-amber-400' :
                    'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                  title={`Score: ${kw.score} | Views: ${kw.viewEstimate || 0} | Used: ${kw.usedCount}x | Source: ${kw.source}`}
                >
                  {kw.keyword}
                  <span className="ml-2 opacity-60">{kw.score}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
