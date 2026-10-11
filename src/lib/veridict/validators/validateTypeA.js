/**
 * Validates Type A Criterion: Deterministic API Execution Count.
 * Verifies that the count of successful HTTP requests (2xx) to targetEndpoint >= minimumCount.
 * Rejects duplicate event IDs.
 *
 * @param {object} criterion - { criterionId, targetEndpoint, minimumCount }
 * @param {object} evidenceItem - { calls: Array<{ id, url, method, status }> }
 * @returns {object} Validation result
 */
export function validateTypeA(criterion, evidenceItem) {
  if (!criterion || !criterion.targetEndpoint || !criterion.minimumCount) {
    return {
      passed: false,
      criterionId: criterion?.criterionId,
      type: "TYPE_A_API_COUNT",
      error: "Invalid Type A criterion parameters",
      actualCount: 0,
      minimumCount: criterion?.minimumCount || 0,
    }
  }

  if (!evidenceItem || !Array.isArray(evidenceItem.calls)) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_A_API_COUNT",
      error: "Missing calls array in evidence item",
      actualCount: 0,
      minimumCount: criterion.minimumCount,
    }
  }

  const seenIds = new Set()
  let validCallsCount = 0

  for (const call of evidenceItem.calls) {
    if (!call || typeof call !== "object") continue

    // Reject duplicate call IDs to prevent replay
    if (call.id) {
      if (seenIds.has(call.id)) continue
      seenIds.add(call.id)
    }

    const matchesEndpoint =
      call.url &&
      (call.url === criterion.targetEndpoint ||
        call.url.startsWith(criterion.targetEndpoint) ||
        call.url.includes(criterion.targetEndpoint))

    const isSuccessfulStatus = typeof call.status === "number" && call.status >= 200 && call.status < 300

    if (matchesEndpoint && isSuccessfulStatus) {
      validCallsCount++
    }
  }

  const passed = validCallsCount >= criterion.minimumCount

  return {
    passed,
    criterionId: criterion.criterionId,
    type: "TYPE_A_API_COUNT",
    actualCount: validCallsCount,
    minimumCount: criterion.minimumCount,
    details: passed
      ? `Verified ${validCallsCount} successful calls (required >= ${criterion.minimumCount})`
      : `Insufficient successful calls: got ${validCallsCount}, required ${criterion.minimumCount}`,
  }
}
