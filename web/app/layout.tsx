import type { Metadata } from "next"
import localFont from "next/font/local"
import { Bebas_Neue } from "next/font/google"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { NavigationLoader } from "@/components/shared/navigation-loader"
import "./globals.css"

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-stencil",
})

const creatoDisplay = localFont({
  src: "./fonts/CreatoDisplay-Regular.otf",
  variable: "--font-display",
  display: "swap",
})

const aerosoldier = localFont({
  src: "./fonts/Aerosoldier.otf",
  variable: "--font-aero",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Empire's Taste",
  description: "NYC gastronomy intelligence — real-time sentiment analysis of New York's food scene.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${creatoDisplay.variable} ${aerosoldier.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-wall text-chalk font-sans antialiased">
        <NavigationLoader />
        {children}
      </body>
    </html>
  )
}
