import test from "node:test"
import assert from "node:assert/strict"
import { validateTypeA } from "../validateTypeA.js"
import { CRITERION_TYPES } from "../../schema.js"

test("validateTypeA — Deterministic Verification", async (t) => {
  const criterion = {
    id: 1,
    type: CRITERION_TYPES.TYPE_A_API_COUNT,
    targetEndpoint: "https://api.pactra.network/v1/feed",
    minimumCount: 2,
  }

  await t.test("passes when exact or extra successful calls are present", () => {
    const evidenceItem = {
      criterionId: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      data: {
        targetEndpoint: "https://api.pactra.network/v1/feed",
        successfulCalls: [
          { id: "evt_1", status: 200, timestamp: "2026-10-08T12:00:00Z" },
          { id: "evt_2", status: 204, timestamp: "2026-10-08T12:01:00Z" },
          { id: "evt_3", status: 201, timestamp: "2026-10-08T12:02:00Z" },
        ],
      },
    }

    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.status, "PASS")
    assert.equal(result.actualCount, 3)
    assert.equal(result.requiredCount, 2)
    assert.equal(result.errors.length, 0)
    assert.ok(result.summary.includes("3 of 2 required calls verified"))
  })

  await t.test("fails when call count is below minimumCount", () => {
    const evidenceItem = {
      criterionId: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      data: {
        targetEndpoint: "https://api.pactra.network/v1/feed",
        successfulCalls: [
          { id: "evt_1", status: 200 },
        ],
      },
    }

    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.status, "FAIL")
    assert.equal(result.actualCount, 1)
    assert.equal(result.requiredCount, 2)
    assert.ok(result.summary.includes("Insufficient calls: 1 verified, 2 required"))
  })

  await t.test("excludes 4xx and 5xx status codes from success count", () => {
    const evidenceItem = {
      criterionId: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      data: {
        targetEndpoint: "https://api.pactra.network/v1/feed",
        successfulCalls: [
          { id: "evt_1", status: 200 },
          { id: "evt_2", status: 500 }, // Server error
          { id: "evt_3", status: 404 }, // Not found
        ],
      },
    }

    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.actualCount, 1) // Only evt_1 counted
  })

  await t.test("excludes calls to different endpoints", () => {
    const evidenceItem = {
      criterionId: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      data: {
        targetEndpoint: "https://api.pactra.network/v1/feed",
        successfulCalls: [
          { id: "evt_1", url: "https://api.pactra.network/v1/feed", status: 200 },
          { id: "evt_2", url: "https://other.com/api", status: 200 }, // Mismatched URL
        ],
      },
    }

    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.actualCount, 1)
  })

  await t.test("rejects duplicate event IDs and reports error", () => {
    const evidenceItem = {
      criterionId: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      data: {
        targetEndpoint: "https://api.pactra.network/v1/feed",
        successfulCalls: [
          { id: "evt_duplicate", status: 200 },
          { id: "evt_duplicate", status: 200 }, // Duplicate replay!
        ],
      },
    }

    const result = validateTypeA(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.actualCount, 1)
    assert.ok(result.errors.some((err) => err.includes("Duplicate event ID detected")))
  })

  await t.test("respects custom expectedStatusCode when specified", () => {
    const exactStatusCriterion = {
      ...criterion,
      expectedStatusCode: 201,
    }

    const evidenceItem = {
      criterionId: 1,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      data: {
        targetEndpoint: "https://api.pactra.network/v1/feed",
        successfulCalls: [
          { id: "evt_1", status: 200 }, // Valid 2xx, but not 201
          { id: "evt_2", status: 201 }, // Matches exact 201
          { id: "evt_3", status: 201 }, // Matches exact 201
        ],
      },
    }

    const result = validateTypeA(exactStatusCriterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.actualCount, 2)
  })
})

test("validateTypeA — Boundary & Missing Input Handling", async (t) => {
  await t.test("handles missing or null evidence gracefully", () => {
    const result = validateTypeA(null, null)
    assert.equal(result.passed, false)
    assert.equal(result.status, "FAIL")

    const res2 = validateTypeA({ id: 1 }, null)
    assert.equal(res2.passed, false)

    const res3 = validateTypeA({ id: 1, targetEndpoint: "https://test.com" }, { criterionId: 1, data: null })
    assert.equal(res3.passed, false)
  })
})
