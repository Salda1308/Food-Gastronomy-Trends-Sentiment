"use client"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import type { RecipeItem } from "@/lib/api"

interface RecipeCardProps {
  recipe: RecipeItem
  isSaved?: boolean
  onSave?: (recipe: RecipeItem) => void
}

export function RecipeCard({ recipe, isSaved = false, onSave }: RecipeCardProps) {
  const [hover, setHover] = useState(false)
  const [pulse, setPulse] = useState(false)

  const imgSrc = recipe.image || `https://picsum.photos/seed/food-${recipe.id}/400/280`
  const health = recipe.healthScore ?? 0
  const badgeTone = health >= 80 ? "positive" : health >= 60 ? "neutral" : "negative"

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    if (isSaved) return
    setPulse(true)
    setTimeout(() => setPulse(false), 320)
    onSave?.(recipe)
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bg-poster overflow-hidden"
      style={{
        boxShadow: hover ? "var(--shadow-poster-hover, 8px 12px 0 rgba(0,0,0,.50), 16px 22px 0 rgba(0,0,0,.18))" : "var(--shadow-poster)",
        borderRadius: 2,
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow .18s, transform .18s",
      }}
    >
      {/* Photo */}
      <Link href={`/dashboard/recipes/${recipe.id}`} className="block">
        <div className="relative h-44 overflow-hidden" style={{ background: "radial-gradient(130% 90% at 40% 30%, #4a3a1e, #1c150a 70%)" }}>
          <Image
            src={imgSrc}
            alt={recipe.title}
            fill
            className="object-cover"
            unoptimized
            style={{ opacity: 0.85, transition: "opacity .2s" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,14,14,.9), transparent 55%)" }} />

          {/* Health sticker */}
          <span
            className="absolute left-3 top-3 font-mono font-bold text-poster text-[12px] bg-neon"
            style={{ padding: "3px 7px", boxShadow: "var(--shadow-tag)" }}
          >
            ★ {health}
          </span>

          {/* Save heart */}
          <button
            onClick={handleSave}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Saved to favorites" : "Save to favorites"}
            className="absolute right-3 top-3 flex items-center justify-center transition-colors"
            style={{
              width: 30, height: 30,
              background: isSaved ? "rgb(var(--neon))" : "rgb(var(--concrete))",
              boxShadow: isSaved ? "var(--shadow-tag)" : "none",
              transform: pulse ? "scale(1.3)" : "scale(1)",
              transition: "background .15s, transform .15s",
            }}
          >
            <span style={{ color: isSaved ? "rgb(var(--poster))" : "rgb(var(--smoke))", fontSize: 14 }}>
              {isSaved ? "♥" : "♡"}
            </span>
          </button>

          {/* Title over photo */}
          <div
            className="absolute bottom-3 left-3 right-3 font-brush text-chalk leading-[0.9] uppercase"
            style={{ fontSize: 24, textShadow: "2px 3px 0 rgba(0,0,0,.5)", paddingRight: 8 }}
          >
            {recipe.title}
          </div>
        </div>
      </Link>

      {/* Meta */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: "1px solid rgb(var(--wire))" }}
      >
        <span className="font-mono text-[13px] text-smoke">
          {recipe.readyInMinutes} min · {recipe.cuisines || "intl"}
        </span>
        <span
          className="font-stencil text-[12px] tracking-[0.14em] uppercase"
          style={{
            padding: "4px 10px",
            background: badgeTone === "positive" ? "rgba(245,197,24,.12)" : badgeTone === "negative" ? "rgba(230,57,70,.15)" : "rgb(var(--concrete))",
            color:      badgeTone === "positive" ? "rgb(var(--chalk))" : badgeTone === "negative" ? "rgb(var(--heat))" : "rgb(var(--smoke))",
            border:     `1px solid ${badgeTone === "positive" ? "rgba(245,197,24,.3)" : badgeTone === "negative" ? "rgba(230,57,70,.3)" : "rgb(var(--wire))"}`,
            boxShadow:  "var(--shadow-tag)",
          }}
        >
          {badgeTone === "positive" ? "aligned" : badgeTone === "negative" ? "fading" : "steady"}
        </span>
      </div>
    </div>
  )
}
