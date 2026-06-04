"use client"
import { useState, useEffect, useId, CSSProperties } from "react"

interface GooeyTextProps {
  words: string[]
  className?: string
  style?: CSSProperties
  interval?: number
}

export function GooeyText({ words, className = "", style, interval = 1900 }: GooeyTextProps) {
  const [index, setIndex] = useState(0)
  const rawId = useId()
  const filterId = rawId.replace(/:/g, "")

  useEffect(() => {
    if (!words.length) return
    const t = setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
    return () => clearInterval(t)
  }, [words.length, interval])

  if (!words.length) return null

  return (
    <span
      className={`relative inline-block ${className}`}
      style={{ minWidth: "5.5em", verticalAlign: "baseline", ...style }}
      role="status"
      aria-live="polite"
      aria-label={words[index]}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <span style={{ filter: `url(#${filterId})`, display: "inline-block" }}>
        {words.map((w, idx) => (
          <span
            key={w}
            style={{
              position: idx === 0 ? "relative" : "absolute",
              left: 0,
              top: 0,
              opacity: idx === index ? 1 : 0,
              transform: idx === index ? "scale(1)" : "scale(0.85)",
              transition: "opacity .5s, transform .5s",
              whiteSpace: "nowrap",
            }}
          >
            {w}
          </span>
        ))}
      </span>
    </span>
  )
}
