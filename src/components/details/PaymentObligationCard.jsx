import { useState } from "react"
import { shortenAddress } from "../../utils/address"

export default function PaymentObligationCard({ pact, pactId, isDemo = false }) {
  const [copiedRecipient, setCopiedRecipient] = useState(false)
  const [copiedCreator, setCopiedCreator] = useState(false)
  const [copiedEvidence, setCopiedEvidence] = useState(false)

  // Real contract data (fallback strictly isolated to explicit demo simulation mode)
  const creatorAddr = pact?.creator || (isDemo ? "0x8192A4789Bc09F32dE09B18a478cbed5efcaE784" : "")
  const recipientAddr = pact?.recipient || (isDemo ? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" : "")
  const amountDisplay = pact ? `${pact.amountFormatted} MON` : (isDemo ? "5 MON" : "—")
  const deadlineDisplay = pact?.deadlineFormatted || (isDemo ? "18:00 UTC" : "—")
  const createdAtDisplay = pact?.createdAtFormatted || (isDemo ? "At Genesis" : "—")
  const submittedAtDisplay = pact?.submittedAtFormatted || null
  const evidenceHash = pact?.evidenceHash || ""
  const hasEvidence = pact?.hasEvidence

  const handleCopyRecipient = () => {
    if (!recipientAddr) return
    navigator.clipboard.writeText(recipientAddr)
    setCopiedRecipient(true)
    setTimeout(() => setCopiedRecipient(false), 2000)
  }

  const handleCopyCreator = () => {
    if (!creatorAddr) return
    navigator.clipboard.writeText(creatorAddr)
    setCopiedCreator(true)
    setTimeout(() => setCopiedCreator(false), 2000)
  }

  const handleCopyEvidence = () => {
    if (!evidenceHash) return
    navigator.clipboard.writeText(evidenceHash)
    setCopiedEvidence(true)
    setTimeout(() => setCopiedEvidence(false), 2000)
  }

  const [copiedVerification, setCopiedVerification] = useState(false)

  // Derive Payment Card Status (PART 10 UI STATES)
  const getPaymentState = () => {
    if (pact?.status === 2 || pact?.verificationResult === 1) {
      return {
        label: "SETTLED",
        badgeClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
        icon: "check_circle",
      }
    }
    if (pact?.status === 3 || pact?.verificationResult === 2) {
      return {
        label: "REFUNDED",
        badgeClass: "bg-rose-500/15 border-rose-500/40 text-rose-400",
        icon: "undo",
      }
    }
    if (pact?.isExpired && pact?.status === 0) {
      return {
        label: "REFUNDABLE",
        badgeClass: "bg-amber-500/15 border-amber-500/40 text-amber-300",
        icon: "warning",
      }
    }
    if (pact?.status === 1) {
      return {
        label: "SETTLING",
        badgeClass: "bg-sky-500/15 border-sky-500/40 text-sky-400",
        icon: "hourglass_top",
      }
    }
    return {
      label: "ESCROWED",
      badgeClass: "bg-primary/20 border-primary/40 text-primary-light",
      icon: "lock",
    }
  }

  const paymentState = getPaymentState()

  const handleCopyVerification = () => {
    if (!pact?.verificationHash) return
    navigator.clipboard.writeText(pact.verificationHash)
    setCopiedVerification(true)
    setTimeout(() => setCopiedVerification(false), 2000)
  }

  const numericPactId = pact?.id || (pactId ? String(pactId).replace(/^[#P-]+/, "") : "")

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden text-left">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(168,85,247,0.7)]"></div>
          <h3 className="font-display text-base font-semibold text-white">Payment Obligation</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${paymentState.badgeClass}`}>
            <span className="material-symbols-outlined text-[12px]">{paymentState.icon}</span>
            <span>{paymentState.label}</span>
          </span>
          {isDemo && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-semibold">
              DEMO DATA
            </span>
          )}
          {numericPactId && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-outline px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40">
              Pact #{numericPactId}
            </span>
          )}
        </div>
      </div>

      {/* Key Obligation Metrics List */}
      <div className="flex flex-col gap-3 font-sans text-sm">
        {/* FROM (Creator) */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-outline">From Originator</div>
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>{pact ? "Pact Creator" : (isDemo ? "PaymentAgent-B" : "Originator")}</span>
                <span className="text-xs font-mono text-outline-variant">
                  {pact ? "(On-Chain)" : "(AI Agent)"}
                </span>
              </div>
            </div>
          </div>
          {creatorAddr && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-on-surface-variant bg-surface-high px-2 py-1 rounded">
              <span>{shortenAddress(creatorAddr)}</span>
              <button
                onClick={handleCopyCreator}
                className="text-outline hover:text-white transition-colors cursor-pointer"
                title="Copy Creator Address"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {copiedCreator ? "check" : "content_copy"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* AMOUNT & TOKEN */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-outline">Escrow Deposit Amount</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-2xl font-bold text-white tracking-tight">
                {amountDisplay}
              </span>
              <span className="font-mono text-xs text-tertiary font-medium">Native Token</span>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-1 rounded text-xs font-mono font-semibold bg-tertiary/10 border border-tertiary/30 text-tertiary">
              MONAD NATIVE
            </span>
          </div>
        </div>

        {/* RECIPIENT */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-outline">Designated Recipient</span>
            <span className="text-[10px] font-mono text-primary font-medium uppercase">
              {pact ? "On-Chain Counterparty" : "Expected Address"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-surface-high/80 px-2.5 py-1.5 rounded border border-outline-variant/40">
            <span className="font-mono text-xs text-white truncate font-medium">
              {recipientAddr || "Not specified"}
            </span>
            {recipientAddr && (
              <button
                onClick={handleCopyRecipient}
                className="text-outline hover:text-white transition-colors cursor-pointer shrink-0"
                title="Copy Address"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copiedRecipient ? "check" : "content_copy"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* DEADLINE & CREATED TIMESTAMP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Creation Timestamp */}
          <div className="p-3 rounded-lg bg-surface-container/60 border border-primary/30 flex flex-col justify-between relative overflow-hidden">
            <div className="pointer-events-none absolute -right-4 -bottom-4 w-14 h-14 bg-primary-container/20 rounded-full blur-xl"></div>
            <span className="text-[11px] font-mono uppercase text-primary font-medium">
              Created Timestamp
            </span>
            <div className="mt-1">
              <span className="font-mono text-xs sm:text-sm font-bold text-primary block truncate" title={createdAtDisplay}>
                {createdAtDisplay}
              </span>
              <div className="mt-1 text-[10px] font-sans text-on-surface-variant">
                Block State Recorded
              </div>
            </div>
          </div>

          {/* Expiration Deadline */}
          <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-outline">Expiration Deadline</span>
            <div className="mt-1">
              <span className="font-mono text-xs sm:text-sm font-bold text-white block truncate" title={deadlineDisplay}>
                {deadlineDisplay}
              </span>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-tertiary">
                <span className="material-symbols-outlined text-[13px]">alarm</span>
                <span>{pact?.isExpired ? "Deadline Expired" : "Timelock Active"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SUBMISSION TIMESTAMP & EVIDENCE (If available) */}
        {(submittedAtDisplay || hasEvidence) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {submittedAtDisplay && (
              <div className="p-3 rounded-lg bg-surface-container/60 border border-cyan/30 flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase text-cyan font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">event_available</span>
                  Submitted Timestamp
                </span>
                <div className="mt-1">
                  <span className="font-mono text-xs font-bold text-cyan block truncate" title={submittedAtDisplay}>
                    {submittedAtDisplay}
                  </span>
                  <div className="mt-1 text-[10px] font-mono text-outline">
                    Evidence Delivered
                  </div>
                </div>
              </div>
            )}

            {hasEvidence && (
              <div className={`p-3 rounded-lg bg-surface-container/60 border border-cyan/30 flex flex-col gap-1.5 ${!submittedAtDisplay ? "sm:col-span-2" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-cyan font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                    Evidence Hash
                  </span>
                  <span className="text-[10px] font-mono text-cyan bg-cyan/10 px-1.5 py-0.5 rounded border border-cyan/20">
                    RECORDED
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-surface-high/80 px-2.5 py-1.5 rounded border border-outline-variant/40 mt-1">
                  <span className="font-mono text-xs text-white truncate" title={evidenceHash}>
                    {evidenceHash}
                  </span>
                  <button
                    onClick={handleCopyEvidence}
                    className="text-outline hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Copy Evidence Hash"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedEvidence ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ON-CHAIN VERIFICATION ATTESTATION HASH (If verified) */}
        {pact?.hasVerification && (
          <div className="p-3 rounded-lg bg-surface-container/60 border border-primary/40 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-primary-light font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                On-Chain Verifier Attestation Hash
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                pact.verificationResult === 1
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-400"
              }`}>
                {pact.verificationResultLabel?.toUpperCase() || "ATTESTED"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-surface-high/80 px-2.5 py-1.5 rounded border border-outline-variant/40 mt-1">
              <span className="font-mono text-xs text-primary truncate" title={pact.verificationHash}>
                {pact.verificationHash}
              </span>
              <button
                onClick={handleCopyVerification}
                className="text-outline hover:text-white transition-colors cursor-pointer shrink-0"
                title="Copy Verification Hash"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copiedVerification ? "check" : "content_copy"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
