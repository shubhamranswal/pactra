import { isAddress } from "viem"
import { hashCanonical } from "./canonical.js"

export const CRITERION_TYPES = {
  TYPE_A_API_COUNT: "TYPE_A_API_COUNT",
  TYPE_B_TX_VERIFY: "TYPE_B_TX_VERIFY",
  TYPE_C_HASH_MATCH: "TYPE_C_HASH_MATCH",
}

const HEX_32_REGEX = /^0x[a-fA-F0-9]{64}$/

/**
 * Validates a single acceptance criterion object.
 *
 * @param {object} criterion - The criterion definition.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCriterion(criterion) {
  const errors = []

  if (!criterion || typeof criterion !== "object") {
    return { valid: false, errors: ["Criterion must be an object."] }
  }

  if (criterion.id === undefined || criterion.id === null || typeof criterion.id !== "number" || criterion.id < 1) {
    errors.push("Criterion 'id' must be a positive number.")
  }

  const validTypes = Object.values(CRITERION_TYPES)
  if (!validTypes.includes(criterion.type)) {
    errors.push(`Criterion 'type' must be one of: ${validTypes.join(", ")}. Received: '${criterion.type}'.`)
    return { valid: false, errors }
  }

  if (criterion.type === CRITERION_TYPES.TYPE_A_API_COUNT) {
    if (!criterion.targetEndpoint || typeof criterion.targetEndpoint !== "string") {
      errors.push("Type A criterion requires a non-empty 'targetEndpoint' string.")
    } else {
      try {
        new URL(criterion.targetEndpoint)
      } catch {
        errors.push("Type A criterion 'targetEndpoint' must be a valid URL.")
      }
    }

    if (
      typeof criterion.minimumCount !== "number" ||
      !Number.isInteger(criterion.minimumCount) ||
      criterion.minimumCount < 1
    ) {
      errors.push("Type A criterion requires 'minimumCount' to be an integer >= 1.")
    }
  }

  if (criterion.type === CRITERION_TYPES.TYPE_B_TX_VERIFY) {
    if (!criterion.recipient || typeof criterion.recipient !== "string" || !isAddress(criterion.recipient)) {
      errors.push("Type B criterion requires a valid 42-character EVM 'recipient' address.")
    }

    if (criterion.minimumAmountWei === undefined || criterion.minimumAmountWei === null) {
      errors.push("Type B criterion requires 'minimumAmountWei' string representation.")
    } else {
      try {
        const val = BigInt(criterion.minimumAmountWei.toString())
        if (val < 0n) {
          errors.push("Type B criterion 'minimumAmountWei' cannot be negative.")
        }
      } catch {
        errors.push("Type B criterion 'minimumAmountWei' must be a valid numeric/BigInt string.")
      }
    }

    if (criterion.chainId !== undefined && (typeof criterion.chainId !== "number" || criterion.chainId <= 0)) {
      errors.push("Type B criterion 'chainId' must be a positive integer if provided.")
    }
  }

  if (criterion.type === CRITERION_TYPES.TYPE_C_HASH_MATCH) {
    if (!criterion.expectedHash || typeof criterion.expectedHash !== "string" || !HEX_32_REGEX.test(criterion.expectedHash)) {
      errors.push("Type C criterion requires a valid 66-character 0x-prefixed 'expectedHash' bytes32 hex string.")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a complete Pact Terms object.
 *
 * @param {object} terms - Pact terms definition.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePactTerms(terms) {
  const errors = []

  if (!terms || typeof terms !== "object") {
    return { valid: false, errors: ["Pact terms must be an object."] }
  }

  if (!terms.originator || !isAddress(terms.originator)) {
    errors.push("Pact terms require a valid 42-character EVM 'originator' address.")
  }

  if (!terms.executor || !isAddress(terms.executor)) {
    errors.push("Pact terms require a valid 42-character EVM 'executor' address.")
  }

  if (terms.originator && terms.executor && terms.originator.toLowerCase() === terms.executor.toLowerCase()) {
    errors.push("'originator' and 'executor' cannot be the same address.")
  }

  const numAmount = parseFloat(terms.escrowAmount)
  if (terms.escrowAmount === undefined || isNaN(numAmount) || numAmount <= 0) {
    errors.push("Pact terms require a positive numeric 'escrowAmount'.")
  }

  if (!terms.token || typeof terms.token !== "string" || !terms.token.trim()) {
    errors.push("Pact terms require a non-empty 'token' symbol (e.g. 'MON').")
  }

  const timeout = Number(terms.timeoutSeconds)
  if (!Number.isInteger(timeout) || timeout < 60 || timeout > 365 * 86400) {
    errors.push("Pact terms require 'timeoutSeconds' between 60 (1 min) and 31,536,000 (365 days).")
  }

  if (!Array.isArray(terms.criteria) || terms.criteria.length === 0) {
    errors.push("Pact terms must define at least one acceptance criterion in 'criteria' array.")
  } else {
    terms.criteria.forEach((crit, idx) => {
      const res = validateCriterion(crit)
      if (!res.valid) {
        errors.push(`Criteria[${idx}]: ${res.errors.join("; ")}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Creates and canonically hashes a structured Pact Terms package.
 *
 * @param {object} params - Input parameters.
 * @returns {object} Canonical Pact Terms with computed termsHash and criteriaHash.
 */
