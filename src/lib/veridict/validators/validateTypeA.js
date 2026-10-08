/**
 * @file validateTypeA.js
 * @description Type A Deterministic Validator (API Execution Count).
 *
 * Implements Task 7.6.1 / P7-FR-008:
 * Deterministically verifies that the count of successful HTTP calls
 * (status in [200, 299] or matching expectedStatusCode) to targetEndpoint
 * in the evidence item meets or exceeds minimumCount.
 * Rejects duplicate event IDs.
 */

import { CRITERION_TYPES } from "../schema.js"

/**
 * Deterministically validates an evidence item against a Type A acceptance criterion.
 *
 * @param {object} criterion - The Type A criterion definition
 * @param {object} evidenceItem - The evidence item containing recorded API call telemetry
 * @returns {object} Validation result { criterionId, type, passed, status, actualCount, requiredCount, summary, proof, errors }
 */
export function validateTypeA(criterion, evidenceItem) {
  const errors = []

  if (!criterion || typeof criterion !== "object") {
    return {
      criterionId: null,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      passed: false,
      status: "FAIL",
      actualCount: 0,
      requiredCount: 0,
      summary: "Invalid criterion object provided to Type A validator.",
      proof: null,
      errors: ["Criterion must be an object."],
    }
  }

  const criterionId = criterion.id || null
  const requiredCount = typeof criterion.minimumCount === "number" && criterion.minimumCount > 0
    ? criterion.minimumCount
    : 1
  const targetEndpoint = criterion.targetEndpoint || ""

  if (!targetEndpoint) {
    errors.push("Type A criterion is missing 'targetEndpoint'.")
  }

  if (!evidenceItem || typeof evidenceItem !== "object") {
    return {
      criterionId,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      passed: false,
      status: "FAIL",
      actualCount: 0,
      requiredCount,
      summary: "Missing evidence item for Type A criterion.",
      proof: null,
      errors: ["Evidence item must be an object."],
    }
  }

  if (evidenceItem.criterionId && criterionId && evidenceItem.criterionId !== criterionId) {
    errors.push(
      `Criterion ID mismatch: Expected #${criterionId}, got #${evidenceItem.criterionId}.`
    )
  }

  const data = evidenceItem.data
  if (!data || typeof data !== "object") {
    return {
      criterionId,
      type: CRITERION_TYPES.TYPE_A_API_COUNT,
      passed: false,
      status: "FAIL",
      actualCount: 0,
      requiredCount,
      summary: "Evidence item has no telemetry data.",
      proof: null,
      errors: ["Evidence item data is missing or not an object."],
    }
  }

  // Extract raw calls list
  const rawCalls = Array.isArray(data.successfulCalls)
    ? data.successfulCalls
    : Array.isArray(data.calls)
      ? data.calls
      : Array.isArray(data)
        ? data
        : []

  const itemEndpoint = data.targetEndpoint || targetEndpoint
  if (targetEndpoint && itemEndpoint && targetEndpoint !== itemEndpoint) {
    errors.push(
      `Endpoint mismatch: Expected '${targetEndpoint}', found '${itemEndpoint}'.`
    )
  }

  const seenEventIds = new Set()
  const validCalls = []

  for (let i = 0; i < rawCalls.length; i++) {
    const call = rawCalls[i]
    if (!call || typeof call !== "object") continue

    // Check for duplicate event IDs
    if (call.id) {
      if (seenEventIds.has(call.id)) {
        errors.push(`Duplicate event ID detected: '${call.id}'.`)
        continue // Do not count duplicate events
      }
      seenEventIds.add(call.id)
    }

    // Verify endpoint match if individual call includes url
    if (call.url && targetEndpoint && call.url !== targetEndpoint) {
      continue // Ignore calls to different endpoints
    }

    // Verify status code
    const status = Number(call.status)
    const expectedStatus = criterion.expectedStatusCode
    const isStatusValid = expectedStatus !== undefined
      ? status === expectedStatus
      : status >= 200 && status < 300

    if (isStatusValid) {
      validCalls.push(call)
    }
  }

  const actualCount = validCalls.length
  const passed = actualCount >= requiredCount && errors.length === 0

  const summary = passed
    ? `${actualCount} of ${requiredCount} required calls verified for ${targetEndpoint}.`
    : actualCount < requiredCount
      ? `Insufficient calls: ${actualCount} verified, ${requiredCount} required for ${targetEndpoint}.`
      : `Validation failed: ${errors.join(" ")}`

  return {
    criterionId,
    type: CRITERION_TYPES.TYPE_A_API_COUNT,
    passed,
    status: passed ? "PASS" : "FAIL",
    actualCount,
    requiredCount,
    summary,
    proof: {
      endpoint: targetEndpoint,
      actualCount,
      requiredCount,
      verifiedCalls: validCalls.map((c) => ({
        id: c.id || null,
        status: c.status,
        timestamp: c.timestamp || null,
        method: c.method || "GET",
      })),
    },
    errors,
  }
}
