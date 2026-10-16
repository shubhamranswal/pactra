import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai"
import {
  executeApiCall,
  executeBlockchainQuery,
  executeCryptoHasher,
} from "./tools.js"

dotenv.config()

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"

// Gemini Tool Definitions
export const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "tool_api_caller",
    description:
      "Performs an outbound HTTP request (GET or POST) to an approved whitelisted endpoint. Records deterministic API telemetry for Type A pact criteria.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: {
          type: "STRING",
          description: "Target URL. Must be in the approved outbound destination allowlist.",
        },
        method: {
          type: "STRING",
          description: "HTTP method: GET or POST.",
          enum: ["GET", "POST"],
        },
        body: {
          type: "OBJECT",
          description: "Optional JSON request body for POST requests.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "tool_blockchain_query",
    description:
      "Queries Monad Testnet (Chain ID 10143) RPC for transaction receipts, block numbers, or account balances for Type B criteria.",
    parameters: {
      type: "OBJECT",
      properties: {
        queryType: {
          type: "STRING",
          description: "Type of query to perform.",
          enum: ["receipt", "blockNumber", "balance"],
        },
        txHash: {
          type: "STRING",
          description: "Transaction hash (0x-prefixed 32-byte hex) when queryType is 'receipt'.",
        },
        address: {
          type: "STRING",
          description: "Target EVM address when queryType is 'balance'.",
        },
      },
      required: ["queryType"],
    },
  },
  {
    name: "tool_crypto_hasher",
    description:
      "Generates an RFC 8785 canonical JSON serialization and Keccak-256 output digest for deliverable data for Type C criteria.",
    parameters: {
      type: "OBJECT",
      properties: {
        outputPayload: {
          type: "OBJECT",
          description: "The JSON data object to canonicalize and hash.",
        },
        toolName: {
          type: "STRING",
          description: "Optional descriptive label for the computation tool.",
        },
      },
      required: ["outputPayload"],
    },
  },
]

export const AGENT_SYSTEM_INSTRUCTION = `You are the PACTRA Autonomous Executor Agent.
Your duty is to fulfill machine-verifiable service obligations for an on-chain pact on Monad Testnet.
You must use your available tools to perform real, verifiable work:
- To fulfill Type A (API Count) criteria: Call the specified endpoint using 'tool_api_caller' the required number of times.
- To fulfill Type B (Blockchain Tx) criteria: Query the relevant transaction receipt using 'tool_blockchain_query'.
- To fulfill Type C (Hash Match) criteria: Produce and digest the deliverables using 'tool_crypto_hasher'.

Rules:
1. You have ZERO authority to sign blockchain transactions or release funds.
2. You cannot declare your own work verified. An independent engine (Veridict) validates the raw telemetry.
3. Only use the approved tools provided. Never attempt to access private keys, system files, or unapproved network hosts.
4. When all required criteria have been executed via tools, summarize your completed steps concisely.`

/**
 * Executes a Gemini agent session against specific pact criteria using approved tools.
 *
 * @param {object} params
 * @param {string|number} params.pactId
 * @param {object} params.pact - Authoritative on-chain pact data
 * @param {Array} params.criteria - Authoritative pact acceptance criteria
 * @param {string} [params.prompt] - Optional task context prompt
 * @param {object} params.recorder - ExecutionRecorder instance
 * @param {string} [params.apiKey] - Optional override for GEMINI_API_KEY
 * @param {string} [params.model] - Optional override for model
 * @param {number} [params.maxTurns=8] - Maximum turns to prevent runaways
 * @returns {Promise<object>} Agent execution result
 */
export async function runGeminiAgent({
  pactId,
  pact,
  criteria = [],
  prompt = "",
  recorder,
  apiKey = process.env.GEMINI_API_KEY,
  model = MODEL_NAME,
  maxTurns = 8,
}) {
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY for agent execution")
  }

  const ai = new GoogleGenAI({ apiKey })

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: AGENT_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
      temperature: 0.1, // Low temperature for deterministic planning
    },
  })

  // Format initial user prompt containing pact constraints and criteria
  const criteriaSummary = criteria
    .map(
      (c, idx) =>
        `Criterion #${c.criterionId || idx + 1}: Type: ${c.type}. ${
          c.description || ""
        }. Details: ${JSON.stringify(c)}`
    )
    .join("\n")

  const initialMessage = `Pact #${pactId} Execution Request:
Pact Details:
- Recipient: ${pact?.recipient || "N/A"}
- Amount: ${pact?.amount ? pact.amount.toString() : "N/A"}
- Deadline: ${pact?.deadline ? pact.deadline.toString() : "N/A"}

Acceptance Criteria to Fulfill:
${criteriaSummary}

Additional Instructions:
${prompt || "Execute all required tool calls to satisfy the criteria."}

Begin execution by calling the appropriate tools now.`

  const stepsLog = []
  let currentResponse = await chat.sendMessage({ message: initialMessage })
  let turns = 0

  while (turns < maxTurns) {
    turns++
    const functionCalls = currentResponse.functionCalls

    if (!functionCalls || functionCalls.length === 0) {
      // Agent finished tool use
      break
    }

    const toolResponses = []

    for (const call of functionCalls) {
      stepsLog.push({
        turn: turns,
        type: "TOOL_CALL",
        toolName: call.name,
        args: call.args,
      })

      let toolResult = null

      try {
        switch (call.name) {
          case "tool_api_caller":
            toolResult = await executeApiCall({
              url: call.args.url,
              method: call.args.method || "GET",
              body: call.args.body || null,
              recorder,
            })
            break

          case "tool_blockchain_query":
            toolResult = await executeBlockchainQuery({
              queryType: call.args.queryType,
              txHash: call.args.txHash,
              address: call.args.address,
              recorder,
            })
            break

          case "tool_crypto_hasher":
            toolResult = executeCryptoHasher({
              outputPayload: call.args.outputPayload,
              toolName: call.args.toolName,
              recorder,
            })
            break

          default:
            toolResult = { error: `Unapproved tool: ${call.name}` }
        }
      } catch (toolErr) {
        toolResult = { error: toolErr.message || String(toolErr) }
      }

      stepsLog.push({
        turn: turns,
        type: "TOOL_RESPONSE",
        toolName: call.name,
        result: toolResult,
      })

      toolResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: toolResult },
          id: call.id,
        },
      })
    }

    // Send tool responses back to Gemini
    currentResponse = await chat.sendMessage({ message: toolResponses })
  }

  const finalNarrative = currentResponse?.text || "Task executed."

  return {
    pactId,
    model,
    turns,
    executionLog: finalNarrative,
    steps: stepsLog,
    traces: recorder?.getTraces() || [],
    completed: true,
  }
}
