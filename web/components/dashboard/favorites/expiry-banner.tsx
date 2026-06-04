"use client"

export function ExpiryBanner() {
  return (
    <div
      className="flex items-center justify-between px-6 py-3"
      style={{ background: "rgba(230,57,70,.08)", borderBottom: "1px solid rgba(230,57,70,.25)" }}
    >
      <p className="font-sans text-[13px] text-smoke">
        Saved recipes expire after{" "}
        <span className="font-mono text-heat">30 days</span>
        . Download any you want to keep.
      </p>
      
    </div>
  )
}
