// mobile/lib/api.ts
const BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  avg_compound: number;
}

export interface KeywordItem {
  keyword: string;
  score: number;
  label: "positive" | "negative" | "neutral";
  count: number;
}

export interface TrendPoint {
  week: string;
  avg_sentiment: number;
}

export interface EntityItem {
  name: string;
  mentions: number;
  type: "restaurant" | "chef" | "neighborhood";
}

export interface RecipeItem {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number;
  cuisines: string;
  diets: string;
  dishTypes: string;
  healthScore: number;
  spoonacularScore: number;
  servings?: number;
  pricePerServing?: number;
  aggregateLikes?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  ingredient_names?: string;
  instructions_text?: string;
  sourceUrl?: string;
}

export interface RecipeParams {
  cuisine?: string;
  diet?: string;
  maxReadyTime?: number;
  query?: string;
}

export interface GovernanceKpi {
  total_records: number;
  max_null_rate: number;
  duplicate_rate: number;
  schema_compliance: number;
}

export interface NullRateItem {
  field: string;
  null_rate: number;
}

export interface SummaryData {
  top_keyword: string;
  avg_compound: number;
  total_recipes: number;
  pct_positive: number;
  top_diet: string;
}

const TIMEOUT_MS = 5000;

async function apiFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { signal: controller.signal });
  } catch (err) {
    throw new Error(`Network error: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getSentiment(): Promise<SentimentData> {
  const raw = await apiFetch<any>("/api/storytelling/sentiment");
  const dist: { label: string; percentage: number }[] = Array.isArray(raw.distribution) ? raw.distribution : [];
  const pct = (label: string) => dist.find((d) => d.label === label)?.percentage ?? 0;
  return {
    positive: pct("positive"),
    negative: pct("negative"),
    neutral:  pct("neutral"),
    avg_compound: raw.avg_compound_score ?? 0,
  };
}

export async function getKeywords(limit = 15): Promise<KeywordItem[]> {
  const raw = await apiFetch<any>(`/api/storytelling/keywords?limit=${limit}`);
  const kws: any[] = Array.isArray(raw.keywords) ? raw.keywords : [];
  return kws.map((k) => ({
    keyword: k.keyword,
    score:   k.sentiment === "negative" ? -(k.score / 100) : k.score / 100,
    label:   (k.sentiment as "positive" | "negative" | "neutral") ?? "neutral",
    count:   k.rank ?? 1,
  }));
}

export async function getTrend(): Promise<TrendPoint[]> {
  const raw = await apiFetch<any>("/api/storytelling/trend");
  const trend: any[] = Array.isArray(raw.trend) ? raw.trend : [];
  return trend.map((t) => ({ week: t.week, avg_sentiment: t.avg_sentiment }));
}

export async function getEntities(): Promise<EntityItem[]> {
  const raw = await apiFetch<any>("/api/storytelling/entities");
  const map = (arr: any[], type: EntityItem["type"]) =>
    (Array.isArray(arr) ? arr : []).map((e) => ({ name: e.name, mentions: e.mentions, type }));
  return [
    ...map(raw.restaurants, "restaurant"),
    ...map(raw.chefs, "chef"),
    ...map(raw.neighborhoods, "neighborhood"),
  ];
}

export async function getRecipes(params: RecipeParams = {}): Promise<RecipeItem[]> {
  const qs = new URLSearchParams();
  if (params.cuisine)      qs.set("cuisine",      params.cuisine);
  if (params.diet)         qs.set("diet",          params.diet);
  if (params.maxReadyTime) qs.set("maxReadyTime",  String(params.maxReadyTime));
  if (params.query)        qs.set("query",         params.query);
  const raw = await apiFetch<any>(`/api/recommendations/?${qs.toString()}`);
  return Array.isArray(raw.recipes) ? raw.recipes : [];
}

export async function getRecipeById(id: number): Promise<RecipeItem> {
  return apiFetch<RecipeItem>(`/api/recommendations/${id}`);
}

export async function getGovernanceKpis(): Promise<GovernanceKpi> {
  const raw = await apiFetch<any>("/api/governance/kpis");
  return {
    total_records:     raw.total_records ?? 0,
    max_null_rate:     raw.max_null_rate ?? 0,
    duplicate_rate:    raw.duplicate_rate ?? 0,
    schema_compliance: raw.schema_compliance_rate ?? raw.schema_compliance ?? 0,
  };
}

export async function getNullRates(): Promise<NullRateItem[]> {
  const raw = await apiFetch<any>("/api/governance/null-rates");
  const data: any[] = Array.isArray(raw.data) ? raw.data : [];
  return data.map((d) => ({ field: `${d.source}/${d.field}`, null_rate: d.value }));
}

export interface ArticleItem {
  title: string;
  url: string;
  published_date: string;
  source: string;
}

export interface SourcesData {
  articles: { count: number; items: ArticleItem[] };
  reviews:  { count: number; by_restaurant: { restaurant: string; slug: string; count: number }[] };
}

export async function getSources(): Promise<SourcesData> {
  const raw = await apiFetch<any>("/api/storytelling/sources");
  return {
    articles: {
      count: raw.articles?.count ?? 0,
      items: Array.isArray(raw.articles?.items) ? raw.articles.items : [],
    },
    reviews: {
      count: raw.reviews?.count ?? 0,
      by_restaurant: Array.isArray(raw.reviews?.by_restaurant) ? raw.reviews.by_restaurant : [],
    },
  };
}

export async function getSummary(): Promise<SummaryData> {
  const [sumRaw, sentRaw] = await Promise.allSettled([
    apiFetch<any>("/api/storytelling/summary"),
    apiFetch<any>("/api/storytelling/sentiment"),
  ]);
  const s    = sumRaw.status  === "fulfilled" ? sumRaw.value  : {};
  const sent = sentRaw.status === "fulfilled" ? sentRaw.value : {};
  return {
    top_keyword:   s.top_keyword ?? "—",
    avg_compound:  sent.avg_compound_score ?? 0,
    total_recipes: s.recipe_count ?? 0,
    pct_positive:  s.pct_positive ?? 0,
    top_diet:      s.top_diet ?? "—",
  };
}
