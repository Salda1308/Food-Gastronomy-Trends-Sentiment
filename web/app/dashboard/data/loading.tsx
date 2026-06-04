export default function DataLoading() {
  return (
    <div className="flex-1 overflow-y-auto bg-wall p-7">
      <div className="mb-6 h-14 w-48 animate-pulse bg-wire-light" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse bg-poster" style={{ borderRadius: 2 }} />
        ))}
      </div>
      <div className="h-64 animate-pulse bg-poster" style={{ borderRadius: 2 }} />
    </div>
  )
}