export function createPactTerms({
  pactId,
  originator,
  executor,
  description = "",
  escrowAmount,
  token = "MON",
  timeoutSeconds = 86400,
  criteria = [],
}) {
  const normalizedCriteria = criteria.map((c, index) => ({
    id: c.id || index + 1,
    type: c.type,
    ...(c.type === CRITERION_TYPES.TYPE_A_API_COUNT && {
      targetEndpoint: c.targetEndpoint,
      minimumCount: Number(c.minimumCount),
      ...(c.expectedStatusCode ? { expectedStatusCode: Number(c.expectedStatusCode) } : {}),
    }),
    ...(c.type === CRITERION_TYPES.TYPE_B_TX_VERIFY && {
      recipient: c.recipient,
      minimumAmountWei: c.minimumAmountWei?.toString() || "0",
      chainId: c.chainId || 10143,
    }),
    ...(c.type === CRITERION_TYPES.TYPE_C_HASH_MATCH && {
      expectedHash: c.expectedHash,
    }),
    ...(c.description ? { description: c.description } : {}),
  }))

  const rawTerms = {
    pactId: pactId ? pactId.toString() : "0",
    originator,
    executor,
    description,
    escrowAmount: escrowAmount.toString(),
    token,
    timeoutSeconds: Number(timeoutSeconds),
    criteria: normalizedCriteria,
  }

  const validation = validatePactTerms(rawTerms)
  if (!validation.valid) {
    throw new Error(`Pact terms validation failed: ${validation.errors.join(" | ")}`)
  }

  const criteriaHash = hashCanonical(normalizedCriteria)
  const termsHash = hashCanonical(rawTerms)

  return {
    ...rawTerms,
    termsHash,
    criteriaHash,
  }
}

/**
 * Validates a compiled EvidencePackage against structural requirements.
 *
 * @param {object} evidence - The EvidencePackage to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEvidencePackage(evidence) {
  const errors = []

  if (!evidence || typeof evidence !== "object") {
    return { valid: false, errors: ["EvidencePackage must be an object."] }
  }

  if (evidence.pactId === undefined || evidence.pactId === null || String(evidence.pactId).trim() === "") {
    errors.push("EvidencePackage requires a non-empty 'pactId'.")
  }

  if (
    !evidence.pactTermsHash ||
    typeof evidence.pactTermsHash !== "string" ||
    !HEX_32_REGEX.test(evidence.pactTermsHash)
  ) {
    errors.push("EvidencePackage requires a valid 66-character bytes32 hex 'pactTermsHash'.")
  }

  if (!evidence.executor || !isAddress(evidence.executor)) {
    errors.push("EvidencePackage requires a valid 42-character EVM 'executor' address.")
  }

  if (
    typeof evidence.timestamp !== "number" ||
    !Number.isFinite(evidence.timestamp) ||
    evidence.timestamp <= 0
  ) {
    errors.push("EvidencePackage requires a positive finite numeric 'timestamp'.")
  }

  if (!Array.isArray(evidence.items) || evidence.items.length === 0) {
    errors.push("EvidencePackage must contain a non-empty 'items' array.")
  } else {
    evidence.items.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        errors.push(`Evidence item[${index}] must be an object.`)
        return
      }
      if (typeof item.criterionId !== "number" || item.criterionId < 1) {
        errors.push(`Evidence item[${index}] requires a positive numeric 'criterionId'.`)
      }
      if (!Object.values(CRITERION_TYPES).includes(item.type)) {
        errors.push(`Evidence item[${index}] has unsupported type '${item.type}'.`)
      }
      if (item.data === undefined) {
        errors.push(`Evidence item[${index}] requires a 'data' field (can be object, array, or null).`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

