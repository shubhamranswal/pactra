import test from "node:test"
import assert from "node:assert/strict"
import {
  LIFECYCLE_STATES,
  LIFECYCLE_INFO,
  VALID_TRANSITIONS,
  canTransition,
  validateTransition,
  isTerminalState,
  resolveLifecycleState,
} from "../lifecycle.js"

test("Lifecycle State Machine — Constants & Metadata", async (t) => {
  await t.test("exports all 8 expected lifecycle states", () => {
    assert.equal(LIFECYCLE_STATES.CREATED, "CREATED")
    assert.equal(LIFECYCLE_STATES.FUNDED, "FUNDED")
    assert.equal(LIFECYCLE_STATES.ACCEPTED, "ACCEPTED")
    assert.equal(LIFECYCLE_STATES.EXECUTING, "EXECUTING")
    assert.equal(LIFECYCLE_STATES.SUBMITTED, "SUBMITTED")
    assert.equal(LIFECYCLE_STATES.VERIFYING, "VERIFYING")
    assert.equal(LIFECYCLE_STATES.SETTLED, "SETTLED")
    assert.equal(LIFECYCLE_STATES.REFUNDED, "REFUNDED")
  })

  await t.test("exports valid transition mappings for every state", () => {
    assert.ok(VALID_TRANSITIONS)
    for (const state of Object.values(LIFECYCLE_STATES)) {
      assert.ok(Array.isArray(VALID_TRANSITIONS[state]), `Missing transition table for ${state}`)
    }
  })

  await t.test("LIFECYCLE_INFO contains rich metadata for every state", () => {
    for (const state of Object.values(LIFECYCLE_STATES)) {
      const info = LIFECYCLE_INFO[state]
      assert.ok(info, `Missing info for ${state}`)
      assert.equal(info.state, state)
      assert.ok(typeof info.label === "string" && info.label.length > 0)
      assert.ok(typeof info.description === "string" && info.description.length > 0)
      assert.ok(typeof info.badgeClass === "string")
      assert.ok(typeof info.color === "string")
      assert.ok(typeof info.icon === "string")
      assert.ok(typeof info.isTerminal === "boolean")
      assert.ok(typeof info.stepIndex === "number")
    }
  })

  await t.test("isTerminalState correctly identifies terminal states", () => {
    assert.equal(isTerminalState(LIFECYCLE_STATES.SETTLED), true)
    assert.equal(isTerminalState(LIFECYCLE_STATES.REFUNDED), true)
    assert.equal(isTerminalState(LIFECYCLE_STATES.CREATED), false)
    assert.equal(isTerminalState(LIFECYCLE_STATES.FUNDED), false)
    assert.equal(isTerminalState(LIFECYCLE_STATES.ACCEPTED), false)
    assert.equal(isTerminalState(LIFECYCLE_STATES.EXECUTING), false)
    assert.equal(isTerminalState(LIFECYCLE_STATES.SUBMITTED), false)
    assert.equal(isTerminalState(LIFECYCLE_STATES.VERIFYING), false)
  })
})

