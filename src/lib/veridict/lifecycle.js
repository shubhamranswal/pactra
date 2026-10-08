/**
 * @file lifecycle.js
 * @description PACTRA Extended Runtime Lifecycle State Machine & Transition Rules.
 *
 * Implements Task 7.2.1 / P7-FR-004:
 * Supports tracking runtime execution states:
 * CREATED -> FUNDED -> ACCEPTED -> EXECUTING -> SUBMITTED -> VERIFYING -> SETTLED / REFUNDED
 */

/**
 * Enumeration of all runtime lifecycle states for a Pact.
 */
export const LIFECYCLE_STATES = Object.freeze({
  CREATED: "CREATED",
  FUNDED: "FUNDED",
  ACCEPTED: "ACCEPTED",
  EXECUTING: "EXECUTING",
  SUBMITTED: "SUBMITTED",
  VERIFYING: "VERIFYING",
  SETTLED: "SETTLED",
  REFUNDED: "REFUNDED",
})

/**
 * Valid state transitions table.
 * Terminal states (SETTLED, REFUNDED) have no outbound transitions.
 */
export const VALID_TRANSITIONS = Object.freeze({
  [LIFECYCLE_STATES.CREATED]: Object.freeze([
    LIFECYCLE_STATES.FUNDED,
  ]),
  [LIFECYCLE_STATES.FUNDED]: Object.freeze([
    LIFECYCLE_STATES.ACCEPTED,
    LIFECYCLE_STATES.REFUNDED,
  ]),
  [LIFECYCLE_STATES.ACCEPTED]: Object.freeze([
    LIFECYCLE_STATES.EXECUTING,
    LIFECYCLE_STATES.REFUNDED,
  ]),
  [LIFECYCLE_STATES.EXECUTING]: Object.freeze([
    LIFECYCLE_STATES.SUBMITTED,
    LIFECYCLE_STATES.REFUNDED,
  ]),
  [LIFECYCLE_STATES.SUBMITTED]: Object.freeze([
    LIFECYCLE_STATES.VERIFYING,
    LIFECYCLE_STATES.SETTLED,
    LIFECYCLE_STATES.REFUNDED,
  ]),
  [LIFECYCLE_STATES.VERIFYING]: Object.freeze([
    LIFECYCLE_STATES.SETTLED,
    LIFECYCLE_STATES.REFUNDED,
  ]),
  [LIFECYCLE_STATES.SETTLED]: Object.freeze([]),
  [LIFECYCLE_STATES.REFUNDED]: Object.freeze([]),
})

/**
 * UI Metadata & styling for each lifecycle state.
 */
export const LIFECYCLE_INFO = Object.freeze({
  [LIFECYCLE_STATES.CREATED]: Object.freeze({
    state: LIFECYCLE_STATES.CREATED,
    label: "Created",
    stepIndex: 0,
    description: "Pact terms drafted and agreed off-chain. Pending on-chain escrow funding.",
    badgeClass: "bg-surface-container-high/60 border-outline-variant/40 text-on-surface-variant",
    color: "#94A3B8",
    icon: "note_add",
    isTerminal: false,
  }),
  [LIFECYCLE_STATES.FUNDED]: Object.freeze({
    state: LIFECYCLE_STATES.FUNDED,
    label: "Funded",
    stepIndex: 1,
    description: "Escrow funds locked on-chain on Monad. Counterparty can accept and begin execution.",
    badgeClass: "bg-primary-container/25 border-primary/50 text-primary",
    color: "#D2BBFF",
    icon: "lock",
    isTerminal: false,
  }),
  [LIFECYCLE_STATES.ACCEPTED]: Object.freeze({
    state: LIFECYCLE_STATES.ACCEPTED,
    label: "Accepted",
    stepIndex: 2,
    description: "Counterparty has accepted the commitment and terms. Ready for task execution.",
    badgeClass: "bg-primary/20 border-primary/60 text-primary-fixed",
    color: "#8B5CF6",
    icon: "handshake",
    isTerminal: false,
  }),
  [LIFECYCLE_STATES.EXECUTING]: Object.freeze({
    state: LIFECYCLE_STATES.EXECUTING,
    label: "Executing",
    stepIndex: 3,
    description: "Autonomous agent execution active. Telemetry recorder collecting deterministic proofs.",
    badgeClass: "bg-amber-500/20 border-amber-500/50 text-amber-300",
    color: "#F59E0B",
    icon: "bolt",
    isTerminal: false,
  }),
  [LIFECYCLE_STATES.SUBMITTED]: Object.freeze({
    state: LIFECYCLE_STATES.SUBMITTED,
    label: "Submitted",
    stepIndex: 4,
    description: "Evidence manifest compiled and cryptographic hash committed on-chain on Monad.",
    badgeClass: "bg-cyan/20 border-cyan/50 text-cyan",
    color: "#38BDF8",
    icon: "assignment_turned_in",
    isTerminal: false,
  }),
  [LIFECYCLE_STATES.VERIFYING]: Object.freeze({
    state: LIFECYCLE_STATES.VERIFYING,
    label: "Verifying",
    stepIndex: 4,
    description: "Veridict deterministic engine evaluating API telemetry, blockchain receipts, and hash criteria.",
    badgeClass: "bg-indigo-500/25 border-indigo-500/60 text-indigo-300",
    color: "#6366F1",
    icon: "policy",
    isTerminal: false,
  }),
  [LIFECYCLE_STATES.SETTLED]: Object.freeze({
    state: LIFECYCLE_STATES.SETTLED,
    label: "Settled",
    stepIndex: 5,
    description: "Deterministic criteria verified. Escrow disbursement confirmed and settled.",
    badgeClass: "bg-emerald-500/20 border-success/60 text-emerald-300",
    color: "#10B981",
    icon: "verified",
    isTerminal: true,
  }),
  [LIFECYCLE_STATES.REFUNDED]: Object.freeze({
    state: LIFECYCLE_STATES.REFUNDED,
    label: "Refunded",
    stepIndex: 5,
    description: "Deadline passed or criteria failed. Escrow returned to creator.",
    badgeClass: "bg-danger/20 border-danger/60 text-danger",
    color: "#EF4444",
    icon: "undo",
    isTerminal: true,
  }),
})

