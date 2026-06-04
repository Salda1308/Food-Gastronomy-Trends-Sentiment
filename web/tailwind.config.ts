import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* --- The Wall (landing / light concrete) --- */
        wall:        "rgb(var(--wall) / <alpha-value>)",
        "wall-deep": "rgb(var(--wall-deep) / <alpha-value>)",
        "wire-light":"rgb(var(--wire-light) / <alpha-value>)",
        ink:         "rgb(var(--ink) / <alpha-value>)",
        chalk:       "rgb(var(--chalk) / <alpha-value>)",
        /* --- Poster (dashboard / dark surfaces) --- */
        poster:      "rgb(var(--poster) / <alpha-value>)",
        concrete:    "rgb(var(--concrete) / <alpha-value>)",
        slab:        "rgb(var(--slab) / <alpha-value>)",
        wire:        "rgb(var(--wire) / <alpha-value>)",
        /* --- Spray paint --- */
        neon:        "rgb(var(--neon) / <alpha-value>)",
        heat:        "rgb(var(--heat) / <alpha-value>)",
        "spray-blue": "rgb(var(--spray-blue) / <alpha-value>)",
        "spray-green":"rgb(var(--spray-green) / <alpha-value>)",
        smoke:       "rgb(var(--smoke) / <alpha-value>)",
        /* --- Legacy aliases kept so old references don't break during migration --- */
        cream:       "rgb(var(--wall) / <alpha-value>)",
        accent:      "rgb(var(--neon) / <alpha-value>)",
        muted:       "rgb(var(--smoke) / <alpha-value>)",
        surface:     "rgb(var(--slab) / <alpha-value>)",
        border:      "rgb(var(--wire) / <alpha-value>)",
      },
      fontFamily: {
        stencil: ["var(--font-stencil)", "Impact", "sans-serif"],
        brush:   ["var(--font-aero)",    "sans-serif"],   // legacy alias → Aerosoldier (was NY-Sign)
        display: ["var(--font-display)", "sans-serif"],
        aero:    ["var(--font-aero)",    "sans-serif"],
        sans:    ["var(--font-display)",      "sans-serif"],
        mono:    ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        sm:  "2px",
        md:  "0px",
        lg:  "0px",
        full:"9999px",
      },
      boxShadow: {
        poster:        "7px 9px 0 rgba(0,0,0,.55), 16px 20px 0 rgba(0,0,0,.18)",
        "poster-hover":"9px 12px 0 rgba(0,0,0,.60), 18px 24px 0 rgba(0,0,0,.20)",
        tag:           "3px 3px 0 rgba(0,0,0,.45)",
        "tag-hover":   "4px 4px 0 rgba(0,0,0,.55)",
        "neon-glow":   "0 0 16px rgba(245,197,24,.35)",
      },
    },
  },
  plugins: [],
}

export default config
