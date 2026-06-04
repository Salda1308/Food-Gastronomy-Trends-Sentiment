"use client"
import Image from "next/image"

interface FavoriteCardProps {
  id: string
  recipeId: number
  recipeTitle: string
  recipeImage?: string | null
  expiresAt: string
  onRemove: (id: string) => void
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now()
  if (isNaN(ms)) return 0
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function FavoriteCard({ id, recipeId, recipeTitle, recipeImage, expiresAt, onRemove }: FavoriteCardProps) {
  const days = daysUntil(expiresAt)
  const imgSrc = recipeImage || `https://picsum.photos/seed/food-${recipeId}/400/280`
  const urgent = days <= 7

  return (
    <div
      className="bg-poster overflow-hidden"
      style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, borderTop: urgent ? "4px solid rgb(var(--heat))" : "4px solid rgb(var(--neon))" }}
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden" style={{ background: "radial-gradient(130% 90% at 40% 30%, #4a3a1e, #1c150a 70%)" }}>
        <Image src={imgSrc} alt={recipeTitle} fill className="object-cover opacity-85" unoptimized />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,14,14,.9), transparent 55%)" }} />
        {/* Title over photo */}
        <div
          className="absolute bottom-3 left-3 right-3 font-brush text-chalk leading-[0.9] uppercase"
          style={{ fontSize: 22, textShadow: "2px 3px 0 rgba(0,0,0,.5)", paddingRight: 8 }}
        >
          {recipeTitle}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgb(var(--wire))" }}>
        <span
          className="font-mono text-[11px]"
          style={{ color: urgent ? "rgb(var(--heat))" : "rgb(var(--smoke))" }}
        >
          Expires in {days}d
        </span>
        <button
          onClick={() => onRemove(id)}
          className="font-stencil text-[12px] tracking-[0.1em] uppercase transition-colors hover:text-heat"
          style={{ color: "rgb(var(--smoke))", padding: "4px 8px", border: "1px solid rgb(var(--wire))" }}
        >
          Remove ×
        </button>
      </div>
    </div>
  )
}
