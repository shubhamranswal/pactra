import { GoogleGenAI } from "@google/genai"

/**
 * Gemini Payment Verifier Agent for PACTRA.
 * Evaluates observed payment transaction against expected pact terms.
 *
 * CRITICAL RULE: Gemini does NOT determine blockchain truth.
 * Blockchain truth is supplied to it as deterministic facts.
 * Gemini MUST NOT contradict deterministic verification results.
 */
export async function verifyPaymentWithGemini({
  pactId,
  txHash,
  deterministicResult,
}) {
  const { expected, actual, allPassed } = deterministicResult
  const apiKey = process.env.GEMINI_API_KEY

  // If all deterministic checks passed, default fallback is APPROVED
  const fallbackVerdict = allPassed ? "APPROVED" : "REJECTED"
  const fallbackConfidence = allPassed ? 0.99 : 1.0

  const buildCheckItems = () => [
    {
      name: "Sender Address",
      passed: deterministicResult.senderMatch,
      expected: expected.sender,
      actual: actual.sender,
      explanation: deterministicResult.senderMatch
        ? "Payer address matches expected creator."
        : "Transaction sender address does not match expected creator.",
    },
    {
      name: "Recipient Address",
      passed: deterministicResult.recipientMatch,
      expected: expected.recipient,
      actual: actual.recipient,
      explanation: deterministicResult.recipientMatch
        ? "Payment recipient matches expected contract recipient."
        : "Payment was sent to wrong recipient address.",
    },
    {
      name: "Asset / Token",
      passed: deterministicResult.tokenMatch,
      expected: expected.token,
      actual: actual.token,
      explanation: deterministicResult.tokenMatch
        ? "Transaction is a direct Native MON transfer."
        : "Transaction is not a direct Native MON payment.",
    },
    {
      name: "Payment Amount",
      passed: deterministicResult.amountMatch,
      expected: `${expected.amountMON} MON (${expected.amountWei} wei)`,
      actual: `${actual.amountMON} MON (${actual.amountWei} wei)`,
      explanation: deterministicResult.amountMatch
        ? "Escrow amount matches exact expected MON amount."
        : "Transaction value does not match expected pact amount.",
    },
    {
      name: "Transaction Status",
      passed: deterministicResult.transactionSuccess,
      expected: "SUCCESS",
      actual: actual.status,
      explanation: deterministicResult.transactionSuccess
        ? "Transaction executed successfully on Monad block."
        : "Transaction failed or was reverted on-chain.",
    },
    {
      name: "Timelock Deadline",
      passed: deterministicResult.deadlineMatch,
      expected: `<= ${expected.deadline}`,
      actual: actual.blockTimestamp,
      explanation: deterministicResult.deadlineMatch
        ? "Block timestamp is within valid timelock window."
        : "Transaction block timestamp occurred after pact deadline.",
    },
  ]

  if (!apiKey) {
    return {
      verdict: fallbackVerdict,
      confidence: fallbackConfidence,
      reason: allPassed
        ? "Deterministic verification succeeded for all 6 payment conditions. (Gemini API key not configured on server)."
        : "Deterministic payment verification failed one or more conditions.",
      checks: buildCheckItems(),
    }
  }

  const systemInstruction = `
You are PACTRA's payment verification agent.
You do not determine blockchain truth.
Blockchain truth is supplied to you as deterministic facts.
Your task is to explain whether the observed payment transaction satisfies the expected pact terms.

RULES:
1. Never contradict deterministic verification results.
2. If recipient, amount, sender, asset, transaction status, or deadline fails, the payment must NOT be approved.
3. If all deterministic checks pass, verdict MUST be APPROVED.
4. If any deterministic check fails, verdict MUST be REJECTED.
5. Use NEEDS_REVIEW only for ambiguous RPC/data situations.
6. Return strict structured JSON only.

JSON SCHEMA:
{
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_REVIEW",
  "confidence": number between 0 and 1,
  "reason": string,
  "checks": [
    {
      "name": string,
      "passed": boolean,
      "expected": string,
      "actual": string,
      "explanation": string
    }
  ]
}
`

  const prompt = `
Explain and format the following observed payment verification for Pact #${pactId}:

TRANSACTION HASH: ${txHash}
DETERMINISTIC ALL PASSED: ${allPassed}

EXPECTED TERMS:
- Sender: ${expected.sender}
- Recipient: ${expected.recipient}
- Amount: ${expected.amountMON} MON (${expected.amountWei} wei)
- Asset: ${expected.token}
- Deadline: ${expected.deadline}

OBSERVED TRANSACTION:
- Sender: ${actual.sender} (Match: ${deterministicResult.senderMatch})
- Recipient: ${actual.recipient} (Match: ${deterministicResult.recipientMatch})
- Amount: ${actual.amountMON} MON (${actual.amountWei} wei) (Match: ${deterministicResult.amountMatch})
- Asset: ${actual.token} (Match: ${deterministicResult.tokenMatch})
- Status: ${actual.status} (Success: ${deterministicResult.transactionSuccess})
- Block Timestamp: ${actual.blockTimestamp} (Within Deadline: ${deterministicResult.deadlineMatch})

Evaluate and return JSON according to the schema.
`

  try {
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    })

    const rawText = response.text ? response.text.trim() : ""
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return {
        verdict: fallbackVerdict,
        confidence: fallbackConfidence,
        reason: allPassed
          ? "All 6 deterministic payment checks satisfied on Monad Testnet."
          : "Deterministic payment verification failed expected terms.",
        checks: buildCheckItems(),
      }
    }

    return validateGeminiPaymentResult(parsed, deterministicResult, buildCheckItems())
  } catch (err) {
    console.error("Gemini Payment Verifier Error:", err)
    return {
      verdict: fallbackVerdict,
      confidence: fallbackConfidence,
      reason: allPassed
        ? "All 6 deterministic payment checks satisfied."
        : `Payment failed deterministic verification (${err.message || "Error"}).`,
      checks: buildCheckItems(),
    }
  }
}

