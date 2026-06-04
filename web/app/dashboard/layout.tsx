import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Masthead } from "@/components/dashboard/masthead"
import { getKeywords } from "@/lib/api"
import type { KeywordItem } from "@/lib/api"

const FALLBACK_TICKER: KeywordItem[] = [
  { keyword: "omakase",      score: 0.71, label: "positive", count: 1 },
  { keyword: "birria",       score: 0.64, label: "positive", count: 1 },
  { keyword: "natural wine", score: 0.52, label: "positive", count: 1 },
  { keyword: "ghost kitchen",score: -0.31,label: "negative", count: 1 },
  { keyword: "smashburger",  score: 0.39, label: "positive", count: 1 },
  { keyword: "sober bar",    score: 0.44, label: "positive", count: 1 },
  { keyword: "truffle oil",  score: -0.18,label: "negative", count: 1 },
  { keyword: "wagyu",        score: 0.55, label: "positive", count: 1 },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  let tickerItems: KeywordItem[] = FALLBACK_TICKER
  try {
    const kws = await getKeywords(12)
    if (kws.length >= 4) tickerItems = kws
  } catch {}

  return (
    <div className="flex min-h-[100dvh] flex-col bg-wall">
      <Masthead
        userEmail={session.user?.email}
        userImage={session.user?.image}
        tickerItems={tickerItems}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
