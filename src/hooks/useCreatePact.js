import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEventLogs } from "viem"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI } from "../config/contracts"

export function useCreatePact() {
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
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  let createdPactId = null
  if (receipt && receipt.logs) {
    try {
      const parsedLogs = parseEventLogs({
        abi: PACT_ESCROW_ABI,
        eventName: "PactCreated",
        logs: receipt.logs,
      })
      if (parsedLogs && parsedLogs.length > 0 && parsedLogs[0].args && parsedLogs[0].args.pactId !== undefined) {
        createdPactId = parsedLogs[0].args.pactId.toString()
      }
    } catch {
      // Event log parsing fallback if log structure varies
    }
  }

  const createPact = async ({ recipient, deadlineSeconds, valueWei }) => {
    return await writeContractAsync({
      address: PACT_ESCROW_ADDRESS,
      abi: PACT_ESCROW_ABI,
      functionName: "createPact",
      args: [recipient, BigInt(deadlineSeconds)],
      value: valueWei,
    })
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
    error: writeError || receiptError,
    reset: resetWrite,
  }
}
