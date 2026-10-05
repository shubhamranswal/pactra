import { GoogleGenAI } from "@google/genai"

/**
 * Gemini Verifier Agent for PACTRA.
 * Evaluates submitted proof/evidence against machine-verifiable pact requirements.
 *
 * STRICT RULE: Never call Gemini directly from the React frontend.
 * The Gemini API key must exist only on the server (GEMINI_API_KEY).
 */
export async function verifyEvidenceWithGemini({
  pactId,
  creator,
  recipient,
  amount,
  deadline,
  requirements,
  evidence,
  evidenceHash,
}) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return {
      verdict: "NEEDS_REVIEW",
      confidence: 0.5,
      reason: "GEMINI_API_KEY environment variable is not configured on server. Manual review required.",
      checks: [
        {
          name: "API Key Configured",
          passed: false,
          explanation: "Server missing GEMINI_API_KEY environment variable.",
        },
      ],
    }
  }

  const systemInstruction = `
You are the PACTRA Autonomous AI Verification Agent.
Your sole responsibility is to evaluate whether supplied proof/evidence satisfies the machine-verifiable requirements of an on-chain escrow pact.

CRITICAL CONSTRAINTS:
1. You may ONLY evaluate whether the supplied evidence satisfies the pact requirements.
2. You CANNOT execute transactions, modify requirements, change wallet addresses, alter amounts, alter deadlines, or authorize payouts.
3. Be conservative. If evidence is ambiguous, incomplete, uncorroborated, or missing required fields, return verdict "NEEDS_REVIEW".
4. Do NOT approve based on assumptions or plausible extrapolations.
5. You MUST return ONLY a JSON object matching the requested schema.

JSON SCHEMA:
{
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_REVIEW",
  "confidence": number between 0 and 1,
  "reason": string explaining decision,
  "checks": [
    {
      "name": string,
      "passed": boolean,
      "explanation": string
    }
  ]
}
`

  const prompt = `
Evaluate the following escrow pact evidence:

PACT SPECIFICATION:
- Pact ID: ${pactId}
- Creator Address: ${creator}
- Recipient Address: ${recipient}
- Amount: ${amount} MON
- Deadline Unix Timestamp: ${deadline}
- On-Chain Evidence Hash: ${evidenceHash}
- Expected Requirements: ${requirements || "Deliver requested service/asset proof according to specification."}

SUBMITTED EVIDENCE:
${typeof evidence === "object" ? JSON.stringify(evidence, null, 2) : String(evidence)}

Evaluate the evidence strictly and return the JSON outcome matching the schema.
`

  try {
    const ai = new GoogleGenAI({ apiKey })

    let response
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      })
    } catch {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      })
    }

    const rawText = response.text ? response.text.trim() : ""
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      // Return NEEDS_REVIEW if JSON parsing fails
      return {
        verdict: "NEEDS_REVIEW",
        confidence: 0.5,
        reason: "Gemini output failed JSON parsing. Manual review required.",
        checks: [
          {
            name: "Structured Output Check",
            passed: false,
            explanation: "Gemini output was not valid JSON.",
          },
        ],
      }
    }

    return validateGeminiSchema(parsed)
  } catch (err) {
    console.error("Gemini API Verification Error:", err)
    return {
      verdict: "NEEDS_REVIEW",
      confidence: 0.5,
      reason: `Gemini evaluation encountered an error: ${err.message || "API failure"}. Manual review required.`,
      checks: [
        {
          name: "AI Agent System Status",
          passed: false,
          explanation: err.message || "Model evaluation exception.",
        },
      ],
    }
  }
}

/**
 * Validates and normalizes Gemini output server-side to guarantee strict schema compliance.
 */
function validateGeminiSchema(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      verdict: "NEEDS_REVIEW",
      confidence: 0.5,
      reason: "Invalid object returned from Gemini.",
      checks: [],
    }
  }

  const validVerdicts = ["APPROVED", "REJECTED", "NEEDS_REVIEW"]
  const verdict = validVerdicts.includes(raw.verdict) ? raw.verdict : "NEEDS_REVIEW"

  let confidence = typeof raw.confidence === "number" ? raw.confidence : 0.5
  if (confidence < 0) confidence = 0
  if (confidence > 1) confidence = 1

  const reason = typeof raw.reason === "string" ? raw.reason : "Evaluation completed."

  const checks = Array.isArray(raw.checks)
    ? raw.checks.map((c, idx) => ({
        name: typeof c.name === "string" ? c.name : `Check #${idx + 1}`,
        passed: Boolean(c.passed),
        explanation: typeof c.explanation === "string" ? c.explanation : "",
      }))
    : []

  return {
    verdict,
    confidence,
    reason,
    checks,
  }
}
