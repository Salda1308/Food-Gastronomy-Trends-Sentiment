import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getRecipeById } from "@/lib/api"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr"

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let recipe
  try {
    recipe = await getRecipeById(Number(id))
  } catch {
    notFound()
  }

  const imgSrc = recipe.image || `https://picsum.photos/seed/food-${recipe.id}/800/500`

  const badges = [
    recipe.vegetarian && "Vegetarian",
    recipe.vegan      && "Vegan",
    recipe.glutenFree && "Gluten Free",
    recipe.dairyFree  && "Dairy Free",
  ].filter(Boolean) as string[]

  const ingredients = recipe.ingredient_names
    ? recipe.ingredient_names.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <div className="flex-1 overflow-y-auto bg-wall">
      {/* Back */}
      <div
        className="bg-poster px-6 py-3"
        style={{ borderBottom: "1px solid rgb(var(--wire))" }}
      >
        <Link
          href="/dashboard/recipes"
          className="inline-flex items-center gap-2 font-stencil text-[14px] tracking-[0.1em] uppercase text-smoke hover:text-chalk transition-colors"
        >
          <ArrowLeft size={13} />
          Back to recipes
        </Link>
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          height: "clamp(240px,32vw,380px)",
          background: "radial-gradient(130% 90% at 40% 30%, #4a3a1e, #140b05 70%)",
          borderBottom: "4px solid rgb(var(--neon))",
        }}
      >
        <Image src={imgSrc} alt={recipe.title} fill className="object-cover opacity-75" unoptimized />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,14,14,.9) 30%, rgba(14,14,14,.3) 65%, transparent)" }} />
        <div className="absolute bottom-0 left-0 p-7">
          {recipe.cuisines && (
            <span
              className="inline-block font-stencil text-[12px] tracking-[0.2em] uppercase bg-neon text-poster mb-3"
              style={{ padding: "5px 12px", boxShadow: "var(--shadow-tag)" }}
            >
              {recipe.cuisines}
            </span>
          )}
          <h1
            className="font-brush text-chalk m-0 leading-[0.86] uppercase"
            style={{ fontSize: "clamp(40px,6vw,80px)", textShadow: "3px 4px 0 rgba(0,0,0,.5)" }}
          >
            {recipe.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 p-7">

        {/* Meta strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Ready in",     value: `${recipe.readyInMinutes} min` },
            { label: "Servings",     value: recipe.servings ?? "—" },
            { label: "Health score", value: recipe.healthScore != null ? `${recipe.healthScore}/100` : "—" },
            { label: "Likes",        value: recipe.aggregateLikes?.toLocaleString() ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-poster p-4"
              style={{ boxShadow: "var(--shadow-tag)", borderRadius: 2 }}
            >
              <p className="font-sans text-[13px] text-smoke mb-1">{label}</p>
              <p className="font-mono font-bold text-neon" style={{ fontSize: 24, textShadow: "0 0 12px rgba(245,197,24,.3)" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Diet badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="font-stencil text-[13px] tracking-[0.16em] uppercase text-smoke bg-poster"
                style={{ padding: "5px 12px", border: "1px solid rgb(var(--wire))", boxShadow: "var(--shadow-tag)" }}
              >
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <div>
            <h2
              className="font-stencil text-[14px] tracking-[0.28em] text-smoke uppercase mb-4 pb-2"
              style={{ borderBottom: "1px solid rgb(var(--wire-light))" }}
            >
              Ingredients
            </h2>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {ingredients.map((ing) => (
                <li key={ing} className="flex items-start gap-2 font-sans text-sm text-chalk">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-neon" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions_text && (
          <div>
            <h2
              className="font-stencil text-[14px] tracking-[0.28em] text-smoke uppercase mb-4 pb-2"
              style={{ borderBottom: "1px solid rgb(var(--wire-light))" }}
            >
              Instructions
            </h2>
            <p className="font-sans text-sm text-chalk leading-relaxed">{recipe.instructions_text}</p>
          </div>
        )}

        {/* Source */}
        {recipe.sourceUrl && (
          <div style={{ borderTop: "1px solid rgb(var(--wire-light))", paddingTop: 16 }}>
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-stencil text-[12px] tracking-[0.1em] uppercase text-smoke hover:text-neon transition-colors"
            >
              View original source →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
