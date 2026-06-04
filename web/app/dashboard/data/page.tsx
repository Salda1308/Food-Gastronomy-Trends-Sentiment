export const dynamic = "force-dynamic"

import { getGovernanceKpis, getNullRates, getSources } from "@/lib/api"
import { NullRateChart } from "@/components/dashboard/data/null-rate-chart"

// Translate internal field names to human-readable labels
const FIELD_LABELS: Record<string, string> = {
  "api/preparationMinutes": "Recipe prep time",
  "api/cookingMinutes":     "Recipe cooking time",
  "api/occasions":          "Occasion tags (e.g. holiday, party)",
  "api/cuisines":           "Cuisine type (e.g. Italian, Japanese)",
  "api/license":            "Recipe license info",
  "api/diets":              "Dietary labels (vegan, keto...)",
  "api/dishTypes":          "Dish category (main, dessert...)",
  "api/pricePerServing":    "Price per serving",
  "api/healthScore":        "Health score",
  "api/summary":            "Recipe description",
  "webscraping/article_summary":      "Article content",
  "webscraping/article_title":        "Article headline",
  "webscraping/author":               "Article author",
  "webscraping/published_date":       "Publication date",
  "webscraping/article_url":          "Article link",
}

function friendlyField(raw: string): string {
  return FIELD_LABELS[raw] ?? raw.replace(/^(api|webscraping)\//, "").replace(/([A-Z])/g, " $1").toLowerCase()
}

export default async function DataPage() {
  const [kpisResult, nullRatesResult, sourcesResult] = await Promise.allSettled([
    getGovernanceKpis(),
    getNullRates(),
    getSources(),
  ])
  const kpis      = kpisResult.status      === "fulfilled" ? kpisResult.value      : null
  const nullRates = nullRatesResult.status === "fulfilled" ? nullRatesResult.value  : []
  const sources   = sourcesResult.status   === "fulfilled" ? sourcesResult.value    : null

  const flagged = (v: number | null | undefined, threshold: number, direction: "above" | "below") =>
    v != null && (direction === "above" ? v > threshold : v < threshold)

  const kpiItems = kpis ? [
    {
      label: "Records collected",
      sublabel: "Total recipes + articles processed",
      value: kpis.total_records?.toLocaleString() ?? "—",
      bad: false,
    },
    {
      label: "Missing data",
      sublabel: "Fields with null values (< 20% is healthy)",
      value: kpis.max_null_rate != null ? `${kpis.max_null_rate.toFixed(1)}%` : "—",
      bad: flagged(kpis.max_null_rate, 20, "above"),
    },
    {
      label: "Data quality",
      sublabel: "Records that pass all schema checks",
      value: kpis.schema_compliance != null ? `${kpis.schema_compliance.toFixed(1)}%` : "—",
      bad: flagged(kpis.schema_compliance, 90, "below"),
    },
    {
      label: "Duplicates",
      sublabel: "Repeated entries removed (< 5% is healthy)",
      value: kpis.duplicate_rate != null ? `${kpis.duplicate_rate.toFixed(1)}%` : "—",
      bad: flagged(kpis.duplicate_rate, 5, "above"),
    },
  ] : []

  return (
    <div className="flex-1 overflow-y-auto bg-wall" style={{ padding: "28px clamp(16px,3vw,32px)" }}>

      {/* Section header */}
      <div className="mb-6">
        <p className="font-sans text-[13px] text-smoke mb-2">
          Bronze → Silver → Gold pipeline · Apache Airflow
        </p>
        <h1
          className="font-brush text-chalk m-0 leading-[0.9] uppercase"
          style={{ fontSize: "clamp(36px,5vw,60px)", textShadow: "2px 3px 0 rgba(26,26,26,.15)" }}
        >
          The line.
        </h1>
      </div>

      {kpis ? (
        <>
          {/* KPI stat board */}
          <div
            className="mb-6 grid grid-cols-2 lg:grid-cols-4 bg-poster"
            style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}
          >
            {kpiItems.map((item, i) => (
              <div
                key={item.label}
                className="px-6 py-5"
                style={{ borderRight: i < 3 ? "1px solid rgb(var(--wire))" : "none" }}
              >
                <p className="font-stencil text-[13px] tracking-[0.18em] text-chalk mb-1 uppercase">{item.label}</p>
                <p
                  className="font-mono font-bold leading-none mb-2"
                  style={{
                    fontSize: 30,
                    color: item.bad ? "rgb(var(--heat))" : "rgb(var(--neon))",
                    textShadow: item.bad ? "0 0 16px rgba(230,57,70,.35)" : "0 0 16px rgba(245,197,24,.35)",
                  }}
                >
                  {item.value}
                </p>
                <p className="font-sans text-[13px] text-smoke leading-[1.4]">
                  {"sublabel" in item ? item.sublabel : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Pipeline layer cards */}
          <div
            className="mb-6 bg-poster"
            style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "24px" }}
          >
            <p className="font-stencil text-[13px] tracking-[0.18em] text-chalk mb-4 uppercase">How the pipeline works</p>
            <div className="flex items-stretch gap-0">
              {[
                { name: "BRONZE",  desc: "Raw collection — Eater NY articles, OpenTable reviews, Spoonacular recipes", accent: "rgb(var(--spray-green))" },
                { name: "SILVER",  desc: "Cleaned, deduplicated and ready for analysis",                                  accent: "rgb(var(--smoke))" },
                { name: "GOLD",    desc: "Sentiment scoring (VADER), keyword extraction, restaurant entity detection",    accent: "rgb(var(--neon))" },
              ].map((layer, i) => (
                <div key={layer.name} className="flex items-center">
                  <div
                    className="flex-1 bg-concrete p-4"
                    style={{ border: "1px solid rgb(var(--wire))", borderLeft: i > 0 ? "none" : undefined }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: layer.accent, boxShadow: `0 0 6px ${layer.accent}` }} />
                      <span className="font-stencil text-[15px] tracking-[0.08em] text-chalk">{layer.name}</span>
                    </div>
                    <p className="font-sans text-[14px] text-smoke leading-[1.4]">{layer.desc}</p>
                  </div>
                  {i < 2 && <span className="px-2 font-stencil text-[18px] text-neon shrink-0">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Sources: articles + reviews */}
          {sources && (
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {/* Articles */}
              <div className="bg-poster" style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "24px" }}>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-mono font-bold text-[36px] text-neon" style={{ textShadow: "0 0 16px rgba(245,197,24,.35)" }}>
                    {sources.articles.count}
                  </span>
                  <div>
                    <p className="font-stencil text-[14px] tracking-[0.1em] text-chalk uppercase">Articles collected</p>
                    <p className="font-sans text-[14px] text-smoke">Eater NY — food &amp; restaurant news</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {sources.articles.items.map((a, i) => (
                    <a
                      key={i}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 hover:opacity-80 transition-opacity"
                    >
                      <span className="font-mono text-[12px] text-smoke shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <p className="font-sans text-[14px] text-chalk group-hover:text-neon transition-colors leading-[1.3] truncate">
                          {a.title || "Untitled"}
                        </p>
                        <p className="font-mono text-[12px] text-smoke">{a.published_date}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-poster" style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "24px" }}>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-mono font-bold text-[36px] text-neon" style={{ textShadow: "0 0 16px rgba(245,197,24,.35)" }}>
                    {sources.reviews.count}
                  </span>
                  <div>
                    <p className="font-stencil text-[14px] tracking-[0.1em] text-chalk uppercase">Reviews collected</p>
                    <p className="font-sans text-[14px] text-smoke">OpenTable — real diner reviews</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {sources.reviews.by_restaurant.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[12px] text-smoke shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        <p className="font-sans text-[14px] text-chalk truncate">{r.restaurant}</p>
                      </div>
                      <span className="font-mono text-[13px] text-neon shrink-0 ml-3">{r.count} reviews</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {nullRates.length > 0 && (
            <div
              className="bg-poster"
              style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "24px" }}
            >
              <p className="font-stencil text-[13px] tracking-[0.18em] text-chalk mb-2 uppercase">Data completeness by field</p>
              <p className="font-sans text-[14px] text-smoke mb-4">
                Shows what percentage of data is missing for each field. Under 20% is healthy — the higher the bar, the more records lack that information.
              </p>
              <NullRateChart data={nullRates.map(r => ({ ...r, field: friendlyField(r.field) }))} />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center bg-poster py-20 text-center" style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}>
          <div>
            <p className="font-stencil text-4xl tracking-wide text-smoke">NO PIPELINE DATA</p>
            <p className="mt-2 font-sans text-[14px] text-smoke">Run the pipeline to populate metrics.</p>
          </div>
        </div>
      )}
    </div>
  )
}
