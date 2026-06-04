"use client"
import type { KeywordItem } from "@/lib/api"

const COLOR: Record<string, string> = {
  positive: "rgb(var(--neon))",
  negative: "rgb(var(--heat))",
  neutral:  "rgb(var(--smoke))",
}

function scoreLabel(score: number, sentiment: string): string {
  const abs = Math.abs(score)
  if (sentiment === "positive") {
    if (abs >= 0.8) return "Highly trending"
    if (abs >= 0.5) return "Trending"
    if (abs >= 0.3) return "Growing"
    return "Mentioned"
  }
  if (sentiment === "negative") {
    if (abs >= 0.5) return "Heavily criticized"
    return "Mixed reviews"
  }
  return "Neutral coverage"
}

export function KeywordBars({ data }: { data: KeywordItem[] }) {
  const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10)
  const max = Math.max(...sorted.map((d) => Math.abs(d.score)), 0.01)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item, rank) => (
        <div key={item.keyword}>
          <div className="flex items-center gap-3 mb-1">
            {/* Rank */}
            <span className="w-6 shrink-0 font-mono text-[13px] text-smoke text-right">
              {String(rank + 1).padStart(2, "0")}
            </span>
            {/* Keyword */}
            <span
              className="w-28 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap font-stencil text-[17px] tracking-[0.04em]"
              style={{ color: rank === 0 ? "rgb(var(--neon))" : "rgb(var(--chalk))" }}
            >
              {item.keyword}
            </span>
            {/* Bar */}
            <div className="flex-1 h-2.5 bg-concrete">
              <div
                className="h-full transition-[width]"
                style={{
                  width: `${(Math.abs(item.score) / max) * 100}%`,
                  background: COLOR[item.label] ?? "#5a5a5a",
                  boxShadow: rank === 0 ? "0 0 8px rgba(245,197,24,.35)" : "none",
                }}
              />
            </div>
            {/* Human label */}
            <span
              className="w-32 shrink-0 text-right font-sans text-[13px]"
              style={{ color: COLOR[item.label] ?? "#5a5a5a", opacity: 0.85 }}
            >
              {scoreLabel(item.score, item.label)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
