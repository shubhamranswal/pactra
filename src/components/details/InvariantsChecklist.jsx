export default function InvariantsChecklist({
  invariants,
  mode,
  onToggleInvariant,
}) {
  const invKeys = ["sender", "recipient", "token", "amount", "tx", "deadline"]
  const passedCount = invKeys.filter((k) => invariants[k]).length

  const getStatusBadge = () => {
    if (mode === "verifying") {
      return (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary font-mono text-[11px] font-semibold">
          6 of 6 checking
        </span>
      )
    }
    if (passedCount === 6) {
      return (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-semibold">
          6 of 6 passed
        </span>
      )
    }
    return (
      <span className="ml-2 px-2 py-0.5 rounded-full bg-danger/20 border border-danger/40 text-danger font-mono text-[11px] font-semibold">
        {passedCount} of 6 passed
      </span>
    )
  }

  const items = [
    {
      key: "sender",
      num: "1. Sender",
      title: "Originator Sig",
      sub: "0x4a9...e21",
      passText: "✓ SIG VALIDATED",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "recipient",
      num: "2. Recipient",
      title: "Match Target",
      sub: "0x71C...92",
      passText: "✓ RESOLVED MATCH",
      failText: "✕ RECIPIENT MISMATCH",
    },
    {
      key: "token",
      num: "3. Token",
      title: "Asset Pair",
      sub: "MON (Native)",
      passText: "✓ WHITELISTED",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "amount",
      num: "4. Amount",
      title: "Value Exact",
      sub: "5.0000 MON",
      passText: "✓ EXACT MATCH",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "tx",
      num: "5. Tx Inclusion",
      title: "Receipt State",
      sub: "0x82af...91bd",
      passText: "✓ RECEIPT VERIFIED",
      failText: "✕ FAILED CHECK",
    },
    {
      key: "deadline",
      num: "6. Deadline",
      title: "Timelock Window",
      sub: "< 18:00 UTC",
      passText: "✓ IN TIMELOCK",
      failText: "✕ TIMELOCK EXPIRED",
    },
  ]

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <h3 className="font-display text-base font-semibold text-white">Verification Invariants</h3>
          {getStatusBadge()}
        </div>
        <span className="font-mono text-[11px] text-outline">
          Click invariant card to toggle simulated condition
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
                  className={`material-symbols-outlined text-[17px] ${
                    isOk ? "text-success" : "text-danger"
                  }`}
                >
                  {isOk ? "check_circle" : "cancel"}
                </span>
              </div>
              <div>
                <div className="font-mono text-xs font-semibold text-white">{item.title}</div>
                <div className="font-mono text-[10px] text-outline truncate">{item.sub}</div>
              </div>
              <div
                className={`font-mono text-[9px] tracking-wide font-semibold ${
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
