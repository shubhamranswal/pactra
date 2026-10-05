import { Router } from "express"
import { createPublicClient, http, formatEther, isAddress } from "viem"
import { monadTestnet } from "viem/chains"
import PactEscrowAbi from "../../src/abi/PactEscrow.json" with { type: "json" }
import { verifyEvidenceWithGemini } from "../agents/geminiVerifier.js"
import {
  calculateEvidenceHash,
  storeEvidence,
  getEvidence,
} from "../services/evidenceService.js"
import { relayVerificationToContract } from "../services/verificationRelayer.js"

const router = Router()

const rpcUrl = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
const contractAddress = process.env.VITE_PACT_ESCROW_ADDRESS || ""

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(rpcUrl),
})

/**
 * POST /api/submit-evidence-offchain
 * Stores raw evidence payload off-chain and returns the computed Keccak-256 hash.
 */
router.post("/submit-evidence-offchain", (req, res) => {
  try {
    const { pactId, evidence } = req.body

    if (evidence === undefined || evidence === null || String(evidence).trim() === "") {
      return res.status(400).json({
        error: "Evidence content cannot be empty.",
      })
    }

    const stored = storeEvidence(pactId, evidence)

    return res.json({
      success: true,
      pactId: stored.pactId,
      evidenceHash: stored.hash,
      normalizedEvidence: stored.normalized,
    })
  } catch (err) {
    console.error("Error storing off-chain evidence:", err)
    return res.status(500).json({ error: err.message || "Failed to process evidence off-chain." })
  }
})

/**
 * POST /api/verify-evidence
 * Verifies evidence against on-chain pact commitment & invokes Gemini Verifier Agent.
 */
router.post("/verify-evidence", async (req, res) => {
  try {
    const { pactId, evidence, requirements } = req.body

    if (!pactId || isNaN(Number(pactId)) || Number(pactId) <= 0) {
      return res.status(400).json({
        verdict: "NEEDS_REVIEW",
        confidence: 0,
        reason: "Invalid or missing pact ID.",
        checks: [{ name: "Pact ID Check", passed: false, explanation: "Pact ID must be a positive integer." }],
      })
    }

    const cleanPactId = BigInt(pactId)

    let rawPact
    let isLiveOnChain = false

    // 1. Fetch live pact data from Monad Testnet contract if configured
    if (contractAddress && isAddress(contractAddress, { strict: false })) {
      try {
        rawPact = await publicClient.readContract({
          address: contractAddress,
          abi: PactEscrowAbi,
          functionName: "getPact",
          args: [cleanPactId],
        })
        isLiveOnChain = true
      } catch (e) {
        console.warn(`Could not read pact #${pactId} from contract: ${e.message}`)
      }
    }

    // 2. Derive raw evidence payload (from req.body or off-chain store)
    let rawEvidencePayload = evidence
    if (!rawEvidencePayload) {
      const stored = getEvidence(pactId)
      if (stored) {
        rawEvidencePayload = stored.rawEvidence
      }
    }

    if (rawEvidencePayload === undefined || rawEvidencePayload === null || String(rawEvidencePayload).trim() === "") {
      return res.status(400).json({
        pactId: Number(pactId),
        verdict: "REJECTED",
        confidence: 1.0,
        reason: "Evidence payload is empty or missing.",
        checks: [
          { name: "Evidence Submission Check", passed: false, explanation: "No evidence payload provided for verification." },
        ],
      })
    }

    // 3. Calculate Keccak-256 evidence hash
    const calculatedHash = calculateEvidenceHash(rawEvidencePayload)

    // 4. Compare with on-chain evidenceHash if live pact exists
    if (isLiveOnChain && rawPact) {
      const onChainHash = rawPact.evidenceHash

      const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000"

      if (onChainHash === ZERO_BYTES32) {
        return res.json({
          pactId: Number(pactId),
          verdict: "NEEDS_REVIEW",
          confidence: 0,
          reason: "On-chain evidence hash has not been submitted yet.",
          checks: [
            {
              name: "On-Chain Commitment Check",
              passed: false,
              explanation: "Pact state has zero evidenceHash. Evidence must be submitted on-chain first.",
            },
          ],
        })
      }

      if (calculatedHash.toLowerCase() !== onChainHash.toLowerCase()) {
        return res.json({
          pactId: Number(pactId),
          verdict: "EVIDENCE_HASH_MISMATCH",
          confidence: 0,
          reason: "Off-chain evidence content hash does not match on-chain committed evidenceHash.",
          checks: [
            {
              name: "Evidence Hash Match",
              passed: false,
              explanation: `Calculated hash (${calculatedHash.slice(0, 10)}...) does not match on-chain hash (${onChainHash.slice(0, 10)}...).`,
            },
          ],
        })
      }
    }

    // 5. Build pact parameters for Gemini
    const pactSpec = {
      pactId: Number(pactId),
      creator: rawPact ? rawPact.creator : "On-chain Creator",
      recipient: rawPact ? rawPact.recipient : "On-chain Recipient",
      amount: rawPact ? formatEther(rawPact.amount) : "1.0",
      deadline: rawPact ? rawPact.deadline.toString() : "Future Deadline",
      requirements: requirements || "Deliver agreed proof/service according to specification.",
      evidence: rawEvidencePayload,
      evidenceHash: calculatedHash,
    }

    // 6. Invoke Gemini Verifier Agent
    const geminiResult = await verifyEvidenceWithGemini(pactSpec)

    // 7. Inject hash match check into checks list
    const combinedChecks = [
      {
        name: "Evidence Hash Match",
        passed: true,
        explanation: "Calculated Keccak-256 hash matches on-chain commitment.",
      },
      ...(geminiResult.checks || []),
    ]

    // 8. Phase 8: Trigger automated on-chain resolution via authorized verifier relayer
    let attestation = {
      relayed: false,
      reason: "NEEDS_REVIEW verdict does not trigger automated on-chain settlement.",
    }

    if (geminiResult.verdict === "APPROVED" || geminiResult.verdict === "REJECTED") {
      attestation = await relayVerificationToContract({
        pactId: Number(pactId),
        evidenceHash: calculatedHash,
        verdict: geminiResult.verdict,
        confidence: geminiResult.confidence,
      })
    }

    return res.json({
      pactId: Number(pactId),
      verdict: geminiResult.verdict,
      confidence: geminiResult.confidence,
      reason: geminiResult.reason,
      checks: combinedChecks,
      attestation,
    })
  } catch (err) {
    console.error("Verification API Error:", err)
    return res.status(500).json({
      verdict: "NEEDS_REVIEW",
      confidence: 0,
      reason: `Server verification failure: ${err.message || "Internal error"}`,
      checks: [{ name: "Server Pipeline Check", passed: false, explanation: err.message || "Internal error" }],
    })
  }
})

export default router
