import { shortenAddress } from "../../utils/address"

export default function InvariantsChecklist({
  invariants,
  mode,
  onToggleInvariant,
  pact,
  verificationResult,
  paymentVerificationResult,
  isDemo = false,
}) {
  const invKeys = ["sender", "recipient", "token", "amount", "tx", "deadline"]

  const det = paymentVerificationResult?.deterministicResult

  // Derive individual check statuses if payment verification result is present
  const effectiveInvariants = {
    sender: det ? det.senderMatch : invariants.sender,
    recipient: det ? det.recipientMatch : invariants.recipient,
    token: det ? det.tokenMatch : invariants.token,
    amount: det ? det.amountMatch : invariants.amount,
    tx: det ? det.transactionSuccess : (verificationResult?.verdict === "APPROVED" || invariants.tx),
    deadline: det ? det.deadlineMatch : invariants.deadline,
  }

  const passedCount = invKeys.filter((k) => effectiveInvariants[k]).length

  const getStatusBadge = () => {
    if (mode === "verifying" && !det) {
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
      title: "Payer Address",
      exp: pact?.creator ? shortenAddress(pact.creator) : (isDemo ? "0x4a9...e21" : "—"),
      act: det ? shortenAddress(det.actual.sender) : null,
      passText: "✓ SENDER MATCH",
      failText: "✕ SENDER MISMATCH",
    },
    {
      key: "recipient",
      num: "2. Recipient",
      title: "Target Recipient",
      exp: pact?.recipient ? shortenAddress(pact.recipient) : (isDemo ? "0x709...79C8" : "—"),
      act: det ? shortenAddress(det.actual.recipient) : null,
      passText: "✓ RECIPIENT MATCH",
      failText: "✕ RECIPIENT MISMATCH",
    },
    {
      key: "token",
      num: "3. Token",
      title: "Native Escrow",
      exp: "Native MON",
      act: det ? det.actual.token : null,
      passText: "✓ NATIVE MON LOCK",
      failText: "✕ TOKEN MISMATCH",
    },
    {
      key: "amount",
      num: "4. Amount",
      title: "Deposit Allocation",
      exp: pact ? `${pact.amountFormatted} MON` : (isDemo ? "5.0000 MON" : "—"),
      act: det ? `${det.actual.amountMON} MON` : null,
      passText: "✓ ON-CHAIN ESCROW CONFIRMED",
      failText: "✕ AMOUNT MISMATCH",
    },
    {
      key: "tx",
      num: "5. Payment Proof",
      title: "Transaction Success",
      exp: "Success Receipt",
      act: det ? det.actual.status : (pact?.hasEvidence ? "Evidence Hash" : null),
      passText: "✓ TX CONFIRMED",
      failText: "✕ TX FAILED / UNCONFIRMED",
    },
    {
      key: "deadline",
      num: "6. Deadline",
      title: "Timelock Window",
      exp: pact ? (pact.isExpired ? "Expired" : "< Deadline") : (isDemo ? "< 18:00 UTC" : "—"),
      act: det ? (det.deadlineMatch ? "Within Deadline" : "After Deadline") : null,
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
          Expected vs Actual Blockchain Truth
        </span>
      </div>

      {/* 6 Invariants Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const isOk = effectiveInvariants[item.key]
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
                  <span className="text-outline">Exp:</span> {item.exp}
                </div>
                {item.act && (
                  <div className={`font-mono text-[10px] truncate ${isOk ? "text-emerald-400" : "text-rose-400"}`}>
                    <span className="text-outline">Act:</span> {item.act}
                  </div>
                )}
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
    </div>
  )
}
