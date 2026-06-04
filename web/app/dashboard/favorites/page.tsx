"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { FavoriteCard } from "@/components/dashboard/favorites/favorite-card"
import { ExpiryBanner } from "@/components/dashboard/favorites/expiry-banner"
import type { RecipeItem } from "@/lib/api"

interface Favorite {
  id: string
  recipeId: number
  recipeTitle: string
  recipeImage?: string | null
  expiresAt: string
}


async function downloadPDF(favorites: Favorite[]) {
  const results = await Promise.allSettled(
    favorites.map((fav) =>
      fetch(`/api/recipe/${fav.recipeId}`).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json() as Promise<RecipeItem>
      })
    )
  )

  const recipes: RecipeItem[] = results
    .map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : ({ id: favorites[i].recipeId, title: favorites[i].recipeTitle, image: favorites[i].recipeImage ?? null, readyInMinutes: 0, cuisines: "", diets: "", dishTypes: "", healthScore: 0, spoonacularScore: 0 } as RecipeItem)
    )

  const pages = recipes.map((recipe) => {
    const img = recipe.image || `https://picsum.photos/seed/food-${recipe.id}/800/420`
    const ingredients = recipe.ingredient_names
      ? recipe.ingredient_names.split(",").map((s) => s.trim()).filter(Boolean)
      : []
    const badges = [
      recipe.vegetarian && "Vegetarian",
      recipe.vegan      && "Vegan",
      recipe.glutenFree && "Gluten Free",
      recipe.dairyFree  && "Dairy Free",
    ].filter(Boolean) as string[]

    const metaItems = [
      { label: "Ready in",     value: recipe.readyInMinutes ? `${recipe.readyInMinutes} min` : "—" },
      { label: "Servings",     value: recipe.servings ?? "—" },
      { label: "Health",       value: recipe.healthScore != null ? `${recipe.healthScore}/100` : "—" },
      { label: "Likes",        value: recipe.aggregateLikes?.toLocaleString() ?? "—" },
    ]

    return `
    <div class="recipe">
      <img class="recipe-img" src="${img}" alt="${recipe.title.replace(/"/g, "&quot;")}" />
      <div class="recipe-body">
        ${recipe.cuisines ? `<div class="cuisine-badge">${recipe.cuisines}</div>` : ""}
        <h2>${recipe.title}</h2>
        <div class="meta-grid">
          ${metaItems.map(({ label, value }) => `
            <div class="meta-box">
              <div class="meta-label">${label}</div>
              <div class="meta-value">${value}</div>
            </div>`).join("")}
        </div>
        ${badges.length ? `<div class="badges">${badges.map((b) => `<span class="badge">${b}</span>`).join("")}</div>` : ""}
        ${ingredients.length ? `
        <h3>Ingredients</h3>
        <ul class="ingredients">
          ${ingredients.map((ing) => `<li>${ing}</li>`).join("")}
        </ul>` : ""}
        ${recipe.instructions_text ? `
        <h3>Instructions</h3>
        <p class="instructions">${recipe.instructions_text}</p>` : ""}
        ${recipe.sourceUrl ? `<p class="source">Source: <a href="${recipe.sourceUrl}">${recipe.sourceUrl}</a></p>` : ""}
      </div>
    </div>`
  }).join("")

  const win = window.open("", "_blank")
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Empire's Taste — Saved Plates</title>
  <style>
    @page { size: A4; margin: 2cm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Helvetica Neue", Arial, sans-serif; background: #fff; color: #111; font-size: 13px; }

    /* Cover */
    .cover { padding: 48px 0 32px; border-bottom: 3px solid #111; margin-bottom: 0; }
    .cover-title { font-size: 52px; font-weight: 900; letter-spacing: -0.02em; line-height: 1; }
    .cover-sub { margin-top: 8px; font-size: 13px; color: #555; }

    /* Recipe block — one per page */
    .recipe { page-break-before: always; padding-top: 0; }
    .recipe:first-of-type { page-break-before: auto; margin-top: 40px; }
    .recipe-img { width: 100%; height: 240px; object-fit: cover; display: block; }
    .recipe-body { padding: 24px 0 40px; }

    h2 { font-size: 30px; font-weight: 900; line-height: 1.1; margin-bottom: 16px; color: #111; }
    h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #888; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e0e0e0; }

    .cuisine-badge { display: inline-block; background: #111; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; padding: 4px 10px; margin-bottom: 12px; }

    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .meta-box { border: 1px solid #ddd; padding: 10px 12px; }
    .meta-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.2em; color: #999; margin-bottom: 4px; }
    .meta-value { font-size: 18px; font-weight: 800; color: #111; }

    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
    .badge { font-size: 9px; border: 1px solid #ccc; padding: 3px 9px; color: #444; text-transform: uppercase; letter-spacing: 0.15em; }

    .ingredients { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px 20px; }
    .ingredients li { font-size: 12px; color: #333; padding-left: 12px; position: relative; line-height: 1.5; }
    .ingredients li::before { content: "—"; position: absolute; left: 0; color: #999; }

    .instructions { font-size: 12px; color: #333; line-height: 1.75; white-space: pre-line; }

    .source { margin-top: 16px; font-size: 10px; color: #aaa; }
    .source a { color: #777; }

    .footer { margin-top: 48px; font-size: 10px; color: #bbb; text-align: center; border-top: 1px solid #eee; padding-top: 14px; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-title">Saved Plates</div>
    <div class="cover-sub">${recipes.length} recipe${recipes.length !== 1 ? "s" : ""} · Empire's Taste NYC · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  ${pages}
  <p class="footer">Empire's Taste — NYC Gastronomy Intelligence</p>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}

export default function FavoritesPage() {
  const [favorites, setFavorites]   = useState<Favorite[]>([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setGenerating(true)
    try { await downloadPDF(favorites) } finally { setGenerating(false) }
  }

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then((data) => { if (Array.isArray(data)) setFavorites(data) })
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (id: string) => {
    const prev = favorites
    setFavorites((f) => f.filter((x) => x.id !== id))
    try {
      const res = await fetch(`/api/favorites/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`${res.status}`)
    } catch {
      setFavorites(prev)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-wall">
      {/* Mural hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "radial-gradient(150% 120% at 80% 30%, #3a2510, rgb(var(--concrete)) 55%, rgb(var(--poster)) 88%)",
          borderBottom: "4px solid rgb(var(--neon))",
          boxShadow: "0 8px 0 rgba(0,0,0,.35)",
        }}
      >
        <Image
          src="/assets/mark-neon.png" alt="" width={400} height={400} unoptimized aria-hidden="true"
          className="pointer-events-none absolute right-[2%] top-1/2 -translate-y-1/2 opacity-[0.08]"
          style={{ height: "120%" }}
        />
        <div
          className="relative flex flex-wrap items-end justify-between gap-5"
          style={{ padding: "48px clamp(24px,4vw,56px) 50px" }}
        >
          <div>
            <p className="font-sans text-[14px] text-smoke mb-2">Your collection</p>
            <h1
              className="font-brush text-chalk m-0 leading-[0.86] uppercase"
              style={{ fontSize: "clamp(48px,7vw,80px)", textShadow: "3px 4px 0 rgba(0,0,0,.4)" }}
            >
              Saved{" "}
              <span className="text-neon" style={{ textShadow: "0 0 30px rgba(245,197,24,.5), 3px 4px 0 rgba(0,0,0,.4)" }}>
                plates.
              </span>
            </h1>
          </div>
          <div className="flex items-end gap-8">
            <div className="text-right">
              <p
                className="font-mono font-bold text-neon leading-[0.85] tracking-[-0.02em]"
                style={{ fontSize: 72, textShadow: "0 0 30px rgba(245,197,24,.45)" }}
              >
                {loading ? "—" : favorites.length}
              </p>
              <p className="font-sans text-[14px] text-smoke mt-2">recipes saved</p>
            </div>
            {favorites.length > 0 && (
              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="font-stencil text-[14px] tracking-[0.1em] uppercase text-chalk bg-slab hover:bg-concrete transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "12px 20px", border: "1px solid rgb(var(--wire))", boxShadow: "var(--shadow-tag)" }}
              >
                {generating ? "Generating…" : "Download PDF ↓"}
              </button>
            )}
          </div>
        </div>
      </section>

      <ExpiryBanner />

      <div className="flex-1 overflow-y-auto" style={{ padding: "28px clamp(16px,3vw,32px)" }}>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-poster overflow-hidden" style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}>
                <div className="h-44 animate-pulse bg-concrete" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse bg-slab" />
                  <div className="h-3 w-1/2 animate-pulse bg-slab" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 bg-poster py-20 text-center"
            style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}
          >
            <span className="font-stencil text-[48px] tracking-wide text-smoke">♡</span>
            <p className="font-brush text-chalk text-[32px] leading-none uppercase">
              Nothing saved yet
            </p>
            <p className="font-sans text-[14px] text-smoke max-w-xs">
              Tap the heart on any plate to keep it here.
            </p>
            <Link
              href="/dashboard/recipes"
              className="font-stencil text-[14px] tracking-[0.12em] uppercase bg-heat text-chalk transition-[filter] hover:brightness-110"
              style={{ padding: "12px 24px", boxShadow: "var(--shadow-tag)", marginTop: 8 }}
            >
              Browse Recipes →
            </Link>
          </div>
        ) : (
          <div id="favorites-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((fav) => (
              <FavoriteCard
                key={fav.id}
                id={fav.id}
                recipeId={fav.recipeId}
                recipeTitle={fav.recipeTitle}
                recipeImage={fav.recipeImage}
                expiresAt={fav.expiresAt}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
