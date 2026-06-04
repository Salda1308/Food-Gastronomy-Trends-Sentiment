"use client"
import { useState, useEffect, useCallback } from "react"
import { getRecipes, type RecipeItem } from "@/lib/api"
import { RecipeCard } from "@/components/dashboard/recipes/recipe-card"
import { FilterBar } from "@/components/dashboard/recipes/filter-bar"

export default function RecipesPage() {
  const [recipes, setRecipes]   = useState<RecipeItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  const fetchRecipes = useCallback(async (params: { cuisine?: string; diet?: string; maxReadyTime?: number; query?: string }) => {
    setLoading(true)
    try {
      const data = await getRecipes(params)
      setRecipes(Array.isArray(data) ? data : [])
    } catch {
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecipes({}) }, [fetchRecipes])

  const handleFiltersChange = (filters: { cuisine: string; diet: string; maxReadyTime: string; query: string }) => {
    fetchRecipes({
      cuisine:      filters.cuisine      || undefined,
      diet:         filters.diet         || undefined,
      maxReadyTime: filters.maxReadyTime ? Number(filters.maxReadyTime) : undefined,
      query:        filters.query        || undefined,
    })
  }

  const handleSave = async (recipe: RecipeItem) => {
    if (savedIds.has(recipe.id)) return
    setSavedIds((prev) => { const s = new Set(prev); s.add(recipe.id); return s })
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id, recipeTitle: recipe.title, recipeImage: recipe.image }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
    } catch {
      setSavedIds((prev) => { const s = new Set(prev); s.delete(recipe.id); return s })
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-wall">
      <FilterBar onFiltersChange={handleFiltersChange} />

      <div className="flex-1 overflow-y-auto" style={{ padding: "28px clamp(16px,3vw,32px)" }}>
        {/* Section header */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <p className="font-sans text-[14px] text-smoke mb-3">
              What&rsquo;s worth cooking this week
            </p>
            <h1
              className="font-brush text-chalk m-0 leading-[0.9] uppercase"
              style={{ fontSize: "clamp(36px,5vw,56px)", textShadow: "2px 3px 0 rgba(26,26,26,.15)" }}
            >
              On the menu
            </h1>
          </div>
          {!loading && recipes.length > 0 && (
            <span className="font-mono text-[12px] text-smoke">{recipes.length} plates found</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-poster overflow-hidden" style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}>
                <div className="h-44 animate-pulse bg-concrete" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse bg-slab" />
                  <div className="h-3 w-1/2 animate-pulse bg-slab" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex items-center justify-center bg-poster py-20 text-center" style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}>
            <div>
              <p className="font-stencil text-4xl tracking-wide text-smoke">NOTHING HERE</p>
              <p className="mt-2 font-sans text-[14px] text-smoke">No recipes match your filters — try clearing them.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isSaved={savedIds.has(recipe.id)}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
