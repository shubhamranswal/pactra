import { useState, useMemo } from "react"
import { useAccount } from "wagmi"
import { hashCanonical } from "../../lib/veridict/canonical"
import { validateEvidencePackage } from "../../lib/veridict/schema"
import { useSubmitEvidence } from "../../hooks/useSubmitEvidence"
import { shortenAddress } from "../../utils/address"

/**
 * SubmitEvidenceModal Component
 *
 * Implements Task 7.5.2:
 * Modal interface allowing counterparty agents to inspect, paste, or compile
 * structured evidence packages, compute live RFC 8785 evidence hashes,
 * and submit the cryptographic commitment on-chain to Monad Testnet.
 */
export default function SubmitEvidenceModal({
  isOpen,
  onClose,
  pact,
  pactId,
  onSuccess,
}) {
  const { address } = useAccount()
  const [jsonText, setJsonText] = useState("")
  const [manualHash, setManualHash] = useState("")
  const [activeTab, setActiveTab] = useState("package") // "package" | "raw_hash"

  const {
    submitEvidence,
    isPending,
    isConfirming,
    isSuccess,
    transactionHash,
    submittedEvidenceHash,
    errorMessage,
    reset,
  } = useSubmitEvidence()

  const recipientAddress = pact?.recipient || ""
  const isConnectedRecipient = address && recipientAddress && address.toLowerCase() === recipientAddress.toLowerCase()

  // Real-time JSON parsing and canonical hashing
  const parsedData = useMemo(() => {
    if (!jsonText.trim()) {
      return { parsed: null, error: null, computedHash: null, validation: null }
    }
    try {
      const parsed = JSON.parse(jsonText)
      const computedHash = hashCanonical(parsed)
      const validation = validateEvidencePackage(parsed)
      return { parsed, error: null, computedHash, validation }
    } catch (err) {
      return { parsed: null, error: err.message, computedHash: null, validation: null }
    }
  }, [jsonText])

  const targetEvidenceHash = useMemo(() => {
    if (activeTab === "package") {
      return parsedData.computedHash
    }
    return manualHash.trim()
  }, [activeTab, parsedData.computedHash, manualHash])

  const isValidHash = targetEvidenceHash && /^0x[0-9a-fA-F]{64}$/.test(targetEvidenceHash)

  // Pre-load a sample valid Evidence Package matching this pact
  const handleLoadSample = () => {
    const sample = {
      pactId: String(pactId || pact?.id || "1"),
      pactTermsHash: "0x" + "a".repeat(64),
      executor: recipientAddress || (address || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
      timestamp: Math.floor(Date.now() / 1000),
      items: [
        {
          criterionId: 1,
          type: "TYPE_A_API_COUNT",
          data: {
            targetEndpoint: "https://api.pactra.network/v1/feed",
            callCount: 2,
            requiredCount: 2,
          },
        },
        {
          criterionId: 2,
          type: "TYPE_B_TX_VERIFY",
          data: {
            txHash: "0x" + "b".repeat(64),
            from: recipientAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            to: pact?.creator || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            value: "1000000000000000000",
            status: "success",
            chainId: 10143,
          },
        },
      ],
    }
    setJsonText(JSON.stringify(sample, null, 2))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidHash) return

    try {
      await submitEvidence({
        pactId: pactId || pact?.id,
        evidenceHash: targetEvidenceHash,
      })
    } catch {
      // Error handled by hook
    }
  }

  const handleFinish = () => {
    reset()
    if (onSuccess) onSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="w-full max-w-2xl bg-surface rounded-2xl border border-outline-variant/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/40 bg-surface-low">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-container/20 border border-primary/40 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">fingerprint</span>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                Commit Cryptographic Evidence
                <span className="font-mono text-xs text-primary px-2 py-0.5 rounded-full bg-primary-container/25">
                  #{pactId || pact?.id}
                </span>
              </h2>
              <p className="text-xs font-sans text-on-surface-variant">
                Commit off-chain verifiable proof hash to Monad Testnet escrow contract
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-white hover:bg-surface-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Recipient Status Banner */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              isConnectedRecipient
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {isConnectedRecipient ? "verified_user" : "info"}
              </span>
              <span>
                Required Submitter: <strong className="font-mono">{shortenAddress(recipientAddress)}</strong>
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface/50 border border-current">
              {isConnectedRecipient ? "Wallet Match" : "Non-Recipient Connected"}
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 p-1 bg-surface-low rounded-xl border border-outline-variant/30 text-xs font-mono">
            <button
              onClick={() => setActiveTab("package")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === "package"
                  ? "bg-primary-container text-white shadow-sm"
                  : "text-outline hover:text-white"
              }`}
            >
              Evidence Package JSON
            </button>
            <button
              onClick={() => setActiveTab("raw_hash")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === "raw_hash"
                  ? "bg-primary-container text-white shadow-sm"
                  : "text-outline hover:text-white"
              }`}
            >
              Direct Hash (0x...)
            </button>
          </div>

          {/* Mode 1: Package JSON */}
          {activeTab === "package" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-outline">Package JSON Payload:</span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">auto_fix_high</span>
                  Load Sample Manifest
                </button>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{\n  "pactId": "1",\n  "pactTermsHash": "0x...",\n  "executor": "0x...",\n  "timestamp": 1791112500,\n  "items": [...]\n}'
                rows={9}
                className="w-full bg-surface-container font-mono text-xs text-white p-3 rounded-xl border border-outline-variant/50 focus:border-primary focus:outline-none resize-none"
              />

              {/* JSON Parse / Validation Feedback */}
              {parsedData.error && (
                <div className="text-xs font-mono text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  Syntax Error: {parsedData.error}
                </div>
              )}

              {parsedData.validation && !parsedData.validation.valid && (
                <div className="text-xs font-mono text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Schema Notice: {parsedData.validation.errors.join("; ")}
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Direct Hash */
            <div className="space-y-2">
              <label className="text-xs font-mono text-outline block">
                Evidence Hash (32-byte Keccak-256):
              </label>
              <input
                type="text"
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                placeholder="0x1234...64-hex-characters"
                className="w-full bg-surface-container font-mono text-xs text-white p-3 rounded-xl border border-outline-variant/50 focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {/* Computed Evidence Hash Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-outline">RFC 8785 Evidence Hash:</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  isValidHash
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-surface-highest text-outline"
                }`}
              >
                {isValidHash ? "Valid bytes32" : "Awaiting Input"}
              </span>
            </div>
            <div className="font-mono text-xs text-primary break-all bg-surface-low p-2 rounded border border-outline-variant/30">
              {targetEvidenceHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-rose-300 text-xs font-mono flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-danger shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Panel */}
          {isSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-display text-sm font-semibold">
                <span className="material-symbols-outlined text-emerald-400">verified</span>
                Evidence Hash Committed On-Chain!
              </div>
              <p className="text-xs text-emerald-200/80">
                Pact status transitioned to <strong className="text-white">Submitted</strong>.
                Veridict verification engine and creator review window are now active.
              </p>
              {transactionHash && (
                <div className="text-[11px] font-mono text-white/90 break-all bg-emerald-950/40 p-2 rounded">
                  Tx: {transactionHash}
                </div>
              )}
              {submittedEvidenceHash && (
                <div className="text-[11px] font-mono text-white/90 break-all bg-emerald-950/40 p-2 rounded">
                  Hash: {submittedEvidenceHash}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-outline-variant/40 bg-surface-low flex items-center justify-end gap-3">
          {isSuccess ? (
            <button
              onClick={handleFinish}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Done & Refresh Details
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending || isConfirming}
                className="px-4 py-2 rounded-xl text-outline hover:text-white text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidHash || isPending || isConfirming}
                className="px-5 py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary-container/80 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {(isPending || isConfirming) && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                )}
                <span>
                  {isPending
                    ? "Sign in Wallet..."
                    : isConfirming
                      ? "Confirming on Monad..."
                      : "Commit Evidence On-Chain"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
