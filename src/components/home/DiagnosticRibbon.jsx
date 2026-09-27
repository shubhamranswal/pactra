export default function DiagnosticRibbon() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-xl bg-[#0B0C10]/85 border border-white/10 shadow-inner flex flex-wrap items-center justify-between gap-4">
        {/* RPC Endpoint */}
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse"></span>
          <span className="font-mono text-xs text-[#94A3B8] uppercase tracking-wider">
            Monad Testnet RPC:
          </span>
          <span className="font-mono text-xs sm:text-sm text-[#F8FAFC]">
            https://testnet-rpc.monad.xyz
          </span>
        </div>

        {/* Live Diagnostics */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#64748B]">LATENCY:</span>
            <span className="text-[#38BDF8] font-medium">0.38s</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#64748B]">AVG GAS:</span>
            <span className="text-[#38BDF8] font-medium">&lt; 0.00012 MON</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#64748B]">TPS PEAK:</span>
            <span className="text-[#D2BBFF] font-medium">10,240</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#64748B]">ATOMIC SETTLED:</span>
            <span className="text-[#F8FAFC] font-medium">99.98%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
