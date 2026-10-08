import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEventLogs } from "viem"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI, isPactEscrowConfigured } from "../config/contracts.js"

const BYTES32_REGEX = /^0x[0-9a-fA-F]{64}$/
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"

export function formatContractError(err) {
  if (!err) return null
  const message = err.shortMessage || err.message || (typeof err === "string" ? err : "")

  if (/user rejected|user denied/i.test(message)) {
    return "Transaction signature rejected in wallet."
  }
  if (/UnauthorizedRecipient/i.test(message)) {
    return "Unauthorized: Only the designated counterparty recipient can submit evidence for this pact."
  }
  if (/ZeroEvidenceHash/i.test(message)) {
    return "Invalid evidence hash: Cannot submit a zero hash (0x0)."
  }
  if (/InvalidPactState/i.test(message)) {
    return "Invalid pact state: Evidence can only be submitted for a Funded pact."
  }
  if (/DeadlinePassed/i.test(message)) {
    return "Pact deadline has passed. Evidence submission window is closed."
  }
  if (/PactDoesNotExist/i.test(message)) {
    return "Pact does not exist on-chain."
  }
  if (/ReentrancyGuardReentrant/i.test(message)) {
    return "Reentrancy guard triggered."
  }
  if (/connector not connected/i.test(message)) {
    return "Wallet is not connected."
  }
  if (/chain mismatch/i.test(message)) {
    return "Please switch network to Monad Testnet."
  }
  if (err.details) {
    return err.details
  }
  return message.split("\n")[0].substring(0, 180)
}

/**
 * React hook to submit cryptographic evidence hash on-chain to Monad Testnet.
 *
 * Implements Task 7.5.1 / P7-FR-007
 */
export function useSubmitEvidence() {
  const [customError, setCustomError] = useState(null)

  const {
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContractAsync,
    reset: resetWrite,
  } = useWriteContract()

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isReceiptSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  const isReverted = receipt?.status === "reverted"
  const isSuccess = isReceiptSuccess && receipt?.status === "success"

  let submittedEvidenceHash = null
  let eventPactId = null

  if (receipt && receipt.status === "success" && receipt.logs) {
    try {
      const parsedLogs = parseEventLogs({
        abi: PACT_ESCROW_ABI,
        eventName: "EvidenceSubmitted",
        logs: receipt.logs,
      })
      if (parsedLogs && parsedLogs.length > 0) {
        submittedEvidenceHash = parsedLogs[0].args?.evidenceHash || null
        if (parsedLogs[0].args?.pactId !== undefined) {
          eventPactId = parsedLogs[0].args.pactId.toString()
        }
      }
    } catch (parseErr) {
      console.warn("Could not extract EvidenceSubmitted from receipt logs:", parseErr)
    }
  }

  const submitEvidence = async ({ pactId, evidenceHash }) => {
    setCustomError(null)

    if (!isPactEscrowConfigured) {
      const err = new Error("PactEscrow contract address is missing in VITE_PACT_ESCROW_ADDRESS.")
      setCustomError(err)
      throw err
    }

    if (pactId === undefined || pactId === null || pactId === "") {
      const err = new Error("pactId is required for evidence submission.")
      setCustomError(err)
      throw err
    }

    let parsedPactId
    try {
      parsedPactId = BigInt(pactId.toString().trim())
      if (parsedPactId <= 0n) {
        throw new Error("Pact ID must be a positive integer.")
      }
    } catch {
      const err = new Error(`Invalid pactId '${pactId}': must be a positive integer.`)
      setCustomError(err)
      throw err
    }

    if (!evidenceHash || typeof evidenceHash !== "string" || !BYTES32_REGEX.test(evidenceHash)) {
      const err = new Error(
        `Invalid evidenceHash '${evidenceHash}': must be a 66-character hex string starting with '0x'.`
      )
      setCustomError(err)
      throw err
    }

    if (evidenceHash.toLowerCase() === ZERO_BYTES32) {
      const err = new Error("Evidence hash cannot be the zero hash.")
      setCustomError(err)
      throw err
    }

    try {
      return await writeContractAsync({
        address: PACT_ESCROW_ADDRESS,
        abi: PACT_ESCROW_ABI,
        functionName: "submitEvidence",
        args: [parsedPactId, evidenceHash],
      })
    } catch (err) {
      setCustomError(err)
      throw err
    }
  }

  const combinedError =
    customError ||
    writeError ||
    receiptError ||
    (isReverted ? new Error("Evidence submission reverted on Monad Testnet.") : null)

  const reset = () => {
    setCustomError(null)
    resetWrite()
  }

  return {
    submitEvidence,
    hash,
    transactionHash: hash,
    receipt,
    submittedEvidenceHash,
    eventPactId,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    error: combinedError,
    errorMessage: formatContractError(combinedError),
    reset,
  }
}
