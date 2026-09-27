export default function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
      {/* Left: Title & Protocol Status */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse"></span>
          <span className="font-mono uppercase tracking-wider text-[#64748B]">
            Autonomous Agent State Channel
          </span>
          <span className="text-[#4A4455]">/</span>
          <span className="font-mono text-[#38BDF8]">Epoch #84920</span>
        </div>

        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
            Telemetry Dashboard
          </h1>
          <span className="font-mono text-xs text-[#94A3B8] px-2.5 py-0.5 rounded bg-white/5 border border-white/10 backdrop-blur-md">
            EVM Equivalence
          </span>
        </div>
      </div>

      {/* Right: Sub-second Engine Status Pill */}
      <div className="flex items-center gap-3 self-start md:self-auto px-4 py-2.5 rounded-xl bg-[#14151A]/80 border border-white/10 backdrop-blur-xl shadow-lg hover:border-[#38BDF8]/40 transition-all">
        <div className="flex flex-col text-left">
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#64748B]">
            Monad Engine
          </span>
          <span className="font-mono font-medium text-[#38BDF8] text-xs sm:text-sm">
            412ms Finality • 9,842 TPS
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.25)]">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
        </div>
      </div>
    </div>
  )
}
