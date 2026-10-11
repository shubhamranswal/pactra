import { hashCanonical } from "../canonical.js"

/**
 * Validates Type C Criterion: Cryptographic Hash Equivalence.
 * Deterministically computes keccak256(canonicalJson(outputPayload)) and checks equality with expectedHash.
 *
 * @param {object} criterion - { criterionId, expectedHash }
 * @param {object} evidenceItem - { outputPayload }
 * @returns {object} Validation result
 */
export function validateTypeC(criterion, evidenceItem) {
  if (!criterion || !criterion.expectedHash) {
    return {
      passed: false,
      criterionId: criterion?.criterionId,
      type: "TYPE_C_HASH_MATCH",
      error: "Missing expectedHash in criterion",
    }
  }

  if (!evidenceItem || evidenceItem.outputPayload === undefined) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_C_HASH_MATCH",
      error: "Missing outputPayload in evidence item",
    }
  }

  try {
    const actualHash = hashCanonical(evidenceItem.outputPayload)
    const passed = actualHash.toLowerCase() === criterion.expectedHash.toLowerCase()

    return {
      passed,
      criterionId: criterion.criterionId,
      type: "TYPE_C_HASH_MATCH",
      actualHash,
      expectedHash: criterion.expectedHash,
      details: passed
        ? `Cryptographic output hash matches expected ${criterion.expectedHash}`
        : `Hash mismatch: computed ${actualHash}, expected ${criterion.expectedHash}`,
    }
  } catch (err) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_C_HASH_MATCH",
      error: `Hash calculation failed: ${err.message}`,
    }
  }
}
