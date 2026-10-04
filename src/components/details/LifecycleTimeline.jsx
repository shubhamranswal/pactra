export default function LifecycleTimeline({ mode, pact }) {
  const isVerifying = mode === "verifying"
  const isPassed = mode === "passed"
  const isFailed = mode === "mismatch" || mode === "expired"

  return (
    <div className="rounded-xl bg-surface-low/90 border border-outline-variant/40 p-5 shadow-lg relative overflow-hidden text-left">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
          <span className="font-display text-sm font-semibold tracking-wide text-white uppercase">
            Lifecycle Timeline
          </span>
        </div>

        {isVerifying && (
          <div className="text-xs font-mono text-tertiary flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] animate-spin text-tertiary">sync</span>
            <span>
              {pact?.status === 1
                ? "Evidence submitted on-chain. 3-day review period active."
                : (pact ? "Pact funded on Monad. Awaiting counterparty evidence." : "Checking Monad BFT receipts against predicate invariants")}
            </span>
          </div>
        )}

        {isPassed && (
          <div className="text-xs font-mono text-success flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-success">verified</span>
            <span className="font-semibold">
              {pact ? "Pact settled on-chain. Escrow disbursement finalized!" : "All invariants verified. Autonomous settlement finalized!"}
            </span>
          </div>
        )}

        {isFailed && (
          <div className="text-xs font-mono text-danger flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-danger">warning</span>
            <span className="font-semibold">
              {pact ? "Pact deadline elapsed. Escrow refunded to creator." : "Invariant check failed. Escrow safely refunded to originator."}
            </span>
          </div>
        )}
      </div>

      {/* Stepper track */}
      <div className="relative w-full pt-2 pb-1">
        {/* Track Base */}
        <div className="absolute top-[21px] left-6 right-6 h-[2px] bg-surface-highest z-0"></div>

        {/* Track Progress Bar */}
        <div
          className="absolute top-[21px] left-6 h-[2px] bg-gradient-to-r from-success via-tertiary to-primary z-0 transition-all duration-500"
          style={{ width: isPassed ? "calc(100% - 3rem)" : "70%" }}
        ></div>

        <div className="relative z-10 grid grid-cols-6 gap-1 text-center">
          {/* 1. CREATED */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">1. CREATED</span>
              <span className="font-mono text-[10px] text-outline">0.02s</span>
            </div>
          </div>

          {/* 2. FUNDED */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">2. FUNDED</span>
              <span className="font-mono text-[10px] text-outline">0.11s</span>
            </div>
          </div>

          {/* 3. ACCEPTED */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">3. ACCEPTED</span>
              <span className="font-mono text-[10px] text-outline">0.19s</span>
            </div>
          </div>

          {/* 4. EXECUTING */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">4. EXECUTING</span>
              <span className="font-mono text-[10px] text-outline">380ms Tx</span>
            </div>
          </div>

          {/* 5. VERIFYING */}
          <div className="flex flex-col items-center gap-1.5 group cursor-pointer transition-all">
            {isVerifying && (
              <>
                <div className="w-8 h-8 -mt-0.5 rounded-full bg-primary-container border-2 border-primary text-white flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.85)] animate-pulse">
                  <span className="material-symbols-outlined text-[17px] animate-spin">sync</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-bold text-primary tracking-wide">5. VERIFYING</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-primary-container/40 text-primary uppercase font-semibold">
                    Active Pulse
                  </span>
                </div>
              </>
            )}

            {isPassed && (
              <>
                <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  <span className="material-symbols-outlined text-[15px]">check</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-semibold text-white">5. VERIFIED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-success/20 text-success">
                    Passed (12ms)
                  </span>
                </div>
              </>
            )}

            {isFailed && (
              <>
                <div className="w-8 h-8 -mt-0.5 rounded-full bg-danger/20 border-2 border-danger text-danger flex items-center justify-center shadow-[0_0_16px_rgba(239,68,68,0.5)]">
                  <span className="material-symbols-outlined text-[17px]">priority_high</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-bold text-danger tracking-wide">5. FAILED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-danger/20 text-danger">
                    Reverted
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 6. SETTLED */}
          <div
            className={`flex flex-col items-center gap-1.5 group transition-all ${
              isVerifying ? "opacity-40" : "opacity-100"
            }`}
          >
            {isVerifying && (
              <>
                <div className="w-7 h-7 rounded-full bg-surface-highest border border-outline-variant/60 text-outline flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-medium text-outline">6. SETTLED</span>
                  <span className="font-mono text-[10px] text-outline">Pending</span>
                </div>
              </>
            )}

            {isPassed && (
              <>
                <div className="w-8 h-8 -mt-0.5 rounded-full bg-success text-[#0d0e11] font-bold flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.7)]">
                  <span className="material-symbols-outlined text-[17px]">done_all</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-bold text-success">6. SETTLED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-success/20 text-success uppercase font-semibold">
                    Complete
                  </span>
                </div>
              </>
            )}

            {isFailed && (
              <>
                <div className="w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                  <span className="material-symbols-outlined text-[15px]">undo</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-bold text-danger">6. REFUNDED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-danger/20 text-danger">
                    Safeguard
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
