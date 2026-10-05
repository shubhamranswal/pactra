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
})
