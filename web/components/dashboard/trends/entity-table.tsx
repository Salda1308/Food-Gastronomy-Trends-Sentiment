"use client"
import { useState } from "react"
import type { EntityItem } from "@/lib/api"

type TabType = "restaurant" | "chef" | "neighborhood"
const TABS: { id: TabType; label: string }[] = [
  { id: "restaurant",   label: "Restaurants"   },
  { id: "chef",         label: "Chefs"         },
  { id: "neighborhood", label: "Neighborhoods" },
]

export function EntityTable({ data }: { data: EntityItem[] }) {
  const [tab, setTab] = useState<TabType>("restaurant")
  const items = Array.isArray(data) ? data : []
  const filtered = items.filter((e) => e.type === tab).slice(0, 10)

  return (
    <div
      className="bg-poster"
      style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "22px" }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-sans text-[14px] text-smoke mb-1">Most mentioned this week</p>
          <h2 className="font-stencil text-[28px] tracking-[0.06em] text-chalk leading-none m-0">NAMED ENTITIES</h2>
        </div>
        {/* Tab pills */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              type="button"
              className="font-stencil text-[13px] tracking-[0.1em] uppercase transition-colors"
              style={{
                padding: "8px 16px",
                background: tab === t.id ? "rgb(var(--neon))"     : "rgb(var(--slab))",
                color:      tab === t.id ? "rgb(var(--poster))"   : "rgb(var(--smoke))",
                boxShadow:  tab === t.id ? "var(--shadow-tag)"    : "none",
                border:     tab === t.id ? "none" : "1px solid rgb(var(--wire))",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: "rgb(var(--wire))" }}>
        {filtered.map((entity, i) => (
          <div
            key={entity.name}
            className="flex items-baseline gap-3 py-3 transition-colors hover:bg-concrete/40"
            style={{ paddingLeft: 4, borderLeft: i === 0 ? "5px solid rgb(var(--neon))" : "5px solid transparent" }}
          >
            <span className="w-6 shrink-0 font-mono text-[13px] text-smoke">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1 font-stencil text-[22px] tracking-[0.04em] text-chalk leading-none">
              {entity.name}
            </span>
            <span className="flex-shrink-0 font-mono text-[13px] font-bold text-smoke">{entity.mentions}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center font-stencil text-[14px] tracking-wider text-smoke uppercase">
            No data yet — run the pipeline first.
          </p>
        )}
      </div>
    </div>
  )
}
