import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function QuickPactModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [payer, setPayer] = useState("0x8192A478...c09f (Agent A)")
  const [executor, setExecutor] = useState("0x33e1...14aa (Agent B)")
  const [amount, setAmount] = useState("12500")
  const [sla, setSla] = useState("< 800 ms")
  const [epochs, setEpochs] = useState("1084")
  const [schema, setSchema] = useState("ZK-SNARK Invariant Proof (Fast Finality)")
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      onClose()
      navigate("/create-agreement")
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#14151A] border border-white/15 shadow-2xl p-6 sm:p-8 overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/30 flex items-center justify-center text-[#D2BBFF]">
              <span className="material-symbols-outlined text-[22px]">add_circle</span>
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                Create Autonomous Pact
              </h3>
              <span className="font-mono text-xs text-[#94A3B8]">
                Target Network: Monad Testnet (Chain ID 10143)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] animate-pulse">
              <span className="material-symbols-outlined text-[32px]">check</span>
            </div>
            <h4 className="font-display text-xl font-bold text-white">
              Autonomous Pact Initiated
            </h4>
            <p className="font-mono text-xs text-[#38BDF8] max-w-sm">
              Escrow vault compiled. Redirecting to Agreement Creation Studio...
            </p>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Payer Agent Address
                </label>
                <input
                  type="text"
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0E11] border border-white/10 text-white font-mono text-xs focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Executor Agent Address
                </label>
                <input
                  type="text"
                  value={executor}
                  onChange={(e) => setExecutor(e.target.value)}
                  placeholder="0x33e1...14aa (Agent B)"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0E11] border border-white/10 text-white font-mono text-xs focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Escrow Amount (MON)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0E11] border border-white/10 text-[#38BDF8] font-mono text-xs focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  SLA Latency Target
                </label>
                <input
                  type="text"
                  value={sla}
                  onChange={(e) => setSla(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0E11] border border-white/10 text-white font-mono text-xs focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Timelock (Epochs)
                </label>
                <input
                  type="number"
                  value={epochs}
                  onChange={(e) => setEpochs(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0E11] border border-white/10 text-white font-mono text-xs focus:border-[#7C3AED] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Verification Schema / Proof Method
              </label>
              <select
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D0E11] border border-white/10 text-white font-mono text-xs focus:border-[#7C3AED] focus:outline-none transition-colors cursor-pointer"
              >
                <option>ZK-SNARK Invariant Proof (Fast Finality)</option>
                <option>Oracle Attestation Quorum (3/4 Signature)</option>
                <option>Deterministic Hash Pre-image Match</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Estimated Monad Gas:</span>
              <span className="font-mono text-[#38BDF8] font-medium">
                0.00012 MON (~$0.00003)
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#1F1F23] text-white text-xs font-medium hover:bg-[#292A2D] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9] transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Deploy Pact &amp; Lock Vault</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
