/**
 * @file validateTypeC.js
 * @description Type C Deterministic Validator (Cryptographic Hash Equivalence).
 *
 * Implements Task 7.6.3 / P7-FR-010:
 * Deterministically verifies that:
 * 1. keccak256(canonicalJson(evidence.outputPayload)) === criterion.expectedHash
 * 2. If evidence specifies outputHash, verifies outputPayload produces that exact hash.
 * 3. Enforces strict 32-byte equality check.
 */

import { hashCanonical } from "../canonical.js"
import { CRITERION_TYPES } from "../schema.js"

const HEX_32_REGEX = /^0x[0-9a-fA-F]{64}$/

/**
 * Deterministically validates an evidence item against a Type C acceptance criterion.
 *
 * @param {object} criterion - The Type C criterion definition
 * @param {object} evidenceItem - The evidence item containing output payload / hash telemetry
 * @returns {object} Validation result { criterionId, type, passed, status, actualHash, expectedHash, summary, proof, errors }
 */
export function validateTypeC(criterion, evidenceItem) {
  const errors = []

  if (!criterion || typeof criterion !== "object") {
    return {
      criterionId: null,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      passed: false,
      status: "FAIL",
      actualHash: null,
      expectedHash: null,
      summary: "Invalid criterion object provided to Type C validator.",
      proof: null,
      errors: ["Criterion must be an object."],
    }
  }

  const criterionId = criterion.id || null
  const expectedHash = criterion.expectedHash ? criterion.expectedHash.toLowerCase() : null

  if (!expectedHash || !HEX_32_REGEX.test(expectedHash)) {
    errors.push("Type C criterion requires a valid 66-character bytes32 hex 'expectedHash'.")
  }

  if (!evidenceItem || typeof evidenceItem !== "object") {
    return {
      criterionId,
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      passed: false,
      status: "FAIL",
      actualHash: null,
      expectedHash,
      summary: "Missing evidence item for Type C criterion.",
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
      type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
      passed: false,
      status: "FAIL",
      actualHash: null,
      expectedHash,
      summary: "Evidence item has no payload or hash data.",
      proof: null,
      errors: ["Evidence item data is missing or not an object."],
    }
  }

  const payload = data.outputPayload !== undefined ? data.outputPayload : data.payload
  const statedHash = data.outputHash ? data.outputHash.toLowerCase() : null

  let computedHash = null

  if (payload !== undefined) {
    try {
      computedHash = hashCanonical(payload).toLowerCase()
    } catch (err) {
      errors.push(`ERR_TYPE_C_CANONICALIZATION_FAILED: Unable to compute canonical hash of payload: ${err.message}`)
    }

    // Verify consistency between stated hash and computed payload hash
    if (statedHash && computedHash && statedHash !== computedHash) {
      errors.push(
        `ERR_TYPE_C_PAYLOAD_TAMPERED: Stated outputHash '${statedHash}' does not match canonical payload hash '${computedHash}'.`
      )
    }
  }

  const actualHash = computedHash || statedHash

  if (!actualHash) {
    errors.push("ERR_TYPE_C_MISSING_DATA: Evidence item contains neither payload nor outputHash.")
  } else if (!HEX_32_REGEX.test(actualHash)) {
    errors.push(`Invalid actual hash format '${actualHash}'. Must be a 66-character hex string.`)
  }

  if (expectedHash && actualHash && expectedHash !== actualHash) {
    errors.push(
      `ERR_TYPE_C_HASH_MISMATCH: Actual hash '${actualHash}' does not match expected '${expectedHash}'.`
    )
  }

  const passed = Boolean(expectedHash && actualHash && expectedHash === actualHash && errors.length === 0)

  const summary = passed
    ? `Cryptographic output hash matches expected hash (${expectedHash.slice(0, 10)}...).`
    : `Hash verification failed: ${errors.join(" ")}`

  return {
    criterionId,
    type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
    passed,
    status: passed ? "PASS" : "FAIL",
    actualHash,
    expectedHash,
    summary,
    proof: {
      expectedHash,
      actualHash,
      toolName: data.toolName || null,
      match: passed,
    },
    errors,
  }
}
