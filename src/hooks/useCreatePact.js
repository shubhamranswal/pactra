import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEventLogs } from "viem"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI, isPactEscrowConfigured } from "../config/contracts"

export function formatContractError(err) {
  if (!err) return null
  const message = err.shortMessage || err.message || (typeof err === "string" ? err : "")

  if (/user rejected|user denied/i.test(message)) {
    return "Transaction signature rejected in wallet."
  }
  if (/insufficient funds/i.test(message)) {
    return "Insufficient MON balance in wallet for escrow deposit + gas."
  }
  if (/ZeroEscrowAmount/i.test(message)) {
    return "Escrow amount must be greater than zero."
  }
  if (/InvalidRecipient/i.test(message)) {
    return "Invalid recipient address (cannot be zero address)."
  }
  if (/SelfRecipientNotAllowed/i.test(message)) {
    return "Self-recipient not allowed. Please enter a different recipient address."
  }
  if (/InvalidDeadline/i.test(message)) {
    return "Invalid deadline. Must be in the future and within 365 days."
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

export function useCreatePact() {
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

  let createdPactId = null
  if (receipt && receipt.status === "success" && receipt.logs) {
    try {
      const parsedLogs = parseEventLogs({
        abi: PACT_ESCROW_ABI,
        eventName: "PactCreated",
        logs: receipt.logs,
      })
      if (parsedLogs && parsedLogs.length > 0 && parsedLogs[0].args?.pactId !== undefined) {
        createdPactId = parsedLogs[0].args.pactId.toString()
      }
    } catch (parseErr) {
      console.warn("Could not extract pactId from receipt logs:", parseErr)
    }
  }

  const createPact = async ({ recipient, deadlineSeconds, valueWei }) => {
    setCustomError(null)

    if (!isPactEscrowConfigured) {
      const err = new Error("PactEscrow contract address is missing in VITE_PACT_ESCROW_ADDRESS.")
      setCustomError(err)
      throw err
    }

    try {
      return await writeContractAsync({
        address: PACT_ESCROW_ADDRESS,
        abi: PACT_ESCROW_ABI,
        functionName: "createPact",
        args: [recipient, BigInt(deadlineSeconds)],
        value: valueWei,
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
    (isReverted ? new Error("Transaction reverted on Monad Testnet.") : null)

  const reset = () => {
    setCustomError(null)
    resetWrite()
  }

  return {
    createPact,
    hash,
    transactionHash: hash,
    receipt,
    createdPactId,
    isPending: isWritePending,
    isConfirming,
    isSuccess,
    error: combinedError,
    errorMessage: formatContractError(combinedError),
    reset,
  }
}
