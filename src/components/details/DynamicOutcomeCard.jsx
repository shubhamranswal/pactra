import { shortenAddress } from "../../utils/address"

export default function DynamicOutcomeCard({ mode, invariants, pact }) {
  const isVerifying = mode === "verifying"
  const isPassed = mode === "passed"
  const isExpired = mode === "expired" || !invariants.deadline

  const amountText = pact ? `${pact.amountFormatted} MON` : "5 MON"
  const recipientAddr = pact ? shortenAddress(pact.recipient) : "0x7099...79C8"
  const creatorAddr = pact ? shortenAddress(pact.creator) : "0x8192...c09f"

  let failReasonBadge = "Recipient mismatch"
  let failExplanationText =
    `Invariant #2 violation detected: On-chain recipient does not match pact condition ${recipientAddr}. Automatic rollback executed.`
  let failTriggerText = "Trigger: Invariant Violation #2 (Recipient mismatch)"

  if (isExpired && !(!invariants.recipient && mode !== "expired")) {
    failReasonBadge = "Deadline Expired"
    failExplanationText =
      "Invariant #6 violation detected: Timelock deadline elapsed without evidence submission. Escrow funds refundable to Originator."
    failTriggerText = "Trigger: Invariant Violation #6 (Timelock expired)"
  } else if (!invariants.sender) {
    failReasonBadge = "Sender signature invalid"
    failExplanationText =
      "Invariant #1 violation detected: Originator signature failed cryptographic validation."
    failTriggerText = "Trigger: Invariant Violation #1 (Sender signature)"
  } else if (!invariants.token) {
    failReasonBadge = "Token not accepted"
    failExplanationText =
      "Invariant #3 violation detected: Asset received is not in the approved protocol asset list."
    failTriggerText = "Trigger: Invariant Violation #3 (Token whitelist)"
  } else if (!invariants.amount) {
    failReasonBadge = "Amount mismatch"
    failExplanationText =
      `Invariant #4 violation detected: Transferred amount does not meet exact ${amountText} specification.`
    failTriggerText = "Trigger: Invariant Violation #4 (Amount check)"
  } else if (!invariants.tx) {
    failReasonBadge = "Evidence proof missing"
    failExplanationText =
      "Invariant #5 violation detected: Cryptographic evidence proof hash not submitted before deadline."
    failTriggerText = "Trigger: Invariant Violation #5 (Evidence proof)"
  }

  return (
    <div className="w-full text-left">
      {/* STATE A: VERIFYING */}
      {isVerifying && (
        <div className="rounded-xl bg-surface-low border border-primary/50 p-6 shadow-[0_0_32px_-8px_rgba(124,58,237,0.3)] relative overflow-hidden transition-all flex flex-col gap-5">
          <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 bg-primary-container/20 blur-[60px] rounded-full"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-primary-container/20 border border-primary/40 text-primary">
              <span className="material-symbols-outlined text-[17px] animate-spin">autorenew</span>
              <span className="font-mono text-xs font-bold tracking-wider">
                EVALUATING INVARIANTS...
              </span>
            </div>
            <span className="font-mono text-xs text-outline">Monad Testnet</span>
          </div>

          {/* Scanning Visualizer Wave / Bars */}
          <div className="p-4 rounded-xl bg-surface-container/90 border border-outline-variant/40 flex flex-col gap-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-white font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
                Evaluating Invariants...
              </span>
              <span className="text-tertiary font-semibold">Active State</span>
            </div>

            {/* Animated Scan Progress Graphic */}
            <div className="w-full h-2 rounded-full bg-surface-highest overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-tertiary via-primary-container to-primary rounded-full animate-scan-glow w-3/4"></div>
            </div>

            <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
              Escrow funds safely locked on Monad Testnet. Counterparty agent can submit evidence hash to trigger the 3-day review period and release funds.
            </p>
          </div>

          <div className="flex items-center justify-between font-mono text-xs text-outline border-t border-outline-variant/30 pt-3">
            <span>Status: Escrow Active</span>
            <span className="text-primary font-medium">BFT Consensus Live</span>
          </div>
        </div>
      )}

      {/* STATE B: VERIFIED / SETTLED */}
      {isPassed && (
        <div className="rounded-xl bg-surface-low border border-success/50 p-6 shadow-[0_0_36px_-6px_rgba(16,185,129,0.22)] relative overflow-hidden transition-all flex flex-col gap-5">
          <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-success/15 blur-[65px] rounded-full"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-success/20 border border-success/40 text-success">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span className="font-mono text-xs font-bold tracking-wider">✓ VERIFIED &amp; SETTLED</span>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-success/15 text-success border border-success/30 uppercase">
              SETTLED
            </span>
          </div>

          {/* Settlement Telemetry Flow */}
          <div className="p-4 rounded-xl bg-surface-container/90 border border-success/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-outline">Escrow Settlement Disbursement</span>
              <span className="font-mono text-[10px] text-success font-semibold px-2 py-0.5 rounded bg-success/15 border border-success/30">
                DISBURSED
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {amountText}
              </div>
              <div className="flex items-center gap-1 font-mono text-xs text-success font-semibold">
                <span>↓ To Recipient</span>
                <span className="material-symbols-outlined text-[17px]">south</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
              <span className="text-outline">Recipient:</span>
              <span className="font-mono text-white text-right truncate">
                {pact ? pact.recipient : "0x7099...79C8"}
              </span>
            </div>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Deterministic state finalized. Invariants confirmed and escrow funds released to the recipient on Monad Testnet.
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 flex-wrap gap-2">
            <span className="font-mono text-xs text-outline">State: Pact Settled</span>
            <span className="px-3 py-1 rounded-lg bg-success/15 border border-success/30 text-success font-mono text-xs font-semibold">
              Finalized
            </span>
          </div>
        </div>
      )}

      {/* STATE C: FAILED / REFUNDED */}
      {!isVerifying && !isPassed && (
        <div className="rounded-xl bg-surface-low border border-danger/50 p-6 shadow-[0_0_36px_-6px_rgba(239,68,68,0.22)] relative overflow-hidden transition-all flex flex-col gap-5">
          <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 bg-danger/15 blur-[65px] rounded-full"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-danger/20 border border-danger/40 text-danger">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              <span className="font-mono text-xs font-bold tracking-wider">✕ REFUNDED STATE</span>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-danger/15 text-danger border border-danger/30 uppercase">
              REFUNDED
            </span>
          </div>

          {/* Revert Telemetry Flow */}
          <div className="p-4 rounded-xl bg-surface-container/90 border border-danger/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-outline">Escrow Protection Refund</span>
              <span className="font-mono text-[10px] text-danger font-semibold px-2 py-0.5 rounded bg-danger/15 border border-danger/30">
                {failReasonBadge}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {amountText}
              </div>
              <div className="flex items-center gap-1 font-mono text-xs text-danger font-semibold">
                <span>↓ REFUND → Originator</span>
                <span className="material-symbols-outlined text-[17px]">undo</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
              <span className="text-outline">Refund Receiver:</span>
              <span className="font-mono text-white text-right truncate">
                {pact ? pact.creator : `Originator (${creatorAddr})`}
              </span>
            </div>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            {failExplanationText}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 flex-wrap gap-2">
            <span className="font-mono text-xs text-outline">{failTriggerText}</span>
            <span className="px-3 py-1 rounded-lg bg-danger/15 border border-danger/30 text-danger font-mono text-xs font-semibold">
              Refund Recorded
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
