/**
 * @file engine.js
 * @description Veridict Deterministic Verification Engine Orchestrator.
 *
 * Implements Task 7.7.1 / P7-FR-011 / Section 11:
 * Coordinates the full deterministic verification pipeline:
 * Step 1: Hash Validation (termsHash and committed evidenceHash)
 * Step 2: Criteria Matching by criterionId
 * Step 3: Concurrent Deterministic Validator Execution (Type A, Type B, Type C)
 * Step 4: Aggregate Verdict Synthesis (Binary outcome: PASS or FAIL)
 */

import { hashCanonical } from "./canonical.js"
import { CRITERION_TYPES, validateEvidencePackage } from "./schema.js"
import { validateTypeA } from "./validators/validateTypeA.js"
import { validateTypeB } from "./validators/validateTypeB.js"
import { validateTypeC } from "./validators/validateTypeC.js"

export const VERDICT = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
})

/**
 * Executes full deterministic verification of an evidence package against pact terms.
 *
 * @param {object} terms - The canonical PactTerms definition
 * @param {object} evidence - The submitted EvidencePackage
 * @param {object} [options] - Verification configuration
 * @param {object} [options.publicClient] - Viem publicClient for Type B on-chain queries
 * @param {string} [options.committedEvidenceHash] - On-chain committed evidenceHash from contract
 * @param {string} [options.executor] - Expected executor address
 * @param {number|bigint} [options.deadline] - Pact deadline timestamp in seconds
 * @param {boolean} [options.offline=false] - If true, evaluates Type B without live RPC queries
 * @returns {Promise<object>} Comprehensive VeridictResult
 */
