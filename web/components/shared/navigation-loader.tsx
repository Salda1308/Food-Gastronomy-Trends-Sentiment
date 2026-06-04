"use client"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

export function NavigationLoader() {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      const t = setTimeout(() => setVisible(false), 120)
      return () => clearTimeout(t)
    }
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a")
      if (!link) return

      const href = link.getAttribute("href") ?? ""
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        href.startsWith("#") ||
        link.target === "_blank"
      ) return

      const targetPath = href.split("?")[0]
      if (targetPath === pathname) return

      setVisible(true)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [pathname])

  if (!visible) return null

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(6,6,8,0.78)",
      backdropFilter: "blur(5px)",
      WebkitBackdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "loaderFadeIn 0.15s ease-out",
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: "3px solid rgba(245,197,24,0.2)",
        borderTop: "3px solid #f5c518",
        borderRadius: "50%",
        animation: "loaderSpin 0.7s linear infinite",
      }} />
      <style>{`
        @keyframes loaderFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes loaderSpin   { to   { transform: rotate(360deg) }     }
      `}</style>
    </div>
  )
}
