import PactraLogo from "./PactraLogo"

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#0A0B0E]/95 backdrop-blur-md py-10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Info */}
          <div className="flex items-center gap-3">
            <PactraLogo className="h-6 w-auto" showBadge={false} />
            <span className="font-mono text-xs text-[#94A3B8]">
              Autonomous Settlement Infrastructure
            </span>
          </div>

          {/* Telemetry Tags */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <span className="text-[#64748B]">Consensus: <strong className="text-[#F8FAFC]">Monad-BFT</strong></span>
            <span className="text-[#64748B]">Execution: <strong className="text-[#F8FAFC]">Parallel EVM</strong></span>
            <span className="text-[#38BDF8] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
              Deterministic Finality &lt; 0.4s
            </span>
          </div>

          {/* Copyright */}
          <div className="font-mono text-xs text-[#64748B] text-center md:text-right">
            © 2025 PACTRA Protocol. Secured on Monad Testnet.
          </div>
        </div>
      </div>
    </footer>
  )
}
