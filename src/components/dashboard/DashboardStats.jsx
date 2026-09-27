export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Card 1: Active Pacts */}
      <div className="relative overflow-hidden rounded-xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 p-5 flex flex-col justify-between gap-4 shadow-xl group hover:border-[#7C3AED]/40 hover:bg-[#1A1B22]/85 transition-all">
        <div className="absolute -right-10 -top-10 w-24 h-24 bg-[#7C3AED]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#7C3AED]/20 transition-all"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs uppercase text-[#64748B]">Active Pacts</span>
            <span className="font-display text-3xl font-bold text-white mt-1">12</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#D2BBFF] font-mono text-[11px] uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse"></span>
            +2 New
          </span>
        </div>

        {/* Inline Sparkline */}
        <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/5">
          <div className="flex flex-col text-left">
            <span className="font-mono text-[11px] text-[#94A3B8]">7d Throughput</span>
            <span className="font-mono text-xs text-[#38BDF8] font-semibold">+18.4%</span>
          </div>
          <svg className="h-7 w-20 text-[#7C3AED] overflow-visible drop-shadow-[0_0_8px_rgba(210,187,255,0.4)]" fill="none" viewBox="0 0 96 28">
            <path d="M0 22L16 18L32 24L48 10L64 14L80 4L96 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M0 22L16 18L32 24L48 10L64 14L80 4L96 8V28H0Z" fill="currentColor" fillOpacity="0.12" />
          </svg>
        </div>
      </div>

      {/* Card 2: Total Escrow Locked */}
      <div className="relative overflow-hidden rounded-xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 p-5 flex flex-col justify-between gap-4 shadow-xl group hover:border-[#38BDF8]/40 hover:bg-[#1A1B22]/85 transition-all">
        <div className="absolute -right-10 -top-10 w-24 h-24 bg-[#38BDF8]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#38BDF8]/20 transition-all"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs uppercase text-[#64748B]">Total Escrow Locked</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-display text-3xl font-bold text-white tracking-tight">4,280</span>
              <span className="font-mono text-xs text-[#C0C1FF] font-medium">USDC</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#38BDF8] shadow-inner">
            <span className="material-symbols-outlined text-[18px]">lock</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-white/5">
          <span className="font-mono">Protected via Monad-BFT</span>
          <span className="font-mono text-[#38BDF8] font-medium">100% Non-Custodial</span>
        </div>
      </div>

      {/* Card 3: Pending Verifications */}
      <div className="relative overflow-hidden rounded-xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 p-5 flex flex-col justify-between gap-4 shadow-xl group hover:border-[#6366F1]/40 hover:bg-[#1A1B22]/85 transition-all">
        <div className="absolute -right-10 -top-10 w-24 h-24 bg-[#6366F1]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#6366F1]/20 transition-all"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs uppercase text-[#64748B]">Pending Verifications</span>
            <span className="font-display text-3xl font-bold text-white mt-1">3</span>
          </div>
          <span className="relative flex h-3 w-3 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#38BDF8]"></span>
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]"></span>
            <span className="font-mono text-[11px] text-[#94A3B8]">2 In-Flight Consensus</span>
          </div>
          <span className="font-mono text-[#38BDF8]">Avg: ~420ms</span>
        </div>
      </div>

      {/* Card 4: Deterministic Finality */}
      <div className="relative overflow-hidden rounded-xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 p-5 flex flex-col justify-between gap-4 shadow-xl group hover:border-[#10B981]/40 hover:bg-[#1A1B22]/85 transition-all">
        <div className="absolute -right-10 -top-10 w-24 h-24 bg-[#10B981]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#10B981]/20 transition-all"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col text-left">
            <span className="font-mono text-xs uppercase text-[#64748B]">Deterministic Finality</span>
            <span className="font-display text-3xl font-bold text-white mt-1">94.2%</span>
          </div>
          {/* Circular SVG Gauge */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <svg className="w-9 h-9 -rotate-90 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" viewBox="0 0 36 36">
              <path className="text-[#343538]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
              <path className="text-[#38BDF8]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="94.2, 100" strokeLinecap="round" strokeWidth="3.5" />
            </svg>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
          <span className="font-mono text-[#94A3B8]">Zero Re-org Rate</span>
          <span className="font-mono text-[#10B981] font-medium">Optimal</span>
        </div>
      </div>
    </div>
  )
}
