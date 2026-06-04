"use client"
import { useState, useCallback, useRef } from "react"

const CUISINES = ["Italian", "Japanese", "American", "French", "Mexican", "Chinese", "Indian"]
const DIETS    = ["vegetarian", "vegan", "gluten free", "ketogenic", "paleo"]

export interface RecipeFilters {
  cuisine: string
  diet: string
  maxReadyTime: string
  query: string
}

interface FilterBarProps {
  onFiltersChange: (filters: RecipeFilters) => void
}

const EMPTY: RecipeFilters = { cuisine: "", diet: "", maxReadyTime: "", query: "" }

const selectStyle = {
  background: "rgb(var(--slab))",
  border: "1px solid rgb(var(--wire))",
  color: "rgb(var(--smoke))",
  fontFamily: "var(--font-stencil)",
  fontSize: 13,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  padding: "9px 14px",
}

const inputStyle = {
  background: "rgb(var(--slab))",
  border: "1px solid rgb(var(--wire))",
  color: "rgb(var(--chalk))",
  fontFamily: "var(--font-geist-mono)",
  fontSize: 12,
  padding: "9px 14px",
}

export function FilterBar({ onFiltersChange }: FilterBarProps) {
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY)
  const filtersRef = useRef<RecipeFilters>(EMPTY)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = useCallback((key: keyof RecipeFilters, value: string) => {
    const next = { ...filtersRef.current, [key]: value }
    filtersRef.current = next
    setFilters(next)
    if (key === "query") {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onFiltersChange(next), 300)
    } else {
      onFiltersChange(next)
    }
  }, [onFiltersChange])

  const hasFilters = Object.values(filters).some(Boolean)

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    filtersRef.current = EMPTY
    setFilters(EMPTY)
    onFiltersChange(EMPTY)
  }, [onFiltersChange])

  return (
    <div
      className="flex flex-wrap items-center gap-2 bg-poster"
      style={{ padding: "12px clamp(16px,3vw,28px)", borderBottom: "4px solid rgb(var(--neon))" }}
    >
      <select value={filters.cuisine} onChange={(e) => update("cuisine", e.target.value)} aria-label="Filter by cuisine" style={selectStyle}>
        <option value="">Cuisine ▾</option>
        {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select value={filters.diet} onChange={(e) => update("diet", e.target.value)} aria-label="Filter by diet" style={selectStyle}>
        <option value="">Diet ▾</option>
        {DIETS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      <input
        type="number"
        value={filters.maxReadyTime}
        onChange={(e) => update("maxReadyTime", e.target.value)}
        placeholder="Max min"
        min={1}
        aria-label="Maximum preparation time"
        className="w-24"
        style={{ ...inputStyle, "::placeholder": { color: "rgb(var(--smoke))" } } as React.CSSProperties}
      />

      <input
        type="text"
        value={filters.query}
        onChange={(e) => update("query", e.target.value)}
        placeholder="Search plates…"
        aria-label="Search recipes"
        className="flex-1 min-w-[160px]"
        style={inputStyle}
      />

      {hasFilters && (
        <button
          onClick={clear}
          className="font-stencil text-[13px] tracking-[0.1em] uppercase text-smoke hover:text-chalk transition-colors"
          style={{ padding: "9px 14px", border: "1px solid rgb(var(--wire))" }}
        >
          Clear ×
        </button>
      )}
    </div>
  )
}
