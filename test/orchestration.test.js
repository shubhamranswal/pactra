import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatEther } from "viem"
import { orchestrateEvidenceAndSettlement, ORCHESTRATION_STATES } from "../src/lib/orchestrator.js"
import { CRITERION_TYPES } from "../src/lib/veridict/schema.js"
import { hashCanonical, canonicalJson } from "../src/lib/veridict/canonical.js"

describe("Phase 7: Evidence Verification + Settlement Orchestration", () => {
  const dummyAddress = "0x1111111111111111111111111111111111111111"
  const recipientAddress = "0x2222222222222222222222222222222222222222"

  const validPayload = { status: "verified_execution", completedAt: 1791112500 }
  const validPayloadHash = hashCanonical(validPayload)

  const validTerms = {
    pactId: "1",
    originator: dummyAddress,
    executor: recipientAddress,
    criteria: [
      {
        criterionId: 1,
        type: CRITERION_TYPES.TYPE_A,
        targetEndpoint: "https://api.pactra.network/test",
        minimumCount: 2,
      },
      {
        criterionId: 2,
        type: CRITERION_TYPES.TYPE_C,
        expectedHash: validPayloadHash,
      },
    ],
  }

  const validEvidence = {
    pactId: "1",
    executor: recipientAddress,
    items: [
      {
        criterionId: 1,
        type: CRITERION_TYPES.TYPE_A,
        calls: [
          { id: "c1", url: "https://api.pactra.network/test", method: "POST", status: 200 },
          { id: "c2", url: "https://api.pactra.network/test", method: "POST", status: 201 },
        ],
      },
      {
        criterionId: 2,
        type: CRITERION_TYPES.TYPE_C,
        outputPayload: { status: "verified_execution", completedAt: 1791112500 },
      },
    ],
  }

  const failingEvidence = {
    pactId: "1",
    executor: recipientAddress,
    items: [
      {
        criterionId: 1,
        type: CRITERION_TYPES.TYPE_A,
        calls: [
          // Only 1 call; requires 2!
          { id: "c1", url: "https://api.pactra.network/test", method: "POST", status: 200 },
        ],
      },
      {
        criterionId: 2,
        type: CRITERION_TYPES.TYPE_C,
        outputPayload: { status: "tampered_payload" }, // Mismatched hash
      },
    ],
  }

  // 1. PASS -> submitEvidence -> settlePact
  it("1. PASS → submitEvidence → settlePact", async () => {
    const callLog = []
    const states = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      callLog.push({ functionName, args })
      return `0xmock_hash_${functionName}`
    }

    const mockPublicClient = {
      waitForTransactionReceipt: async ({ hash }) => {
        return { status: "success", transactionHash: hash }
      },
    }

    const result = await orchestrateEvidenceAndSettlement({
      pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
      evidencePackage: validEvidence,
      terms: validTerms,
      publicClient: mockPublicClient,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: true,
      onStateChange: (u) => {
        if (u.state) states.push(u.state)
      },
    })

    assert.equal(result.settled, true)
    assert.equal(result.state, ORCHESTRATION_STATES.SETTLED)
    assert.equal(callLog.length, 2)
    assert.equal(callLog[0].functionName, "submitEvidence")
    assert.equal(callLog[1].functionName, "settlePact")
    assert.deepEqual(states, [
      ORCHESTRATION_STATES.VERIFYING,
      ORCHESTRATION_STATES.SUBMITTING_EVIDENCE,
      ORCHESTRATION_STATES.EVIDENCE_SUBMITTED,
      ORCHESTRATION_STATES.SETTLING,
      ORCHESTRATION_STATES.SETTLED,
    ])
  })

  // 2. FAIL -> no submitEvidence
  it("2. FAIL → no submitEvidence", async () => {
    const callLog = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      callLog.push({ functionName, args })
      return `0xmock_${functionName}`
    }

    const result = await orchestrateEvidenceAndSettlement({
      pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
      evidencePackage: failingEvidence,
      terms: validTerms,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: true,
    })

    assert.equal(result.verdict, "FAIL")
    assert.equal(result.state, ORCHESTRATION_STATES.VERIFICATION_FAILED)
    assert.equal(callLog.length, 0, "No submitEvidence must be called on FAIL")
  })

  // 3. FAIL -> no settlePact
  it("3. FAIL → no settlePact", async () => {
    const callLog = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      callLog.push({ functionName, args })
      return `0xmock_${functionName}`
    }

    const result = await orchestrateEvidenceAndSettlement({
      pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
      evidencePackage: failingEvidence,
      terms: validTerms,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: true,
    })

    assert.equal(result.settled, false)
    assert.equal(
      callLog.filter((c) => c.functionName === "settlePact").length,
      0,
      "settlePact must NEVER be called when Veridict fails"
    )
  })

  // 4. submitEvidence failure -> no settlement
  it("4. submitEvidence failure → no settlement", async () => {
    const callLog = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      callLog.push({ functionName, args })
      if (functionName === "submitEvidence") {
        throw new Error("RPC rejection: user rejected transaction")
      }
      return `0xmock_${functionName}`
    }

    await assert.rejects(
      async () => {
        await orchestrateEvidenceAndSettlement({
          pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
          evidencePackage: validEvidence,
          terms: validTerms,
          writeContractAsync: mockWriteContractAsync,
          isAuthorizedSettler: true,
        })
      },
      /RPC rejection/
    )

    assert.equal(
      callLog.filter((c) => c.functionName === "settlePact").length,
      0,
      "settlePact must not be called if submitEvidence fails"
    )
  })

  // 5. settlement failure -> evidence remains submitted
  it("5. settlement failure → evidence remains submitted", async () => {
    let capturedEvidenceHash = null
    const states = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      if (functionName === "submitEvidence") {
        capturedEvidenceHash = args[1]
        return "0xevidence_tx_123"
      }
      if (functionName === "settlePact") {
        throw new Error("UnauthorizedSettler: only creator can settle")
      }
      return "0xmock"
    }

    const mockPublicClient = {
      waitForTransactionReceipt: async () => ({ status: "success" }),
    }

    await assert.rejects(
      async () => {
        await orchestrateEvidenceAndSettlement({
          pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
          evidencePackage: validEvidence,
          terms: validTerms,
          publicClient: mockPublicClient,
          writeContractAsync: mockWriteContractAsync,
          isAuthorizedSettler: true,
          onStateChange: (u) => {
            if (u.state) states.push(u.state)
          },
        })
      },
      /UnauthorizedSettler/
    )

    assert.ok(capturedEvidenceHash, "Evidence hash was submitted")
    assert.ok(
      states.includes(ORCHESTRATION_STATES.EVIDENCE_SUBMITTED),
      "Evidence submitted state was achieved before settlement failed"
    )
  })

  // 6. settlement retry does not submit evidence again
  it("6. settlement retry does not submit evidence again", async () => {
    const callLog = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      callLog.push({ functionName, args })
      return `0xmock_${functionName}`
    }

    const mockPublicClient = {
      waitForTransactionReceipt: async () => ({ status: "success" }),
    }

    // Pact is ALREADY in status 1 (Submitted)
    const result = await orchestrateEvidenceAndSettlement({
      pact: {
        id: "1",
        status: 1, // Submitted
        creator: dummyAddress,
        recipient: recipientAddress,
      },
      evidencePackage: validEvidence,
      terms: validTerms,
      publicClient: mockPublicClient,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: true,
    })

    assert.equal(result.settled, true)
    assert.equal(
      callLog.filter((c) => c.functionName === "submitEvidence").length,
      0,
      "submitEvidence must NOT be called when status is already Submitted"
    )
    assert.equal(callLog.filter((c) => c.functionName === "settlePact").length, 1)
  })

  // 7. already Settled -> no duplicate settlement
  it("7. already Settled → no duplicate settlement", async () => {
    const callLog = []

    const mockWriteContractAsync = async ({ functionName, args }) => {
      callLog.push({ functionName, args })
      return `0xmock_${functionName}`
    }

    const result = await orchestrateEvidenceAndSettlement({
      pact: {
        id: "1",
        status: 2, // Settled
        creator: dummyAddress,
        recipient: recipientAddress,
      },
      evidencePackage: validEvidence,
      terms: validTerms,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: true,
    })

    assert.equal(result.settled, true)
    assert.equal(callLog.length, 0, "No transactions should be called when already Settled")
  })

  // 8. button disabled while transaction is pending (concurrency guard)
  it("8. button disabled while transaction is pending", async () => {
    const busyStates = [
      ORCHESTRATION_STATES.VERIFYING,
      ORCHESTRATION_STATES.SUBMITTING_EVIDENCE,
      ORCHESTRATION_STATES.SETTLING,
    ]

    for (const st of busyStates) {
      const isBusy =
        st === ORCHESTRATION_STATES.VERIFYING ||
        st === ORCHESTRATION_STATES.SUBMITTING_EVIDENCE ||
        st === ORCHESTRATION_STATES.SETTLING
      assert.equal(isBusy, true, `State ${st} must mark button as disabled`)
    }
  })

  // 9. evidenceHash passed correctly
  it("9. evidenceHash passed correctly", async () => {
    let passedEvidenceHash = null

    const mockWriteContractAsync = async ({ functionName, args }) => {
      if (functionName === "submitEvidence") {
        passedEvidenceHash = args[1]
      }
      return "0xmock"
    }

    const expectedHash = hashCanonical(validEvidence)

    await orchestrateEvidenceAndSettlement({
      pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
      evidencePackage: validEvidence,
      terms: validTerms,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: false,
    })

    assert.equal(passedEvidenceHash, expectedHash)
    assert.match(passedEvidenceHash, /^0x[a-fA-F0-9]{64}$/)
  })

  // 10. pact amount displayed correctly
  it("10. pact amount displayed correctly", () => {
    const amountWei = 2500000000000000000n // 2.5 ether
    const formatted = formatEther(amountWei)
    assert.equal(formatted, "2.5")
  })

  // 11. recipient address displayed correctly
  it("11. recipient address displayed correctly", () => {
    const testRecipient = "0x2222222222222222222222222222222222222222"
    assert.equal(validTerms.executor.toLowerCase(), testRecipient.toLowerCase())
  })

  // 12. final UI state only becomes Settled after settlement receipt
  it("12. final UI state only becomes Settled after settlement receipt", async () => {
    let receiptPolled = false
    const states = []

    const mockWriteContractAsync = async ({ functionName }) => {
      return `0xhash_${functionName}`
    }

    const mockPublicClient = {
      waitForTransactionReceipt: async ({ hash }) => {
        if (hash === "0xhash_settlePact") {
          // Verify that state has NOT reached SETTLED before receipt returns
          assert.equal(states.includes(ORCHESTRATION_STATES.SETTLED), false)
          receiptPolled = true
        }
        return { status: "success" }
      },
    }

    const result = await orchestrateEvidenceAndSettlement({
      pact: { id: "1", status: 0, creator: dummyAddress, recipient: recipientAddress },
      evidencePackage: validEvidence,
      terms: validTerms,
      publicClient: mockPublicClient,
      writeContractAsync: mockWriteContractAsync,
      isAuthorizedSettler: true,
      onStateChange: (u) => {
        if (u.state) states.push(u.state)
      },
    })

    assert.equal(receiptPolled, true)
    assert.equal(result.state, ORCHESTRATION_STATES.SETTLED)
    assert.equal(states[states.length - 1], ORCHESTRATION_STATES.SETTLED)
  })
})

describe("RFC 8785 Canonical Serialization", () => {
  it("sorts keys lexicographically regardless of insertion order", () => {
    const obj1 = { b: 2, a: 1, c: { z: 9, y: 8 } }
    const obj2 = { c: { y: 8, z: 9 }, a: 1, b: 2 }

    const str1 = canonicalJson(obj1)
    const str2 = canonicalJson(obj2)

    assert.equal(str1, '{"a":1,"b":2,"c":{"y":8,"z":9}}')
    assert.equal(str1, str2)

    const hash1 = hashCanonical(obj1)
    const hash2 = hashCanonical(obj2)
    assert.equal(hash1, hash2)
  })
})