test("Lifecycle State Machine — Transition Validation", async (t) => {
  await t.test("allows valid sequential and refund transitions", () => {
    // CREATED -> FUNDED
    assert.equal(canTransition(LIFECYCLE_STATES.CREATED, LIFECYCLE_STATES.FUNDED), true)
    assert.equal(validateTransition(LIFECYCLE_STATES.CREATED, LIFECYCLE_STATES.FUNDED), true)

    // FUNDED -> ACCEPTED or REFUNDED
    assert.equal(canTransition(LIFECYCLE_STATES.FUNDED, LIFECYCLE_STATES.ACCEPTED), true)
    assert.equal(canTransition(LIFECYCLE_STATES.FUNDED, LIFECYCLE_STATES.REFUNDED), true)

    // ACCEPTED -> EXECUTING or REFUNDED
    assert.equal(canTransition(LIFECYCLE_STATES.ACCEPTED, LIFECYCLE_STATES.EXECUTING), true)
    assert.equal(canTransition(LIFECYCLE_STATES.ACCEPTED, LIFECYCLE_STATES.REFUNDED), true)

    // EXECUTING -> SUBMITTED or REFUNDED
    assert.equal(canTransition(LIFECYCLE_STATES.EXECUTING, LIFECYCLE_STATES.SUBMITTED), true)
    assert.equal(canTransition(LIFECYCLE_STATES.EXECUTING, LIFECYCLE_STATES.REFUNDED), true)

    // SUBMITTED -> VERIFYING, SETTLED, REFUNDED
    assert.equal(canTransition(LIFECYCLE_STATES.SUBMITTED, LIFECYCLE_STATES.VERIFYING), true)
    assert.equal(canTransition(LIFECYCLE_STATES.SUBMITTED, LIFECYCLE_STATES.SETTLED), true)
    assert.equal(canTransition(LIFECYCLE_STATES.SUBMITTED, LIFECYCLE_STATES.REFUNDED), true)

    // VERIFYING -> SETTLED or REFUNDED
    assert.equal(canTransition(LIFECYCLE_STATES.VERIFYING, LIFECYCLE_STATES.SETTLED), true)
    assert.equal(canTransition(LIFECYCLE_STATES.VERIFYING, LIFECYCLE_STATES.REFUNDED), true)
  })

  await t.test("rejects invalid forward-skipping and backward transitions", () => {
    // Cannot skip from CREATED directly to EXECUTING or SETTLED
    assert.equal(canTransition(LIFECYCLE_STATES.CREATED, LIFECYCLE_STATES.EXECUTING), false)
    assert.equal(canTransition(LIFECYCLE_STATES.CREATED, LIFECYCLE_STATES.SETTLED), false)

    // Cannot transition from FUNDED directly to SETTLED without submission
    assert.equal(canTransition(LIFECYCLE_STATES.FUNDED, LIFECYCLE_STATES.SETTLED), false)

    // Terminal states cannot transition to any state
    assert.equal(canTransition(LIFECYCLE_STATES.SETTLED, LIFECYCLE_STATES.REFUNDED), false)
    assert.equal(canTransition(LIFECYCLE_STATES.SETTLED, LIFECYCLE_STATES.FUNDED), false)
    assert.equal(canTransition(LIFECYCLE_STATES.REFUNDED, LIFECYCLE_STATES.FUNDED), false)

    // validateTransition throws ERR_INVALID_LIFECYCLE_TRANSITION
    assert.throws(
      () => validateTransition(LIFECYCLE_STATES.CREATED, LIFECYCLE_STATES.EXECUTING),
      /ERR_INVALID_LIFECYCLE_TRANSITION/
    )
    assert.throws(
      () => validateTransition(LIFECYCLE_STATES.SETTLED, LIFECYCLE_STATES.FUNDED),
      /ERR_INVALID_LIFECYCLE_TRANSITION/
    )
  })

  await t.test("gracefully handles unknown or empty states", () => {
    assert.equal(canTransition(null, LIFECYCLE_STATES.FUNDED), false)
    assert.equal(canTransition(LIFECYCLE_STATES.FUNDED, null), false)
    assert.equal(canTransition("UNKNOWN_STATE", LIFECYCLE_STATES.FUNDED), false)
  })
})

test("Lifecycle State Machine — resolveLifecycleState", async (t) => {
  await t.test("maps null / undefined onChainStatus to CREATED", () => {
    assert.equal(resolveLifecycleState(), LIFECYCLE_STATES.CREATED)
    assert.equal(resolveLifecycleState({ onChainStatus: null }), LIFECYCLE_STATES.CREATED)
  })

  await t.test("maps on-chain code 0 (Funded) with runtime flags", () => {
    assert.equal(resolveLifecycleState({ onChainStatus: 0 }), LIFECYCLE_STATES.FUNDED)
    assert.equal(
      resolveLifecycleState({ onChainStatus: 0, isAccepted: true }),
      LIFECYCLE_STATES.ACCEPTED
    )
    assert.equal(
      resolveLifecycleState({ onChainStatus: 0, isExecuting: true }),
      LIFECYCLE_STATES.EXECUTING
    )
    assert.equal(
      resolveLifecycleState({ onChainStatus: 0, isExpired: true }),
      LIFECYCLE_STATES.REFUNDED
    )
  })

  await t.test("maps on-chain code 1 (Submitted) and verifying state", () => {
    assert.equal(resolveLifecycleState({ onChainStatus: 1 }), LIFECYCLE_STATES.SUBMITTED)
    assert.equal(
      resolveLifecycleState({ onChainStatus: 1, isVerifying: true }),
      LIFECYCLE_STATES.VERIFYING
    )
  })

  await t.test("maps on-chain code 2 (Settled) and 3 (Refunded)", () => {
    assert.equal(resolveLifecycleState({ onChainStatus: 2 }), LIFECYCLE_STATES.SETTLED)
    assert.equal(resolveLifecycleState({ onChainStatus: 3 }), LIFECYCLE_STATES.REFUNDED)
  })
})
