import { useState, useCallback } from "react"
import { useWriteContract, usePublicClient } from "wagmi"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI } from "../config/contracts"
import { orchestrateEvidenceAndSettlement } from "../lib/orchestrator"
import { useWallet } from "./useWallet"

export const SETTLEMENT_STATES = {
  IDLE: "IDLE",
  VERIFYING: "VERIFYING",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  SUBMITTING_EVIDENCE: "SUBMITTING_EVIDENCE",
  EVIDENCE_SUBMITTED: "EVIDENCE_SUBMITTED",
  SETTLING: "SETTLING",
  SETTLED: "SETTLED",
  ERROR: "ERROR",
}

export function formatSettlementError(err) {
  if (!err) return null
  const message = err.shortMessage || err.message || (typeof err === "string" ? err : "")

  if (/user rejected|user denied/i.test(message)) {
    return "Transaction signature rejected in wallet."
  }
  if (/UnauthorizedSettler/i.test(message)) {
    return "Unauthorized settler: Only the pact creator wallet is authorized to call settlePact on-chain."
  }
  if (/UnauthorizedRecipient/i.test(message)) {
    return "Unauthorized recipient: Only the designated pact recipient can submit evidence."
  }
  if (/DeadlinePassed/i.test(message)) {
    return "Pact deadline has passed. Evidence can no longer be accepted."
  }
  if (/InvalidPactState/i.test(message)) {
    return "Invalid pact state on-chain for this operation."
  }
  if (/EvidenceNotSubmitted/i.test(message)) {
    return "Evidence must be submitted on-chain before the pact can be settled."
  }
  if (/PactAlreadySettled/i.test(message)) {
    return "Pact has already been settled on-chain."
  }
  if (/PactAlreadyRefunded/i.test(message)) {
    return "Pact has already been refunded to originator."
  }
  if (err.details) {
    return err.details
  }
  return message.split("\n")[0].substring(0, 180)
}

/**
 * Orchestrates Phase 7 Option B:
 * Deterministic Veridict verification -> Canonical evidence hash ->
 * on-chain submitEvidence -> on-chain settlePact (subject to contract authorization).
 */
