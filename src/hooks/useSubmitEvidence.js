import { useState } from "react"
import { useWriteContract, usePublicClient } from "wagmi"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI, isPactEscrowConfigured } from "../config/contracts"
import { formatContractError } from "./useCreatePact"

export function useSubmitEvidence() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [txHash, setTxHash] = useState(null)
  const [receipt, setReceipt] = useState(null)

  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const submit = async (pactId, evidenceHash) => {
    setIsSubmitting(true)
    setError(null)
    setTxHash(null)
    setReceipt(null)

    if (!isPactEscrowConfigured) {
      const err = new Error("PactEscrow contract address is missing.")
      setError(err)
      setIsSubmitting(false)
      throw err
    }

    try {
      const hash = await writeContractAsync({
        address: PACT_ESCROW_ADDRESS,
        abi: PACT_ESCROW_ABI,
        functionName: "submitEvidence",
        args: [BigInt(pactId), evidenceHash],
      })
      setTxHash(hash)

      if (publicClient) {
        const rcpt = await publicClient.waitForTransactionReceipt({ hash })
        setReceipt(rcpt)
        setIsSubmitting(false)
        return { hash, receipt: rcpt }
      }

      setIsSubmitting(false)
      return { hash }
    } catch (err) {
      setError(err)
      setIsSubmitting(false)
      throw err
    }
  }

  return {
    submit,
    isSubmitting,
    txHash,
    receipt,
    error,
    errorMessage: formatContractError(error),
  }
}
