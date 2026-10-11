import { hashCanonical } from "./canonical.js"
import { validateEvidencePackage } from "./schema.js"

/**
 * Compiles recorded traces or item payloads into a standard EvidencePackage
 * and computes its deterministic canonical evidenceHash.
 *
 * @param {object} params
 * @param {string|number} params.pactId
 * @param {string} [params.pactTermsHash]
 * @param {string} params.executor
 * @param {Array} params.items
 * @returns {{ evidencePackage: object, evidenceHash: `0x${string}` }}
 */
export function compileEvidencePackage({
  pactId,
  pactTermsHash = "0x0000000000000000000000000000000000000000000000000000000000000000",
  executor,
  items = [],
  timestamp = null,
}) {
  const evidencePackage = {
    pactId: pactId.toString(),
    pactTermsHash,
    executor: executor || "",
    timestamp: timestamp ?? Math.floor(Date.now() / 1000),
    items,
  }

  const validation = validateEvidencePackage(evidencePackage)
  if (!validation.valid) {
    throw new Error(`Invalid evidence package: ${validation.errors.join(", ")}`)
  }

  const evidenceHash = hashCanonical(evidencePackage)

  return {
    evidencePackage,
    evidenceHash,
  }
}
