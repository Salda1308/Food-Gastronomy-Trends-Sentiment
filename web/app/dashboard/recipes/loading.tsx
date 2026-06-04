export default function RecipesLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-wall">
      <div className="bg-poster animate-pulse" style={{ height: 50, borderBottom: "4px solid rgb(var(--wire))" }} />
      <div className="p-7">
        <div className="mb-6 h-14 w-60 animate-pulse bg-wire-light" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-poster animate-pulse overflow-hidden" style={{ borderRadius: 2 }}>
              <div className="h-44 bg-concrete" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 bg-slab" />
                <div className="h-3 w-1/2 bg-slab" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
