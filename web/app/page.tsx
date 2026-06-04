import { Suspense } from "react"
import { Hero } from "@/components/landing/hero"
import { KeywordsStrip } from "@/components/landing/keywords-strip"
import { getSummary } from "@/lib/api"
import Link from "next/link"
import Image from "next/image"
import { LoginButton } from "@/components/shared/login-modal"

// ── Replace with your food photos ───────────────────────────────────────────
const CARD_IMG_1 = "https://picsum.photos/seed/nyc-trends-food/700/500"
const CARD_IMG_2 = "https://picsum.photos/seed/nyc-ramen-bowl/700/500"
const CARD_IMG_3 = "https://picsum.photos/seed/nyc-data-kitchen/700/500"

const NEON = "#f5c518"
const DARK = "rgb(6,6,8)"

// ── Torn paper geometry (computed once at module level) ──────────────────────
// 31 control points: diagonal from bottom-left (y≈92) to top-right (y≈30)
const TEAR_X = [0,  48,  96, 144, 192, 240, 288, 336, 384, 432, 480, 528, 576, 624, 672, 720, 768, 816, 864, 912, 960,1008,1056,1104,1152,1200,1248,1296,1344,1392,1440]
const TEAR_Y = [92, 88,  86,  90,  82,  84,  78,  76,  80,  72,  68,  70,  66,  70,  62,  60,  64,  56,  54,  58,  50,  48,  52,  44,  42,  46,  38,  36,  40,  32,  30]
// Polygon must trace tear RIGHT-TO-LEFT after the top edge so the shape is non-self-intersecting:
//   M0,0 → L1440,0 → L1440,30 → … jag leftward … → L0,92 → Z
const TEAR_RTL     = TEAR_X.map((x, i) => `${x},${TEAR_Y[i]}`).reverse().join(" L")
const SHADOW_RTL   = TEAR_X.map((x, i) => `${x},${TEAR_Y[i] + 7}`).reverse().join(" L")
// Highlight sits right at the tear edge, drawn last so it's visible against toColor
const HIGHLIGHT_PTS = TEAR_X.map((x, i) => `${x},${TEAR_Y[i] + 1}`).join(" ")
const MAIN_PATH     = `M0,0 L1440,0 L${TEAR_RTL} Z`
const SHADOW_PATH   = `M0,0 L1440,0 L${SHADOW_RTL} Z`

