import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  CRITERION_TYPES,
  validateCriterion,
  validatePactTerms,
  createPactTerms,
} from "../schema.js"

const SAMPLE_ORIGINATOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
const SAMPLE_EXECUTOR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
const SAMPLE_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

describe("validateCriterion", () => {
  it("validates a correct Type A criterion", () => {
    const res = validateCriterion({
      id: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      targetEndpoint: "https://api.pactra.network/v1/inference",
      minimumCount: 5,
    })
    assert.equal(res.valid, true)
    assert.equal(res.errors.length, 0)
  })

  it("rejects Type A criterion with invalid endpoint or non-positive count", () => {
    const res1 = validateCriterion({
      id: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      targetEndpoint: "invalid-url",
      minimumCount: 5,
    })
    assert.equal(res1.valid, false)
    assert.match(res1.errors[0], /valid URL/)

    const res2 = validateCriterion({
      id: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      targetEndpoint: "https://api.example.com",
      minimumCount: 0,
    })
    assert.equal(res2.valid, false)
    assert.match(res2.errors[0], /integer >= 1/)
  })

  it("validates a correct Type B criterion", () => {
    const res = validateCriterion({
      id: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      recipient: SAMPLE_EXECUTOR,
      minimumAmountWei: "5000000000000000000",
      chainId: 10143,
    })
    assert.equal(res.valid, true)
  })

  it("rejects Type B criterion with invalid recipient or negative amount", () => {
    const res = validateCriterion({
      id: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      recipient: "0xinvalid",
      minimumAmountWei: "-100",
    })
    assert.equal(res.valid, false)
    assert.equal(res.errors.length, 2)
  })

  it("validates a correct Type C criterion", () => {
    const res = validateCriterion({
      id: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      expectedHash: SAMPLE_HASH,
    })
    assert.equal(res.valid, true)
  })

  it("rejects Type C criterion with malformed hash", () => {
    const res = validateCriterion({
      id: 3,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      expectedHash: "0x123", // too short
    })
    assert.equal(res.valid, false)
    assert.match(res.errors[0], /bytes32 hex string/)
  })

  it("rejects unknown criterion types", () => {
    const res = validateCriterion({
      id: 4,
      type: "TYPE_UNKNOWN",
    })
    assert.equal(res.valid, false)
    assert.match(res.errors[0], /must be one of/)
  })
})

describe("validatePactTerms", () => {
  it("validates a well-formed pact terms object", () => {
    const terms = {
      pactId: "1",
      originator: SAMPLE_ORIGINATOR,
      executor: SAMPLE_EXECUTOR,
      description: "Test Pact",
      escrowAmount: "0.5",
      token: "MON",
      timeoutSeconds: 86400,
      criteria: [
        {
          id: 1,
          type: CRITERION_TYPES.TYPE_A_API_COUNT,
          targetEndpoint: "https://api.pactra.network/query",
          minimumCount: 3,
        },
      ],
    }

    const res = validatePactTerms(terms)
    assert.equal(res.valid, true)
    assert.equal(res.errors.length, 0)
  })

  it("rejects originator === executor", () => {
    const terms = {
      originator: SAMPLE_ORIGINATOR,
      executor: SAMPLE_ORIGINATOR,
      escrowAmount: "1.0",
      token: "MON",
      timeoutSeconds: 86400,
      criteria: [
        {
          id: 1,
          type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
          expectedHash: SAMPLE_HASH,
        },
      ],
    }

    const res = validatePactTerms(terms)
    assert.equal(res.valid, false)
    assert.ok(res.errors.some((e) => e.includes("cannot be the same address")))
  })

  it("rejects empty criteria array", () => {
    const terms = {
      originator: SAMPLE_ORIGINATOR,
      executor: SAMPLE_EXECUTOR,
      escrowAmount: "1.0",
      token: "MON",
      timeoutSeconds: 86400,
      criteria: [],
    }

    const res = validatePactTerms(terms)
    assert.equal(res.valid, false)
    assert.ok(res.errors.some((e) => e.includes("at least one acceptance criterion")))
  })
})

describe("createPactTerms", () => {
  it("normalizes and computes deterministic termsHash and criteriaHash", () => {
    const terms = createPactTerms({
      pactId: "101",
      originator: SAMPLE_ORIGINATOR,
      executor: SAMPLE_EXECUTOR,
      description: "Compute task",
      escrowAmount: "0.25",
      token: "MON",
      timeoutSeconds: 3600,
      criteria: [
        {
          type: CRITERION_TYPES.TYPE_A_API_COUNT,
          targetEndpoint: "https://api.example.com/check",
          minimumCount: 10,
        },
        {
          type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
          expectedHash: SAMPLE_HASH,
        },
      ],
    })

    assert.equal(terms.pactId, "101")
    assert.equal(terms.criteria.length, 2)
    assert.equal(terms.criteria[0].id, 1)
    assert.equal(terms.criteria[1].id, 2)
    assert.match(terms.termsHash, /^0x[a-f0-9]{64}$/)
    assert.match(terms.criteriaHash, /^0x[a-f0-9]{64}$/)

    // Deterministic regeneration must match exactly
    const termsRecreated = createPactTerms({
      pactId: "101",
      originator: SAMPLE_ORIGINATOR,
      executor: SAMPLE_EXECUTOR,
      description: "Compute task",
      escrowAmount: "0.25",
      token: "MON",
      timeoutSeconds: 3600,
      criteria: [
        {
          type: CRITERION_TYPES.TYPE_A_API_COUNT,
          targetEndpoint: "https://api.example.com/check",
          minimumCount: 10,
        },
        {
          type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
          expectedHash: SAMPLE_HASH,
        },
      ],
    })

    assert.equal(terms.termsHash, termsRecreated.termsHash)
    assert.equal(terms.criteriaHash, termsRecreated.criteriaHash)
  })

  it("throws descriptive error when validation fails", () => {
    assert.throws(
      () =>
        createPactTerms({
          originator: "0x123", // invalid
          executor: SAMPLE_EXECUTOR,
          escrowAmount: "0",
          criteria: [],
        }),
      /Pact terms validation failed/
    )
  })
})
