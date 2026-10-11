import { VeridictEngine } from "./veridict/engine.js"
import { hashCanonical } from "./veridict/canonical.js"
import { PACT_ESCROW_ADDRESS, PACT_ESCROW_ABI } from "../config/contracts.js"

export const ORCHESTRATION_STATES = {
  IDLE: "IDLE",
  VERIFYING: "VERIFYING",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  SUBMITTING_EVIDENCE: "SUBMITTING_EVIDENCE",
  EVIDENCE_SUBMITTED: "EVIDENCE_SUBMITTED",
  SETTLING: "SETTLING",
  SETTLED: "SETTLED",
  ERROR: "ERROR",
}

/**
 * Pure orchestration engine for Phase 7 Option B flow.
 * Handles deterministic verification -> submitEvidence -> settlePact.
 */
export async function orchestrateEvidenceAndSettlement({
  pact,
  evidencePackage,
  terms,
  publicClient,
  writeContractAsync,
  isAuthorizedSettler = false,
  forceSettle = false,
  onStateChange = () => {},
  contractAddress = PACT_ESCROW_ADDRESS,
  contractAbi = PACT_ESCROW_ABI,
}) {
  const pactId = pact?.id || terms?.pactId || evidencePackage?.pactId
  if (!pactId) {
    const err = new Error("Missing pactId for evidence verification")
    onStateChange({ state: ORCHESTRATION_STATES.ERROR, error: err })
    throw err
  }

  // Idempotency: if already Settled on-chain
  if (pact?.status === 2) {
    onStateChange({
      state: ORCHESTRATION_STATES.SETTLED,
      statusMessage: "Pact is already settled on-chain.",
    })
    return {
      state: ORCHESTRATION_STATES.SETTLED,
      settled: true,
      verdict: "PASS",
    }
  }

  // 1. Veridict Evaluation
  onStateChange({
    state: ORCHESTRATION_STATES.VERIFYING,
    statusMessage: "Verifying your evidence...",
  })

  let veridictResult
  try {
    veridictResult = await VeridictEngine.evaluate({
      pact,
      terms,
      evidencePackage,
      publicClient,
    })
  } catch (evalErr) {
    onStateChange({
      state: ORCHESTRATION_STATES.VERIFICATION_FAILED,
      error: evalErr,
      statusMessage: "Evidence could not be verified",
    })
    throw evalErr
  }

  // 2. Strict PASS/FAIL Guard
  if (veridictResult.verdict !== "PASS") {
    const failErr = new Error("Evidence could not be verified")
    onStateChange({
      state: ORCHESTRATION_STATES.VERIFICATION_FAILED,
      verdict: "FAIL",
      veridictResult,
      error: failErr,
      statusMessage: "Evidence could not be verified",
    })
    return {
      state: ORCHESTRATION_STATES.VERIFICATION_FAILED,
      verdict: "FAIL",
      veridictResult,
      submitted: false,
      settled: false,
    }
  }

  const evidenceHash = veridictResult.evidenceHash || hashCanonical(evidencePackage)
  onStateChange({
    verdict: "PASS",
    veridictResult,
    evidenceHash,
  })

  // 3. Submit Evidence (if not already Submitted)
  let evidenceTxHash = null

  if (pact?.status === 1) {
    onStateChange({
      state: ORCHESTRATION_STATES.EVIDENCE_SUBMITTED,
      statusMessage: "Evidence verified",
    })
  } else {
    onStateChange({
      state: ORCHESTRATION_STATES.SUBMITTING_EVIDENCE,
      statusMessage: "Confirming evidence on-chain...",
    })

    try {
      evidenceTxHash = await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        functionName: "submitEvidence",
        args: [BigInt(pactId), evidenceHash],
      })

      if (publicClient && typeof publicClient.waitForTransactionReceipt === "function") {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: evidenceTxHash })
        if (receipt.status !== "success" && receipt.status !== 1 && receipt.status !== 1n) {
          throw new Error("Evidence could not be submitted.")
        }
      }

      onStateChange({
        state: ORCHESTRATION_STATES.EVIDENCE_SUBMITTED,
        evidenceTxHash,
        statusMessage: "Evidence verified on-chain",
      })

      // Check if the pact was settled directly upon evidence submission (direct release contract)
      if (publicClient && typeof publicClient.readContract === "function") {
        try {
          const livePact = await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getPact",
            args: [BigInt(pactId)],
          })
          if (livePact && Number(livePact.status) === 2) {
            onStateChange({
              state: ORCHESTRATION_STATES.SETTLED,
              evidenceTxHash,
              settlementTxHash: evidenceTxHash,
              statusMessage: "Payment Released to Recipient",
            })
            return {
              state: ORCHESTRATION_STATES.SETTLED,
              verdict: "PASS",
              evidenceHash,
              evidenceTxHash,
              settlementTxHash: evidenceTxHash,
              settled: true,
            }
          }
        } catch {
          // If readContract fails, continue to explicit settlement step
        }
      }
    } catch (subErr) {
      onStateChange({
        state: ORCHESTRATION_STATES.ERROR,
        error: subErr,
        statusMessage: "Evidence could not be submitted. Your payment has not been released.",
      })
      throw subErr
    }
  }

  // 4. Settle Pact (Fallback for 2-step contracts)
  const canExecuteSettle = isAuthorizedSettler || forceSettle

  if (!canExecuteSettle) {
    onStateChange({
      state: ORCHESTRATION_STATES.EVIDENCE_SUBMITTED,
      statusMessage: "Evidence verified",
    })
    return {
      state: ORCHESTRATION_STATES.EVIDENCE_SUBMITTED,
      verdict: "PASS",
      evidenceHash,
      evidenceTxHash,
      settled: false,
      requiresCreatorSettlement: true,
    }
  }

  onStateChange({
    state: ORCHESTRATION_STATES.SETTLING,
    statusMessage: "Releasing payment...",
  })

  let settlementTxHash
  try {
    settlementTxHash = await writeContractAsync({
      address: contractAddress,
      abi: contractAbi,
      functionName: "settlePact",
      args: [BigInt(pactId)],
    })

    if (publicClient && typeof publicClient.waitForTransactionReceipt === "function") {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: settlementTxHash })
      if (receipt.status !== "success" && receipt.status !== 1 && receipt.status !== 1n) {
        throw new Error("Payment release did not complete.")
      }
    }

    onStateChange({
      state: ORCHESTRATION_STATES.SETTLED,
      settlementTxHash,
      statusMessage: "Payment Released",
    })

    return {
      state: ORCHESTRATION_STATES.SETTLED,
      verdict: "PASS",
      evidenceHash,
      evidenceTxHash,
      settlementTxHash,
      settled: true,
    }
  } catch (settleErr) {
    onStateChange({
      state: ORCHESTRATION_STATES.ERROR,
      error: settleErr,
      statusMessage: "Payment release did not complete. Your evidence has already been submitted.",
    })
    throw settleErr
  }
}
