import test from "node:test"
import assert from "node:assert/strict"
import { keccak256CanonicalJson } from "../canonical.js"
import { CRITERION_TYPES, validatePactTerms, validateEvidencePackage } from "../schema.js"
import { ExecutionRecorder } from "../recorder.js"
import { EvidenceManifestCompiler } from "../manifest.js"
import { VeridictEngine, VERDICT } from "../engine.js"

test("Veridict E2E Suite - Full Pipeline Verification", async (t) => {
  const originator = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  const executor = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  const deadline = 1800000000

  // Expected payload for Type C
  const toolPayload = {
    status: "audited",
    securityScore: 98,
    vulnerabilitiesFound: 0,
  }
  const expectedToolHash = keccak256CanonicalJson(toolPayload)

  const terms = {
    pactId: "pact_e2e_999",
    originator,
    executor,
    escrowAmount: "5.0",
    token: "MON",
    timeoutSeconds: 86400,
    criteria: [
      {
        id: 1,
        type: CRITERION_TYPES.TYPE_A_API_COUNT,
        targetEndpoint: "https://api.pactra.network/v1/inference",
        minimumCount: 2,
        description: "Must execute at least 2 AI inference calls",
      },
      {
        id: 2,
        type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
        recipient: executor,
        minimumAmountWei: "1000000000000000000", // 1 MON
        chainId: 10143,
        deadline,
        description: "Must execute on-chain transfer to executor on Monad Testnet",
      },
      {
        id: 3,
        type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
        toolName: "pactra_audit_engine",
        expectedHash: expectedToolHash,
        description: "Audit engine output must match canonical sha3 hash",
      },
    ],
  }

  // 1. Verify Pact Terms schema
  const termsValidation = validatePactTerms(terms)
  assert.equal(termsValidation.valid, true, "Pact terms must conform to RFC schema")

  // Mock public client for Monad blockchain interaction
  const validTxHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  const mockPublicClient = {
    getTransactionReceipt: async ({ hash }) => {
      if (hash === validTxHash) {
        return {
          status: "success",
          blockNumber: 500000n,
        }
      }
      return null
    },
    getTransaction: async ({ hash }) => {
      if (hash === validTxHash) {
        return {
          from: executor,
          to: executor,
          value: 2000000000000000000n, // 2 MON >= 1 MON
        }
      }
      return null
    },
    getBlock: async ({ blockNumber }) => {
      return {
        timestamp: 1750000000n, // before deadline
        number: blockNumber,
      }
    },
  }

  await t.test("E2E Scenario 1: Happy Path - All Deterministic Predicates Pass", async () => {
    const recorder = new ExecutionRecorder({ maxEvents: 100 })

    // A. Record API calls (Type A)
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })

    // B. Record Monad Testnet Tx (Type B)
    recorder.recordTransaction({
      txHash: validTxHash,
      chainId: 10143,
      from: executor,
      to: executor,
      value: "2000000000000000000",
      status: "success",
      blockNumber: 500000,
    })

    // C. Record Tool Output (Type C)
    recorder.recordToolOutput({
      toolName: "pactra_audit_engine",
      outputPayload: toolPayload,
    })

    // D. Compile evidence package
    const evidencePackage = EvidenceManifestCompiler.compile(terms, recorder)
    const pkgValidation = validateEvidencePackage(evidencePackage)
    assert.equal(pkgValidation.valid, true, "EvidencePackage must be strictly valid")

    // E. Calculate canonical evidence commitment hash
    const evidenceHash = EvidenceManifestCompiler.computeEvidenceHash(evidencePackage)
    assert.match(evidenceHash, /^0x[a-f0-9]{64}$/, "Must be valid 32-byte hex hash")

    // F. Run Veridict deterministic evaluation
    const result = await VeridictEngine.verify(terms, evidencePackage, {
      committedEvidenceHash: evidenceHash,
      publicClient: mockPublicClient,
    })

    assert.equal(result.verdict, VERDICT.PASS, "Verdict must PASS")
    assert.equal(result.passed, true)
    assert.equal(result.criteria.length, 3)
    assert.equal(result.criteria.every((c) => c.passed), true, "All criteria must be marked passed")
    assert.equal(result.failures.length, 0, "Failures array must be empty")
  })

  await t.test("E2E Scenario 2: Anti-Tamper Protection - Modified Evidence Hash Mismatch", async () => {
    const recorder = new ExecutionRecorder({ maxEvents: 100 })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordTransaction({
      txHash: validTxHash,
      chainId: 10143,
      from: executor,
      to: executor,
      value: "2000000000000000000",
      status: "success",
      blockNumber: 500000,
    })
    recorder.recordToolOutput({
      toolName: "pactra_audit_engine",
      outputPayload: toolPayload,
    })

    const evidencePackage = EvidenceManifestCompiler.compile(terms, recorder)
    const validEvidenceHash = EvidenceManifestCompiler.computeEvidenceHash(evidencePackage)

    // Tamper with evidence package by adding an unauthorized modification
    const tamperedPackage = JSON.parse(JSON.stringify(evidencePackage))
    tamperedPackage.items[0].data.callCount = 9999

    const result = await VeridictEngine.verify(terms, tamperedPackage, {
      committedEvidenceHash: validEvidenceHash, // on-chain commitment was for original package
      publicClient: mockPublicClient,
    })

    assert.equal(result.verdict, VERDICT.FAIL, "Tampered evidence must FAIL")
    assert.equal(result.passed, false)
    assert.ok(
      result.failures.some((f) => f.includes("ERR_EVIDENCE_HASH_MISMATCH")),
      "Must flag cryptographic commitment mismatch"
    )
  })

  await t.test("E2E Scenario 3: Criteria Failure - Insufficient API Calls (Type A)", async () => {
    const recorder = new ExecutionRecorder({ maxEvents: 100 })
    // Only 1 call instead of required 2
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordTransaction({
      txHash: validTxHash,
      chainId: 10143,
      from: executor,
      to: executor,
      value: "2000000000000000000",
      status: "success",
      blockNumber: 500000,
    })
    recorder.recordToolOutput({
      toolName: "pactra_audit_engine",
      outputPayload: toolPayload,
    })

    const evidencePackage = EvidenceManifestCompiler.compile(terms, recorder)
    const evidenceHash = EvidenceManifestCompiler.computeEvidenceHash(evidencePackage)

    const result = await VeridictEngine.verify(terms, evidencePackage, {
      committedEvidenceHash: evidenceHash,
      publicClient: mockPublicClient,
    })

    assert.equal(result.verdict, VERDICT.FAIL, "Verdict must FAIL when API calls insufficient")
    assert.equal(result.passed, false)
    const criterionA = result.criteria.find((c) => c.criterionId === 1)
    assert.equal(criterionA.passed, false)
    assert.ok(criterionA.summary.includes("Insufficient") || criterionA.errors.length > 0)
  })

  await t.test("E2E Scenario 4: Criteria Failure - Blockchain Tx Reverted (Type B)", async () => {
    const revertedTxHash = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
    const failingPublicClient = {
      ...mockPublicClient,
      getTransactionReceipt: async ({ hash }) => {
        if (hash === revertedTxHash) {
          return { status: "reverted", blockNumber: 500001n }
        }
        return mockPublicClient.getTransactionReceipt({ hash })
      },
    }

    const recorder = new ExecutionRecorder({ maxEvents: 100 })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordTransaction({
      txHash: revertedTxHash,
      chainId: 10143,
      from: executor,
      to: executor,
      value: "2000000000000000000",
      status: "reverted",
      blockNumber: 500001,
    })
    recorder.recordToolOutput({
      toolName: "pactra_audit_engine",
      outputPayload: toolPayload,
    })

    const evidencePackage = EvidenceManifestCompiler.compile(terms, recorder)
    const evidenceHash = EvidenceManifestCompiler.computeEvidenceHash(evidencePackage)

    const result = await VeridictEngine.verify(terms, evidencePackage, {
      committedEvidenceHash: evidenceHash,
      publicClient: failingPublicClient,
    })

    assert.equal(result.verdict, VERDICT.FAIL, "Verdict must FAIL when blockchain tx reverted")
    assert.equal(result.passed, false)
    const criterionB = result.criteria.find((c) => c.criterionId === 2)
    assert.equal(criterionB.passed, false)
  })

  await t.test("E2E Scenario 5: Criteria Failure - Corrupted Tool Output (Type C)", async () => {
    const recorder = new ExecutionRecorder({ maxEvents: 100 })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordApiCall({
      url: "https://api.pactra.network/v1/inference",
      method: "POST",
      status: 200,
    })
    recorder.recordTransaction({
      txHash: validTxHash,
      chainId: 10143,
      from: executor,
      to: executor,
      value: "2000000000000000000",
      status: "success",
      blockNumber: 500000,
    })
    // Corrupt tool output: vulnerabilitiesFound changed from 0 to 1
    recorder.recordToolOutput({
      toolName: "pactra_audit_engine",
      outputPayload: {
        ...toolPayload,
        vulnerabilitiesFound: 1,
      },
    })

    const evidencePackage = EvidenceManifestCompiler.compile(terms, recorder)
    const evidenceHash = EvidenceManifestCompiler.computeEvidenceHash(evidencePackage)

    const result = await VeridictEngine.verify(terms, evidencePackage, {
      committedEvidenceHash: evidenceHash,
      publicClient: mockPublicClient,
    })

    assert.equal(result.verdict, VERDICT.FAIL, "Verdict must FAIL when hash does not match expected")
    assert.equal(result.passed, false)
    const criterionC = result.criteria.find((c) => c.criterionId === 3)
    assert.equal(criterionC.passed, false)
    assert.ok(criterionC.summary.includes("Hash mismatch") || criterionC.errors.length > 0)
  })
})
