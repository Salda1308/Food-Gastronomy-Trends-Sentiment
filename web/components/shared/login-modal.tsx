"use client"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { GoogleLogo, X } from "@phosphor-icons/react"
import { signInWithGoogle } from "@/app/actions/auth"

function Modal({ onClose }: { onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    // Prevent body scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: "rgba(6,6,8,0.88)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="relative w-full max-w-[400px] bg-poster mx-4"
        style={{
          borderTop: "4px solid rgb(var(--neon))",
          boxShadow: "8px 10px 0 rgba(0,0,0,.65), 18px 22px 0 rgba(0,0,0,.22)",
          padding: "40px 36px 36px",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-smoke hover:text-chalk transition-colors"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Wordmark */}
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/assets/mark-neon.png"
            alt="Empire's Taste"
            width={32}
            height={32}
            unoptimized
            style={{ filter: "drop-shadow(0 0 8px rgba(245,197,24,.35))" }}
          />
          <div className="leading-[0.82] pt-1">
            <div className="font-aero text-chalk text-[22px] uppercase">Empire&rsquo;s</div>
            <div
              className="font-stencil text-neon text-[18px] tracking-[0.18em] leading-none"
              style={{ textShadow: "0 0 10px rgba(245,197,24,.4)" }}
            >
              TASTE
            </div>
          </div>
        </div>

        {/* WELCOME BACK */}
        <h2
          className="font-aero text-chalk m-0 leading-[0.85] uppercase"
          style={{ fontSize: "clamp(48px, 10vw, 72px)", letterSpacing: "-0.01em" }}
        >
          WELCOME
          <br />
          BACK.
        </h2>

        <p className="mt-3 mb-8 font-display text-smoke" style={{ fontSize: 14 }}>
          One step. Pick your Google account and walk in.
        </p>

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 bg-heat font-stencil text-[15px] tracking-[0.1em] uppercase text-chalk transition-[filter] hover:brightness-110 active:scale-[0.97]"
            style={{ padding: "14px", boxShadow: "4px 4px 0 rgba(0,0,0,.55)" }}
          >
            <GoogleLogo size={18} aria-hidden="true" />
            Continue with Google
          </button>
        </form>

        <p className="mt-5 text-center font-display text-smoke" style={{ fontSize: 11, letterSpacing: "0.04em" }}>
          no passwords · no forms
        </p>
      </div>
    </div>
  )
}

export function LoginButton({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} style={style}>
        {children}
      </button>
      {mounted && open && createPortal(
        <Modal onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  )
}
