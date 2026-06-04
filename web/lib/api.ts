type ApiRecord = Record<string, unknown>

// Server-side: use the Docker service name (gastronomy-api:8000)
// Client-side: use the public URL (localhost:8000 → host machine)
const BASE =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "")
    : (process.env.NEXT_PUBLIC_API_URL ?? "")

if (!BASE && typeof window === "undefined") {
  console.warn("[api] API_INTERNAL_URL / NEXT_PUBLIC_API_URL is not set — API calls will fail")
}

// Type-safe coercion helpers for unknown API values
const n = (v: unknown, fallback = 0): number => typeof v === "number" ? v : fallback
const s = (v: unknown, fallback = ""): string => typeof v === "string" ? v : fallback

export interface SentimentData {
  positive: number
  negative: number
  neutral: number
  avg_compound: number
}

export interface KeywordItem {
  keyword: string
  score: number
  label: "positive" | "negative" | "neutral"
  count: number
}

export interface TrendPoint {
  week: string
  avg_sentiment: number
}

export interface EntityItem {
  name: string
  mentions: number
  type: "restaurant" | "chef" | "neighborhood"
}

export interface RecipeItem {
  id: number
  title: string
  image: string | null
  readyInMinutes: number
  cuisines: string
  diets: string
  dishTypes: string
  healthScore: number
  spoonacularScore: number
  servings?: number
  pricePerServing?: number
  aggregateLikes?: number
  vegetarian?: boolean
  vegan?: boolean
  glutenFree?: boolean
  dairyFree?: boolean
  ingredient_names?: string
  instructions_text?: string
  sourceUrl?: string
}

export interface RecipeParams {
  cuisine?: string
  diet?: string
  maxReadyTime?: number
  query?: string
}

export interface GovernanceKpi {
  total_records: number
  max_null_rate: number
  duplicate_rate: number
  schema_compliance: number
}

export interface NullRateItem {
  field: string
  null_rate: number
}

export interface SummaryData {
  top_keyword: string
  avg_compound: number
  total_recipes: number
  pct_positive: number
  top_diet: string
}

