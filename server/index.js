import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import { GoogleGenAI } from "@google/genai"
import { createPublicClient, http, isAddress } from "viem"
import { pactEscrowAbi } from "../src/contracts/pactEscrowAbi.js"
import { ExecutionRecorder } from "../src/lib/veridict/recorder.js"
import { runGeminiAgent } from "./agent.js"
import { getAuthoritativePactTerms } from "./pactRegistry.js"
import { compileEvidenceFromTraces } from "./manifestBridge.js"

dotenv.config()

export const app = express()
const port = process.env.AGENT_PORT || 3001
const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
const monadRpcUrl = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
const pactEscrowAddress =
  process.env.VITE_PACT_ESCROW_ADDRESS || "0x3d22Dc20a9Ff29Fd4EbbCD5B380e8d641eA577ce"

// Allowed frontend origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server) or from allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`))
      }
    },
    credentials: true,
  })
)

app.use(express.json({ limit: "64kb" }))

// Cached SDK probe status
let sdkStatus = {
  verified: false,
  model: modelName,
  lastChecked: null,
  error: null,
}

export async function verifyGeminiSdk() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    sdkStatus = {
      verified: false,
      model: modelName,
      lastChecked: Date.now(),
      error: "Missing or unconfigured GEMINI_API_KEY",
    }
    return sdkStatus
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateContent({
      model: modelName,
      contents: "ping",
    })

    if (res && res.text) {
      sdkStatus = {
        verified: true,
        model: modelName,
        lastChecked: Date.now(),
        error: null,
      }
    } else {
      sdkStatus = {
        verified: false,
        model: modelName,
        lastChecked: Date.now(),
        error: "Probe succeeded but received empty text response",
      }
    }
  } catch (err) {
    sdkStatus = {
      verified: false,
      model: modelName,
      lastChecked: Date.now(),
      error: err.message || String(err),
    }
  }

  return sdkStatus
}

// 1. Health check endpoint
app.get("/api/agent/health", async (_req, res) => {
  if (!sdkStatus.verified) {
    await verifyGeminiSdk()
  }

  res.json({
    status: sdkStatus.verified ? "healthy" : "degraded",
    sdkVerified: sdkStatus.verified,
    model: sdkStatus.model,
    network: 10143,
    monadRpcUrl,
    pactEscrowAddress,
    lastChecked: sdkStatus.lastChecked,
    ...(sdkStatus.error ? { warning: sdkStatus.error } : {}),
  })
})

