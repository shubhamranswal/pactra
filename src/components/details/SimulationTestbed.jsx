export default function SimulationTestbed({ mode, onSelectMode }) {
  return (
    <div className="rounded-xl bg-surface-container/70 border border-outline-variant/50 p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan animate-pulse"></span>
        <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
          Interactive Testbed:
        </span>
        <span className="text-xs text-outline hidden sm:inline">
          Simulate Monad Predicate Engine outcomes
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
        <button
          onClick={() => onSelectMode("verifying")}
          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all border cursor-pointer ${
            mode === "verifying"
              ? "bg-primary-container/30 border-primary text-white shadow-[0_0_12px_rgba(124,58,237,0.35)] font-semibold"
              : "border-outline-variant/50 bg-surface-high hover:border-primary/60 text-on-surface-variant hover:text-white font-medium"
          }`}
        >
          ● State: VERIFYING (Live)
        </button>

        <button
          onClick={() => onSelectMode("passed")}
          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all border cursor-pointer ${
            mode === "passed"
              ? "bg-emerald-500/20 border-success text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] font-semibold"
              : "border-outline-variant/50 bg-surface-high hover:border-success/60 text-on-surface-variant hover:text-white font-medium"
          }`}
        >
          ✓ Simulate All Passed (SETTLED)
        </button>

        <button
          onClick={() => onSelectMode("mismatch")}
          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all border cursor-pointer ${
            mode === "mismatch"
              ? "bg-danger/20 border-danger text-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.35)] font-semibold"
              : "border-outline-variant/50 bg-surface-high hover:border-danger/60 text-on-surface-variant hover:text-white font-medium"
          }`}
        >
          ✕ Recipient Mismatch (FAILED)
        </button>

        <button
          onClick={() => onSelectMode("expired")}
          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all border cursor-pointer ${
            mode === "expired"
              ? "bg-danger/20 border-danger text-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.35)] font-semibold"
              : "border-outline-variant/50 bg-surface-high hover:border-danger/60 text-on-surface-variant hover:text-white font-medium"
          }`}
        >
          ✕ Deadline Expired (FAILED)
        </button>
      </div>
    </div>
  )
}
