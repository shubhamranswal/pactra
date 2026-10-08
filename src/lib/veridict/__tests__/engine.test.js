import test from "node:test"
import assert from "node:assert/strict"
import { VeridictEngine, VERDICT } from "../engine.js"
import { createPactTerms, CRITERION_TYPES } from "../schema.js"
import { compileEvidencePackage } from "../manifest.js"
import { ExecutionRecorder } from "../recorder.js"
import { hashCanonical } from "../canonical.js"

const ORIGINATOR = "0x" + "1".repeat(40)
const EXECUTOR = "0x" + "2".repeat(40)
const RECIPIENT = "0x" + "3".repeat(40)

function buildTestFixtures() {
  const samplePayload = { model: "eval-model", score: 98 }
  const expectedHash = hashCanonical(samplePayload)

  const terms = createPactTerms({
    pactId: 101,
    originator: ORIGINATOR,
    executor: EXECUTOR,
    escrowAmount: "5.0",
    criteria: [
      {
        id: 1,
        type: CRITERION_TYPES.TYPE_A_API_COUNT,
        targetEndpoint: "https://api.pactra.network/inference",
        minimumCount: 2,
      },
      {
        id: 2,
        type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
        recipient: RECIPIENT,
        minimumAmountWei: "1000000000000000000",
      },
      {
        id: 3,
        type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
        expectedHash,
      },
    ],
  })

  const recorder = new ExecutionRecorder()
  recorder.recordApiCall({ url: "https://api.pactra.network/inference", status: 200, responseData: { ok: 1 } })
  recorder.recordApiCall({ url: "https://api.pactra.network/inference", status: 200, responseData: { ok: 2 } })

  recorder.recordBlockchainTx({
    txHash: "0x" + "a".repeat(64),
    from: EXECUTOR,
    to: RECIPIENT,
    value: "2000000000000000000",
    status: "success",
    blockNumber: 1000,
  })

  recorder.recordToolOutput({
    toolName: "evaluator",
    payload: samplePayload,
  })

  const { package: evidencePackage, evidenceHash } = compileEvidencePackage({
    terms,
    traces: recorder,
    executor: EXECUTOR,
    timestamp: 1791112650,
  })

  return { terms, evidencePackage, evidenceHash }
}

test("VeridictEngine — End-to-End Pipeline", async (t) => {
  const { terms, evidencePackage, evidenceHash } = buildTestFixtures()

  await t.test("evaluates valid evidence package to PASS", async () => {
    const result = await VeridictEngine.verify(terms, evidencePackage, {
      committedEvidenceHash: evidenceHash,
    })

    assert.equal(result.verdict, VERDICT.PASS)
    assert.equal(result.passed, true)
    assert.equal(result.onChainCommitted, true)
    assert.equal(result.criteria.length, 3)
    assert.ok(result.criteria.every((c) => c.passed))
    assert.equal(result.failures.length, 0)
    assert.ok(result.summary.includes("Overall verdict: PASS"))
  })

  await t.test("fails when evidence binds to incorrect pactTermsHash", async () => {
    const corruptedEvidence = {
      ...evidencePackage,
      pactTermsHash: "0x" + "e".repeat(64), // Corrupted terms hash!
    }

    const result = await VeridictEngine.verify(terms, corruptedEvidence)
    assert.equal(result.verdict, VERDICT.FAIL)
    assert.equal(result.passed, false)
    assert.ok(result.failures.some((f) => f.includes("ERR_TERMS_HASH_MISMATCH")))
  })

  await t.test("fails when on-chain committed evidenceHash does not match", async () => {
    const wrongOnChainHash = "0x" + "f".repeat(64)
    const result = await VeridictEngine.verify(terms, evidencePackage, {
      committedEvidenceHash: wrongOnChainHash,
    })

    assert.equal(result.verdict, VERDICT.FAIL)
    assert.equal(result.passed, false)
    assert.equal(result.onChainCommitted, false)
    assert.ok(result.failures.some((f) => f.includes("ERR_EVIDENCE_HASH_MISMATCH")))
  })

  await t.test("fails when a single criterion fails (partial failure)", async () => {
    // Corrupt Type C payload
    const corruptedItems = evidencePackage.items.map((item) => {
      if (item.type === CRITERION_TYPES.TYPE_C_HASH_MATCH) {
        return {
          ...item,
          data: {
            ...item.data,
            outputPayload: { mutated: true },
          },
        }
      }
      return item
    })

    const partialFailPackage = {
      ...evidencePackage,
      items: corruptedItems,
    }

    const result = await VeridictEngine.verify(terms, partialFailPackage)
    assert.equal(result.verdict, VERDICT.FAIL)
    assert.equal(result.passed, false)
    assert.equal(result.criteria.find((c) => c.criterionId === 1).passed, true)
    assert.equal(result.criteria.find((c) => c.criterionId === 2).passed, true)
    assert.equal(result.criteria.find((c) => c.criterionId === 3).passed, false)
  })

  await t.test("fails when evidence is missing a required criterion item", async () => {
    const incompletePackage = {
      ...evidencePackage,
      items: evidencePackage.items.filter((item) => item.criterionId !== 1), // Removed #1
    }

    const result = await VeridictEngine.verify(terms, incompletePackage)
    assert.equal(result.verdict, VERDICT.FAIL)
    assert.equal(result.passed, false)
    assert.ok(result.failures.some((f) => f.includes("ERR_MISSING_CRITERION_EVIDENCE")))
  })
})

test("VeridictEngine — Malformed & Boundary Inputs", async (t) => {
  await t.test("handles null terms cleanly", async () => {
    const result = await VeridictEngine.verify(null, {})
    assert.equal(result.verdict, VERDICT.FAIL)
    assert.equal(result.passed, false)
    assert.ok(result.failures.some((f) => f.includes("ERR_INVALID_TERMS")))
  })

  await t.test("handles malformed evidence cleanly", async () => {
    const result = await VeridictEngine.verify({ criteria: [] }, null)
    assert.equal(result.verdict, VERDICT.FAIL)
    assert.equal(result.passed, false)
  })
})
