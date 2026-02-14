import prisma from "@/lib/prisma";
import { Brain } from "lucide-react";

export const dynamic = "force-dynamic";

const AVAILABLE_NICHES = [
  { id: "tech", label: "Tech", color: "from-blue-500 to-cyan-500" },
  { id: "ai", label: "AI", color: "from-violet-500 to-purple-500" },
  { id: "ai-motivation", label: "AI Motivation", color: "from-amber-500 to-orange-500" },
  { id: "finance-tech", label: "Finance + Tech", color: "from-green-500 to-emerald-500" },
  { id: "future-tech", label: "Future Tech", color: "from-cyan-500 to-blue-500" },
  { id: "productivity", label: "Productivity", color: "from-rose-500 to-pink-500" },
  { id: "startup", label: "Startup", color: "from-yellow-500 to-amber-500" },
];

export default async function NichesPage() {
  const activeNiches = await prisma.niche.findMany({
    include: {
      _count: { select: { scripts: true, trendKeywords: true } },
      channel: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Niches</h2>
        <p className="text-zinc-500 text-sm mt-1">
          7 AI-optimized content niches with psychological triggers
        </p>
      </div>

      {/* Available Niches */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {AVAILABLE_NICHES.map((niche) => {
          const active = activeNiches.find((n) => n.name === niche.id);
          return (
            <div
              key={niche.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${niche.color} flex items-center justify-center mb-3`}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold">{niche.label}</h3>
              {active ? (
                <div className="mt-2 space-y-1 text-xs text-zinc-400">
                  <p>Channel: {active.channel?.name || "—"}</p>
                  <p>Scripts: {active._count.scripts} · Keywords: {active._count.trendKeywords}</p>
                  <span className="inline-block mt-1 text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-600">Not activated — assign to a channel to start</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Niche Details */}
      {activeNiches.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4">Active Niche Assignments</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2">Niche</th>
                <th className="text-left py-2">Channel</th>
                <th className="text-right py-2">Scripts</th>
                <th className="text-right py-2">Keywords</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeNiches.map((n) => (
                <tr key={n.id} className="border-b border-zinc-800/50">
                  <td className="py-3 font-medium">{n.name}</td>
                  <td className="py-3 text-zinc-400">{n.channel?.name || "—"}</td>
                  <td className="py-3 text-right">{n._count.scripts}</td>
                  <td className="py-3 text-right">{n._count.trendKeywords}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      n.isActive ? 'bg-green-900/50 text-green-400' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {n.isActive ? "active" : "paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
