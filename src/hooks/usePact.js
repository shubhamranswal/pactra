import { useState } from "react"
import { useReadContract } from "wagmi"
import { formatEther } from "viem"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI, isPactEscrowConfigured } from "../config/contracts"

export const PACT_STATUS = {
  FUNDED: 0,
  SUBMITTED: 1,
  SETTLED: 2,
  REFUNDED: 3,
}

export const PACT_STATUS_INFO = {
  0: {
    code: 0,
    label: "Funded",
    description: "Escrow funds locked on-chain. Waiting for counterparty to execute task and submit cryptographic evidence.",
    badgeClass: "bg-primary-container/25 border-primary/50 text-primary",
    color: "#D2BBFF",
    icon: "lock",
    mode: "verifying",
  },
  1: {
    code: 1,
    label: "Submitted",
    description: "Evidence hash submitted on-chain by recipient. Under creator review or 3-day auto-claim window.",
    badgeClass: "bg-cyan/20 border-cyan/50 text-cyan",
    color: "#38BDF8",
    icon: "assignment_turned_in",
    mode: "verifying",
  },
  2: {
    code: 2,
    label: "Settled",
    description: "Agreement completed. Escrow disbursement confirmed and funds transferred to recipient.",
    badgeClass: "bg-emerald-500/20 border-success/60 text-emerald-300",
    color: "#10B981",
    icon: "verified",
    mode: "passed",
  },
  3: {
    code: 3,
    label: "Refunded",
    description: "Deadline passed without evidence submission. Escrow funds refunded to originator.",
    badgeClass: "bg-danger/20 border-danger/60 text-danger",
    color: "#EF4444",
    icon: "undo",
    mode: "expired",
  },
}

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000"

export function usePact(pactId) {
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000))

  let cleanId = null
  let isInvalidId = false

  if (pactId === undefined || pactId === null || pactId === "") {
    isInvalidId = true
  } else {
    const rawString = pactId.toString().trim()
    const stripped = rawString.replace(/^P-/, "").trim()
    if (/^\d+$/.test(stripped)) {
      const parsedBigInt = BigInt(stripped)
      if (parsedBigInt > 0n) {
        cleanId = parsedBigInt
      } else {
        isInvalidId = true
      }
    } else {
      isInvalidId = true
    }
  }

  const {
    data: rawPact,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: PACT_ESCROW_ADDRESS,
    abi: PACT_ESCROW_ABI,
    functionName: "getPact",
    args: cleanId !== null ? [cleanId] : undefined,
    query: {
      enabled: Boolean(isPactEscrowConfigured && cleanId !== null && !isInvalidId),
      retry: 1,
    },
  })

  // Detect not-found versus other RPC errors
  const errString = (error?.message || error?.shortMessage || "") + (error?.details || "")
  const isNotFound = Boolean(
    isError && (errString.includes("PactDoesNotExist") || errString.includes("reverted with"))
  )
  const isRpcError = Boolean(isError && !isNotFound)

  let pact = null
  if (rawPact && rawPact.id !== undefined && !isError) {
    const statusCode = Number(rawPact.status)
    const statusInfo = PACT_STATUS_INFO[statusCode] || {
      code: statusCode,
      label: "Unknown",
      description: "State unknown",
      badgeClass: "bg-white/10 border-white/20 text-white",
      color: "#FFFFFF",
      icon: "help",
      mode: "verifying",
    }

    const hasEvidence = Boolean(
      rawPact.evidenceHash &&
      rawPact.evidenceHash !== ZERO_HASH &&
      rawPact.evidenceHash.length > 2
    )

    pact = {
      id: rawPact.id.toString(),
      displayId: `P-${rawPact.id.toString()}`,
      creator: rawPact.creator,
      recipient: rawPact.recipient,
      amount: rawPact.amount,
      amountFormatted: formatEther(rawPact.amount),
      createdAt: Number(rawPact.createdAt),
      deadline: Number(rawPact.deadline),
      submittedAt: Number(rawPact.submittedAt),
      status: statusCode,
      statusInfo,
      statusLabel: statusInfo.label,
      evidenceHash: rawPact.evidenceHash,
      hasEvidence,
      createdAtFormatted: rawPact.createdAt
        ? new Date(Number(rawPact.createdAt) * 1000).toUTCString()
        : "N/A",
      deadlineFormatted: rawPact.deadline
        ? new Date(Number(rawPact.deadline) * 1000).toUTCString()
        : "N/A",
      submittedAtFormatted:
        rawPact.submittedAt && Number(rawPact.submittedAt) > 0
          ? new Date(Number(rawPact.submittedAt) * 1000).toUTCString()
          : "Pending submission",
      isExpired: rawPact.deadline && nowSeconds > 0 ? nowSeconds > Number(rawPact.deadline) : rawPact.status === 3,
      contractAddress: PACT_ESCROW_ADDRESS,
    }
  }

  return {
    pact,
    cleanId: cleanId ? cleanId.toString() : null,
    isLoading: isLoading && !isInvalidId,
    isError,
    error,
    isNotFound,
    isInvalidId,
    isRpcError,
    errorMessage: isRpcError ? (error?.shortMessage || error?.message || "RPC connection error") : "",
    refetch,
  }
}