/**
 * Validates Gemini Payment output ensuring it never contradicts deterministic facts.
 */
function validateGeminiPaymentResult(raw, deterministicResult, defaultChecks) {
  if (!raw || typeof raw !== "object") {
    return {
      verdict: deterministicResult.allPassed ? "APPROVED" : "REJECTED",
      confidence: 1.0,
      reason: deterministicResult.allPassed
        ? "All 6 payment verification checks passed."
        : "Payment failed deterministic verification.",
      checks: defaultChecks(),
    }
  }

  // Force verdict to match deterministic truth
  let verdict = ["APPROVED", "REJECTED", "NEEDS_REVIEW"].includes(raw.verdict)
    ? raw.verdict
    : "NEEDS_REVIEW"

  if (!deterministicResult.allPassed) {
    verdict = "REJECTED"
  } else if (deterministicResult.allPassed && verdict !== "APPROVED") {
    verdict = "APPROVED"
  }

  let confidence = typeof raw.confidence === "number" ? raw.confidence : 0.99
  if (confidence < 0) confidence = 0
  if (confidence > 1) confidence = 1

  const reason = typeof raw.reason === "string" ? raw.reason : "Payment verification evaluation completed."

  const checks = Array.isArray(raw.checks) && raw.checks.length > 0
    ? raw.checks.map((c, idx) => ({
        name: typeof c.name === "string" ? c.name : `Check #${idx + 1}`,
        passed: Boolean(c.passed),
        expected: typeof c.expected === "string" ? c.expected : "",
        actual: typeof c.actual === "string" ? c.actual : "",
        explanation: typeof c.explanation === "string" ? c.explanation : "",
      }))
    : defaultChecks()

  return {
    verdict,
    confidence,
    reason,
    checks,
  }
}