// ── Torn paper transition ────────────────────────────────────────────────────
// fromColor sits on top, toColor is revealed below through the diagonal tear
function TornPaper({ fromColor, toColor, flip }: { fromColor: string; toColor: string; flip?: boolean }) {
  return (
    <div style={{ height: 120, background: toColor, overflow: "hidden", display: "block", marginTop: -1 }}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      >
        <path d={SHADOW_PATH} fill="rgba(0,0,0,0.30)" />
        <path d={MAIN_PATH} fill={fromColor} />
        <polyline
          points={HIGHLIGHT_PTS}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ── Stats strip ──────────────────────────────────────────────────────────────
async function StatsStrip() {
  let summary = { top_keyword: "omakase", avg_compound: 0.62, total_recipes: 5000, pct_positive: 87, top_diet: "—" }
  try { summary = await getSummary() } catch {}

  const stats = [
    { value: summary.top_keyword?.toUpperCase() ?? "—",                                    label: "Trending now" },
    { value: summary.avg_compound != null ? `+${summary.avg_compound.toFixed(2)}` : "—",   label: "Food mood" },
    { value: summary.pct_positive != null ? `${Math.round(summary.pct_positive)}%` : "—",  label: "Positive media" },
    { value: summary.total_recipes != null ? `${summary.total_recipes.toLocaleString()}+` : "—", label: "Recipes indexed" },
  ]
  return (
    <div className="bg-poster" style={{ borderBottom: "1px solid rgb(var(--wire))" }}>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {stats.map(({ value, label }, i) => (
          <div key={label} className="px-7 py-5" style={{ borderRight: i < 3 ? "1px solid rgb(var(--wire))" : "none" }}>
            <p className="font-mono font-bold text-neon leading-none" style={{ fontSize: 32, textShadow: "0 0 16px rgba(245,197,24,.28)" }}>{value}</p>
            <p className="mt-2.5 font-stencil text-[10px] tracking-[0.22em] text-smoke uppercase">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsStripSkeleton() {
  return (
    <div className="bg-poster grid grid-cols-2 md:grid-cols-4" style={{ borderBottom: "1px solid rgb(var(--wire))" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-7 py-5">
          <div className="h-8 w-20 animate-pulse bg-slab" />
          <div className="mt-2.5 h-2 w-24 animate-pulse bg-slab" />
        </div>
      ))}
    </div>
  )
}

// ── YELLOW SECTION — inspired by the street art shop reference ───────────────
// Background: neon yellow. Dark text. Aerosoldier font for the big title.
// Three photo cards at the bottom with rotated labels (like ИНТЕРЬЕР/ОДЕЖДА).
const SECTIONS = [
  { label: "TRENDS",  img: CARD_IMG_1, href: "/dashboard/trends",  desc: "What the city is talking about" },
  { label: "RECIPES", img: CARD_IMG_2, href: "/dashboard/recipes", desc: "What the city is cooking" },
  { label: "DATA",    img: CARD_IMG_3, href: "/dashboard/data",    desc: "How the pipeline runs" },
]

function YellowBlock() {
  return (
    <section style={{ background: NEON }}>
      {/* ── Header row ───────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-start justify-between"
        style={{ padding: "clamp(28px,4vw,60px) clamp(20px,4vw,56px) 0" }}
      >
        {/* Left — big Aerosoldier title */}
        <div style={{ maxWidth: "60%" }}>
          <span
            className="font-stencil uppercase text-ink"
            style={{ fontSize: 10, letterSpacing: "0.28em", opacity: 0.55 }}
          >
            About the platform
          </span>

          <h2
            className="font-aero text-ink m-0 leading-[0.88] uppercase"
            style={{ fontSize: "clamp(56px,10vw,148px)" }}
          >
            READ THE
            <br />
            CITY.
          </h2>

          {/* Aerosoldier sub-line */}
          <p
            className="mt-3 font-display text-ink"
            style={{ fontSize: "clamp(16px,2.2vw,26px)", opacity: 0.5 }}
          >
            NYC gastronomy intelligence
          </p>
        </div>

        {/* Right — description text */}
        <div style={{ maxWidth: 320, paddingTop: 8 }}>
          <p
            className="font-sans text-ink leading-relaxed"
            style={{ fontSize: 14, opacity: 0.65 }}
          >
            Sentiment is not a number between −1 and 1 — it is the difference
            between a season taking off and a concept dying. Keywords are not
            search terms. They are the vocabulary of the street, right now.
          </p>
          <div
            className="mt-4 flex flex-wrap gap-2"
            style={{ fontSize: 11, opacity: 0.5 }}
          >
            {["Bronze", "Silver", "Gold", "Airflow", "VADER NLP"].map((t) => (
              <span key={t} className="font-mono text-ink" style={{ padding: "3px 8px", border: "1px solid rgba(0,0,0,.25)" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Three photo cards ────────────────────────────────── */}
      <div
        className="mt-8 grid grid-cols-3"
        style={{ borderTop: "2px solid rgba(0,0,0,.15)" }}
      >
        {SECTIONS.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className="group relative block overflow-hidden"
            style={{
              height: "clamp(220px, 32vw, 420px)",
              borderRight: i < 2 ? "2px solid rgba(0,0,0,.15)" : "none",
            }}
          >
            {/* Photo */}
            <Image
              src={s.img}
              alt={s.label}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
              style={{ opacity: 0.88 }}
            />

            {/* Bottom gradient + hover overlay */}
            <div
              className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-70"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 50%)" }}
            />

            {/* Label rotated 90° on the LEFT side — like the reference image */}
            <div
              className="absolute bottom-8 left-0"
              style={{
                transformOrigin: "bottom left",
                transform: "rotate(-90deg) translateX(-100%)",
                paddingLeft: 12,
              }}
            >
              <span
                className="font-aero text-white block uppercase"
                style={{
                  fontSize: "clamp(18px,2.5vw,32px)",
                  letterSpacing: "0.04em",
                  textShadow: "2px 2px 0 rgba(0,0,0,.4)",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </div>

            {/* Bottom description */}
            <div className="absolute bottom-4 right-4 text-right">
              <p className="font-stencil text-[10px] tracking-[0.2em] uppercase text-white opacity-70">
                {s.desc}
              </p>
            </div>

            {/* Arrow on hover */}
            <div
              className="absolute right-4 top-4 font-stencil text-[20px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-80"
            >
              →
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── CTA ──────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section
      className="relative overflow-hidden bg-wall text-center"
      style={{ padding: "80px clamp(20px,5vw,72px) 88px" }}
    >
      <Image
        src="/assets/mark-neon.png" alt="" width={500} height={500}
        unoptimized aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
      />
      <div className="relative z-10">
        <p className="font-stencil text-[9px] tracking-[0.32em] text-smoke uppercase mb-4">
          Ready to read the city?
        </p>
        <h2
          className="font-aero text-chalk leading-[0.88] m-0 uppercase"
          style={{ fontSize: "clamp(56px,10vw,140px)" }}
        >
          EMPIRE&rsquo;S TASTE.
        </h2>
        <p className="mx-auto mt-6 font-sans leading-relaxed text-smoke" style={{ fontSize: 15, maxWidth: "44ch" }}>
          Real-time NYC gastronomy intelligence — trends, recipes, and data governance.
        </p>
        <LoginButton
          className="mt-8 inline-block bg-heat font-stencil uppercase tracking-[0.14em] text-chalk transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
          style={{ fontSize: 15, padding: "14px 40px", boxShadow: "5px 5px 0 rgba(0,0,0,.65)", cursor: "pointer" }}
        >
          Enter Dashboard →
        </LoginButton>
        <p className="mt-4 font-mono text-[11px] tracking-[0.06em] text-smoke">
          — 5,000 recipes indexed · updated daily —
        </p>
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main style={{ background: DARK }}>
      <Hero />

      <Suspense fallback={<StatsStripSkeleton />}>
        <StatsStrip />
      </Suspense>

      {/* Dark hero/stats → yellow block — TORN PAPER */}
      <TornPaper fromColor={DARK} toColor={NEON} />

      <YellowBlock />

      {/* Yellow → dark — TORN PAPER (inverted) */}
      <TornPaper fromColor={NEON} toColor={DARK} flip />

      <Suspense fallback={<div style={{ height: 480, background: DARK }} />}>
        <KeywordsStrip />
      </Suspense>

      <CTASection />
    </main>
  )
}
