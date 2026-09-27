export default function EscrowPreviewCard({
  amount,
  token,
  recipientAddress,
  collateral,
  timeout,
  onInitiatePact,
  isProcessing,
}) {
  const isMon = token === "MON"
  const rate = isMon ? 4.28 : 1.0
  const numAmount = parseFloat(amount) || 0
  const usdValue = (numAmount * rate).toFixed(2)

  return (
    <div className="bg-[#111318]/90 rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/10 backdrop-blur-xl relative overflow-hidden flex flex-col gap-5 text-left">
      {/* Corner Ambient Glows */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#7C3AED]/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-36 h-36 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#7C3AED] text-[20px]">layers</span>
          <span className="font-sans text-xs font-semibold text-white tracking-wider uppercase">
            Execution Preview
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#181A20] text-[#38BDF8] font-mono text-[10px] border border-[#38BDF8]/20">
          PRE-FLIGHT
        </span>
      </div>

      {/* Payment Transfer Summary Tile */}
      <div className="bg-[#0D0E11]/90 border border-white/10 rounded-xl p-4 flex flex-col gap-1.5 relative z-10">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono uppercase tracking-wider text-[#64748B]">
            Payment Transfer
          </span>
          <span className="font-mono text-xs text-[#D2BBFF] font-medium">
            DISBURSEMENT
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="font-mono font-semibold text-[#D2BBFF] text-sm">
              {token}
            </span>
          </div>
          <span className="font-mono text-xs text-[#64748B]">
            ≈ ${usdValue} USD
          </span>
        </div>
        <div className="flex items-center gap-1.5 pt-2 text-[#94A3B8] font-mono text-xs border-t border-white/5">
          <span className="material-symbols-outlined text-[15px] text-[#38BDF8]">
            arrow_forward
          </span>
          <span className="truncate">
            {recipientAddress || "0x71C5A82d54B98819446D61BcA49A92"}
          </span>
        </div>
      </div>

      {/* Collateral Escrow Tile */}
      <div className="bg-[#0D0E11]/90 border border-white/10 rounded-xl p-4 flex flex-col gap-1.5 relative z-10">
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono uppercase tracking-wider text-[#64748B]">
            Collateral Guarantee
          </span>
          <span className="font-mono text-[10px] text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.2 rounded border border-[#10B981]/20">
            BONDED
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold text-white">
              {collateral || "100 USDC"}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#64748B]">
            Timeout: {timeout}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1.5 font-mono text-[11px] text-[#64748B] border-t border-white/5">
          <span>Auto-revert on failure</span>
          <span className="text-[#38BDF8] font-medium">100% Non-Custodial</span>
        </div>
      </div>

      {/* Fee & Network Telemetry Breakdown */}
      <div className="space-y-2 pt-1 font-mono text-xs text-[#94A3B8] relative z-10">
        <div className="flex justify-between">
          <span>Deposit Allocation</span>
          <span className="text-white font-medium">{numAmount} {token}</span>
        </div>
        <div className="flex justify-between">
          <span>Estimated Network Fee</span>
          <span className="text-[#38BDF8]">&lt; 0.00012 MON (&lt;$0.01)</span>
        </div>
        <div className="flex justify-between">
          <span>Settlement Velocity</span>
          <span className="text-white">Sub-second (~400ms)</span>
        </div>
        <div className="flex justify-between">
          <span>Consensus Pre-flight</span>
          <span className="text-[#10B981]">100% Validated</span>
        </div>
      </div>

      {/* Primary Execution Action */}
      <div className="flex flex-col gap-2 pt-2 relative z-10">
        <button
          type="button"
          onClick={onInitiatePact}
          disabled={isProcessing}
          className="w-full py-3.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.98] text-white font-sans text-sm font-semibold tracking-wide shadow-[0_0_28px_rgba(124,58,237,0.45)] border border-[#7C3AED]/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
              </svg>
              <span>Compiling Escrow Bytecode...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">lock_open</span>
              <span>Fund Escrow &amp; Initiate Pact</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-center text-[#64748B] font-mono text-[11px] pt-1">
          <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">shield</span>
          <span>Non-custodial timelock escrow on Monad Testnet</span>
        </div>
      </div>

      {/* Protocol Metric Pill Footer */}
      <div className="px-3 py-2 rounded-lg bg-[#0D0E11]/80 border border-white/5 flex items-center justify-between text-[#64748B] font-mono text-[10px] relative z-10">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
          GAS: &lt; 0.00012 MON
        </span>
        <span>EXECUTION: ASYNC-08</span>
      </div>
    </div>
  )
}
