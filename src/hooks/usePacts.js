import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePublicClient } from "wagmi"
import { formatEther } from "viem"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI, PACT_ESCROW_V1_ABI, isPactEscrowConfigured } from "../config/contracts"
import { PACT_STATUS_INFO } from "./usePact"
import { shortenAddress } from "../utils/address"

export function usePacts() {
  const publicClient = usePublicClient()

  const {
    data: pacts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pacts-dashboard", PACT_ESCROW_ADDRESS],
    queryFn: async () => {
      if (!isPactEscrowConfigured || !publicClient) {
        return []
      }

      // 1. Read total pact count from contract
      const rawCount = await publicClient.readContract({
        address: PACT_ESCROW_ADDRESS,
        abi: PACT_ESCROW_ABI,
        functionName: "getPactCount",
      })

      const totalOnChain = Number(rawCount)

      // 2. Query recent PactCreated event logs within allowed Monad RPC block window
      let eventPactIds = []
      try {
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 90n ? currentBlock - 90n : 0n
        const logs = await publicClient.getLogs({
          address: PACT_ESCROW_ADDRESS,
          event: {
            type: "event",
            name: "PactCreated",
            inputs: [
              { name: "pactId", type: "uint256", indexed: true, internalType: "uint256" },
              { name: "creator", type: "address", indexed: true, internalType: "address" },
              { name: "recipient", type: "address", indexed: true, internalType: "address" },
              { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
              { name: "deadline", type: "uint256", indexed: false, internalType: "uint256" },
            ],
          },
          fromBlock,
          toBlock: currentBlock,
        })
        eventPactIds = logs.map((log) => Number(log.args.pactId)).filter(Boolean)
      } catch (logErr) {
        // Monad testnet RPC limits eth_getLogs to a 100 block window; fallback smoothly to getPactCount
        console.warn("PactCreated log query limited by RPC node; relying on sequential getPactCount:", logErr?.message || logErr)
      }

      if (totalOnChain === 0 && eventPactIds.length === 0) {
        return []
      }

      // Collect all sequential pact IDs 1..totalOnChain (and any discovered event IDs)
      const idSet = new Set(eventPactIds)
      for (let i = 1; i <= totalOnChain; i++) {
        idSet.add(i)
      }
      const allIds = Array.from(idSet).sort((a, b) => b - a) // newest first

      // 3. Read each pact using getPact(pactId) with V2 -> V1 fallback
      const rawPacts = await Promise.all(
        allIds.map(async (id) => {
          try {
            return await publicClient.readContract({
              address: PACT_ESCROW_ADDRESS,
              abi: PACT_ESCROW_ABI,
              functionName: "getPact",
              args: [BigInt(id)],
            })
          } catch {
            // Fallback for V1 contracts (288-byte struct)
            const fallback = await publicClient.readContract({
              address: PACT_ESCROW_ADDRESS,
              abi: PACT_ESCROW_V1_ABI,
              functionName: "getPact",
              args: [BigInt(id)],
            })
            return {
              ...fallback,
              verificationResult: 0,
              verificationHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            }
          }
        })
      )

      const nowSeconds = Math.floor(Date.now() / 1000)

      // 4. Map into existing Dashboard format
      const formatted = rawPacts.map((raw) => {
        const idStr = raw.id.toString()
        const statusCode = Number(raw.status)
        const statusInfo = PACT_STATUS_INFO[statusCode] || {
          code: statusCode,
          label: "Unknown",
          badgeClass: "bg-white/10 border-white/20 text-white",
        }

        const amountFormatted = formatEther(raw.amount)
        const deadlineSec = Number(raw.deadline)
        const createdAtSec = Number(raw.createdAt)
        const isExpired = deadlineSec > 0 && nowSeconds > deadlineSec

        const deadlineDate = deadlineSec > 0 ? new Date(deadlineSec * 1000) : null
        const oracleSpec = deadlineDate
          ? `Exp: ${deadlineDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC`
          : "Native Timelock"

        return {
          id: idStr,
          title:
            statusCode === 2
              ? "Settled Escrow"
              : statusCode === 3
              ? "Refunded Escrow"
              : statusCode === 1
              ? "Evidence Review Active"
              : "Autonomous Native Escrow",
          routingToken: `${amountFormatted} MON`,
          beneficiary: shortenAddress(raw.recipient),
          recipient: raw.recipient,
          creator: raw.creator,
          amount: `${amountFormatted} MON`,
          amountFormatted,
          amountRaw: raw.amount,
          oracleSpec,
          status: statusCode,
          statusLabel: statusInfo.label,
          statusInfo,
          createdAt: createdAtSec,
          deadline: deadlineSec,
          submittedAt: Number(raw.submittedAt),
          evidenceHash: raw.evidenceHash,
          hasEvidence: Boolean(
            raw.evidenceHash &&
            raw.evidenceHash.length > 2 &&
            !raw.evidenceHash.startsWith("0x0000000000000000")
          ),
          verificationResult: Number(raw.verificationResult || 0),
          verificationHash: raw.verificationHash,
          hasVerification: Boolean(
            raw.verificationHash &&
            raw.verificationHash.length > 2 &&
            !raw.verificationHash.startsWith("0x0000000000000000")
          ),
          isExpired,
        }
      })

      // Sort newest first deterministically by createdAt then id
      formatted.sort((a, b) => {
        if (b.createdAt !== a.createdAt) {
          return b.createdAt - a.createdAt
        }
        return Number(b.id) - Number(a.id)
      })

      return formatted
    },
    enabled: Boolean(isPactEscrowConfigured && publicClient),
    staleTime: 10_000,
  })

  // Aggregate stats from real on-chain pacts
  const stats = useMemo(() => {
    const totalPacts = pacts.length
    let activeCount = 0
    let settledCount = 0
    let totalLockedWei = 0n

    for (const p of pacts) {
      if (p.status === 0 || p.status === 1) {
        activeCount++
        totalLockedWei += p.amountRaw || 0n
      } else if (p.status === 2) {
        settledCount++
      }
    }

    const totalLockedFormatted = formatEther(totalLockedWei)
    const finalityRate = totalPacts > 0
      ? `${Math.round((settledCount / totalPacts) * 100)}%`
      : "100%"

    return {
      totalPacts,
      activeCount,
      settledCount,
      totalLockedFormatted,
      finalityRate,
    }
  }, [pacts])

  return {
    pacts,
    totalCount: pacts.length,
    isLoading,
    isError,
    error,
    refetch,
    stats,
  }
}
