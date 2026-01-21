export default function LibraryLoading() {
  return (
    <div className="flex min-h-screen bg-bg-main">
      {/* Sidebar skeleton */}
      <div className="hidden xl:block w-64 bg-[#00132c] animate-pulse" />

      {/* Main content skeleton */}
      <div className="flex-1 p-4 md:p-6 pb-24 xl:pb-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="h-12 w-full max-w-md bg-slate-200 rounded-xl animate-pulse mb-6" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
