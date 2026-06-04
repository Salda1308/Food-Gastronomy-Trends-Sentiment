"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import type { TrendPoint } from "@/lib/api"

export function TrendLine({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center font-sans text-[14px] text-smoke">
        No trend data available
      </p>
    )
  }

  if (data.length === 1) {
    const point = data[0]
    const score = point.avg_sentiment
    const label = score >= 0.2 ? "Positive" : score <= -0.2 ? "Negative" : "Mixed"
    const color = score >= 0.2 ? "rgb(var(--chalk))" : score <= -0.2 ? "rgb(var(--heat))" : "rgb(var(--smoke))"
    return (
      <div className="py-4 text-center">
        <p className="font-sans text-[14px] text-smoke mb-2">
          Week of {point.week}
        </p>
        <p className="font-mono font-bold text-[28px]" style={{ color }}>
          {label}
        </p>
        <p className="font-sans text-[13px] text-smoke mt-2">
          Not enough history for a trend — run the pipeline daily to build it
        </p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={150} minWidth={0}>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 9, fontFamily: "var(--font-geist-mono)", fill: "rgb(var(--smoke))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[-1, 1]} hide />
          <ReferenceLine y={0} stroke="rgb(var(--wire))" strokeDasharray="3 3" />
          <Tooltip
            formatter={(v) => typeof v === "number" ? (v >= 0.2 ? "Positive" : v <= -0.2 ? "Negative" : "Mixed") + ` (${(v > 0 ? "+" : "") + v.toFixed(2)})` : v}
            contentStyle={{ background: "rgb(var(--slab))", border: "1px solid rgb(var(--wire))", borderRadius: 2, color: "rgb(var(--chalk))", fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="avg_sentiment"
            stroke="#f5c518"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#f5c518" }}
            activeDot={{ r: 6, fill: "#f5c518", stroke: "rgb(var(--poster))", strokeWidth: 2, style: { filter: "drop-shadow(0 0 5px #f5c518)" } }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
