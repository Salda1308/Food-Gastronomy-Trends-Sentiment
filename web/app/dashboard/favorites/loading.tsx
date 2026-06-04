export default function FavoritesLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-wall">
      <div className="bg-concrete animate-pulse" style={{ height: 200, borderBottom: "4px solid rgb(var(--wire))" }} />
      <div className="p-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-poster animate-pulse overflow-hidden" style={{ borderRadius: 2 }}>
            <div className="h-44 bg-concrete" />
            <div className="space-y-2 p-4">
              <div className="h-4 bg-slab" />
              <div className="h-3 w-1/2 bg-slab" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
