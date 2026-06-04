"use client"
import { useRef, useMemo } from "react"
import { useAnimationFrame, useReducedMotion } from "motion/react"

export interface ColumnItem {
  keyword: string
  label: "positive" | "negative" | "neutral"
  score: number
}

interface TestimonialsColumnProps {
  items: ColumnItem[]
  direction?: "up" | "down"
  speed?: number
  className?: string
}

export function TestimonialsColumn({ items, direction = "up", speed = 40, className = "" }: TestimonialsColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(0)
  const prefersReduced = useReducedMotion()
  const doubled = useMemo(() => [...items, ...items], [items])

  useAnimationFrame((_, delta) => {
    if (prefersReduced || !containerRef.current) return
    const half = containerRef.current.scrollHeight / 2
    if (half === 0) return
    posRef.current += direction === "up" ? -(speed * delta) / 1000 : (speed * delta) / 1000
    if (posRef.current <= -half) posRef.current += half
    if (posRef.current >= half)  posRef.current -= half
    containerRef.current.style.transform = `translateY(${posRef.current}px)`
  })

  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={containerRef} className="flex flex-col gap-3">
        {doubled.map((item, i) => {
          const isPos = item.label === "positive"
          const isNeg = item.label === "negative"
          return (
            <div
              key={`${item.keyword}-${i}`}
              className="bg-ink"
              style={{
                borderLeft: `5px solid ${isPos ? "rgb(var(--neon))" : isNeg ? "rgb(var(--heat))" : "rgb(var(--smoke))"}`,
                padding: "12px 15px",
                boxShadow: "4px 4px 0 rgba(0,0,0,.4)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-stencil text-[17px] tracking-[0.06em] text-chalk">
                  {item.keyword}
                </span>
                <span
                  className="font-mono text-[12px] font-bold"
                  style={{
                    color: isPos ? "rgb(var(--neon))" : isNeg ? "rgb(var(--heat))" : "rgb(var(--smoke))",
                  }}
                >
                  {isPos ? "▲" : isNeg ? "▼" : "→"} {item.score.toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
