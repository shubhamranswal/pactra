export default function ComparisonSection() {
  const comparisonData = [
    {
      capability: "Settlement Latency",
      pactra: "< 0.4s (Deterministic)",
      multisig: "15m - 24 hours (Manual M-of-N)",
      relayers: "5s - 60s (Batched)",
      relayerStatus: "neutral",
    },
    {
      capability: "Non-Custodial Guarantee",
      pactra: "100% Cryptographic Lock",
      multisig: "High (Smart Contract)",
      relayers: "Low (Custodial Risk)",
      relayerStatus: "error",
    },
    {
      capability: "Agent SLA Verification",
      pactra: "6-Point Invariant Engine",
      multisig: "None (Human Signoff)",
      relayers: "Opaque Webhook Check",
      relayerStatus: "neutral",
    },
    {
      capability: "Peak Throughput",
      pactra: "10,000+ TPS (Monad Parallel)",
      multisig: "~30 TPS (Sequential EVM)",
      relayers: "~500 TPS (API rate limited)",
      relayerStatus: "neutral",
    },
    {
      capability: "Atomic Dispute Resolution",
      pactra: "Automated Timed Refund",
      multisig: "Arbiter voting round",
      relayers: "Support Ticket / Frozen",
      relayerStatus: "error",
    },
  ]

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-left">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="font-mono text-xs text-[#38BDF8] uppercase tracking-widest">
          ARCHITECTURE COMPARISON
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] mt-1.5">
          Autonomous Escrow vs Legacy Solutions
        </h2>
        <p className="font-sans text-sm text-[#94A3B8] mt-2">
          Why traditional multisigs and off-chain relayers fail modern AI agent payment requirements.
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl bg-[#0B0C10]/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#0D0E11]/90 border-b border-white/10 font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider">
                <th className="p-4 pl-6">Capability</th>
                <th className="p-4 text-[#38BDF8] bg-[#7C3AED]/10 border-x border-white/10">
                  PACTRA Autonomous Escrow
                </th>
                <th className="p-4">Traditional Multi-Sig (Gnosis)</th>
                <th className="p-4 pr-6">Centralized Off-Chain Relayers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans text-[#94A3B8]">
              {comparisonData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 pl-6 font-medium text-white">{row.capability}</td>
                  <td className="p-4 font-mono font-bold text-[#38BDF8] bg-[#7C3AED]/5 border-x border-white/10">
                    {row.pactra}
                  </td>
                  <td className="p-4 font-mono text-xs text-[#94A3B8]">{row.multisig}</td>
                  <td
                    className={`p-4 pr-6 font-mono text-xs ${
                      row.relayerStatus === "error" ? "text-[#F43F5E]" : "text-[#64748B]"
                    }`}
                  >
                    {row.relayers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden flex flex-col gap-4">
        {comparisonData.map((row, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-white/10 bg-[#0B0C10]/90 backdrop-blur-md flex flex-col gap-2.5"
          >
            <span className="font-display text-sm font-semibold text-white">
              {row.capability}
            </span>
            <div className="p-2.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30 flex flex-col">
              <span className="font-mono text-[10px] text-[#38BDF8] uppercase">
                PACTRA Autonomous Escrow
              </span>
              <span className="font-mono text-sm font-bold text-[#38BDF8] mt-0.5">
                {row.pactra}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded bg-[#14151A] border border-white/5">
                <span className="text-[10px] text-[#64748B] block">Gnosis Multi-Sig</span>
                <span className="text-[#94A3B8] text-[11px] mt-0.5 block">{row.multisig}</span>
              </div>
              <div className="p-2 rounded bg-[#14151A] border border-white/5">
                <span className="text-[10px] text-[#64748B] block">Off-Chain Relayer</span>
                <span
                  className={`text-[11px] mt-0.5 block ${
                    row.relayerStatus === "error" ? "text-[#F43F5E]" : "text-[#94A3B8]"
                  }`}
                >
                  {row.relayers}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