// 2. Dedicated local test telemetry endpoint (for deterministic Type A criteria in test/dev)
app.all("/api/test-telemetry", (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000)
  const batchId = `test_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  res.json({
    acknowledged: true,
    isTestEndpoint: true,
    timestamp,
    batchId,
    receivedPayload: req.body || null,
  })
})

// 3. Primary Agent Task Execution Endpoint
app.post("/api/agent/execute", async (req, res) => {
  const { pactId, contractAddress: clientContractAddress } = req.body || {}

  if (!pactId) {
    return res.status(400).json({
      error: "BadRequest",
      message: "Missing required pactId",
    })
  }

  const targetContract =
    (clientContractAddress && isAddress(clientContractAddress, { strict: false })
      ? clientContractAddress
      : null) || pactEscrowAddress

  // Authoritative on-chain lookup via Monad Testnet RPC
  let pactOnChain = null
  try {
    const publicClient = createPublicClient({
      transport: http(monadRpcUrl),
    })

    const onChainResult = await publicClient.readContract({
      address: targetContract,
      abi: pactEscrowAbi,
      functionName: "getPact",
      args: [BigInt(pactId)],
    })

    if (onChainResult) {
      pactOnChain = {
        id: onChainResult.id.toString(),
        creator: onChainResult.creator,
        recipient: onChainResult.recipient,
        amount: onChainResult.amount.toString(),
        createdAt: Number(onChainResult.createdAt),
        deadline: Number(onChainResult.deadline),
        submittedAt: Number(onChainResult.submittedAt),
        status: Number(onChainResult.status),
        evidenceHash: onChainResult.evidenceHash,
      }
    }
  } catch (rpcErr) {
    console.warn(`[AgentAPI] RPC check for pact #${pactId}: ${rpcErr.message || rpcErr}`)
    // If not found on-chain, supply a fallback record for local testbeds
    pactOnChain = {
      id: String(pactId),
      creator: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
      amount: "1000000000000000000",
      createdAt: Math.floor(Date.now() / 1000) - 3600,
      deadline: Math.floor(Date.now() / 1000) + 86400,
      submittedAt: 0,
      status: 0, // Funded
      evidenceHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      isRpcFallback: true,
    }
  }

  // Validate pact status
  if (pactOnChain.status === 2) {
    return res.status(400).json({
      error: "InvalidPactState",
      message: "Pact is already settled on-chain.",
    })
  }

  if (pactOnChain.status === 3) {
    return res.status(400).json({
      error: "InvalidPactState",
      message: "Pact has already been refunded.",
    })
  }

  const now = Math.floor(Date.now() / 1000)
  if (pactOnChain.deadline && now > pactOnChain.deadline) {
    return res.status(400).json({
      error: "DeadlinePassed",
      message: "Pact deadline has passed. Evidence can no longer be accepted.",
    })
  }

  // Authoritative pact terms resolution from Server Registry (never trust client criteria)
  const terms = getAuthoritativePactTerms(pactId, pactOnChain)

  // Run Gemini Agent with live ExecutionRecorder
  const recorder = new ExecutionRecorder()

  try {
    const agentResult = await runGeminiAgent({
      pactId,
      pact: pactOnChain,
      criteria: terms.criteria,
      prompt: terms.taskPrompt,
      recorder,
    })

    // Compile canonical EvidencePackage from recorded traces
    const { evidencePackage, evidenceHash } = compileEvidenceFromTraces({
      pactId,
      executor: pactOnChain.recipient,
      criteria: terms.criteria,
      traces: agentResult.traces,
    })

    return res.json({
      success: true,
      pactId: String(pactId),
      pact: pactOnChain,
      terms,
      executionLog: agentResult.executionLog,
      steps: agentResult.steps,
      traces: agentResult.traces,
      evidencePackage,
      evidenceHash,
    })
  } catch (agentErr) {
    console.error(`[AgentAPI] Error executing agent for pact #${pactId}:`, agentErr)
    return res.status(500).json({
      error: "AgentExecutionFailed",
      message: agentErr.message || String(agentErr),
      traces: recorder.getTraces(),
    })
  }
})

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("[ServerError]:", err.message || err)
  res.status(500).json({
    error: "InternalServerError",
    message: err.message || "An unexpected error occurred",
  })
})

// Start server if executed directly
const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()

if (isDirectExecution) {
  const server = app.listen(port, () => {
    console.log(`[PACTRA Agent Server] Running on http://localhost:${port}`)
    console.log(`[PACTRA Agent Server] Health: http://localhost:${port}/api/agent/health`)
    console.log(`[PACTRA Agent Server] Test Telemetry: http://localhost:${port}/api/test-telemetry`)
    console.log(`[PACTRA Agent Server] Agent Execute: POST http://localhost:${port}/api/agent/execute`)
  })

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[PACTRA Agent Server] Port ${port} is already in use by another process.`)
    } else {
      console.error(`[PACTRA Agent Server] Server error:`, err)
    }
  })

  verifyGeminiSdk().then((status) => {
    if (status.verified) {
      console.log(`[Gemini SDK] Verified connection to ${status.model}`)
    } else {
      console.warn(`[Gemini SDK] Warning during verification: ${status.error}`)
    }
  }).catch((err) => {
    console.warn(`[Gemini SDK] Initialization check failed:`, err.message || err)
  })
}
