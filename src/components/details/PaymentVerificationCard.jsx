import { useState } from "react"
import { isHash } from "viem"

export default function PaymentVerificationCard({
  pact,
  pactId,
  onPaymentVerified,
}) {
  const [txHashInput, setTxHashInput] = useState("")
  const [stage, setStage] = useState("READY") // READY | FETCHING_TRANSACTION | VERIFYING_ONCHAIN | AI_REVIEW | COMPLETED
  const [errorMsg, setErrorMsg] = useState("")
  const [verificationResult, setVerificationResult] = useState(null)

  const handleVerifyPayment = async () => {
    setErrorMsg("")
    setVerificationResult(null)

    const cleanHash = txHashInput.trim()
    if (!cleanHash || !isHash(cleanHash)) {
      setErrorMsg("Please enter a valid transaction hash (66 characters starting with 0x).")
      return
    }

    try {
      // Stage 1: Fetching transaction
      setStage("FETCHING_TRANSACTION")
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Stage 2: Verifying on-chain data
      setStage("VERIFYING_ONCHAIN")
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Stage 3: AI Review
      setStage("AI_REVIEW")

      const targetPactId = pact?.id || pactId
      const res = await fetch(`/api/pacts/${targetPactId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: cleanHash }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to verify transaction on Monad Testnet.")
        setStage("READY")
        if (data.gemini) {
          setVerificationResult(data)
          if (onPaymentVerified) onPaymentVerified(data)
        }
        return
      }

      setVerificationResult(data)
      setStage("COMPLETED")
      if (onPaymentVerified) {
        onPaymentVerified(data)
      }
    } catch (err) {
      setErrorMsg(`Payment verification error: ${err.message || "Network error"}`)
      setStage("READY")
    }
  }

  const getStageBadge = () => {
    if (stage === "FETCHING_TRANSACTION") {
      return {
        label: "FETCHING TRANSACTION",
        color: "bg-sky-500/15 border-sky-500/40 text-sky-400",
        spin: true,
      }
    }
    if (stage === "VERIFYING_ONCHAIN") {
      return {
        label: "VERIFYING ON-CHAIN DATA",
        color: "bg-purple-500/15 border-purple-500/40 text-purple-400",
        spin: true,
      }
    }
    if (stage === "AI_REVIEW") {
      return {
        label: "AI REVIEW",
        color: "bg-amber-500/15 border-amber-500/40 text-amber-300",
        spin: true,
      }
    }

    const verdict = verificationResult?.gemini?.verdict
    if (verdict === "APPROVED") {
      return {
        label: "APPROVED",
        color: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
        spin: false,
      }
    }
    if (verdict === "REJECTED") {
      return {
        label: "REJECTED",
        color: "bg-rose-500/15 border-rose-500/40 text-rose-400",
        spin: false,
      }
    }
    if (verdict === "NEEDS_REVIEW") {
      return {
        label: "NEEDS REVIEW",
        color: "bg-amber-500/15 border-amber-500/40 text-amber-300",
        spin: false,
      }
    }

    return {
      label: "READY",
      color: "bg-surface-highest border-outline-variant text-outline",
      spin: false,
    }
  }

  const badgeInfo = getStageBadge()

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          <h3 className="font-display text-base font-semibold text-white">
            Verify Payment Transaction
          </h3>
        </div>
        <div className={`px-2.5 py-0.5 rounded-full border font-mono text-[11px] font-semibold flex items-center gap-1.5 ${badgeInfo.color}`}>
          {badgeInfo.spin && (
            <div className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
          )}
          <span>{badgeInfo.label}</span>
        </div>
      </div>

      <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
        Paste a Monad Testnet native MON payment transaction hash to observe and compare actual on-chain transaction values against expected pact terms.
      </p>

      {/* Hash Input & Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={txHashInput}
            onChange={(e) => setTxHashInput(e.target.value)}
            placeholder="0x... (Transaction Hash)"
            className="w-full bg-surface-container border border-outline-variant/50 focus:border-primary rounded-xl px-3.5 py-2.5 font-mono text-xs text-white focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleVerifyPayment}
          disabled={stage !== "READY" && stage !== "COMPLETED"}
          className="py-2.5 px-5 rounded-xl bg-primary hover:bg-primary-hover text-white font-sans text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {badgeInfo.spin ? (
            <span>Verifying...</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">travel_explore</span>
              <span>Verify Payment</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/40 text-danger font-mono text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Results Display */}
      {verificationResult && (
        <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/30 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">Gemini AI Verdict:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${verificationResult.gemini?.verdict === "APPROVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
              {verificationResult.gemini?.verdict} ({Math.round((verificationResult.gemini?.confidence || 1) * 100)}% Confidence)
            </span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant bg-surface-container p-3 rounded-lg border border-outline-variant/30 leading-relaxed">
            {verificationResult.gemini?.reason}
          </p>

          <div className="flex justify-between items-center text-[11px] text-outline">
            <span>Canonical Evidence Hash:</span>
            <span className="text-primary truncate max-w-[220px]">{verificationResult.evidenceHash}</span>
          </div>
        </div>
      )}
    </div>
  )
}
