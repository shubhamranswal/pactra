import { Link } from "react-router-dom"

export default function CreatePactHeader() {
  return (
    <div className="flex flex-col gap-2 pb-2 text-left">
      {/* Breadcrumb & Version Tag */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/dashboard"
            className="text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Dashboard</span>
          </Link>
          <span className="text-[#4A4455]">/</span>
          <span className="font-mono text-[#38BDF8]">New Autonomous Escrow</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#D2BBFF] font-mono text-[11px] uppercase tracking-wider">
            Protocol v2.4-alpha
          </span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#38BDF8] font-mono text-[11px] uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse"></span>
            Monad Testnet
          </span>
        </div>
      </div>

      {/* Main Display Title */}
      <div className="flex flex-col gap-1 mt-1">
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
          Create Autonomous Escrow Pact
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#94A3B8] max-w-2xl">
          Configure machine-to-machine financial infrastructure, programmatic SLAs, and cryptographic release conditions for autonomous agent settlement.
        </p>
      </div>
    </div>
  )
}
