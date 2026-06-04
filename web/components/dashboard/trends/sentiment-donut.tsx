"use client"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { SentimentData } from "@/lib/api"

const COLORS = {
  positive: "rgb(245,197,24)",   // neon — brand yellow
  negative: "rgb(230,57,70)",    // heat — brand red
  neutral:  "rgb(90,90,90)",     // smoke
}

export function SentimentDonut({ data }: { data: SentimentData }) {
  const slices = [
    { name: "Positive", value: data.positive, color: COLORS.positive },
    { name: "Negative", value: data.negative, color: COLORS.negative },
    { name: "Neutral",  value: data.neutral,  color: COLORS.neutral },
  ]
  return (
    <div className="w-full">
      <p className="mb-1 font-stencil text-[12px] tracking-[0.18em] text-chalk uppercase">
        How diners &amp; media feel about NYC food
      </p>
      <p className="mb-3 font-sans text-[14px] text-smoke leading-[1.5]">
        {data.positive >= 80
          ? "The food scene is thriving — a great week to explore new spots."
          : data.positive >= 60
          ? "Mostly upbeat coverage. Good time to try trending restaurants."
          : data.positive >= 40
          ? "Mixed reactions this week. Worth researching before you book."
          : "More criticism than usual. Stick to proven favorites this week."}
      </p>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie data={slices} dataKey="value" innerRadius={52} outerRadius={72} strokeWidth={0}>
              {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip
              formatter={(v) => typeof v === "number" ? `${v.toFixed(1)}%` : v}
              contentStyle={{ background: "rgb(var(--slab))", border: "1px solid rgb(var(--wire))", borderRadius: 2, color: "rgb(var(--chalk))" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{ fontSize: 22, color: "rgb(var(--chalk))", textShadow: "0 0 12px rgba(245,197,24,.3)" }}
          >
            {data.positive > 0 ? `${data.positive.toFixed(0)}%` : "—"}
          </span>
          <span className="font-stencil text-[12px] tracking-[0.12em] text-smoke uppercase mt-0.5">
            positive
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-5">
        {slices.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 font-stencil text-[12px] tracking-[0.12em] text-smoke uppercase">
            <span className="inline-block h-2 w-2" style={{ background: s.color }} />
            {s.name} {s.value > 0 ? `${s.value.toFixed(0)}%` : ""}
          </span>
        ))}
      </div>
    </div>
  )
}
