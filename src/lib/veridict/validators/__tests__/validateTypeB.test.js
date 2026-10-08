import test from "node:test"
import assert from "node:assert/strict"
import { validateTypeB } from "../validateTypeB.js"
import { CRITERION_TYPES } from "../../schema.js"

const RECIPIENT = "0x" + "1".repeat(40)
const EXECUTOR = "0x" + "2".repeat(40)
const OTHER = "0x" + "3".repeat(40)
const TX_HASH = "0x" + "a".repeat(64)

test("validateTypeB — Offline / Telemetry Verification", async (t) => {
  const criterion = {
    id: 2,
    type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
    recipient: RECIPIENT,
    minimumAmountWei: "1000000000000000000", // 1 MON
  }

  await t.test("passes with valid matching transaction", async () => {
    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: {
        txHash: TX_HASH,
        from: EXECUTOR,
        to: RECIPIENT,
        value: "1500000000000000000", // 1.5 MON >= 1 MON
        status: "success",
        blockNumber: 1000,
      },
    }

    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, true)
    assert.equal(result.status, "PASS")
    assert.equal(result.errors.length, 0)
    assert.ok(result.summary.includes("Transaction confirmed on Monad"))
  })

  await t.test("fails when transaction is reverted", async () => {
    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: {
        txHash: TX_HASH,
        from: EXECUTOR,
        to: RECIPIENT,
        value: "1000000000000000000",
        status: "reverted",
      },
    }

    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.equal(result.status, "FAIL")
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_B_TX_REVERTED")))
  })

  await t.test("fails when recipient address does not match", async () => {
    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: {
        txHash: TX_HASH,
        from: EXECUTOR,
        to: OTHER, // Wrong recipient!
        value: "1000000000000000000",
        status: "success",
      },
    }

    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_B_RECIPIENT_MISMATCH")))
  })

  await t.test("fails when value transferred is below minimumAmountWei", async () => {
    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: {
        txHash: TX_HASH,
        from: EXECUTOR,
        to: RECIPIENT,
        value: "500000000000000000", // 0.5 MON < 1 MON
        status: "success",
      },
    }

    const result = await validateTypeB(criterion, evidenceItem)
    assert.equal(result.passed, false)
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_B_AMOUNT_MISMATCH")))
  })

  await t.test("fails when executor check fails", async () => {
    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: {
        txHash: TX_HASH,
        from: OTHER, // Sent by other, expected EXECUTOR
        to: RECIPIENT,
        value: "1000000000000000000",
        status: "success",
      },
    }

    const result = await validateTypeB(criterion, evidenceItem, { executor: EXECUTOR })
    assert.equal(result.passed, false)
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_B_EXECUTOR_MISMATCH")))
  })

  await t.test("fails when transaction is confirmed after deadline", async () => {
    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: {
        txHash: TX_HASH,
        from: EXECUTOR,
        to: RECIPIENT,
        value: "1000000000000000000",
        status: "success",
        timestamp: 1700000500,
      },
    }

    const result = await validateTypeB(criterion, evidenceItem, { deadline: 1700000000 })
    assert.equal(result.passed, false)
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_B_AFTER_DEADLINE")))
  })
})

test("validateTypeB — Live Mock PublicClient Verification", async (t) => {
  const criterion = {
    id: 2,
    type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
    recipient: RECIPIENT,
    minimumAmountWei: "2000000000000000000",
  }

  await t.test("queries mock publicClient and passes when on-chain state matches", async () => {
    const mockClient = {
      getTransactionReceipt: async ({ hash }) => {
        assert.equal(hash, TX_HASH)
        return { status: "success", blockNumber: 12345n }
      },
      getTransaction: async ({ hash }) => {
        assert.equal(hash, TX_HASH)
        return {
          from: EXECUTOR,
          to: RECIPIENT,
          value: 2000000000000000000n,
        }
      },
    }

    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: { txHash: TX_HASH },
    }

    const result = await validateTypeB(criterion, evidenceItem, { publicClient: mockClient })
    assert.equal(result.passed, true)
    assert.equal(result.status, "PASS")
    assert.equal(result.proof.blockNumber, 12345)
    assert.equal(result.proof.amountWei, "2000000000000000000")
  })

  await t.test("fails if on-chain receipt indicates reverted transaction", async () => {
    const mockClient = {
      getTransactionReceipt: async () => ({ status: "reverted", blockNumber: 12345n }),
      getTransaction: async () => ({
        from: EXECUTOR,
        to: RECIPIENT,
        value: 2000000000000000000n,
      }),
    }

    const evidenceItem = {
      criterionId: 2,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      data: { txHash: TX_HASH },
    }

    const result = await validateTypeB(criterion, evidenceItem, { publicClient: mockClient })
    assert.equal(result.passed, false)
    assert.ok(result.errors.some((e) => e.includes("ERR_TYPE_B_TX_REVERTED")))
  })
})

test("validateTypeB — Boundary & Error Cases", async (t) => {
  await t.test("handles malformed or missing txHash", async () => {
    const res1 = await validateTypeB(null, null)
    assert.equal(res1.passed, false)

    const res2 = await validateTypeB({ id: 2, recipient: RECIPIENT }, { data: { txHash: "invalid" } })
    assert.equal(res2.passed, false)
    assert.ok(res2.summary.includes("Must be a 66-character hex string"))
  })
})
