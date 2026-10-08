import test from "node:test"
import assert from "node:assert/strict"
import { compileEvidencePackage } from "../manifest.js"
import { ExecutionRecorder } from "../recorder.js"
import { createPactTerms, CRITERION_TYPES, validateEvidencePackage } from "../schema.js"
import { hashCanonical } from "../canonical.js"

const ORIGINATOR = "0x" + "1".repeat(40)
const EXECUTOR = "0x" + "2".repeat(40)
const RECIPIENT = "0x" + "3".repeat(40)

test("compileEvidencePackage — Complete Workflow", async (t) => {
  const samplePayload = { output: "verified dataset", records: 100 }
  const expectedPayloadHash = hashCanonical(samplePayload)

  const terms = createPactTerms({
    pactId: 1,
    originator: ORIGINATOR,
    executor: EXECUTOR,
    escrowAmount: "1.5",
    criteria: [
      {
        id: 1,
        type: CRITERION_TYPES.TYPE_A_API_COUNT,
        targetEndpoint: "https://api.pactra.network/v1/feed",
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
        expectedHash: expectedPayloadHash,
      },
    ],
  })

  const recorder = new ExecutionRecorder()
  // 2 API calls
  recorder.recordApiCall({ url: "https://api.pactra.network/v1/feed", status: 200, responseData: { a: 1 } })
  recorder.recordApiCall({ url: "https://api.pactra.network/v1/feed", status: 200, responseData: { b: 2 } })

  // 1 Blockchain tx
  const txHash = "0x" + "a".repeat(64)
  recorder.recordBlockchainTx({
    txHash,
    from: EXECUTOR,
    to: RECIPIENT,
    value: "1000000000000000000",
    blockNumber: 54321,
    status: "success",
  })

  // 1 Tool output
  recorder.recordToolOutput({
    toolName: "data_processor",
    payload: samplePayload,
  })

  await t.test("compiles clean EvidencePackage from recorder", () => {
    const result = compileEvidencePackage({
      terms,
      traces: recorder,
      executor: EXECUTOR,
      timestamp: 1791112500,
    })

    assert.equal(result.isComplete, true)
    assert.equal(result.warnings.length, 0)
    assert.ok(result.evidenceHash.startsWith("0x"))
    assert.equal(result.package.pactId, "1")
    assert.equal(result.package.pactTermsHash, terms.termsHash)
    assert.equal(result.package.executor, EXECUTOR.toLowerCase())
    assert.equal(result.package.items.length, 3)

    // Validate structural schema
    const val = validateEvidencePackage(result.package)
    assert.equal(val.valid, true)
  })

  await t.test("warns when criterion calls are insufficient", () => {
    const deficientRecorder = new ExecutionRecorder()
    deficientRecorder.recordApiCall({ url: "https://api.pactra.network/v1/feed", status: 200 })

    const result = compileEvidencePackage({
      terms,
      traces: deficientRecorder,
    })

    assert.equal(result.isComplete, false)
    assert.ok(result.warnings.length > 0)
    assert.ok(result.warnings.some((w) => w.includes("Required 2 calls")))
  })

  await t.test("strict mode throws on missing criteria", () => {
    const emptyRecorder = new ExecutionRecorder()
    assert.throws(
      () =>
        compileEvidencePackage({
          terms,
          traces: emptyRecorder,
          strict: true,
        }),
      /ERR_MISSING_CRITERION_EVIDENCE/
    )
  })
})

test("compileEvidencePackage — Schema & Boundary Validation", async (t) => {
  await t.test("rejects invalid terms object or empty criteria", () => {
    assert.throws(
      () => compileEvidencePackage({ terms: null, traces: [] }),
      /ERR_INVALID_TERMS/
    )
    assert.throws(
      () => compileEvidencePackage({ terms: { criteria: [] }, traces: [] }),
      /ERR_INVALID_TERMS/
    )
  })
})