export function useEvidenceAndSettlement({
  pact,
  evidencePackage,
  terms,
  onSuccess,
  onError,
  // Testing injections
  writeContractAsync: injectedWriteContractAsync,
  publicClient: injectedPublicClient,
  connectedAddress: injectedConnectedAddress,
} = {}) {
  const [state, setState] = useState(SETTLEMENT_STATES.IDLE)
  const [verdict, setVerdict] = useState(null)
  const [veridictResult, setVeridictResult] = useState(null)
  const [evidenceHash, setEvidenceHash] = useState(null)
  const [evidenceTxHash, setEvidenceTxHash] = useState(null)
  const [settlementTxHash, setSettlementTxHash] = useState(null)
  const [error, setError] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")

  const { address: walletAddress } = useWallet()
  const connectedAddress = injectedConnectedAddress || walletAddress

  const defaultPublicClient = usePublicClient()
  const publicClient = injectedPublicClient || defaultPublicClient

  const { writeContractAsync: defaultWriteContractAsync } = useWriteContract()
  const writeContractAsync = injectedWriteContractAsync || defaultWriteContractAsync

  const isVerifying = state === SETTLEMENT_STATES.VERIFYING
  const isSubmittingEvidence = state === SETTLEMENT_STATES.SUBMITTING_EVIDENCE
  const isSettling = state === SETTLEMENT_STATES.SETTLING
  const isComplete = state === SETTLEMENT_STATES.SETTLED

  // Check if connected address is authorized creator to settle pact
  const isAuthorizedSettler = Boolean(
    pact?.creator && connectedAddress && pact.creator.toLowerCase() === connectedAddress.toLowerCase()
  )

  /**
   * Safe settlement invocation.
   * Can be used automatically when authorized, or triggered as a retry/creator action.
   */
  const executeSettlement = useCallback(
    async (pactId) => {
      // Idempotency check: if already settled on-chain, skip
      if (pact?.status === 2) {
        setState(SETTLEMENT_STATES.SETTLED)
        setStatusMessage("Pact is already settled on-chain.")
        return null
      }

      setState(SETTLEMENT_STATES.SETTLING)
      setStatusMessage("Releasing payment...")

      try {
        const hash = await writeContractAsync({
          address: PACT_ESCROW_ADDRESS,
          abi: PACT_ESCROW_ABI,
          functionName: "settlePact",
          args: [BigInt(pactId)],
        })
        setSettlementTxHash(hash)

        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash })
          if (receipt.status !== "success" && receipt.status !== 1 && receipt.status !== 1n) {
            throw new Error("Payment release did not complete.")
          }
        }

        setState(SETTLEMENT_STATES.SETTLED)
        setStatusMessage("Payment Released")
        if (onSuccess) onSuccess({ settlementTxHash: hash })
        return hash
      } catch (err) {
        setError(err)
        setState(SETTLEMENT_STATES.ERROR)
        setStatusMessage("Payment release did not complete. Your evidence has already been submitted.")
        if (onError) onError(err)
        throw err
      }
    },
    [pact?.status, writeContractAsync, publicClient, onSuccess, onError]
  )

  /**
   * Primary runner for Option B flow.
   */
  const run = useCallback(
    async (options = {}) => {
      const activePackage = options.evidencePackage || evidencePackage
      const activeTerms = options.terms || terms
      const activePact = options.pact || pact
      const forceSettle = options.forceSettle || false

      // Prevent concurrent invocations
      if (
        state === SETTLEMENT_STATES.VERIFYING ||
        state === SETTLEMENT_STATES.SUBMITTING_EVIDENCE ||
        state === SETTLEMENT_STATES.SETTLING
      ) {
        return
      }

      setError(null)
      setStatusMessage("")

      const pactId = activePact?.id || activeTerms?.pactId || activePackage?.pactId
      if (!pactId) {
        const err = new Error("Missing pactId for evidence verification")
        setError(err)
        setState(SETTLEMENT_STATES.ERROR)
        if (onError) onError(err)
        return
      }

      // Check if pact already Settled
      if (activePact?.status === 2) {
        setState(SETTLEMENT_STATES.SETTLED)
        setStatusMessage("Pact is already settled on-chain.")
        return
      }

      try {
        const res = await orchestrateEvidenceAndSettlement({
          pact: activePact,
          evidencePackage: activePackage,
          terms: activeTerms,
          publicClient,
          writeContractAsync,
          isAuthorizedSettler,
          forceSettle,
          onStateChange: (update) => {
            if (update.state) setState(update.state)
            if (update.verdict !== undefined) setVerdict(update.verdict)
            if (update.veridictResult !== undefined) setVeridictResult(update.veridictResult)
            if (update.evidenceHash !== undefined) setEvidenceHash(update.evidenceHash)
            if (update.evidenceTxHash !== undefined) setEvidenceTxHash(update.evidenceTxHash)
            if (update.settlementTxHash !== undefined) setSettlementTxHash(update.settlementTxHash)
            if (update.statusMessage !== undefined) setStatusMessage(update.statusMessage)
            if (update.error !== undefined) setError(update.error)
          },
        })

        if (res?.settled && onSuccess) {
          onSuccess({ settlementTxHash: res.settlementTxHash })
        }
      } catch (err) {
        setError(err)
        if (onError) onError(err)
      }
    },
    [
      state,
      evidencePackage,
      terms,
      pact,
      publicClient,
      writeContractAsync,
      isAuthorizedSettler,
      onSuccess,
      onError,
    ]
  )

  const retrySettlement = useCallback(async () => {
    const pactId = pact?.id || terms?.pactId
    if (!pactId) return
    return executeSettlement(pactId)
  }, [pact?.id, terms?.pactId, executeSettlement])

  const reset = useCallback(() => {
    setState(SETTLEMENT_STATES.IDLE)
    setVerdict(null)
    setVeridictResult(null)
    setEvidenceHash(null)
    setEvidenceTxHash(null)
    setSettlementTxHash(null)
    setError(null)
    setStatusMessage("")
  }, [])

  return {
    run,
    executeSettlement,
    retrySettlement,
    reset,
    state,
    isVerifying,
    isSubmittingEvidence,
    isSettling,
    isComplete,
    verdict,
    veridictResult,
    evidenceHash,
    evidenceTxHash,
    settlementTxHash,
    error,
    errorMessage: formatSettlementError(error),
    statusMessage,
    isAuthorizedSettler,
  }
}
