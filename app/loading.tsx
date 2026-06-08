export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 font-semibold">
          Loading…
        </p>
      </div>
    </div>
  )
}
