import { compileEvidencePackage } from "../src/lib/veridict/manifest.js"
import { CRITERION_TYPES } from "../src/lib/veridict/schema.js"
import { hashCanonical } from "../src/lib/veridict/canonical.js"

/**
 * Builds structured EvidencePackage items from recorded execution traces.
 *
 * @param {object} params
 * @param {Array} params.criteria - Authoritative pact acceptance criteria
 * @param {Array} params.traces - Raw traces collected by ExecutionRecorder
 * @returns {Array} Formatted items array for EvidencePackage
 */
export function buildEvidenceItemsFromTraces({ criteria = [], traces = [] }) {
  const items = []

  for (const criterion of criteria) {
    if (criterion.type === CRITERION_TYPES.TYPE_A) {
      // Find all API_CALL traces matching criterion.targetEndpoint
      const matchingCalls = traces
        .filter((t) => t.type === "API_CALL")
        .map((t) => ({
          id: t.id,
          url: t.url,
          method: t.method,
          status: t.status,
        }))

      items.push({
        criterionId: criterion.criterionId,
        type: CRITERION_TYPES.TYPE_A,
        calls: matchingCalls,
      })
    } else if (criterion.type === CRITERION_TYPES.TYPE_B) {
      // Find matching blockchain tx trace
      const txTrace = traces.find((t) => t.type === "BLOCKCHAIN_TX")
      items.push({
        criterionId: criterion.criterionId,
        type: CRITERION_TYPES.TYPE_B,
        txHash: txTrace?.txHash || null,
        recipient: txTrace?.to || null,
        valueWei: txTrace?.value || "0",
        blockTimestamp: txTrace?.timestamp || null,
      })
    } else if (criterion.type === CRITERION_TYPES.TYPE_C) {
      // Find matching tool output trace
      const toolTrace = traces.find((t) => t.type === "TOOL_OUTPUT")
      items.push({
        criterionId: criterion.criterionId,
        type: CRITERION_TYPES.TYPE_C,
        outputPayload: toolTrace?.outputPayload || null,
      })
    }
  }

  return items
}

/**
 * Compiles an authoritative EvidencePackage and computes canonical evidenceHash from recorded traces.
 *
 * @param {object} params
 * @param {string|number} params.pactId
 * @param {string} params.executor - Recipient EVM address
 * @param {Array} params.criteria - Authoritative criteria
 * @param {Array} params.traces - Raw traces from ExecutionRecorder
 * @returns {{ evidencePackage: object, evidenceHash: `0x${string}` }}
 */
export function compileEvidenceFromTraces({
  pactId,
  executor,
  criteria = [],
  traces = [],
  pactTermsHash = null,
}) {
  const items = buildEvidenceItemsFromTraces({ criteria, traces })

  const termsHash =
    pactTermsHash || hashCanonical({ pactId: String(pactId), criteria, executor })

  return compileEvidencePackage({
    pactId: String(pactId),
    pactTermsHash: termsHash,
    executor: executor || "",
    items,
  })
}