const NGROK_HEADERS = { "ngrok-skip-browser-warning": "true" }
const TIMEOUT_MS = 5000

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...NGROK_HEADERS, ...init?.headers },
      signal: controller.signal,
    })
  } catch (err) {
    throw new Error(`Network error reaching ${path}: ${(err as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export async function getSentiment(): Promise<SentimentData> {
  const raw = await apiFetch<ApiRecord>("/api/storytelling/sentiment", { cache: "no-store" })
  const dist = Array.isArray(raw.distribution) ? (raw.distribution as ApiRecord[]) : []
  const pct = (label: string) => n(dist.find((d) => d.label === label)?.percentage)
  return {
    positive:     pct("positive"),
    negative:     pct("negative"),
    neutral:      pct("neutral"),
    avg_compound: n(raw.avg_compound_score),
  }
}

export async function getKeywords(limit = 15): Promise<KeywordItem[]> {
  const raw = await apiFetch<ApiRecord>(`/api/storytelling/keywords?limit=${limit}`, { cache: "no-store" })
  const kws = Array.isArray(raw.keywords) ? (raw.keywords as ApiRecord[]) : []
  return kws.map((k) => {
    const sentiment = s(k.sentiment) as "positive" | "negative" | "neutral"
    const score = n(k.score)
    return {
      keyword: s(k.keyword),
      score:   sentiment === "negative" ? -(score / 100) : score / 100,
      label:   sentiment || "neutral",
      count:   n(k.rank, 1),
    }
  })
}

export async function getTrend(): Promise<TrendPoint[]> {
  const raw = await apiFetch<ApiRecord>("/api/storytelling/trend", { cache: "no-store" })
  const trend = Array.isArray(raw.trend) ? (raw.trend as ApiRecord[]) : []
  return trend.map((t) => ({ week: s(t.week), avg_sentiment: n(t.avg_sentiment) }))
}

export async function getEntities(): Promise<EntityItem[]> {
  const raw = await apiFetch<ApiRecord>("/api/storytelling/entities", { cache: "no-store" })
  const map = (arr: unknown, type: EntityItem["type"]) =>
    (Array.isArray(arr) ? (arr as ApiRecord[]) : []).map((e) => ({
      name:     s(e.name),
      mentions: n(e.mentions),
      type,
    }))
  return [
    ...map(raw.restaurants, "restaurant"),
    ...map(raw.chefs,       "chef"),
    ...map(raw.neighborhoods, "neighborhood"),
  ]
}

export async function getRecipes(params: RecipeParams = {}): Promise<RecipeItem[]> {
  const qs = new URLSearchParams()
  if (params.cuisine)      qs.set("cuisine",      params.cuisine)
  if (params.diet)         qs.set("diet",          params.diet)
  if (params.maxReadyTime) qs.set("maxReadyTime",  String(params.maxReadyTime))
  if (params.query)        qs.set("query",         params.query)
  const raw = await apiFetch<ApiRecord>(`/api/recommendations/?${qs.toString()}`, { cache: "no-store" })
  return Array.isArray(raw.recipes) ? (raw.recipes as RecipeItem[]) : []
}

export async function getGovernanceKpis(): Promise<GovernanceKpi> {
  const raw = await apiFetch<ApiRecord>("/api/governance/kpis", { cache: "no-store" })
  return {
    total_records:     n(raw.total_records),
    max_null_rate:     n(raw.max_null_rate),
    duplicate_rate:    n(raw.duplicate_rate),
    schema_compliance: n(raw.schema_compliance_rate ?? raw.schema_compliance),
  }
}

export async function getNullRates(): Promise<NullRateItem[]> {
  const raw = await apiFetch<ApiRecord>("/api/governance/null-rates", { cache: "no-store" })
  const data = Array.isArray(raw.data) ? (raw.data as ApiRecord[]) : []
  return data.map((d) => ({ field: `${s(d.source)}/${s(d.field)}`, null_rate: n(d.value) }))
}

export async function getSummary(): Promise<SummaryData> {
  const [sumRaw, sentRaw] = await Promise.allSettled([
    apiFetch<ApiRecord>("/api/storytelling/summary",   { next: { revalidate: 3600 } }),
    apiFetch<ApiRecord>("/api/storytelling/sentiment", { next: { revalidate: 3600 } }),
  ])
  const sum  = sumRaw.status  === "fulfilled" ? sumRaw.value  : {} as ApiRecord
  const sent = sentRaw.status === "fulfilled" ? sentRaw.value : {} as ApiRecord
  return {
    top_keyword:   s(sum.top_keyword,  "—"),
    avg_compound:  n(sent.avg_compound_score),
    total_recipes: n(sum.recipe_count),
    pct_positive:  n(sum.pct_positive),
    top_diet:      s(sum.top_diet, "—"),
  }
}

export async function getRecipeById(id: number): Promise<RecipeItem> {
  return apiFetch<RecipeItem>(`/api/recommendations/${id}`, { cache: "no-store" })
}

export interface ArticleItem {
  title:          string
  url:            string
  published_date: string
  source:         string
}

export interface SourcesData {
  articles: { count: number; items: ArticleItem[] }
  reviews:  { count: number; by_restaurant: { restaurant: string; slug: string; count: number }[] }
}

export async function getSources(): Promise<SourcesData> {
  const raw = await apiFetch<ApiRecord>("/api/storytelling/sources", { cache: "no-store" })
  const art = raw.articles as ApiRecord ?? {}
  const rev = raw.reviews  as ApiRecord ?? {}
  return {
    articles: {
      count: n(art.count),
      items: Array.isArray(art.items) ? (art.items as ArticleItem[]) : [],
    },
    reviews: {
      count: n(rev.count),
      by_restaurant: Array.isArray(rev.by_restaurant)
        ? (rev.by_restaurant as { restaurant: string; slug: string; count: number }[])
        : [],
    },
  }
}
