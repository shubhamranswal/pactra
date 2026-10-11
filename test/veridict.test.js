import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { validateTypeA } from "../src/lib/veridict/validators/validateTypeA.js"
import { validateTypeB } from "../src/lib/veridict/validators/validateTypeB.js"
import { validateTypeC } from "../src/lib/veridict/validators/validateTypeC.js"
import { ExecutionRecorder } from "../src/lib/veridict/recorder.js"
import { compileEvidencePackage } from "../src/lib/veridict/manifest.js"
import { hashCanonical } from "../src/lib/veridict/canonical.js"
import { CRITERION_TYPES } from "../src/lib/veridict/schema.js"

describe("Type A Deterministic Validator (API Count)", () => {
  const criterion = {
    criterionId: 1,
    type: CRITERION_TYPES.TYPE_A,
    targetEndpoint: "https://api.pactra.network/v1/jobs",
    minimumCount: 2,
  }

  it("passes when valid call count meets minimumCount", () => {
    const evidenceItem = {
      calls: [
        { id: "1", url: "https://api.pactra.network/v1/jobs", method: "GET", status: 200 },
        { id: "2", url: "https://api.pactra.network/v1/jobs", method: "POST", status: 201 },
      ],
    }
    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.actualCount, 2)
  })

  it("fails when call count is below minimumCount", () => {
    const evidenceItem = {
      calls: [
        { id: "1", url: "https://api.pactra.network/v1/jobs", method: "GET", status: 200 },
      ],
    }
    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.actualCount, 1)
  })

  it("excludes non-2xx status codes and mismatched endpoints", () => {
    const evidenceItem = {
      calls: [
        { id: "1", url: "https://api.pactra.network/v1/jobs", method: "GET", status: 500 },
        { id: "2", url: "https://api.other.network/v1/jobs", method: "GET", status: 200 },
        { id: "3", url: "https://api.pactra.network/v1/jobs", method: "GET", status: 200 },
      ],
    }
    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.actualCount, 1)
  })

  it("deduplicates replay call IDs", () => {
    const evidenceItem = {
      calls: [
        { id: "replay_1", url: "https://api.pactra.network/v1/jobs", method: "GET", status: 200 },
        { id: "replay_1", url: "https://api.pactra.network/v1/jobs", method: "GET", status: 200 },
      ],
    }
    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.actualCount, 1)
  })
})

describe("Type B Deterministic Validator (Blockchain Tx)", () => {
  const targetRecipient = "0x2222222222222222222222222222222222222222"
  const criterion = {
    criterionId: 2,
    type: CRITERION_TYPES.TYPE_B,
    recipient: targetRecipient,
    minimumAmountWei: "1000000000000000000", // 1 ether
  }

  it("passes with confirmed transaction matching recipient and value", async () => {
    const evidenceItem = {
      txHash: "0xtx123",
      receipt: { status: "success", to: targetRecipient },
      tx: { to: targetRecipient, value: 2000000000000000000n },
    }
    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, true)
  })

  it("fails when receipt status is reverted", async () => {
    const evidenceItem = {
      txHash: "0xtx123",
      receipt: { status: "reverted", to: targetRecipient },
      tx: { to: targetRecipient, value: 2000000000000000000n },
    }
    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.match(result.error, /reverted/)
  })

  it("fails when recipient does not match", async () => {
    const evidenceItem = {
      txHash: "0xtx123",
      receipt: { status: "success", to: "0x9999999999999999999999999999999999999999" },
      tx: { to: "0x9999999999999999999999999999999999999999", value: 2000000000000000000n },
    }
    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.match(result.error, /Recipient mismatch/)
  })

  it("fails when amount is insufficient", async () => {
    const evidenceItem = {
      txHash: "0xtx123",
      receipt: { status: "success", to: targetRecipient },
      tx: { to: targetRecipient, value: 500000000000000000n }, // 0.5 ether < 1 ether
    }
    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.match(result.error, /Amount insufficient/)
  })
})

describe("Type C Deterministic Validator (Hash Match)", () => {
  const payload = { model: "agent-evaluator", score: 98.5 }
  const expectedHash = hashCanonical(payload)

  const criterion = {
    criterionId: 3,
    type: CRITERION_TYPES.TYPE_C,
    expectedHash,
  }

  it("passes when payload canonical hash strictly matches", () => {
    const evidenceItem = { outputPayload: payload }
    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.actualHash, expectedHash)
  })

  it("fails when payload is mutated", () => {
    const evidenceItem = { outputPayload: { model: "agent-evaluator", score: 98.4 } }
    const result = validateTypeC(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.notEqual(result.actualHash, expectedHash)
  })
})

describe("ExecutionRecorder & Manifest Compiler", () => {
  it("records traces and compiles valid manifest", () => {
    const recorder = new ExecutionRecorder()
    recorder.recordApiCall({ url: "https://api.pactra.network/test", method: "POST", status: 200 })
    recorder.recordToolOutput({ toolName: "verifier", outputPayload: { done: true } })

    const traces = recorder.getTraces()
    assert.equal(traces.length, 2)

    const { evidencePackage, evidenceHash } = compileEvidencePackage({
      pactId: "42",
      executor: "0x2222222222222222222222222222222222222222",
      items: [
        {
          criterionId: 1,
          type: CRITERION_TYPES.TYPE_A,
          calls: traces.filter((t) => t.type === "API_CALL"),
        },
      ],
    })

    assert.equal(evidencePackage.pactId, "42")
    assert.match(evidenceHash, /^0x[a-fA-F0-9]{64}$/)
  })
})
