import { hashCanonical } from "./canonical.js"
import { CRITERION_TYPES } from "./schema.js"
import { validateTypeA } from "./validators/validateTypeA.js"
import { validateTypeB } from "./validators/validateTypeB.js"
import { validateTypeC } from "./validators/validateTypeC.js"

export class VeridictEngine {
  /**
   * Evaluates an evidence package against pact criteria deterministically.
   *
   * @param {object} params
   * @param {object} [params.pact] - On-chain pact state
   * @param {object} params.terms - Pact terms defining criteria
   * @param {object} params.evidencePackage - Submitted evidence package
   * @param {object} [params.publicClient] - Optional viem publicClient for on-chain queries
   * @returns {Promise<object>} Structured VeridictResult
   */
  static async evaluate({ pact, terms, evidencePackage, publicClient } = {}) {
    const verifiedAt = Math.floor(Date.now() / 1000)
    const pactId = pact?.id || terms?.pactId || evidencePackage?.pactId || "unknown"

    if (!evidencePackage) {
      return {
        pactId,
        verdict: "FAIL",
        evidenceHash: null,
        verifiedAt,
        criteriaResults: [],
        failureReasons: ["Evidence package is missing or empty"],
      }
    }

    let evidenceHash
    try {
      evidenceHash = hashCanonical(evidencePackage)
    } catch (err) {
      return {
        pactId,
        verdict: "FAIL",
        evidenceHash: null,
        verifiedAt,
        criteriaResults: [],
        failureReasons: [`Failed to compute canonical evidence hash: ${err.message}`],
      }
    }

    const criteria = terms?.criteria || []
    if (criteria.length === 0) {
      return {
        pactId,
        verdict: "FAIL",
        evidenceHash,
        verifiedAt,
        criteriaResults: [],
        failureReasons: ["Pact defines no acceptance criteria"],
      }
    }

    const items = Array.isArray(evidencePackage.items) ? evidencePackage.items : []
    const criteriaResults = []
    const failureReasons = []

    for (const criterion of criteria) {
      // Find matching evidence item by criterionId
      const evidenceItem = items.find((item) => item.criterionId === criterion.criterionId)

      if (!evidenceItem) {
        criteriaResults.push({
          criterionId: criterion.criterionId,
          type: criterion.type,
          description: criterion.description || `Criterion #${criterion.criterionId}`,
          passed: false,
          error: `Missing evidence item for criterion #${criterion.criterionId}`,
        })
        failureReasons.push(`Criterion #${criterion.criterionId} has no submitted evidence`)
        continue
      }

      let result
      try {
        switch (criterion.type) {
          case CRITERION_TYPES.TYPE_A:
            result = validateTypeA(criterion, evidenceItem)
            break
          case CRITERION_TYPES.TYPE_B:
            result = await validateTypeB(criterion, evidenceItem, {
              publicClient,
              pactDeadline: pact?.deadline,
            })
            break
          case CRITERION_TYPES.TYPE_C:
            result = validateTypeC(criterion, evidenceItem)
            break
          default:
            result = {
              passed: false,
              criterionId: criterion.criterionId,
              type: criterion.type,
              error: `Unsupported criterion type: ${criterion.type}`,
            }
        }
      } catch (err) {
        result = {
          passed: false,
          criterionId: criterion.criterionId,
          type: criterion.type,
          error: `Validator exception: ${err.message}`,
        }
      }

      criteriaResults.push({
        ...result,
        description: criterion.description || `Criterion #${criterion.criterionId}`,
      })

      if (!result.passed) {
        failureReasons.push(
          result.error ||
            result.details ||
            `Criterion #${criterion.criterionId} (${criterion.type}) failed verification`
        )
      }
    }

    const allPassed = criteriaResults.length > 0 && criteriaResults.every((r) => r.passed)
    const verdict = allPassed ? "PASS" : "FAIL"

    return {
      pactId,
      verdict,
      evidenceHash,
      verifiedAt,
      criteriaResults,
      failureReasons,
    }
  }
}
