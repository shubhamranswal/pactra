import { useMemo } from "react"
import { shortenAddress } from "../../utils/address"
import { CRITERION_TYPES } from "../../lib/veridict/schema"

export default function InvariantsChecklist({
  invariants,
  mode,
  onToggleInvariant,
  pact,
  isDemo = false,
}) {
  const invKeys = ["sender", "recipient", "token", "amount", "tx", "deadline"]
  const passedCount = invKeys.filter((k) => invariants[k]).length

  // Read any customized terms criteria for this pact from storage
  const cleanId = pact?.id ? String(pact.id) : ""
  const termsCriteria = useMemo(() => {
    if (!cleanId) return null
    try {
      const cached = sessionStorage.getItem(`pact_terms_${cleanId}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        return Array.isArray(parsed.criteria) ? parsed.criteria : null
      }
    } catch {
      // ignore
    }
    return null
  }, [cleanId])

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
      title: "Cryptographic Proof",
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

  const getCriterionLabel = (type) => {
    switch (type) {
      case CRITERION_TYPES.TYPE_A_API_COUNT:
        return "Type A: API Count"
      case CRITERION_TYPES.TYPE_B_TX_VERIFY:
        return "Type B: Monad Tx Verification"
      case CRITERION_TYPES.TYPE_C_HASH_MATCH:
        return "Type C: Cryptographic Hash Match"
      default:
        return "Criterion"
    }
  }

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <h3 className="font-display text-base font-semibold text-white">Verification Invariants</h3>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          {!isDemo && pact && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live On-Chain
            </span>
          )}
          <span className="font-mono text-[11px] text-outline">
            {isDemo ? "Interactive simulation toggles" : "Click card to toggle simulation"}
          </span>
        </div>
      </div>

      {/* 6 Invariants Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const isOk = invariants[item.key]
          return (
            <div
              key={item.key}
              onClick={() => onToggleInvariant(item.key)}
              className={`p-3 rounded-lg transition-all cursor-pointer flex flex-col justify-between gap-2 select-none group border ${
                isOk
                  ? "bg-surface-container/70 border-outline-variant/40 hover:border-primary/50"
                  : "bg-danger/10 border-danger/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-outline group-hover:text-primary transition-colors">
                  {item.num}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOk ? "bg-success shadow-[0_0_6px_#10b981]" : "bg-danger shadow-[0_0_6px_#ef4444]"
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
                className={`font-mono text-[10px] font-semibold tracking-wider pt-1 border-t border-outline-variant/30 ${
                  isOk ? "text-success" : "text-danger"
                }`}
              >
                {isOk ? item.passText : item.failText}
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Agreement Terms Criteria (if configured for this pact) */}
      {termsCriteria && termsCriteria.length > 0 && (
        <div className="pt-3 border-t border-outline-variant/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Pact Agreement Acceptance Criteria ({termsCriteria.length})
            </span>
            <span className="text-[10px] font-mono text-outline">Deterministic Predicates</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {termsCriteria.map((crit, idx) => (
              <div
                key={crit.id || idx}
                className="p-2.5 rounded-lg bg-surface-container/50 border border-outline-variant/30 text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">
                    #{idx + 1} {getCriterionLabel(crit.type)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-high text-[10px] text-outline">
                    ID: {crit.id || idx + 1}
                  </span>
                </div>
                <p className="text-[11px] font-sans text-on-surface-variant truncate">
                  {crit.description || "Machine verifiable acceptance predicate"}
                </p>
                {crit.targetEndpoint && (
                  <div className="text-[10px] text-outline truncate">
                    Endpoint: {crit.targetEndpoint} (min: {crit.minimumCount || 1})
                  </div>
                )}
                {crit.recipient && (
                  <div className="text-[10px] text-outline truncate">
                    To: {shortenAddress(crit.recipient)}
                  </div>
                )}
                {crit.expectedHash && (
                  <div className="text-[10px] text-outline truncate">
                    Hash: {shortenAddress(crit.expectedHash)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
