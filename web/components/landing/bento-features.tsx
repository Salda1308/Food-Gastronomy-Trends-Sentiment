import { getSummary } from "@/lib/api"

export async function BentoFeatures() {
  let summary = { top_keyword: "omakase", avg_compound: 0.62, total_recipes: 5000, pct_positive: 87, top_diet: "—" }
  try { summary = await getSummary() } catch {}

  const compound = summary.avg_compound != null ? summary.avg_compound.toFixed(2) : "—"
  const recipes  = summary.total_recipes  != null ? summary.total_recipes.toLocaleString()  : "—"

  return (
    <section className="bg-wall" style={{ padding: "0 clamp(20px,4vw,64px) 72px" }}>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "1.35fr 1fr", gridTemplateRows: "240px 240px" }}
      >
        {/* ── Big cell — two-row span ─────────── */}
        <div
          className="relative row-span-2 overflow-hidden"
          style={{
            background: "radial-gradient(130% 110% at 30% 20%, #4a2f17, #0e0a04 80%)",
            boxShadow: "7px 9px 0 rgba(0,0,0,.55), 16px 20px 0 rgba(0,0,0,.18)",
            borderRadius: 2,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(10,8,4,.95), rgba(10,8,4,.3) 50%, transparent)" }}
          />
          {/* Top sticker */}
          <div className="absolute left-5 top-5 et-sticker et-sticker-ink">Live Intelligence</div>

          {/* Bottom label */}
          <div className="absolute bottom-6 left-5">
            <div
              className="font-stencil text-chalk leading-[0.88] tracking-[0.04em]"
              style={{ fontSize: 58 }}
            >
              TRENDS
            </div>
            <p
              className="mt-2 font-sans text-chalk leading-relaxed"
              style={{ fontSize: 13, opacity: 0.7, maxWidth: 280 }}
            >
              Which word is gaining ground in NYC&rsquo;s food conversation this week.
            </p>
          </div>
        </div>

        {/* ── Sentiment ───────────────────────── */}
        <div
          className="flex flex-col justify-between bg-poster"
          style={{
            boxShadow: "7px 9px 0 rgba(0,0,0,.55), 16px 20px 0 rgba(0,0,0,.18)",
            borderRadius: 2,
            padding: "22px 24px",
            borderTop: "4px solid rgb(var(--neon))",
          }}
        >
          <span className="font-stencil text-[9px] tracking-[0.26em] text-smoke uppercase">
            Sentiment index
          </span>
          <div>
            <div
              className="font-mono font-bold text-chalk leading-[0.82] tracking-[-0.02em]"
              style={{
                fontSize: 64,
                textShadow: "2px 3px 0 rgba(0,0,0,.4)",
              }}
            >
              {compound}
            </div>
            <p className="mt-2 font-sans text-chalk leading-snug" style={{ fontSize: 13, opacity: 0.65 }}>
              {summary.avg_compound != null && summary.avg_compound > 0.5
                ? "The mood is rising. A season taking off."
                : "NYC food mood · VADER compound"}
            </p>
          </div>
        </div>

        {/* ── Bottom two tiles ────────────────── */}
        <div className="grid grid-cols-2 gap-5">
          {/* Recipes */}
          <div
            className="flex flex-col justify-between bg-concrete"
            style={{
              boxShadow: "7px 9px 0 rgba(0,0,0,.55), 16px 20px 0 rgba(0,0,0,.18)",
              borderRadius: 2,
              padding: "18px 16px",
              borderLeft: "4px solid rgb(var(--neon))",
            }}
          >
            <span className="font-stencil text-[14px] tracking-[0.06em] text-chalk uppercase">
              Recipes
            </span>
            <div>
              <div className="font-mono font-bold text-chalk leading-none" style={{ fontSize: 38 }}>
                {recipes}
              </div>
              <span className="mt-1 font-sans text-smoke" style={{ fontSize: 11 }}>
                aligned with trends
              </span>
            </div>
          </div>

          {/* Positive % */}
          <div
            className="flex flex-col justify-between bg-concrete"
            style={{
              boxShadow: "7px 9px 0 rgba(0,0,0,.55), 16px 20px 0 rgba(0,0,0,.18)",
              borderRadius: 2,
              padding: "18px 16px",
              borderLeft: "4px solid rgb(var(--heat))",
            }}
          >
            <span className="font-stencil text-[14px] tracking-[0.06em] text-chalk uppercase">
              Positive
            </span>
            <div>
              <div className="font-mono font-bold text-chalk leading-none" style={{ fontSize: 38 }}>
                {summary.pct_positive != null ? `${Math.round(summary.pct_positive)}%` : "—"}
              </div>
              <span className="mt-1 font-sans text-smoke" style={{ fontSize: 11 }}>
                of media · NYC food
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
