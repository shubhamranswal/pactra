import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { keccak256, stringToBytes } from "viem"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI } from "../config/contracts"

/**
 * Normalizes evidence payload (text, URL, or JSON) into a deterministic string format.
 */
export function normalizeEvidence(evidence) {
  if (evidence === undefined || evidence === null) return ""
  if (typeof evidence === "string") return evidence.trim()
  if (typeof evidence === "object") {
    try {
      return JSON.stringify(evidence)
    } catch {
      return String(evidence).trim()
    }
  }
  return String(evidence).trim()
}

/**
 * Calculates Keccak-256 hash of normalized evidence string using Viem.
 */
export function calculateEvidenceHash(evidence) {
  const normalized = normalizeEvidence(evidence)
  if (!normalized) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000"
  }
  return keccak256(stringToBytes(normalized))
}

export function useSubmitEvidence() {
  const [lastEvidenceHash, setLastEvidenceHash] = useState("")

  const {
    data: hash,
    error: writeError,
    isPending: isWritePending,
    writeContractAsync,
    reset,
  } = useWriteContract()

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  const submitEvidence = async ({ pactId, rawEvidence }) => {
    if (!pactId || isNaN(Number(pactId)) || Number(pactId) <= 0) {
      throw new Error("Invalid pact ID for evidence submission.")
    }

    const normalized = normalizeEvidence(rawEvidence)
    if (!normalized) {
      throw new Error("Evidence payload cannot be empty.")
    }

    const computedHash = calculateEvidenceHash(normalized)
    setLastEvidenceHash(computedHash)

    // Store raw evidence off-chain via backend API
    try {
      await fetch("/api/submit-evidence-offchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pactId: Number(pactId), evidence: rawEvidence }),
      })
    } catch (e) {
      console.warn("Could not record off-chain evidence prior to transaction:", e)
    }

    // Submit Keccak-256 hash to PactEscrow contract on-chain
    return await writeContractAsync({
      address: PACT_ESCROW_ADDRESS,
      abi: PACT_ESCROW_ABI,
      functionName: "submitEvidence",
      args: [BigInt(pactId), computedHash],
    })
  }

  return {
    submitEvidence,
    hash,
    transactionHash: hash,
    receipt,
    evidenceHash: lastEvidenceHash,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    error: writeError || receiptError,
    reset,
  }
}
