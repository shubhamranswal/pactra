import { isAddress } from "viem"

export const CRITERION_TYPES = {
  TYPE_A: "TYPE_A_API_COUNT",
  TYPE_B: "TYPE_B_TX_VERIFY",
  TYPE_C: "TYPE_C_HASH_MATCH",
}

/**
 * Validates a single acceptance criterion definition.
 *
 * @param {object} criterion
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCriterion(criterion) {
  const errors = []
  if (!criterion || typeof criterion !== "object") {
    return { valid: false, errors: ["Criterion must be an object"] }
  }

  if (criterion.criterionId === undefined || criterion.criterionId === null) {
    errors.push("Missing criterionId")
  }

  if (!Object.values(CRITERION_TYPES).includes(criterion.type)) {
    errors.push(`Unsupported criterion type: ${criterion.type}`)
    return { valid: false, errors }
  }

  if (criterion.type === CRITERION_TYPES.TYPE_A) {
    if (!criterion.targetEndpoint || typeof criterion.targetEndpoint !== "string") {
      errors.push("Type A requires string targetEndpoint")
    }
    if (typeof criterion.minimumCount !== "number" || criterion.minimumCount <= 0) {
      errors.push("Type A requires minimumCount > 0")
    }
  } else if (criterion.type === CRITERION_TYPES.TYPE_B) {
    if (!criterion.recipient || !isAddress(criterion.recipient)) {
      errors.push("Type B requires valid EVM recipient address")
    }
    if (!criterion.minimumAmountWei || typeof criterion.minimumAmountWei !== "string") {
      errors.push("Type B requires minimumAmountWei as string")
    }
  } else if (criterion.type === CRITERION_TYPES.TYPE_C) {
    if (
      !criterion.expectedHash ||
      typeof criterion.expectedHash !== "string" ||
      !/^0x[a-fA-F0-9]{64}$/.test(criterion.expectedHash)
    ) {
      errors.push("Type C requires 32-byte hex expectedHash (0x + 64 hex characters)")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates an agreement's PactTerms structure.
 *
 * @param {object} terms
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePactTerms(terms) {
  const errors = []
  if (!terms || typeof terms !== "object") {
    return { valid: false, errors: ["Pact terms must be an object"] }
  }

  if (!terms.pactId) {
    errors.push("Missing pactId")
  }
  if (!terms.originator || !isAddress(terms.originator)) {
    errors.push("Missing or invalid originator address")
  }
  if (!terms.executor || !isAddress(terms.executor)) {
    errors.push("Missing or invalid executor address")
  }
  if (!Array.isArray(terms.criteria) || terms.criteria.length === 0) {
    errors.push("Pact terms must define at least one criterion")
  } else {
    terms.criteria.forEach((crit, index) => {
      const res = validateCriterion(crit)
      if (!res.valid) {
        errors.push(`Criterion #${index + 1} invalid: ${res.errors.join(", ")}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates an EvidencePackage structure.
 *
 * @param {object} pkg
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEvidencePackage(pkg) {
  const errors = []
  if (!pkg || typeof pkg !== "object") {
    return { valid: false, errors: ["Evidence package must be an object"] }
  }

  if (pkg.pactId === undefined || pkg.pactId === null) {
    errors.push("Missing pactId in evidence package")
  }
  if (!pkg.items || !Array.isArray(pkg.items)) {
    errors.push("Evidence package items must be an array")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
