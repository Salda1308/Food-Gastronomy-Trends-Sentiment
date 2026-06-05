export const dynamic = "force-dynamic"

import { getSentiment, getKeywords, getTrend, getEntities, getSummary } from "@/lib/api"
import { SentimentDonut } from "@/components/dashboard/trends/sentiment-donut"
import { KeywordBars } from "@/components/dashboard/trends/keyword-bars"
import { TrendLine } from "@/components/dashboard/trends/trend-line"
import { EntityTable } from "@/components/dashboard/trends/entity-table"

function moodLabel(compound: number | null | undefined): { text: string; color: string } {
  if (compound == null) return { text: "No data", color: "rgb(var(--smoke))" }
  if (compound >= 0.5)  return { text: "Very Positive", color: "rgb(var(--chalk))" }
  if (compound >= 0.2)  return { text: "Positive",      color: "rgb(var(--neon))" }
  if (compound >= -0.2) return { text: "Mixed",          color: "rgb(var(--smoke))" }
  if (compound >= -0.5) return { text: "Negative",       color: "#e67e22" }
  return                       { text: "Very Negative",  color: "#e63946" }
}

export default async function TrendsPage() {
  const [sentiment, keywords, trend, entities, summary] = await Promise.allSettled([
    getSentiment(),
    getKeywords(15),
    getTrend(),
    getEntities(),
    getSummary(),
  ])

  const sentimentData = sentiment.status === "fulfilled" ? sentiment.value : null
  const keywordsData  = keywords.status  === "fulfilled" ? keywords.value  : []
  const trendData     = trend.status     === "fulfilled" ? trend.value     : []
  const entitiesData  = entities.status  === "fulfilled" ? entities.value  : []
  const summaryData   = summary.status   === "fulfilled" ? summary.value   : null

  const compound   = sentimentData?.avg_compound
  const mood       = moodLabel(compound)
  const topKeyword = summaryData?.top_keyword ?? null
  const pctPos     = sentimentData?.positive ?? summaryData?.pct_positive ?? null

  return (
    <div className="flex-1 overflow-y-auto bg-wall">

      {/* Hero — video background */}
      <section className="relative overflow-hidden" style={{ minHeight: 340, borderBottom: "4px solid rgb(var(--neon))" }}>
        {/* Video layer */}
        <video
          aria-hidden="true" autoPlay muted loop playsInline
          className="absolute inset-0 z-0 h-full w-full object-cover"
        >
          <source src="/assets/NYVideo.mov" type="video/mp4" />
        </video>
        {/* Dark overlay */}
        <div aria-hidden="true" className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(135deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.65) 60%, rgba(0,0,0,.75) 100%)" }} />

        <div className="relative z-[2] flex flex-wrap items-center justify-between gap-8"
          style={{ padding: "52px clamp(24px,4vw,56px) 44px" }}>

          {/* Left — headline */}
          <div className="min-w-0 flex-1" style={{ maxWidth: 580 }}>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="bg-neon text-poster font-stencil text-[10px] tracking-[0.26em] uppercase"
                style={{ padding: "5px 12px", boxShadow: "var(--shadow-tag)" }}>Tonight in NYC</span>
              <span className="border border-wire bg-black/40 text-smoke font-stencil text-[10px] tracking-[0.26em] uppercase"
                style={{ padding: "5px 12px" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <h1 className="font-brush text-chalk m-0 leading-[0.88] uppercase"
              style={{ fontSize: "clamp(44px,6.5vw,84px)", textShadow: "2px 3px 0 rgba(0,0,0,.55)" }}>
              {topKeyword ? (
                <>The city is eating<br />
                  <span className="text-neon" style={{ textShadow: "0 0 40px rgba(245,197,24,.6), 2px 3px 0 rgba(0,0,0,.5)" }}>
                    {topKeyword}.
                  </span>
                </>
              ) : (
                <>NYC food<br /><span className="text-neon">intelligence.</span></>
              )}
            </h1>

            <p className="mt-4 font-sans text-[15px] text-chalk leading-[1.6] max-w-[460px]" style={{ opacity: 0.85 }}>
              {pctPos != null ? (
                <><strong className="font-mono" style={{ color: mood.color }}>{Math.round(pctPos)}%</strong> of articles and diner reviews are positive this week — the mood is{" "}
                <span style={{ color: mood.color }}>{mood.text.toLowerCase()}</span> across the five boroughs.</>
              ) : (
                <>Real-time sentiment from Eater NY articles and OpenTable diner reviews.</>
              )}
            </p>
          </div>

          {/* Right — mood number */}
          <div className="flex-shrink-0 text-center" style={{ minWidth: 200 }}>
            <p className="font-stencil text-[13px] tracking-[0.2em] text-smoke uppercase mb-2">Overall mood</p>
            <div className="font-mono font-bold leading-none"
              style={{ fontSize: "clamp(72px,10vw,128px)", color: "rgb(var(--chalk))",
                textShadow: `0 0 50px ${mood.color}66, 3px 5px 0 rgba(0,0,0,.6)` }}>
              {pctPos != null ? `${Math.round(pctPos)}%` : "—"}
            </div>
            <p className="mt-2 font-stencil text-[15px] tracking-[0.14em] uppercase" style={{ color: mood.color }}>
              {mood.text}
            </p>
            <p className="mt-1 font-stencil text-[13px] tracking-[0.16em] text-smoke uppercase">positive sentiment</p>
          </div>
        </div>
      </section>

      {/* Charts grid */}
      <div className="p-7 flex flex-col gap-6">

        {sentimentData === null && keywordsData.length === 0 ? (
          <div
            className="flex items-center justify-center bg-poster py-20 text-center"
            style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2 }}
          >
            <div>
              <p className="font-stencil text-4xl tracking-wide text-smoke">NO DATA</p>
              <p className="mt-2 font-sans text-[14px] text-smoke">Run the pipeline first to see trends.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              {/* THE BOARD — keyword menu */}
              <div
                className="bg-poster"
                style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "24px 22px 8px" }}
              >
                <div className="mb-5">
                  <p className="font-sans text-[14px] text-smoke mb-2">
                    What NYC is talking about this week
                  </p>
                  <h2 className="font-stencil text-[36px] tracking-[0.06em] text-chalk leading-none m-0" style={{ borderLeft: "6px solid rgb(var(--neon))", paddingLeft: 14 }}>
                    THE BOARD
                  </h2>
                </div>
                <KeywordBars data={keywordsData} />
              </div>

              <div className="flex flex-col gap-6">
                {sentimentData && (
                  <div
                    className="bg-poster flex flex-col items-center justify-center"
                    style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, borderTop: "4px solid rgb(var(--neon))", padding: "22px" }}
                  >
                    <SentimentDonut data={sentimentData} />
                  </div>
                )}
                {trendData.length > 0 && (
                  <div
                    className="bg-poster"
                    style={{ boxShadow: "var(--shadow-poster)", borderRadius: 2, padding: "20px 22px" }}
                  >
                    <p className="mb-3 font-stencil text-[13px] tracking-[0.16em] text-chalk uppercase">
                      Sentiment breakdown · week by week
                    </p>
                    <TrendLine data={trendData} />
                  </div>
                )}
              </div>
            </div>

            <EntityTable data={entitiesData} />
          </>
        )}
      </div>
    </div>
  )
}
