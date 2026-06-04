"use client"
import { motion, useMotionValue, useTransform, useReducedMotion } from "motion/react"
import { useEffect } from "react"

interface GradientTextProps {
  children: React.ReactNode
  className?: string
}

export function GradientText({ children, className = "" }: GradientTextProps) {
  const prefersReduced = useReducedMotion()
  const time = useMotionValue(0)
  const gradient = useTransform(
    time,
    (t) =>
      `linear-gradient(${90 + Math.sin(t * 0.5) * 30}deg, #e63946 0%, #1a1a1a 40%, #e63946 80%)`
  )

  useEffect(() => {
    if (prefersReduced) return
    let start = 0
    let id: number
    const tick = (ts: number) => {
      if (!start) start = ts
      time.set((ts - start) / 1000)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [time, prefersReduced])

  return (
    <motion.span
      style={{
        backgroundImage: prefersReduced ? "linear-gradient(90deg, #e63946 0%, #1a1a1a 80%)" : gradient,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
      className={className}
    >
      {children}
    </motion.span>
  )
}
