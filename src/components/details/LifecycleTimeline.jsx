import { LIFECYCLE_STATES, LIFECYCLE_INFO } from "../../lib/veridict/lifecycle"

/**
 * LifecycleTimeline Component
 *
 * Implements Task 7.2.2:
 * 6-step lifecycle timeline visualizing dynamic contract states & Veridict verification.
 * Steps:
 * 1. CREATED
 * 2. FUNDED
 * 3. ACCEPTED
 * 4. EXECUTING
 * 5. VERIFYING
 * 6. SETTLED / REFUNDED
 */
export default function LifecycleTimeline({ mode, pact }) {
  const statusCode = pact ? Number(pact.status) : null
  const hasEvidence = Boolean(pact?.hasEvidence)
  const isExpired = Boolean(pact?.isExpired)

  // Determine active lifecycle state
  let currentState = pact?.lifecycleState
  if (!currentState) {
    if (mode === "passed" || statusCode === 2) {
      currentState = LIFECYCLE_STATES.SETTLED
    } else if (mode === "expired" || mode === "mismatch" || statusCode === 3 || isExpired) {
      currentState = LIFECYCLE_STATES.REFUNDED
    } else if (hasEvidence || statusCode === 1) {
      currentState = LIFECYCLE_STATES.VERIFYING
    } else if (statusCode === 0) {
      currentState = LIFECYCLE_STATES.FUNDED
    } else {
      currentState = LIFECYCLE_STATES.CREATED
    }
  }

  const isVerifying = currentState === LIFECYCLE_STATES.VERIFYING || (hasEvidence && statusCode === 1)
  const isSettled = currentState === LIFECYCLE_STATES.SETTLED || mode === "passed" || statusCode === 2
  const isRefunded = currentState === LIFECYCLE_STATES.REFUNDED || mode === "expired" || mode === "mismatch" || statusCode === 3
  const isExecuting = currentState === LIFECYCLE_STATES.EXECUTING
  const isFunded = statusCode === 0 && !hasEvidence && !isSettled && !isRefunded

  // Progress Bar Width
  let progressWidth = "25%"
  if (isSettled) {
    progressWidth = "calc(100% - 3rem)"
  } else if (isRefunded) {
    progressWidth = "calc(100% - 3rem)"
  } else if (isVerifying) {
    progressWidth = "82%"
  } else if (isExecuting) {
    progressWidth = "64%"
  } else if (currentState === LIFECYCLE_STATES.ACCEPTED) {
    progressWidth = "46%"
  } else if (isFunded) {
    progressWidth = "28%"
  }

  const currentInfo = LIFECYCLE_INFO[currentState] || LIFECYCLE_INFO[LIFECYCLE_STATES.FUNDED]

  return (
    <div className="rounded-xl bg-surface-low/90 border border-outline-variant/40 p-5 shadow-lg relative overflow-hidden text-left">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
          <span className="font-display text-sm font-semibold tracking-wide text-white uppercase">
            Lifecycle Timeline
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentInfo.badgeClass}`}>
            {currentInfo.label}
          </span>
        </div>

        {/* Status context note */}
        <div className="text-xs font-mono flex items-center gap-1.5">
          {isSettled && (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
              <span>All criteria verified. Escrow settlement finalized!</span>
            </span>
          )}

          {isRefunded && (
            <span className="text-rose-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-rose-400">warning</span>
              <span>
                {isExpired ? "Pact deadline elapsed. Escrow refunded to creator." : "Verification failed. Escrow refunded."}
              </span>
            </span>
          )}

          {isVerifying && (
            <span className="text-cyan flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] animate-spin text-cyan">sync</span>
              <span>Evidence committed on-chain. Veridict engine evaluating proofs.</span>
            </span>
          )}

          {isFunded && (
            <span className="text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">lock</span>
              <span>Escrow locked on Monad. Awaiting counterparty task execution.</span>
            </span>
          )}
        </div>
      </div>

      {/* Stepper track */}
      <div className="relative w-full pt-2 pb-1">
        {/* Track Base */}
        <div className="absolute top-[21px] left-6 right-6 h-[2px] bg-surface-highest z-0"></div>

        {/* Track Progress Bar */}
        <div
          className={`absolute top-[21px] left-6 h-[2px] z-0 transition-all duration-500 ${
            isRefunded
              ? "bg-gradient-to-r from-success via-amber-500 to-rose-500"
              : "bg-gradient-to-r from-success via-tertiary to-primary"
          }`}
          style={{ width: progressWidth }}
        ></div>

        <div className="relative z-10 grid grid-cols-6 gap-1 text-center">
          {/* 1. CREATED */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">1. CREATED</span>
              <span className="font-mono text-[10px] text-outline">
                {pact?.createdAtFormatted ? "Signed" : "Drafted"}
              </span>
            </div>
          </div>

          {/* 2. FUNDED */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">2. FUNDED</span>
              <span className="font-mono text-[10px] text-outline">
                {pact?.amountFormatted ? `${pact.amountFormatted} MON` : "Monad BFT"}
              </span>
            </div>
          </div>

          {/* 3. ACCEPTED */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            {hasEvidence || isSettled ? (
              <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                <span className="material-symbols-outlined text-[15px]">check</span>
              </div>
            ) : isRefunded ? (
              <div className="w-7 h-7 rounded-full bg-surface-container border border-outline-variant/60 text-outline flex items-center justify-center text-[13px]">
                <span className="material-symbols-outlined text-[15px]">close</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface-container border border-primary text-primary flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                <span className="material-symbols-outlined text-[15px]">handshake</span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">3. ACCEPTED</span>
              <span className="font-mono text-[10px] text-outline">
                {hasEvidence || isSettled ? "Committed" : isRefunded ? "Expired" : "Pending"}
              </span>
            </div>
          </div>

          {/* 4. EXECUTING */}
          <div className="flex flex-col items-center gap-1.5 group cursor-default">
            {hasEvidence || isSettled ? (
              <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                <span className="material-symbols-outlined text-[15px]">check</span>
              </div>
            ) : isExecuting ? (
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center text-[13px] animate-pulse">
                <span className="material-symbols-outlined text-[15px]">bolt</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface-highest border border-outline-variant/60 text-outline flex items-center justify-center text-[13px]">
                <span className="material-symbols-outlined text-[15px]">terminal</span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[11px] font-semibold text-white">4. EXECUTING</span>
              <span className="font-mono text-[10px] text-outline">
                {hasEvidence || isSettled ? "Trace Recorded" : isExecuting ? "Recording..." : "Awaiting Run"}
              </span>
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
                    Veridict Active
                  </span>
                </div>
              </>
            )}

            {isSettled && (
              <>
                <div className="w-7 h-7 rounded-full bg-surface-container border border-success text-success flex items-center justify-center text-[13px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  <span className="material-symbols-outlined text-[15px]">check</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-semibold text-white">5. VERIFIED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-success/20 text-success">
                    Criteria Met
                  </span>
                </div>
              </>
            )}

            {isRefunded && (
              <>
                <div className="w-8 h-8 -mt-0.5 rounded-full bg-danger/20 border-2 border-danger text-danger flex items-center justify-center shadow-[0_0_16px_rgba(239,68,68,0.5)]">
                  <span className="material-symbols-outlined text-[17px]">priority_high</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-bold text-danger tracking-wide">5. UNVERIFIED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-danger/20 text-danger">
                    {isExpired ? "Timeout" : "Reverted"}
                  </span>
                </div>
              </>
            )}

            {!isVerifying && !isSettled && !isRefunded && (
              <>
                <div className="w-7 h-7 rounded-full bg-surface-highest border border-outline-variant/60 text-outline flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">policy</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-medium text-outline">5. VERIFYING</span>
                  <span className="font-mono text-[10px] text-outline">Pending</span>
                </div>
              </>
            )}
          </div>

          {/* 6. SETTLED / REFUNDED */}
          <div
            className={`flex flex-col items-center gap-1.5 group transition-all ${
              !isSettled && !isRefunded ? "opacity-50" : "opacity-100"
            }`}
          >
            {isSettled ? (
              <>
                <div className="w-8 h-8 -mt-0.5 rounded-full bg-success text-[#0d0e11] font-bold flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.7)]">
                  <span className="material-symbols-outlined text-[17px]">done_all</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-bold text-success">6. SETTLED</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-success/20 text-success uppercase font-semibold">
                    Disbursed
                  </span>
                </div>
              </>
            ) : isRefunded ? (
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
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-surface-highest border border-outline-variant/60 text-outline flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">lock_open</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] font-medium text-outline">6. SETTLED</span>
                  <span className="font-mono text-[10px] text-outline">Pending</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
