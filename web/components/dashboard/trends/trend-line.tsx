"use client"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts"
import type { TrendPoint } from "@/lib/api"

const POS_COLOR = "#4ade80"
const NEG_COLOR = "#f87171"
const NEU_COLOR = "#94a3b8"

type ChartPoint = {
  week: string
  positive: number
  negative: number
  neutral: number
  count: number
}

function formatWeek(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

type TooltipEntry = { dataKey: string; value: number; payload: ChartPoint }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const pos = payload.find(p => p.dataKey === "positive")?.value ?? 0
  const neg = payload.find(p => p.dataKey === "negative")?.value ?? 0
  const neu = payload.find(p => p.dataKey === "neutral")?.value ?? 0
  const count = payload[0]?.payload?.count ?? 0
  return (
    <div style={{
      background: "rgb(var(--slab))", border: "1px solid rgb(var(--wire))",
      borderRadius: 2, padding: "10px 14px", fontFamily: "var(--font-geist-mono)", fontSize: 11,
      color: "rgb(var(--chalk))",
    }}>
      <p style={{ margin: "0 0 6px", color: "rgb(var(--smoke))", letterSpacing: "0.1em" }}>
        Week of {label} · {count} articles
      </p>
      <p style={{ margin: "2px 0", color: POS_COLOR }}>▲ Positive  {pos.toFixed(1)}%</p>
      <p style={{ margin: "2px 0", color: NEU_COLOR }}>◆ Neutral   {neu.toFixed(1)}%</p>
      <p style={{ margin: "2px 0", color: NEG_COLOR }}>▼ Negative  {neg.toFixed(1)}%</p>
    </div>
  )
}

export function TrendLine({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center font-sans text-[14px] text-smoke">
        No trend data available
      </p>
    )
  }

  // If data has no pct fields (old parquet), fall back to a single info card
  const hasPct = data.some(d => d.positive_pct > 0 || d.negative_pct > 0)

  if (!hasPct) {
    // Old data: show a "needs pipeline rerun" notice alongside the best info we have
    const latest = data[data.length - 1]
    const score = latest.avg_sentiment
    const label = score >= 0.2 ? "Positive" : score <= -0.2 ? "Negative" : "Mixed"
    const color = score >= 0.2 ? POS_COLOR : score <= -0.2 ? NEG_COLOR : NEU_COLOR
    return (
      <div className="py-4 text-center">
        <p className="font-mono font-bold text-[28px]" style={{ color }}>{label}</p>
        <p className="font-sans text-[12px] text-smoke mt-2">
          Re-run the pipeline to see the weekly % breakdown
        </p>
      </div>
    )
  }

  const chartData: ChartPoint[] = data.map(d => ({
    week:     formatWeek(d.week),
    positive: d.positive_pct,
    negative: d.negative_pct,
    neutral:  d.neutral_pct,
    count:    d.article_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={160} minWidth={0}>
      <BarChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }} barSize={28}>
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", fill: "rgb(var(--smoke))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis domain={[0, 100]} hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="positive" stackId="a" fill={POS_COLOR} radius={0}>
          <LabelList
            dataKey="positive"
            position="insideTop"
            style={{ fontSize: 9, fontFamily: "var(--font-geist-mono)", fill: "#fff", fontWeight: 700 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => typeof v === "number" && v > 10 ? `${Math.round(v)}%` : ""}
          />
        </Bar>
        <Bar dataKey="neutral"  stackId="a" fill={NEU_COLOR} radius={0} />
        <Bar dataKey="negative" stackId="a" fill={NEG_COLOR} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
