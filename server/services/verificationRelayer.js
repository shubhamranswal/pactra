import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  stringToBytes,
  isAddress,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { monadTestnet } from "viem/chains"
import PactEscrowAbi from "../../src/abi/PactEscrow.json" with { type: "json" }

function getPublicClient() {
  const rpcUrl = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
  return createPublicClient({
    chain: monadTestnet,
    transport: http(rpcUrl),
  })
}

/**
 * Constructs a deterministic, canonical JSON string representing the verification verdict.
 */
export function buildCanonicalVerificationData({
  pactId,
  evidenceHash,
  verdict,
  confidence,
  timestamp,
}) {
  return JSON.stringify({
    confidence: typeof confidence === "number" ? Number(confidence.toFixed(4)) : 0,
    evidenceHash: String(evidenceHash || "").toLowerCase(),
    pactId: Number(pactId),
    timestamp: Number(timestamp || Math.floor(Date.now() / 1000)),
    verdict: String(verdict).toUpperCase(),
  })
}

/**
 * Computes bytes32 Keccak-256 hash of the canonical verification verdict data.
 */
export function computeVerificationHash(data) {
  const canonical = buildCanonicalVerificationData(data)
  return keccak256(stringToBytes(canonical))
}

/**
 * Relays an approved or rejected Gemini verdict to the PactEscrow contract via the authorized verifier wallet.
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. Gemini itself NEVER possesses blockchain private keys.
 * 2. VERIFIER_PRIVATE_KEY is server-side ONLY. Never expose it to React (no VITE_ prefix).
 * 3. Only triggers on-chain for APPROVED or REJECTED. NEEDS_REVIEW is NEVER relayed.
 */
export async function relayVerificationToContract({
  pactId,
  evidenceHash,
  verdict,
  confidence,
}) {
  // Guard: Only relay APPROVED or REJECTED
  if (verdict !== "APPROVED" && verdict !== "REJECTED") {
    return {
      relayed: false,
      reason: `Verdict '${verdict}' does not trigger automated on-chain resolution. Pact remains in current state for manual review.`,
    }
  }

  const verifierKey = process.env.VERIFIER_PRIVATE_KEY

  if (!verifierKey) {
    console.warn("[VerificationRelayer] VERIFIER_PRIVATE_KEY is not configured on server.")
    return {
      relayed: false,
      reason: "Server missing VERIFIER_PRIVATE_KEY. Automated on-chain resolution was not broadcast.",
    }
  }

  const contractAddress = process.env.VITE_PACT_ESCROW_ADDRESS || ""
  if (!contractAddress || !isAddress(contractAddress, { strict: false })) {
    return {
      relayed: false,
      reason: "PactEscrow contract address is missing or invalid on server.",
    }
  }

  // Format private key safely (add 0x prefix if omitted)
  const formattedKey = verifierKey.startsWith("0x") ? verifierKey : `0x${verifierKey}`
  const account = privateKeyToAccount(formattedKey)

  const rpcUrl = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(rpcUrl),
  })
  const publicClient = getPublicClient()

  // Construct canonical verification data & cryptographic hash
  const timestamp = Math.floor(Date.now() / 1000)
  const verificationHash = computeVerificationHash({
    pactId,
    evidenceHash,
    verdict,
    confidence,
    timestamp,
  })

  const isApproved = verdict === "APPROVED"

  try {
    console.log(`[VerificationRelayer] Submitting verifier attestation for Pact #${pactId}...`)
    console.log(`[VerificationRelayer] Verifier wallet: ${account.address}, Approved: ${isApproved}, Hash: ${verificationHash}`)

    // Submit transaction as authorized verifier
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: PactEscrowAbi,
      functionName: "submitVerification",
      args: [BigInt(pactId), isApproved, verificationHash],
    })

    console.log(`[VerificationRelayer] Transaction broadcast: ${txHash}. Waiting for Monad confirmation...`)

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    })

    const isSuccess = receipt.status === "success"
    console.log(`[VerificationRelayer] Transaction confirmed: block #${receipt.blockNumber}, status: ${receipt.status}`)

    return {
      relayed: true,
      transactionHash: txHash,
      verificationHash,
      blockNumber: receipt.blockNumber.toString(),
      status: receipt.status,
      isSuccess,
      verifierAddress: account.address,
    }
  } catch (err) {
    console.error("[VerificationRelayer] Relayer execution failed:", err)
    return {
      relayed: false,
      error: err.shortMessage || err.message || "Failed to broadcast verifier transaction",
      verificationHash,
    }
  }
}
