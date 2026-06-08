export default function ProductsLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-8">
        {/* Header skeleton */}
        <div className="mb-10 space-y-3">
          <div className="h-10 bg-slate-100 rounded-lg w-64 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-80 animate-pulse" />
        </div>
        {/* Filter bar skeleton */}
        <div className="h-16 bg-slate-50 border border-slate-100 rounded-xl animate-pulse mb-8" />
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
              <div className="aspect-[4/5] bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}