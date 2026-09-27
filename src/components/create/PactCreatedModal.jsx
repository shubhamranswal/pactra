import { Link } from "react-router-dom"

export default function PactCreatedModal({ isOpen, onClose, pactDetails }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#14151A] border border-white/15 shadow-2xl p-6 sm:p-8 overflow-hidden text-left flex flex-col gap-5">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#7C3AED]/20 blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shadow-sm">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                Pact Specification Ready
              </h3>
              <span className="font-mono text-xs text-[#38BDF8]">
                Monad Testnet • Autonomous Non-Custodial Vault
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Overview Box */}
        <div className="rounded-xl bg-[#0D0E11] p-4 border border-white/10 flex flex-col gap-2.5 font-mono text-xs text-[#94A3B8] relative z-10">
          <div className="flex justify-between items-center">
            <span>Pact Identifier:</span>
            <span className="text-[#D2BBFF] font-semibold">#P-1025 (Draft)</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Disbursement Amount:</span>
            <span className="text-white font-semibold">{pactDetails.amount} {pactDetails.token}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Target Recipient:</span>
            <span className="text-white truncate max-w-[180px]">{pactDetails.recipientAddress}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Timelock Expiry:</span>
            <span className="text-[#38BDF8]">{pactDetails.timeout}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Invariants Configured:</span>
            <span className="text-[#10B981] font-semibold">{pactDetails.invariantsCount} Active</span>
          </div>
        </div>

        {/* Notice text */}
        <p className="font-sans text-xs text-[#94A3B8] leading-relaxed relative z-10">
          Frontend escrow configuration generated successfully. In live production, this compiles to Monad bytecode and emits a signed state channel event.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 relative z-10">
          <Link
            to="/agreement/P-1024"
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans text-xs sm:text-sm font-semibold text-center shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Inspect Live Pact #P-1024</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-sans text-xs sm:text-sm font-medium text-center transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
