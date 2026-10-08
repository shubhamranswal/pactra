/**
 * @file manifest.js
 * @description Evidence Package Compiler & Manifest Generator.
 *
 * Implements Task 7.4.1 / P7-FR-006:
 * Matches recorded agent telemetry against pact acceptance criteria, compiles
 * structured EvidencePackage objects, and computes the canonical RFC 8785 evidenceHash.
 */

import { hashCanonical } from "./canonical.js"
import { CRITERION_TYPES, validateEvidencePackage } from "./schema.js"
import { EVENT_TYPES, ExecutionRecorder } from "./recorder.js"

/**
 * Compiles an EvidencePackage from recorded execution traces against Pact terms criteria.
 *
 * @param {object} params
 * @param {object} params.terms - The PactTerms definition object
 * @param {Array<object>|ExecutionRecorder} params.traces - Array of telemetry events or ExecutionRecorder instance
 * @param {string} [params.executor] - Submitting executor EVM address (defaults to terms.executor)
 * @param {number} [params.timestamp] - Unix epoch seconds (defaults to now)
 * @param {boolean} [params.strict=false] - Whether to throw ERR_MISSING_CRITERION_EVIDENCE on missing criteria
 * @returns {{ package: object, evidenceHash: string, warnings: string[], isComplete: boolean }}
 */
export function compileEvidencePackage({
  terms,
  traces,
  executor,
  timestamp,
  strict = false,
}) {
  if (!terms || typeof terms !== "object") {
    throw new Error("ERR_INVALID_TERMS: Pact terms must be provided as an object.")
  }

  if (!Array.isArray(terms.criteria) || terms.criteria.length === 0) {
    throw new Error("ERR_INVALID_TERMS: Pact terms must have a non-empty 'criteria' array.")
  }

  // Extract events array if traces is an ExecutionRecorder instance
  const rawEvents = traces instanceof ExecutionRecorder
    ? traces.getTraces()
    : Array.isArray(traces)
      ? traces
      : []

  const warnings = []
  const items = []

  for (const criterion of terms.criteria) {
    const criterionId = criterion.id

    if (criterion.type === CRITERION_TYPES.TYPE_A_API_COUNT) {
      const targetEndpoint = criterion.targetEndpoint
      const expectedStatus = criterion.expectedStatusCode

      // Match successful calls to targetEndpoint
      const matchingCalls = rawEvents.filter((event) => {
        if (event.type !== EVENT_TYPES.API_CALL) return false
        if (event.url !== targetEndpoint) return false

        if (expectedStatus !== undefined) {
          return event.status === expectedStatus
        }
        return event.status >= 200 && event.status < 300
      })

      const requiredCount = Number(criterion.minimumCount) || 1
      if (matchingCalls.length < requiredCount) {
        warnings.push(
          `Criterion #${criterionId} (Type A): Required ${requiredCount} calls to '${targetEndpoint}', found ${matchingCalls.length}.`
        )
      }

      items.push({
        criterionId,
        type: CRITERION_TYPES.TYPE_A_API_COUNT,
        data: {
          targetEndpoint,
          successfulCalls: matchingCalls.map((c) => ({
            id: c.id,
            timestamp: c.timestamp,
            method: c.method,
            status: c.status,
            responseBodyHash: c.responseBodyHash || null,
          })),
          callCount: matchingCalls.length,
          requiredCount,
        },
      })
    } else if (criterion.type === CRITERION_TYPES.TYPE_B_TX_VERIFY) {
      const recipient = criterion.recipient?.toLowerCase()

      // Find blockchain transactions targeting recipient
      const matchingTxs = rawEvents.filter((event) => {
        if (event.type !== EVENT_TYPES.BLOCKCHAIN_TX) return false
        if (recipient && event.to?.toLowerCase() !== recipient) return false
        return true
      })

      if (matchingTxs.length === 0) {
        warnings.push(
          `Criterion #${criterionId} (Type B): No matching on-chain transaction found for recipient '${criterion.recipient}'.`
        )
      }

      const selectedTx = matchingTxs[matchingTxs.length - 1] || null

      items.push({
        criterionId,
        type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
        data: selectedTx
          ? {
              txHash: selectedTx.txHash,
              from: selectedTx.from,
              to: selectedTx.to,
              value: selectedTx.value,
              blockNumber: selectedTx.blockNumber,
              chainId: selectedTx.chainId || 10143,
              status: selectedTx.status || "success",
            }
          : null,
      })
    } else if (criterion.type === CRITERION_TYPES.TYPE_C_HASH_MATCH) {
      const expectedHash = criterion.expectedHash?.toLowerCase()

      // Find tool outputs matching expectedHash or latest tool output
      let matchedTool = rawEvents.find(
        (e) => e.type === EVENT_TYPES.TOOL_OUTPUT && e.outputHash?.toLowerCase() === expectedHash
      )

      if (!matchedTool) {
        matchedTool = rawEvents.find((e) => e.type === EVENT_TYPES.TOOL_OUTPUT)
      }

      if (!matchedTool) {
        warnings.push(
          `Criterion #${criterionId} (Type C): No tool output found matching expectedHash '${criterion.expectedHash}'.`
        )
      }

      items.push({
        criterionId,
        type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
        data: matchedTool
          ? {
              toolName: matchedTool.toolName,
              outputPayload: matchedTool.payload !== undefined ? matchedTool.payload : matchedTool.outputPayload,
              outputHash: matchedTool.outputHash,
            }
          : null,
      })
    }
  }

  if (strict && warnings.length > 0) {
    throw new Error(`ERR_MISSING_CRITERION_EVIDENCE: ${warnings.join(" | ")}`)
  }

  const executorAddress = (executor || terms.executor || "0x0000000000000000000000000000000000000000").toLowerCase()
  const nowEpoch = typeof timestamp === "number" && timestamp > 0
    ? timestamp
    : Math.floor(Date.now() / 1000)

  const evidencePackage = {
    pactId: String(terms.pactId || "0"),
    pactTermsHash: terms.termsHash || hashCanonical(terms),
    executor: executorAddress,
    timestamp: nowEpoch,
    items,
  }

  const validation = validateEvidencePackage(evidencePackage)
  if (!validation.valid) {
    throw new Error(`ERR_INVALID_EVIDENCE_PACKAGE: ${validation.errors.join("; ")}`)
  }

  const evidenceHash = hashCanonical(evidencePackage)

  return {
    package: evidencePackage,
    evidenceHash,
    warnings,
    isComplete: warnings.length === 0,
  }
}

/**
 * Convenient compiler namespace.
 */
export const EvidenceManifestCompiler = {
  compile: (terms, traces, options = {}) => {
    return compileEvidencePackage({
      terms,
      traces,
      ...options,
    }).package
  },
  computeEvidenceHash: (pkg) => {
    return hashCanonical(pkg)
  },
  compileFull: compileEvidencePackage,
}

