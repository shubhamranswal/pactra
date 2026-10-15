import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  executeApiCall,
  executeCryptoHasher,
  validateOutboundUrl,
  isPrivateIp,
} from "../server/tools.js"
import { ExecutionRecorder } from "../src/lib/veridict/recorder.js"
import {
  buildEvidenceItemsFromTraces,
  compileEvidenceFromTraces,
} from "../server/manifestBridge.js"
import { hashCanonical, canonicalJson } from "../src/lib/veridict/canonical.js"
import { VeridictEngine } from "../src/lib/veridict/engine.js"
import { CRITERION_TYPES } from "../src/lib/veridict/schema.js"
import {
  getAuthoritativePactTerms,
  DEFAULT_DELIVERABLE_PAYLOAD,
  DEFAULT_DELIVERABLE_HASH,
} from "../server/pactRegistry.js"

describe("Phase 2 & 3: Agent Tool Sandbox & SSRF Protection", () => {
  it("blocks private IPv4 and link-local cloud metadata addresses", () => {
    assert.equal(isPrivateIp("127.0.0.1"), true)
    assert.equal(isPrivateIp("10.0.0.1"), true)
    assert.equal(isPrivateIp("172.16.0.1"), true)
    assert.equal(isPrivateIp("192.168.1.1"), true)
    assert.equal(isPrivateIp("169.254.169.254"), true)
    assert.equal(isPrivateIp("0.0.0.0"), true)
    assert.equal(isPrivateIp("8.8.8.8"), false)
  })

  it("blocks IPv6 loopback and unique local addresses", () => {
    assert.equal(isPrivateIp("::1"), true)
    assert.equal(isPrivateIp("fc00::1"), true)
    assert.equal(isPrivateIp("fe80::1"), true)
  })

  it("rejects non-allowlisted outbound hosts in validateOutboundUrl", async () => {
    await assert.rejects(
      async () => {
        await validateOutboundUrl("https://malicious-external-domain.com/evil")
      },
      { message: /not in the approved outbound allowlist/ }
    )
  })

  it("rejects unsupported protocols like file:// or gopher://", async () => {
    await assert.rejects(
      async () => {
        await validateOutboundUrl("file:///etc/passwd")
      },
      { message: /Unsupported protocol/ }
    )
  })

  it("records telemetry in ExecutionRecorder during tool execution", async () => {
    const recorder = new ExecutionRecorder()
    const result = executeCryptoHasher({
      outputPayload: DEFAULT_DELIVERABLE_PAYLOAD,
      recorder,
    })

    assert.equal(result.canonicalHash, DEFAULT_DELIVERABLE_HASH)
    assert.equal(recorder.getTraces().length, 1)
    assert.equal(recorder.getTraces()[0].type, "TOOL_OUTPUT")
  })
})

describe("Phase 3: Manifest Compiler Bridge & Parity Tests", () => {
  it("compiles structured EvidencePackage items from recorded traces", () => {
    const criteria = [
      {
        criterionId: 1,
        type: CRITERION_TYPES.TYPE_A,
        targetEndpoint: "http://localhost:3001/api/test-telemetry",
        minimumCount: 2,
      },
      {
        criterionId: 2,
        type: CRITERION_TYPES.TYPE_C,
        expectedHash: DEFAULT_DELIVERABLE_HASH,
      },
    ]

    const traces = [
      {
        id: "call_1",
        type: "API_CALL",
        url: "http://localhost:3001/api/test-telemetry",
        method: "POST",
        status: 200,
      },
      {
        id: "call_2",
        type: "API_CALL",
        url: "http://localhost:3001/api/test-telemetry",
        method: "POST",
        status: 200,
      },
      {
        id: "tool_1",
        type: "TOOL_OUTPUT",
        toolName: "deterministic_digest_generator",
        outputPayload: DEFAULT_DELIVERABLE_PAYLOAD,
      },
    ]

    const items = buildEvidenceItemsFromTraces({ criteria, traces })
    assert.equal(items.length, 2)
    assert.equal(items[0].criterionId, 1)
    assert.equal(items[0].calls.length, 2)
    assert.equal(items[1].criterionId, 2)
    assert.deepEqual(items[1].outputPayload, DEFAULT_DELIVERABLE_PAYLOAD)
  })

  it("proves byte-for-byte canonical hash parity across test fixtures", () => {
    const fixtures = [
      { a: 1, b: "hello", c: [1, 2, 3] },
      { z: null, y: true, x: false, w: "test" },
      { nested: { b: 2, a: 1 }, list: [{ d: 4, c: 3 }] },
      { pactId: "1", status: "verified_execution", completedAt: 1791112500 },
      { emptyObj: {}, emptyList: [], zero: 0 },
    ]

    for (const fixture of fixtures) {
      const canonicalString1 = canonicalJson(fixture)
      const canonicalString2 = canonicalJson(JSON.parse(JSON.stringify(fixture)))
      assert.equal(canonicalString1, canonicalString2)

      const hash1 = hashCanonical(fixture)
      const hash2 = hashCanonical(JSON.parse(JSON.stringify(fixture)))
      assert.equal(hash1, hash2)
      assert.match(hash1, /^0x[a-f0-9]{64}$/)
    }
  })

  it("evaluates compiled evidence package through Veridict with PASS verdict", async () => {
    const terms = getAuthoritativePactTerms("demo_1", {
      creator: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
    })

    const traces = [
      {
        id: "call_1",
        type: "API_CALL",
        url: "http://localhost:3001/api/test-telemetry",
        method: "POST",
        status: 200,
      },
      {
        id: "call_2",
        type: "API_CALL",
        url: "http://localhost:3001/api/test-telemetry",
        method: "POST",
        status: 200,
      },
      {
        id: "tool_1",
        type: "TOOL_OUTPUT",
        toolName: "deterministic_digest_generator",
        outputPayload: DEFAULT_DELIVERABLE_PAYLOAD,
      },
    ]

    const { evidencePackage, evidenceHash } = compileEvidenceFromTraces({
      pactId: "demo_1",
      executor: "0x2222222222222222222222222222222222222222",
      criteria: terms.criteria,
      traces,
    })

    const evaluation = await VeridictEngine.evaluate({
      terms,
      evidencePackage,
    })

    assert.equal(evaluation.verdict, "PASS")
    assert.equal(evaluation.evidenceHash, evidenceHash)
    assert.equal(evaluation.criteriaResults.length, 2)
    assert.equal(evaluation.criteriaResults.every((r) => r.passed), true)
  })

  it("evaluates compiled evidence package through Veridict with FAIL verdict if calls insufficient", async () => {
    const terms = getAuthoritativePactTerms("demo_1", {
      creator: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
    })

    // Only 1 call instead of 2 required!
    const traces = [
      {
        id: "call_1",
        type: "API_CALL",
        url: "http://localhost:3001/api/test-telemetry",
        method: "POST",
        status: 200,
      },
      {
        id: "tool_1",
        type: "TOOL_OUTPUT",
        toolName: "deterministic_digest_generator",
        outputPayload: DEFAULT_DELIVERABLE_PAYLOAD,
      },
    ]

    const { evidencePackage } = compileEvidenceFromTraces({
      pactId: "demo_1",
      executor: "0x2222222222222222222222222222222222222222",
      criteria: terms.criteria,
      traces,
    })

    const evaluation = await VeridictEngine.evaluate({
      terms,
      evidencePackage,
    })

    assert.equal(evaluation.verdict, "FAIL")
    assert.equal(evaluation.criteriaResults[0].passed, false)
    assert.match(evaluation.failureReasons[0], /Insufficient successful calls/)
  })
})