export async function verifyPactEvidence(terms, evidence, options = {}) {
  const verifiedAt = Math.floor(Date.now() / 1000)
  const generalErrors = []

  if (!terms || typeof terms !== "object" || !Array.isArray(terms.criteria)) {
    return {
      pactId: evidence?.pactId ? String(evidence.pactId) : "unknown",
      verdict: VERDICT.FAIL,
      passed: false,
      verifiedAt,
      evidenceHash: null,
      pactTermsHash: null,
      onChainCommitted: false,
      summary: "Verification failed: Malformed or missing Pact terms definition.",
      criteria: [],
      failures: ["ERR_INVALID_TERMS: Pact terms must be an object with a criteria array."],
      errors: ["ERR_INVALID_TERMS: Pact terms must be an object with a criteria array."],
    }
  }

  const pactId = String(terms.pactId || evidence?.pactId || "0")

  // Validate structural schema of EvidencePackage
  const evidenceValidation = validateEvidencePackage(evidence)
  if (!evidenceValidation.valid) {
    return {
      pactId,
      verdict: VERDICT.FAIL,
      passed: false,
      verifiedAt,
      evidenceHash: null,
      pactTermsHash: null,
      onChainCommitted: false,
      summary: `Verification failed: EvidencePackage schema invalid (${evidenceValidation.errors[0]}).`,
      criteria: [],
      failures: evidenceValidation.errors,
      errors: evidenceValidation.errors,
    }
  }

  // --- STEP 1: HASH VALIDATION ---
  let computedEvidenceHash = null
  try {
    computedEvidenceHash = hashCanonical(evidence)
  } catch (err) {
    generalErrors.push(`ERR_EVIDENCE_CANONICALIZATION_FAILED: ${err.message}`)
  }

  // Verify that evidence.pactTermsHash matches canonical hash of terms
  const expectedTermsHash = terms.termsHash || hashCanonical(terms)
  if (
    evidence.pactTermsHash &&
    expectedTermsHash &&
    evidence.pactTermsHash.toLowerCase() !== expectedTermsHash.toLowerCase()
  ) {
    generalErrors.push(
      `ERR_TERMS_HASH_MISMATCH: Evidence binds to terms hash '${evidence.pactTermsHash}', but terms hash is '${expectedTermsHash}'.`
    )
  }

  // If on-chain committed evidence hash is provided, verify match
  let onChainCommitted = null
  if (options.committedEvidenceHash) {
    const committed = options.committedEvidenceHash.toLowerCase()
    const computed = computedEvidenceHash ? computedEvidenceHash.toLowerCase() : null
    onChainCommitted = Boolean(computed && committed === computed)

    if (!onChainCommitted) {
      generalErrors.push(
        `ERR_EVIDENCE_HASH_MISMATCH: Computed evidence hash '${computed}' does not match on-chain committed hash '${committed}'.`
      )
    }
  }

  // --- STEP 2: CRITERIA MATCHING & STEP 3: DETERMINISTIC VALIDATION ---
  const evidenceItemsMap = new Map()
  if (Array.isArray(evidence.items)) {
    for (const item of evidence.items) {
      if (item && item.criterionId !== undefined) {
        evidenceItemsMap.set(item.criterionId, item)
      }
    }
  }

  const criteriaResultsPromises = terms.criteria.map(async (criterion) => {
    const evidenceItem = evidenceItemsMap.get(criterion.id)

    if (!evidenceItem) {
      return {
        criterionId: criterion.id,
        type: criterion.type,
        passed: false,
        status: "FAIL",
        summary: `Missing evidence item for criterion #${criterion.id}.`,
        proof: null,
        errors: [`ERR_MISSING_CRITERION_EVIDENCE: No evidence item provided for criterion #${criterion.id}.`],
      }
    }

    if (criterion.type === CRITERION_TYPES.TYPE_A_API_COUNT) {
      return validateTypeA(criterion, evidenceItem)
    }

    if (criterion.type === CRITERION_TYPES.TYPE_B_TX_VERIFY) {
      return await validateTypeB(criterion, evidenceItem, {
        publicClient: options.publicClient,
        executor: options.executor || terms.executor,
        deadline: options.deadline !== undefined ? options.deadline : terms.deadline,
        offline: options.offline,
      })
    }

    if (criterion.type === CRITERION_TYPES.TYPE_C_HASH_MATCH) {
      return validateTypeC(criterion, evidenceItem)
    }

    return {
      criterionId: criterion.id,
      type: criterion.type,
      passed: false,
      status: "FAIL",
      summary: `Unsupported criterion type: '${criterion.type}'.`,
      proof: null,
      errors: [`ERR_UNSUPPORTED_CRITERION_TYPE: '${criterion.type}'.`],
    }
  })

  const criteriaResults = await Promise.all(criteriaResultsPromises)

  // --- STEP 4: VERDICT SYNTHESIS ---
  const criteriaFailures = criteriaResults
    .filter((r) => !r.passed)
    .map((r) => `#${r.criterionId} (${r.type}): ${r.errors.join("; ") || r.summary}`)

  const allFailures = [...generalErrors, ...criteriaFailures]
  const passed = allFailures.length === 0
  const verdict = passed ? VERDICT.PASS : VERDICT.FAIL

  const summary = passed
    ? `All ${criteriaResults.length} criteria verified successfully. Overall verdict: PASS.`
    : `Verification failed with ${allFailures.length} issue(s): ${allFailures[0]}`

  return {
    pactId,
    verdict,
    passed,
    verifiedAt,
    evidenceHash: computedEvidenceHash,
    pactTermsHash: expectedTermsHash,
    onChainCommitted,
    summary,
    criteria: criteriaResults,
    failures: allFailures,
    errors: allFailures,
  }
}

/**
 * VeridictEngine Class wrapping verifyPactEvidence.
 */
export class VeridictEngine {
  /**
   * Evaluates evidence against pact terms.
   *
   * @param {object} terms
   * @param {object} evidence
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  static async verify(terms, evidence, options = {}) {
    return verifyPactEvidence(terms, evidence, options)
  }

  /**
   * Alias for verify.
   */
  static async evaluate(terms, evidence, options = {}) {
    return verifyPactEvidence(terms, evidence, options)
  }
}
