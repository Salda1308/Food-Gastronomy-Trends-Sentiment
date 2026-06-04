"use client"
import { useEffect, useRef, useState } from "react"
import { GooeyText } from "@/components/shared/gooey-text"
import { LoginButton } from "@/components/shared/login-modal"

const KEYWORDS = ["omakase", "birria", "wagyu", "natural wine", "soba", "smashburger"]

export function Hero() {
  const [scrollY, setScrollY] = useState(0)
  const rafRef = useRef<number>(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => setScrollY(window.scrollY))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      {/* ── Layer 0: NYC video — full brightness ─── */}
      <video
        ref={videoRef}
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 z-[0] h-full w-full object-cover"
        style={{
          // Subtle parallax via transform (scale compensates for translate edge gaps)
          transform: `translateY(${scrollY * 0.12}px) scale(1.14)`,
          transformOrigin: "center top",
        }}
      >
        <source src="/assets/NYVideo.mov" type="video/mp4" />
      </video>

      {/* ── Layer 1: dark gradient overlay ─────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,6,8,0.96) 0%, rgba(6,6,8,0.91) 55%, rgba(6,6,8,0.96) 100%)",
        }}
      />

      {/* ── Layer 2: grain ───────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.70' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.05,
          mixBlendMode: "screen",
        }}
      />

      {/* ── Layer 3: all content ─────────────────────────── */}
      <div className="relative z-[3] flex min-h-[100dvh] flex-col">

        {/* Top bar */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "22px clamp(20px,4vw,60px)" }}
        >
          <div className="flex flex-wrap gap-2">
            <span
              className="font-stencil text-[9px] tracking-[0.28em] uppercase"
              style={{
                color: "rgba(238,234,226,.5)",
                padding: "4px 10px",
                border: "1px solid rgba(238,234,226,.12)",
              }}
            >
              Gastronomic Intelligence
            </span>
            <span
              className="font-stencil text-[9px] tracking-[0.28em] uppercase"
              style={{ color: "rgba(238,234,226,.28)", padding: "4px 10px" }}
            >
              New York City
            </span>
          </div>
          <span className="hidden items-center gap-2 font-mono text-[10px] sm:flex" style={{ color: "rgba(238,234,226,.3)" }}>
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ background: "#24a058", boxShadow: "0 0 6px rgba(36,160,88,.9)" }}
            />
            updated daily
          </span>
        </div>

        {/* ── Center block ─────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: "0 clamp(16px,4vw,60px)" }}>

          {/* "Empire's" — brush, white */}
          <div
            className="font-brush text-chalk leading-none uppercase"
            style={{ fontSize: "clamp(40px,6vw,88px)", opacity: 0.9 }}
          >
            Empire&rsquo;s
          </div>

          <h1
            className="font-stencil leading-[0.82] select-none"
            style={{
              fontSize: "clamp(100px,22vw,320px)",
              letterSpacing: "-0.02em",
              color: "#f5c400",
              textShadow: "0 0 60px rgba(245,196,0,0.35), 0 0 120px rgba(245,196,0,0.15)",
            }}
          >
            TASTE.
          </h1>

          {/* Gooey keyword */}
          <div
            className="mt-5 flex flex-wrap items-baseline justify-center gap-3 font-stencil uppercase tracking-[0.06em]"
            style={{ fontSize: "clamp(15px,2vw,24px)", color: "rgba(238,234,226,.45)" }}
          >
            <span>The city is eating</span>
            <GooeyText
              words={KEYWORDS}
              className="font-stencil"
              style={{ color: "rgba(238,234,226,.8)" }}
            />
          </div>

          {/* Body copy */}
          <p
            className="mt-4 max-w-[38ch] font-sans leading-relaxed"
            style={{ fontSize: 14, color: "rgba(110,108,104,.85)" }}
          >
            Eater NY articles + Spoonacular recipes — processed through a sentiment
            pipeline daily. Read the street like data.
          </p>

          {/* CTA */}
          <div className="mt-7 flex flex-col items-center gap-3">
            <LoginButton
              className="inline-block font-stencil uppercase tracking-[0.16em] text-chalk transition-[background,transform] hover:bg-white/10 active:scale-[0.97]"
              style={{
                fontSize: 14,
                padding: "13px 36px",
                border: "2px solid rgba(238,234,226,.6)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Enter Dashboard →
            </LoginButton>
            <p className="font-mono text-[10px] tracking-[0.06em]" style={{ color: "rgba(110,108,104,.7)" }}>
              — 5,000 recipes · updated daily —
            </p>
          </div>
        </div>

        {/* Bottom border — neon line at the very bottom */}
        <div style={{ height: 3, background: "rgb(var(--heat))", opacity: 0.7 }} />
      </div>
    </section>
  )
}
