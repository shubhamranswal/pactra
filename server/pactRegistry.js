import { CRITERION_TYPES } from "../src/lib/veridict/schema.js"
import { hashCanonical } from "../src/lib/veridict/canonical.js"

export const DEFAULT_DELIVERABLE_PAYLOAD = {
  status: "verified_execution",
  completedAt: 1791112500,
}

export const DEFAULT_DELIVERABLE_HASH = hashCanonical(DEFAULT_DELIVERABLE_PAYLOAD)

const AGENT_PORT = process.env.AGENT_PORT || "3001"
const LOCAL_TEST_ENDPOINT = `http://localhost:${AGENT_PORT}/api/test-telemetry`

/**
 * Server-Side Authoritative Pact Registry.
 * Binds immutable criteria and task specifications to on-chain pacts.
 * Ensures the backend never trusts client-supplied criteria.
 */
export const PACT_SPECIFICATIONS = {
  // Pre-configured specification for Pact #1 (Primary Demo / Test Pact)
  "1": {
    pactId: "1",
    description: "Machine-verifiable telemetry verification and cryptographic deliverable",
    criteria: [
      {
        criterionId: 1,
        type: CRITERION_TYPES.TYPE_A,
        description: "API Execution: Minimum 2 verified successful telemetry calls to local test endpoint",
        targetEndpoint: LOCAL_TEST_ENDPOINT,
        minimumCount: 2,
      },
      {
        criterionId: 2,
        type: CRITERION_TYPES.TYPE_C,
        description: "Cryptographic Artifact: Output deliverable canonical hash match",
        expectedHash: DEFAULT_DELIVERABLE_HASH,
      },
    ],
    taskPrompt: `Fulfill the pact obligations:
1. Make 2 separate POST requests to ${LOCAL_TEST_ENDPOINT} using 'tool_api_caller' with payload { ping: true, runId: Date.now() }.
2. Use 'tool_crypto_hasher' with outputPayload: ${JSON.stringify(DEFAULT_DELIVERABLE_PAYLOAD)} to compute the required cryptographic digest.`,
  },
}

/**
 * Resolves authoritative pact terms for a given pactId and on-chain record.
 * Falls back to a deterministic template if the pact ID is newly created.
 */
export function getAuthoritativePactTerms(pactId, pactOnChain = {}) {
  const cleanId = String(pactId)

  if (PACT_SPECIFICATIONS[cleanId]) {
    const spec = PACT_SPECIFICATIONS[cleanId]
    return {
      pactId: cleanId,
      originator: pactOnChain.creator || "0x0000000000000000000000000000000000000000",
      executor: pactOnChain.recipient || "0x0000000000000000000000000000000000000000",
      description: spec.description,
      criteria: spec.criteria,
      taskPrompt: spec.taskPrompt,
    }
  }

  // Deterministic standard template for dynamic on-chain pacts
  return {
    pactId: cleanId,
    originator: pactOnChain.creator || "0x0000000000000000000000000000000000000000",
    executor: pactOnChain.recipient || "0x0000000000000000000000000000000000000000",
    description: `Automated service pact #${cleanId} fulfillment`,
    criteria: [
      {
        criterionId: 1,
        type: CRITERION_TYPES.TYPE_A,
        description: `API Execution: Minimum 2 verified successful telemetry calls to ${LOCAL_TEST_ENDPOINT}`,
        targetEndpoint: LOCAL_TEST_ENDPOINT,
        minimumCount: 2,
      },
      {
        criterionId: 2,
        type: CRITERION_TYPES.TYPE_C,
        description: "Cryptographic Artifact: Output deliverable canonical hash match",
        expectedHash: DEFAULT_DELIVERABLE_HASH,
      },
    ],
    taskPrompt: `Execute 2 calls to ${LOCAL_TEST_ENDPOINT} via 'tool_api_caller' and compute hash for ${JSON.stringify(
      DEFAULT_DELIVERABLE_PAYLOAD
    )} via 'tool_crypto_hasher'.`,
  }
}
