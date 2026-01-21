export default function EditLoading() {
  return (
    <div className="flex min-h-screen bg-bg-main">
      {/* Sidebar skeleton */}
      <div className="hidden xl:block w-64 bg-[#00132c] animate-pulse" />

      {/* Main content skeleton */}
      <div className="flex-1 p-4 md:p-6 pb-24 xl:pb-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* Editor skeleton */}
        <div className="space-y-4">
          <div className="h-16 w-full bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-64 w-full bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-32 w-full bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
