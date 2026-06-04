export default function TrendsLoading() {
  return (
    <div className="flex-1 overflow-y-auto bg-wall">
      <div className="bg-concrete animate-pulse" style={{ height: 240, borderBottom: "4px solid rgb(var(--wire))" }} />
      <div className="p-7 flex flex-col gap-6">
        <div className="grid gap-6" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
          <div className="bg-poster animate-pulse" style={{ height: 360, borderRadius: 2 }} />
          <div className="flex flex-col gap-6">
            <div className="bg-poster animate-pulse" style={{ height: 200, borderRadius: 2 }} />
            <div className="bg-poster animate-pulse" style={{ height: 148, borderRadius: 2 }} />
          </div>
        </div>
        <div className="bg-poster animate-pulse" style={{ height: 260, borderRadius: 2 }} />
      </div>
    </div>
  )
}
