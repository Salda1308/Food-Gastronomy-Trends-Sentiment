import { getKeywords } from "@/lib/api"
import { TestimonialsColumn } from "@/components/shared/testimonials-column"
import type { ColumnItem } from "@/components/shared/testimonials-column"

const FALLBACK: ColumnItem[] = [
  { keyword: "omakase",      label: "positive", score: 0.82 },
  { keyword: "birria",       label: "positive", score: 0.65 },
  { keyword: "wagyu",        label: "positive", score: 0.51 },
  { keyword: "natural wine", label: "positive", score: 0.44 },
  { keyword: "smashburger",  label: "positive", score: 0.39 },
  { keyword: "sober bar",    label: "positive", score: 0.44 },
  { keyword: "ghost kitchen",label: "negative", score: -0.31 },
  { keyword: "dirty soda",   label: "negative", score: -0.12 },
  { keyword: "truffle oil",  label: "negative", score: -0.18 },
  { keyword: "dollar slice", label: "neutral",  score: 0.18 },
]

export async function KeywordsStrip() {
  let items: ColumnItem[] = []
  try {
    const kws = await getKeywords(20)
    items = kws.map((k) => ({ keyword: k.keyword, label: k.label, score: k.score }))
  } catch {}
  if (items.length === 0) items = FALLBACK

  const half = Math.ceil(items.length / 2)

  return (
    <section
      className="overflow-hidden bg-wall"
      style={{
        padding: "60px clamp(20px,4vw,64px)",
        borderBottom: "1px solid rgb(var(--wire))",
      }}
    >
      <div className="mb-8">
        <p className="mb-2 font-stencil text-[9px] tracking-[0.32em] text-smoke uppercase">
          The vocabulary of the street right now
        </p>
        <h2
          className="font-brush text-chalk m-0 leading-[0.88] uppercase"
          style={{ fontSize: "clamp(34px,5vw,60px)" }}
        >
          What&rsquo;s rising.{" "}
          <span
            className="text-neon"
            style={{ textShadow: "0 0 20px rgba(245,197,24,.4)" }}
          >
            What&rsquo;s dying.
          </span>
        </h2>
      </div>

      <div
        className="grid grid-cols-2 gap-4 overflow-hidden"
        style={{
          height: 380,
          maskImage: "linear-gradient(transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage: "linear-gradient(transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <TestimonialsColumn items={items.slice(0, half)}  direction="up"   speed={44} />
        <TestimonialsColumn items={items.slice(half)}     direction="down" speed={34} />
      </div>
    </section>
  )
}
