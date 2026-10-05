import { useState } from "react"
import { useSubmitEvidence, calculateEvidenceHash } from "../../hooks/useSubmitEvidence"
import { useWallet } from "../../hooks/useWallet"

export default function EvidenceVerificationCard({ pact, pactId, onVerificationComplete, isDemo = false }) {
  const [evidenceInput, setEvidenceInput] = useState("")
  const [isVerifyingAI, setIsVerifyingAI] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [uiError, setUiError] = useState("")

  const { address, isConnected } = useWallet()
  const { submitEvidence, isPending, isConfirming, isSuccess, transactionHash } = useSubmitEvidence()

  const hasSubmittedOnChain = Boolean(pact?.hasEvidence) || isSuccess

  const isRecipient = isConnected && address && pact?.recipient
    ? address.toLowerCase() === pact.recipient.toLowerCase()
    : false

  // Handle On-Chain Evidence Submission
  const handleSubmitEvidenceOnChain = async () => {
    setUiError("")
    if (!evidenceInput.trim()) {
      setUiError("Please enter proof/evidence before submitting.")
      return
    }

    try {
      await submitEvidence({
        pactId: pact?.id || pactId,
        rawEvidence: evidenceInput,
      })
    } catch (err) {
      setUiError(err.message || "Failed to submit evidence on-chain.")
    }
  }

  // Handle Gemini AI Verification Request to Backend Server
  const handleRunAiVerification = async () => {
    setUiError("")
    setIsVerifyingAI(true)
    try {
      const targetPactId = pact?.id || pactId
      const res = await fetch("/api/verify-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pactId: Number(targetPactId),
          evidence: evidenceInput || "Standard verifiable delivery proof",
          requirements: "Verification of deliverable fulfillment according to pact specifications.",
        }),
      })

      const data = await res.json()
      setVerificationResult(data)
      if (onVerificationComplete) {
        onVerificationComplete(data)
      }
    } catch (err) {
      setUiError(`AI Verification API error: ${err.message}`)
    } finally {
      setIsVerifyingAI(false)
    }
  }

  // Derive Lifecycle State
  const getLifecycleState = () => {
    if (verificationResult?.verdict === "APPROVED") {
      return {
        badgeText: "AI Verification Passed",
        tagText: "APPROVED",
        tagColor: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
        icon: "verified",
      }
    }
    if (verificationResult?.verdict === "REJECTED") {
      return {
        badgeText: "AI Verification Failed",
        tagText: "REJECTED",
        tagColor: "bg-rose-500/15 border-rose-500/40 text-rose-400",
        icon: "cancel",
      }
    }
    if (verificationResult?.verdict === "NEEDS_REVIEW") {
      return {
        badgeText: "Manual Review Required",
        tagText: "NEEDS REVIEW",
        tagColor: "bg-amber-500/15 border-amber-500/40 text-amber-300",
        icon: "help_center",
      }
    }
    if (verificationResult?.verdict === "EVIDENCE_HASH_MISMATCH") {
      return {
        badgeText: "Hash Verification Mismatch",
        tagText: "HASH MISMATCH",
        tagColor: "bg-rose-500/15 border-rose-500/40 text-rose-400",
        icon: "warning",
      }
    }
    if (hasSubmittedOnChain) {
      return {
        badgeText: "Evidence Commitment Recorded",
        tagText: "VERIFYING",
        tagColor: "bg-sky-500/15 border-sky-500/40 text-sky-400",
        icon: "schedule",
      }
    }
    return {
      badgeText: "Pending Evidence",
      tagText: "EVIDENCE MISSING",
      tagColor: "bg-surface-highest border-outline-variant text-outline",
      icon: "assignment_late",
    }
  }

  const stateInfo = getLifecycleState()

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4 text-left">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
          <h3 className="font-display text-base font-semibold text-white">
            Evidence &amp; Gemini Verification Agent
          </h3>
        </div>
        <div className={`px-2.5 py-0.5 rounded-full border font-mono text-[11px] font-semibold flex items-center gap-1.5 ${stateInfo.tagColor}`}>
          <span className="material-symbols-outlined text-[14px]">{stateInfo.icon}</span>
          <span>{stateInfo.tagText}</span>
        </div>
      </div>

      {/* Lifecycle Status Banner */}
      <div className="p-3.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between font-mono text-xs">
        <span className="text-on-surface-variant font-medium">Lifecycle Stage:</span>
        <span className="text-white font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          {stateInfo.badgeText}
        </span>
      </div>

      {/* Evidence Submission Area (If not yet submitted or for submitting updates) */}
      {!hasSubmittedOnChain ? (
        <div className="flex flex-col gap-3">
          <label className="font-sans text-xs text-on-surface-variant font-medium">
            Recipient Proof Submission (Text, URL, or JSON):
          </label>
          <textarea
            rows={3}
            value={evidenceInput}
            onChange={(e) => setEvidenceInput(e.target.value)}
            placeholder="e.g. Delivery proof: https://github.com/pactra/deliverable-1024 or JSON hash metadata"
            className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary rounded-lg p-3 font-mono text-xs text-white focus:outline-none"
          ></textarea>

          {evidenceInput.trim() && (
            <div className="font-mono text-[11px] text-outline flex items-center justify-between">
              <span>Keccak-256 Hash Preview:</span>
              <span className="text-primary truncate max-w-[200px]">{calculateEvidenceHash(evidenceInput)}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmitEvidenceOnChain}
              disabled={isPending || isConfirming}
              className="px-4 py-2.5 rounded-xl bg-primary text-white font-sans text-xs font-semibold hover:bg-primary-hover transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPending || isConfirming ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  <span>Submitting On-Chain...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Submit Evidence On-Chain</span>
                </>
              )}
            </button>
            {!isRecipient && !isDemo && (
              <span className="font-mono text-[10px] text-amber-400">
                Note: Only recipient wallet can submit on-chain.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-xs bg-surface-container/40 p-3.5 rounded-lg border border-outline-variant/30">
          <div className="flex justify-between items-center">
            <span className="text-outline">On-Chain Evidence Hash:</span>
            <span className="text-primary font-medium truncate max-w-[220px]">
              {pact?.evidenceHash || "0x..."}
            </span>
          </div>
          {transactionHash && (
            <div className="flex justify-between items-center">
              <span className="text-outline">TX Hash:</span>
              <a
                href={`https://testnet.monadexplorer.com/tx/${transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline truncate max-w-[180px]"
              >
                {transactionHash}
              </a>
            </div>
          )}
        </div>
      )}

      {/* AI Verification Trigger Button */}
      {hasSubmittedOnChain && !verificationResult && (
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRunAiVerification}
            disabled={isVerifyingAI}
            className="w-full py-3 px-4 rounded-xl bg-primary/20 border border-primary/40 hover:bg-primary/30 text-primary-light font-sans text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isVerifyingAI ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
                <span>Gemini Verifier Agent Inspecting Evidence...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">neurology</span>
                <span>Run Gemini AI Verification Assessment</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Gemini AI Verification Report Display */}
      {verificationResult && (
        <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/30">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">smart_toy</span>
              Gemini Verification Verdict
            </span>
            <span className="text-primary font-bold">
              {Math.round((verificationResult.confidence || 0) * 100)}% Confidence
            </span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant bg-surface-container p-3 rounded-lg border border-outline-variant/30 leading-relaxed">
            {verificationResult.reason}
          </p>

          {/* Individual Checks List */}
          {verificationResult.checks && verificationResult.checks.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] text-outline uppercase tracking-wider">
                Automated Verification Checks:
              </span>
              <div className="flex flex-col gap-1.5">
                {verificationResult.checks.map((chk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-container/50 border border-outline-variant/20 flex flex-col gap-1 text-left font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{chk.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${chk.passed ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {chk.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    {chk.explanation && (
                      <span className="text-[11px] text-on-surface-variant">
                        {chk.explanation}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* UI Error Message Display */}
      {uiError && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/40 text-danger font-mono text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{uiError}</span>
        </div>
      )}
    </div>
  )
}
