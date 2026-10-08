import test from "node:test"
import assert from "node:assert/strict"
import { validateTypeC } from "../validateTypeC.js"
import { hashCanonical } from "../../canonical.js"
import { CRITERION_TYPES } from "../../schema.js"

test("validateTypeC — Deterministic Hash Verification", async (t) => {
  const samplePayload = {
    dataset: "monad-telemetry-october",
    recordsProcessed: 10000,
    metrics: { accuracy: 0.999, latencyMs: 42 },
  }
  const expectedHash = hashCanonical(samplePayload)

  const criterion = {
    id: 3,
    type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
    expectedHash,
  }

  await t.test("passes with identical output payload", () => {
    const evidenceItem = {
      criterionId: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      data: {
        toolName: "dataset_validator",
        outputPayload: samplePayload,
      },
    }

    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.status, "PASS")
    assert.equal(result.actualHash, expectedHash.toLowerCase())
    assert.equal(result.errors.length, 0)
    assert.ok(result.summary.includes("Cryptographic output hash matches"))
  })

  await t.test("passes with reordered object keys due to RFC 8785 canonicalization", () => {
    const reorderedPayload = {
      metrics: { latencyMs: 42, accuracy: 0.999 }, // inverted inner keys
      recordsProcessed: 10000,
      dataset: "monad-telemetry-october", // inverted outer keys
    }

    const evidenceItem = {
      criterionId: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      data: {
        outputPayload: reorderedPayload,
      },
    }

    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.status, "PASS")
    assert.equal(result.actualHash, expectedHash.toLowerCase())
  })

  await t.test("fails when payload is mutated", () => {
    const mutatedPayload = {
      ...samplePayload,
      recordsProcessed: 9999, // 1 record missing!
    }

    const evidenceItem = {
      criterionId: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      data: {
        outputPayload: mutatedPayload,
      },
    }

    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.status, "FAIL")
    assert.notEqual(result.actualHash, expectedHash.toLowerCase())
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_C_HASH_MISMATCH")))
  })

  await t.test("fails and flags tampering when stated hash conflicts with payload hash", () => {
    const fakeHash = "0x" + "f".repeat(64)
    const evidenceItem = {
      criterionId: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      data: {
        outputPayload: samplePayload,
        outputHash: fakeHash, // Conflicting stated hash!
      },
    }

    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_C_PAYLOAD_TAMPERED")))
  })

  await t.test("passes when only matching outputHash is provided", () => {
    const evidenceItem = {
      criterionId: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      data: {
        outputHash: expectedHash,
      },
    }

    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.actualHash, expectedHash.toLowerCase())
  })
})

test("validateTypeC — Boundary & Missing Data Handling", async (t) => {
  await t.test("handles missing payload and data cleanly", () => {
    const res1 = validateTypeC(null, null)
    assert.equal(res1.passed, false)

    const validCrit = { id: 3, expectedHash: "0x" + "a".repeat(64) }
    const res2 = validateTypeC(validCrit, { data: {} })
    assert.equal(res2.passed, false)
    assert.ok(res2.errors.some((e) => e.includes("ERR_TYPE_C_MISSING_DATA")))
  })
})
