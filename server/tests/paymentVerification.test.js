import assert from "node:assert"
import { test, describe } from "node:test"
import { canonicalJsonStringify, hashPaymentEvidence } from "../services/paymentVerification.js"
import { verifyPaymentWithGemini } from "../agents/geminiPaymentVerifier.js"

describe("Phase 7 — Payment Verification & Agent Tests", () => {
  test("Canonical JSON stringification is deterministic regardless of key order", () => {
    const obj1 = { b: 2, a: 1, c: { z: 26, y: 25 } }
    const obj2 = { a: 1, c: { y: 25, z: 26 }, b: 2 }

    const str1 = canonicalJsonStringify(obj1)
    const str2 = canonicalJsonStringify(obj2)

    assert.strictEqual(str1, str2)

    const hash1 = hashPaymentEvidence(obj1)
    const hash2 = hashPaymentEvidence(obj2)

    assert.strictEqual(hash1, hash2)
  })

  test("Deterministic check allPassed=true yields APPROVED verdict", async () => {
    const mockDeterministicResult = {
      chainMatch: true,
      senderMatch: true,
      recipientMatch: true,
      tokenMatch: true,
      amountMatch: true,
      transactionSuccess: true,
      deadlineMatch: true,
      allPassed: true,
      expected: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        deadline: "1800000000",
      },
      actual: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        status: "SUCCESS",
        blockNumber: "12345",
        blockTimestamp: "1700000000",
        chainId: 10143,
      },
    }

    const result = await verifyPaymentWithGemini({
      pactId: 1,
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      deterministicResult: mockDeterministicResult,
    })

    assert.strictEqual(result.verdict, "APPROVED")
    assert.strictEqual(result.checks.length, 6)
  })

  test("Deterministic check wrong amount yields REJECTED verdict", async () => {
    const mockDeterministicResult = {
      chainMatch: true,
      senderMatch: true,
      recipientMatch: true,
      tokenMatch: true,
      amountMatch: false, // WRONG AMOUNT
      transactionSuccess: true,
      deadlineMatch: true,
      allPassed: false,
      expected: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        deadline: "1800000000",
      },
      actual: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "500000000000000000", // 0.5 MON
        amountMON: "0.5",
        token: "Native MON",
        status: "SUCCESS",
        blockNumber: "12345",
        blockTimestamp: "1700000000",
        chainId: 10143,
      },
    }

    const result = await verifyPaymentWithGemini({
      pactId: 1,
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      deterministicResult: mockDeterministicResult,
    })

    assert.strictEqual(result.verdict, "REJECTED")
  })

  test("Deterministic check wrong recipient yields REJECTED verdict", async () => {
    const mockDeterministicResult = {
      chainMatch: true,
      senderMatch: true,
      recipientMatch: false, // WRONG RECIPIENT
      tokenMatch: true,
      amountMatch: true,
      transactionSuccess: true,
      deadlineMatch: true,
      allPassed: false,
      expected: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        deadline: "1800000000",
      },
      actual: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x3333333333333333333333333333333333333333", // WRONG
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        status: "SUCCESS",
        blockNumber: "12345",
        blockTimestamp: "1700000000",
        chainId: 10143,
      },
    }

    const result = await verifyPaymentWithGemini({
      pactId: 1,
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      deterministicResult: mockDeterministicResult,
    })

    assert.strictEqual(result.verdict, "REJECTED")
  })

  test("Deterministic check payment after deadline yields REJECTED verdict", async () => {
    const mockDeterministicResult = {
      chainMatch: true,
      senderMatch: true,
      recipientMatch: true,
      tokenMatch: true,
      amountMatch: true,
      transactionSuccess: true,
      deadlineMatch: false, // EXPIRED
      allPassed: false,
      expected: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        deadline: "1700000000",
      },
      actual: {
        sender: "0x1111111111111111111111111111111111111111",
        recipient: "0x2222222222222222222222222222222222222222",
        amountWei: "1000000000000000000",
        amountMON: "1.0",
        token: "Native MON",
        status: "SUCCESS",
        blockNumber: "12345",
        blockTimestamp: "1800000000", // AFTER DEADLINE
        chainId: 10143,
      },
    }

    const result = await verifyPaymentWithGemini({
      pactId: 1,
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      deterministicResult: mockDeterministicResult,
    })

    assert.strictEqual(result.verdict, "REJECTED")
  })
})
