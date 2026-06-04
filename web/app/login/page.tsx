import Image from "next/image"
import { GoogleLogo } from "@phosphor-icons/react/dist/ssr"
import { signInWithGoogle } from "@/app/actions/auth"

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] bg-wall">
      {/* Left — moody food wall */}
      <div
        className="relative hidden overflow-hidden md:flex md:w-[44%]"
        style={{ background: "radial-gradient(120% 100% at 35% 40%, #4a2f17, #140b05 78%)" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(13,13,15,.3), rgba(13,13,15,.72))" }}
        />
        <Image
          src="/assets/mark-chalk.png"
          alt=""
          width={300}
          height={300}
          unoptimized
          aria-hidden="true"
          className="absolute bottom-[8%] left-1/2 -translate-x-1/2 opacity-[0.15]"
          style={{ height: "44%", width: "auto" }}
        />
        <div className="absolute bottom-12 left-10 z-10">
          <h2
            className="font-brush text-chalk m-0 leading-[0.9] uppercase"
            style={{ fontSize: 48 }}
          >
            The city is<br />
            <span className="text-neon" style={{ textShadow: "0 0 24px rgba(245,197,24,.45)" }}>
              always eating.
            </span>
          </h2>
          <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-smoke">
            — 5,000 recipes indexed · updated daily —
          </p>
        </div>
      </div>

      {/* Right — the venue door */}
      <div className="flex flex-1 items-center justify-center p-10">
        <div
          className="w-full max-w-[380px] bg-poster"
          style={{ borderRadius: 2, padding: "40px 36px", borderTop: "4px solid rgb(var(--neon))", boxShadow: "7px 9px 0 rgba(0,0,0,.55)" }}
        >
          {/* Wordmark */}
          <div className="mb-2 flex items-center gap-3">
            <Image
              src="/assets/mark-neon.png"
              alt="Empire's Taste"
              width={36}
              height={36}
              unoptimized
              style={{ filter: "drop-shadow(0 0 10px rgba(245,197,24,.3))" }}
            />
            <div className="leading-[0.82] pt-1">
              <div className="font-brush text-chalk text-[26px] uppercase">Empire&rsquo;s</div>
              <div
                className="font-stencil text-neon text-[22px] tracking-[0.18em] leading-none"
                style={{ textShadow: "0 0 12px rgba(245,197,24,.4)" }}
              >
                TASTE
              </div>
            </div>
          </div>

          <p className="mt-4 mb-7 font-sans text-[14px] text-smoke leading-[1.5]">
            One step. Pick your Google account and walk in.
          </p>

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2.5 bg-heat font-stencil text-[15px] tracking-[0.1em] uppercase text-chalk transition-[filter] hover:brightness-110 active:scale-[0.97]"
              style={{ padding: "14px", boxShadow: "4px 4px 0 rgba(0,0,0,.5)" }}
            >
              <GoogleLogo size={18} aria-hidden="true" />
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-center font-mono text-[11px] text-smoke leading-[1.7]">
            no passwords · no forms<br />redirects to /dashboard/trends
          </p>
        </div>
      </div>
    </div>
  )
}
