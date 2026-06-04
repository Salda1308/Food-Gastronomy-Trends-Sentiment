"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { SignOut } from "@phosphor-icons/react"
import type { KeywordItem } from "@/lib/api"

const TABS = [
  { href: "/dashboard/trends",    label: "Trends"    },
  { href: "/dashboard/recipes",   label: "Recipes"   },
  { href: "/dashboard/favorites", label: "Favorites" },
  { href: "/dashboard/data",      label: "Data"      },
]

interface MastheadProps {
  userEmail?: string | null
  userImage?: string | null
  tickerItems?: KeywordItem[]
}

export function Masthead({ userEmail, userImage, tickerItems = [] }: MastheadProps) {
  const pathname = usePathname()

  const doubled = [...tickerItems, ...tickerItems]

  return (
    <header className="sticky top-0 z-50">

      {/* ── Main bar ──────────────────────────────────────────── */}
      <div
        className="flex items-stretch justify-between bg-poster"
        style={{
          borderBottom: "4px solid rgb(var(--neon))",
          boxShadow: "0 6px 0 rgba(0,0,0,.40), 0 12px 0 rgba(0,0,0,.16)",
        }}
      >
        {/* Wordmark */}
        <div
          className="flex items-center gap-3 px-6"
          style={{ borderRight: "1px solid rgb(var(--wire))" }}
        >
          <Image
            src="/assets/mark-neon.png"
            alt="Empire's Taste"
            width={34}
            height={34}
            unoptimized
            style={{ filter: "drop-shadow(0 0 8px rgba(245,197,24,.4))" }}
          />
          <div className="leading-[0.8] pt-[2px]">
            <div className="font-brush text-chalk uppercase" style={{ fontSize: 22 }}>
              Empire&rsquo;s
            </div>
            <div
              className="font-stencil text-neon tracking-[0.22em] leading-none"
              style={{ fontSize: 18, textShadow: "0 0 10px rgba(245,197,24,.5)" }}
            >
              TASTE
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="hidden items-stretch md:flex" aria-label="Dashboard navigation">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center font-stencil text-[14px] tracking-[0.14em] uppercase transition-colors"
                style={{
                  padding: "0 20px",
                  minHeight: 60,
                  background:  active ? "rgb(var(--neon))"   : "transparent",
                  color:       active ? "rgb(var(--poster))" : "rgb(var(--smoke))",
                  boxShadow:   active ? "inset 0 -3px 0 rgba(0,0,0,.25)" : "none",
                  borderRight: "1px solid rgb(var(--wire))",
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* Right — status + user */}
        <div
          className="ml-auto flex items-center gap-4 px-5"
          style={{ borderLeft: "1px solid rgb(var(--wire))" }}
        >
          <span className="hidden items-center gap-2 font-mono text-[13px] text-smoke sm:flex">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "rgb(var(--neon))", boxShadow: "0 0 6px rgba(245,197,24,.8)" }}
            />
            live
          </span>

          {userImage ? (
            <Image
              src={userImage}
              alt={userEmail ?? "User"}
              width={30}
              height={30}
              className="rounded-full"
              unoptimized
              style={{ border: "2px solid rgb(var(--wire))" }}
            />
          ) : (
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full font-stencil text-[13px] text-neon"
              style={{ background: "rgb(var(--slab))", border: "2px solid rgb(var(--wire))" }}
            >
              {(userEmail?.[0] ?? "U").toUpperCase()}
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-smoke transition-colors hover:text-chalk"
            aria-label="Sign out"
          >
            <SignOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Live keyword ticker ────────────────────────────────── */}
      {doubled.length > 0 && (
        <div
          className="flex items-stretch overflow-hidden bg-ink"
          style={{ height: 28, borderBottom: "1px solid rgb(var(--wire))" }}
        >
          <span
            className="flex shrink-0 items-center bg-neon font-stencil text-[13px] tracking-[0.2em] uppercase text-ink"
            style={{ padding: "0 14px", boxShadow: "4px 0 0 rgba(0,0,0,.4)" }}
          >
            On the wire
          </span>

          <div className="relative flex-1 overflow-hidden">
            <div
              className="absolute top-0 flex h-full items-center gap-10 whitespace-nowrap font-mono text-[13px]"
              style={{ animation: "et-marquee 30s linear infinite" }}
            >
              {doubled.map((kw, i) => (
                <span key={i} className="text-smoke">
                  {kw.keyword}{" "}
                  <span
                    className="font-bold"
                    style={{
                      color: kw.label === "negative"
                        ? "rgb(var(--heat))"
                        : "rgb(var(--neon))",
                    }}
                  >
                    {kw.score > 0 ? "▲" : "▼"}{Math.abs(kw.score).toFixed(2)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
