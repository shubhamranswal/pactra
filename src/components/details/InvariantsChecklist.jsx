import { shortenAddress } from "../../utils/address"

export default function InvariantsChecklist({
  invariants,
  mode,
  onToggleInvariant,
  pact,
  isDemo = false,
}) {
  const invKeys = ["sender", "recipient", "token", "amount", "tx", "deadline"]
  const passedCount = invKeys.filter((k) => invariants[k]).length

  const getStatusBadge = () => {
    if (mode === "verifying") {
      return (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary font-mono text-[11px] font-semibold">
          {passedCount} of 6 evaluated
        </span>
      )
    }
    if (passedCount === 6) {
      return (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-semibold">
          6 of 6 satisfied
        </span>
      )
    }
    return (
      <span className="ml-2 px-2 py-0.5 rounded-full bg-danger/20 border border-danger/40 text-danger font-mono text-[11px] font-semibold">
        {passedCount} of 6 satisfied
      </span>
    )
  }

  const items = [
    {
      key: "sender",
      num: "1. Sender",
      title: "Originator Auth",
      sub: pact?.creator ? shortenAddress(pact.creator) : (isDemo ? "0x4a9...e21" : "—"),
      passText: "✓ AUTH VALIDATED",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "recipient",
      num: "2. Recipient",
      title: "Target Recipient",
      sub: pact?.recipient ? shortenAddress(pact.recipient) : (isDemo ? "0x709...79C8" : "—"),
      passText: "✓ RECIPIENT MATCH",
      failText: "✕ RECIPIENT MISMATCH",
    },
    {
      key: "token",
      num: "3. Token",
      title: "Native Escrow",
      sub: "MON (Native Escrow)",
      passText: "✓ NATIVE MON LOCK",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "amount",
      num: "4. Amount",
      title: "Deposit Exact",
      sub: pact ? `${pact.amountFormatted} MON` : (isDemo ? "5.0000 MON" : "—"),
      passText: "✓ EXACT MATCH",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "tx",
      num: "5. Evidence Proof",
      title: "Confirm Manual Verification",
      sub: pact?.hasEvidence ? "Evidence Hash On-Chain" : (pact ? "Pending Evidence" : (isDemo ? "zkProof / Hash Recorded" : "Pending")),
      passText: pact?.hasEvidence ? "✓ EVIDENCE VERIFIED" : "✓ PREDICATE VALID",
      failText: "✕ EVIDENCE MISSING",
    },
    {
      key: "deadline",
      num: "6. Deadline",
      title: "Timelock Window",
      sub: pact ? (pact.isExpired ? "Expired" : "Active Timelock") : (isDemo ? "< 18:00 UTC" : "—"),
      passText: "✓ WITHIN TIMELOCK",
      failText: "✕ TIMELOCK EXPIRED",
    },
  ]

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <h3 className="font-display text-base font-semibold text-white">Verification Invariants</h3>
          {getStatusBadge()}
        </div>
        <span className="font-mono text-[11px] text-outline">
          Interactive simulation toggles
        </span>
      </div>

      {/* 6 Invariants Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const isOk = invariants[item.key]
          return (
            <div
              key={item.key}
              onClick={() => onToggleInvariant(item.key)}
              className={`p-3 rounded-lg transition-all cursor-pointer flex flex-col justify-between gap-2 select-none group border ${isOk
                ? "bg-surface-container/70 border-outline-variant/40 hover:border-primary/50"
                : "bg-danger/10 border-danger/60"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-outline group-hover:text-primary transition-colors">
                  {item.num}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${isOk ? "bg-success shadow-[0_0_6px_#10b981]" : "bg-danger shadow-[0_0_6px_#ef4444]"
                    }`}
                ></span>
              </div>

              <div>
                <div className="font-sans text-xs font-semibold text-white">
                  {item.title}
                </div>
                <div className="font-mono text-[11px] text-on-surface-variant truncate">
                  {item.sub}
                </div>
              </div>

              <div
                className={`font-mono text-[10px] font-semibold tracking-wider pt-1 border-t border-outline-variant/30 ${isOk ? "text-success" : "text-danger"
                  }`}
              >
                {isOk ? item.passText : item.failText}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