/**
 * Checks whether a transition between two lifecycle states is allowed.
 *
 * @param {string} fromState - Starting state
 * @param {string} toState - Target state
 * @returns {boolean} True if transition is valid
 */
export function canTransition(fromState, toState) {
  if (!fromState || !toState) return false
  const allowed = VALID_TRANSITIONS[fromState]
  if (!allowed) return false
  return allowed.includes(toState)
}

/**
 * Validates a transition and throws ERR_INVALID_LIFECYCLE_TRANSITION if illegal.
 *
 * @param {string} fromState - Starting state
 * @param {string} toState - Target state
 * @returns {boolean} True if transition is valid
 * @throws {Error} If transition is invalid
 */
export function validateTransition(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new Error(
      `ERR_INVALID_LIFECYCLE_TRANSITION: Cannot transition from ${fromState} to ${toState}`
    )
  }
  return true
}

/**
 * Checks if a given state is terminal (SETTLED or REFUNDED).
 *
 * @param {string} state
 * @returns {boolean}
 */
export function isTerminalState(state) {
  return state === LIFECYCLE_STATES.SETTLED || state === LIFECYCLE_STATES.REFUNDED
}

/**
 * Resolves the extended runtime lifecycle state from on-chain contract state and optional runtime flags.
 *
 * @param {object} params
 * @param {number|null} [params.onChainStatus] - On-chain PactStatus (0: Funded, 1: Submitted, 2: Settled, 3: Refunded)
 * @param {boolean} [params.isExecuting=false] - Whether executor is actively recording execution
 * @param {boolean} [params.isAccepted=false] - Whether executor has accepted commitment
 * @param {boolean} [params.isVerifying=false] - Whether Veridict engine is actively verifying evidence
 * @param {boolean} [params.hasEvidence=false] - Whether evidence has been committed
 * @param {boolean} [params.isExpired=false] - Whether deadline has elapsed
 * @returns {string} One of LIFECYCLE_STATES
 */
export function resolveLifecycleState({
  onChainStatus,
  isExecuting = false,
  isAccepted = false,
  isVerifying = false,
  hasEvidence = false,
  isExpired = false,
} = {}) {
  // If not yet funded on-chain
  if (onChainStatus === undefined || onChainStatus === null) {
    return LIFECYCLE_STATES.CREATED
  }

  const statusCode = Number(onChainStatus)

  // Terminal states on-chain
  if (statusCode === 2) {
    return LIFECYCLE_STATES.SETTLED
  }
  if (statusCode === 3) {
    return LIFECYCLE_STATES.REFUNDED
  }

  // Submitted on-chain (statusCode === 1)
  if (statusCode === 1 || hasEvidence) {
    if (isVerifying) {
      return LIFECYCLE_STATES.VERIFYING
    }
    return LIFECYCLE_STATES.SUBMITTED
  }

  // Funded on-chain (statusCode === 0)
  if (statusCode === 0) {
    if (isExpired) {
      return LIFECYCLE_STATES.REFUNDED
    }
    if (isExecuting) {
      return LIFECYCLE_STATES.EXECUTING
    }
    if (isAccepted) {
      return LIFECYCLE_STATES.ACCEPTED
    }
    return LIFECYCLE_STATES.FUNDED
  }

  return LIFECYCLE_STATES.FUNDED
}
