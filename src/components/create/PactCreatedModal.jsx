import { Link } from "react-router-dom"

export default function PactCreatedModal({ isOpen, onClose, pactDetails }) {
  if (!isOpen) return null

  const numericId = pactDetails?.createdPactId ? String(pactDetails.createdPactId) : null
  const pactDisplayId = numericId ? `#${numericId}` : "Confirmed"
  const txHash = pactDetails?.transactionHash || ""
  const explorerUrl = txHash ? `https://testnet.monadexplorer.com/tx/${txHash}` : "#"

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
                Pact Successfully Created
              </h3>
              <span className="font-mono text-xs text-[#38BDF8]">
                Monad Testnet • Autonomous Non-Custodial Vault
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Overview Box */}
        <div className="rounded-xl bg-[#0D0E11] p-4 border border-white/10 flex flex-col gap-2.5 font-mono text-xs text-[#94A3B8] relative z-10">
          <div className="flex justify-between items-center">
            <span>Pact Identifier:</span>
            <span className="text-[#D2BBFF] font-semibold">{pactDisplayId}</span>
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
          {txHash && (
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span>Transaction Hash:</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#38BDF8] hover:underline truncate max-w-[180px] flex items-center gap-1"
              >
                <span>{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
            </div>
          )}
        </div>

        {/* Notice text */}
        <p className="font-sans text-xs text-[#94A3B8] leading-relaxed relative z-10">
          On-chain escrow pact has been confirmed on Monad Testnet. Native MON escrow deposit is securely locked in the PactEscrow contract.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 relative z-10">
          {numericId ? (
            <Link
              to={`/agreement/${numericId}`}
              state={{ transactionHash: txHash }}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans text-xs sm:text-sm font-semibold text-center shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Inspect Pact #{numericId}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans text-xs sm:text-sm font-semibold text-center shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>View in Dashboard</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          )}
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
