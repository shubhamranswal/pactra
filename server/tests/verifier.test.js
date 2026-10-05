import assert from "node:assert"
import { test, describe } from "node:test"
import { calculateEvidenceHash, normalizeEvidence } from "../services/evidenceService.js"
import { verifyEvidenceWithGemini } from "../agents/geminiVerifier.js"

describe("PART 11 — Verification Agent & Hash Integrity Tests", () => {
  // Test A: Normalization and Hashing
  test("Normalizes evidence string deterministically", () => {
    const norm1 = normalizeEvidence("   Proof Delivery Payload   ")
    const norm2 = normalizeEvidence("Proof Delivery Payload")
    assert.strictEqual(norm1, norm2)

    const hash1 = calculateEvidenceHash(norm1)
    const hash2 = calculateEvidenceHash(norm2)
    assert.strictEqual(hash1, hash2)
  })

  // Test E: Empty evidence rejected before Gemini call
  test("Empty evidence produces zero bytes32 hash", () => {
    const emptyHash = calculateEvidenceHash("")
    assert.strictEqual(emptyHash, "0x0000000000000000000000000000000000000000000000000000000000000000")
  })

  // Test D: Evidence content changed after hash submission
  test("Detects evidence hash mismatch when content is tampered", () => {
    const originalContent = "Original Deliverable Proof v1.0"
    const tamperedContent = "Original Deliverable Proof v1.0 (Tampered)"

    const originalHash = calculateEvidenceHash(originalContent)
    const tamperedHash = calculateEvidenceHash(tamperedContent)

    assert.notStrictEqual(originalHash, tamperedHash)
  })

  // Test F: Missing API Key fallback returns NEEDS_REVIEW safely
  test("Missing API key returns NEEDS_REVIEW schema safely without throwing", async () => {
    const originalKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    const result = await verifyEvidenceWithGemini({
      pactId: 1,
      creator: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
      amount: "1.0",
      deadline: "1800000000",
      requirements: "Deliver asset proof",
      evidence: "Sample Proof",
      evidenceHash: "0x123456",
    })

    assert.strictEqual(result.verdict, "NEEDS_REVIEW")
    assert.strictEqual(typeof result.confidence, "number")
    assert.ok(Array.isArray(result.checks))

    if (originalKey) process.env.GEMINI_API_KEY = originalKey
  })

  // Test G: Canonical verification hash generation
  test("Computes deterministic verificationHash from canonical result data", async () => {
    const { computeVerificationHash } = await import(
      "../services/verificationRelayer.js"
    )

    const data1 = {
      pactId: 1,
      evidenceHash: "0x1234abcd",
      verdict: "APPROVED",
      confidence: 0.95,
      timestamp: 1700000000,
    }

    const data2 = {
      pactId: 1,
      evidenceHash: "0x1234abcd",
      verdict: "APPROVED",
      confidence: 0.95,
      timestamp: 1700000000,
    }

    const hash1 = computeVerificationHash(data1)
    const hash2 = computeVerificationHash(data2)

    assert.strictEqual(hash1, hash2)
    assert.ok(hash1.startsWith("0x"))
    assert.strictEqual(hash1.length, 66)

    // Tampered verdict produces different hash
    const hash3 = computeVerificationHash({ ...data1, verdict: "REJECTED" })
    assert.notStrictEqual(hash1, hash3)
  })

  // Test H: Relayer ignores NEEDS_REVIEW
  test("Relayer rejects NEEDS_REVIEW without on-chain broadcast", async () => {
    const { relayVerificationToContract } = await import("../services/verificationRelayer.js")

    const res = await relayVerificationToContract({
      pactId: 1,
      evidenceHash: "0x1234",
      verdict: "NEEDS_REVIEW",
      confidence: 0.5,
    })

    assert.strictEqual(res.relayed, false)
    assert.ok(res.reason.includes("NEEDS_REVIEW"))
  })

  // Test I: Relayer safe fallback when VERIFIER_PRIVATE_KEY missing
  test("Relayer safely returns fallback when VERIFIER_PRIVATE_KEY is not configured", async () => {
    const originalVerifierKey = process.env.VERIFIER_PRIVATE_KEY
    delete process.env.VERIFIER_PRIVATE_KEY

    const { relayVerificationToContract } = await import("../services/verificationRelayer.js")

    const res = await relayVerificationToContract({
      pactId: 1,
      evidenceHash: "0x1234",
      verdict: "APPROVED",
      confidence: 0.98,
    })

    assert.strictEqual(res.relayed, false)
    assert.ok(res.reason.includes("VERIFIER_PRIVATE_KEY"))

    if (originalVerifierKey) process.env.VERIFIER_PRIVATE_KEY = originalVerifierKey
  })
})

