import { Router } from "express"
import { observeAndVerifyPayment } from "../services/paymentVerification.js"
import { verifyPaymentWithGemini } from "../agents/geminiPaymentVerifier.js"

const router = Router()

/**
 * POST /api/pacts/:pactId/verify-payment
 * Fetches transaction & block data from Monad RPC, runs 6 deterministic checks,
 * builds canonical PaymentEvidence, hashes evidence, and calls Gemini Payment Verifier.
 */
router.post("/pacts/:pactId/verify-payment", async (req, res) => {
  try {
    const { pactId } = req.params
    const { txHash } = req.body

    if (!pactId || isNaN(Number(pactId)) || Number(pactId) <= 0) {
      return res.status(400).json({
        error: "Invalid pact ID. Must be a positive integer.",
      })
    }

    if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x") || txHash.length !== 66) {
      return res.status(400).json({
        error: "Invalid transaction hash format. Must be 0x followed by 64 hexadecimal characters.",
      })
    }

    // 1-9: Observe blockchain transaction, run 6 deterministic checks, build & hash PaymentEvidence
    let verificationData
    try {
      verificationData = await observeAndVerifyPayment({ pactId, txHash })
    } catch (err) {
      return res.status(400).json({
        pactId: Number(pactId),
        txHash,
        error: err.message || "Failed to observe transaction on Monad RPC.",
        gemini: {
          verdict: "NEEDS_REVIEW",
          confidence: 0,
          reason: `Transaction observation failed: ${err.message}`,
          checks: [],
        },
      })
    }

    // 10-11: Call Gemini Payment Verifier Agent
    const geminiResult = await verifyPaymentWithGemini({
      pactId: Number(pactId),
      txHash,
      deterministicResult: verificationData.deterministicResult,
    })

    // 12: Return final response
    return res.json({
      pactId: Number(pactId),
      txHash,
      evidenceHash: verificationData.evidenceHash,
      paymentEvidence: verificationData.paymentEvidence,
      deterministicResult: verificationData.deterministicResult,
      gemini: geminiResult,
    })
  } catch (err) {
    console.error("Payment Verification API Error:", err)
    return res.status(500).json({
      error: err.message || "Internal server error during payment verification.",
    })
  }
})

export default router
