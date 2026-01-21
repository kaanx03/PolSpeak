export default function PresentLoading() {
  return (
    <div className="min-h-screen bg-[#00132c] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70 text-sm">Loading presentation...</p>
      </div>
    </div>
  );
}
