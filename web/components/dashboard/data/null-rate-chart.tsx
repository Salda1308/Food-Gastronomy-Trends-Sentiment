"use client"
import type { NullRateItem } from "@/lib/api"

function healthColor(rate: number): { bar: string; badge: string; label: string } {
  if (rate > 50) return { bar: "rgb(var(--heat))",        badge: "bg-heat/20 text-heat",   label: "High concern" }
  if (rate > 20) return { bar: "rgb(245,160,50)",         badge: "bg-orange-500/20 text-orange-400", label: "Review needed" }
  if (rate > 5)  return { bar: "rgb(var(--neon))",        badge: "bg-neon/20 text-neon",   label: "Acceptable" }
  return              { bar: "rgb(var(--neon))",          badge: "bg-neon/10 text-chalk",          label: "Healthy" }
}

export function NullRateChart({ data }: { data: NullRateItem[] }) {
  const sorted = [...(Array.isArray(data) ? data : [])].sort((a, b) => b.null_rate - a.null_rate)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((item) => {
        const { bar, label } = healthColor(item.null_rate)
        const pct = Math.min(Math.round(item.null_rate), 100)

        return (
          <div
            key={item.field}
            className="bg-concrete p-4"
            style={{ border: "1px solid rgb(var(--wire))", borderRadius: 2 }}
          >
            {/* Field name */}
            <p className="font-sans text-[13px] text-chalk leading-[1.3] mb-3 min-h-[36px]">
              {item.field}
            </p>

            {/* Bar */}
            <div className="h-1.5 bg-slab mb-2" style={{ borderRadius: 1 }}>
              <div
                className="h-full transition-[width]"
                style={{ width: `${pct}%`, background: bar, borderRadius: 1 }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[20px]" style={{ color: bar }}>
                {pct}%
              </span>
              <span className="font-stencil text-[12px] tracking-[0.12em] uppercase px-2 py-1"
                style={{ background: `${bar}22`, color: bar, border: `1px solid ${bar}44` }}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
