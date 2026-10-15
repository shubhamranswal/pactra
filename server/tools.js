import dns from "dns/promises"
import net from "net"
import { createPublicClient, http } from "viem"
import { canonicalJson, hashCanonical } from "../src/lib/veridict/canonical.js"

const MONAD_RPC_URL = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
const AGENT_PORT = process.env.AGENT_PORT || "3001"

// Default allowed outbound hosts for API calling
const DEFAULT_ALLOWED_HOSTS = new Set([
  `localhost:${AGENT_PORT}`,
  `127.0.0.1:${AGENT_PORT}`,
  "testnet-rpc.monad.xyz",
])

/**
 * Checks if an IP address falls within private, loopback, or link-local ranges.
 */
export function isPrivateIp(ip) {
  if (!ip) return true
  const family = net.isIP(ip)
  if (family === 4) {
    const parts = ip.split(".").map(Number)
    if (parts.length !== 4) return true

    // 0.0.0.0/8
    if (parts[0] === 0) return true
    // 10.0.0.0/8
    if (parts[0] === 10) return true
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true
    // 169.254.0.0/16 (Link-local / Cloud metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true
    // Broadcast
    if (parts[0] >= 224) return true

    return false
  } else if (family === 6) {
    const normalized = ip.toLowerCase()
    // ::1 loopback
    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true
    // fc00::/7 (Unique local)
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true
    // fe80::/10 (Link-local)
    if (normalized.startsWith("fe80")) return true
    return false
  }
  return true
}

/**
 * Validates outbound request URL against SSRF and allowlist rules.
 */
export async function validateOutboundUrl(urlString, { allowedHosts = DEFAULT_ALLOWED_HOSTS } = {}) {
  let parsed
  try {
    parsed = new URL(urlString)
  } catch {
    throw new Error(`Invalid URL: ${urlString}`)
  }

  // 1. Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported protocol ${parsed.protocol}. Only http and https are allowed.`)
  }

  const hostWithPort = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname
  const isLocalDevHost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1"

  // 2. Allowlist check
  const hostAllowed =
    allowedHosts.has(parsed.hostname) ||
    allowedHosts.has(hostWithPort) ||
    (isLocalDevHost && parsed.port === String(AGENT_PORT))

  if (!hostAllowed) {
    throw new Error(`Destination host "${hostWithPort}" is not in the approved outbound allowlist.`)
  }

  // 3. SSRF / IP resolution check for non-local hosts
  if (!isLocalDevHost) {
    try {
      const lookup = await dns.lookup(parsed.hostname)
      if (isPrivateIp(lookup.address)) {
        throw new Error(`Outbound target resolves to private or restricted IP: ${lookup.address}`)
      }
    } catch (err) {
      if (err.message?.includes("resolves to private")) throw err
      throw new Error(`DNS resolution failed for host "${parsed.hostname}": ${err.message}`)
    }
  }

  return parsed
}

/**
 * Tool A: Outbound HTTP API Caller with SSRF protection and ExecutionRecorder hook.
 */
export async function executeApiCall({
  url,
  method = "GET",
  body = null,
  headers = {},
  recorder,
  allowedHosts = DEFAULT_ALLOWED_HOSTS,
}) {
  const upperMethod = method.toUpperCase()
  if (upperMethod !== "GET" && upperMethod !== "POST") {
    throw new Error(`Method ${method} is not permitted. Only GET and POST are supported.`)
  }

  await validateOutboundUrl(url, { allowedHosts })

  const requestOptions = {
    method: upperMethod,
    headers: {
      "User-Agent": "PACTRA-Agent/1.0",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    redirect: "manual", // Do NOT follow redirects automatically (SSRF defense)
    signal: AbortSignal.timeout(5000), // 5-second hard timeout
  }

  if (body && upperMethod === "POST") {
    const stringBody = typeof body === "string" ? body : JSON.stringify(body)
    if (Buffer.byteLength(stringBody, "utf8") > 64 * 1024) {
      throw new Error("Request body exceeds maximum allowed size of 64 KB")
    }
    requestOptions.body = stringBody
  }

  let responseStatus = 0
  let responseData = null

  try {
    const res = await fetch(url, requestOptions)
    responseStatus = res.status

    if (res.status >= 300 && res.status < 400) {
      throw new Error(`HTTP Redirect ${res.status} blocked by security policy.`)
    }

    const text = await res.text()
    if (text.length > 1024 * 1024) {
      responseData = { warning: "Response exceeded 1MB and was truncated", truncated: text.slice(0, 1024) }
    } else {
      try {
        responseData = JSON.parse(text)
      } catch {
        responseData = text.slice(0, 1024)
      }
    }
  } catch (err) {
    if (responseStatus === 0) responseStatus = 500
    responseData = { error: err.message || String(err) }
  }

  // Record deterministic telemetry
  let trace = null
  if (recorder && typeof recorder.recordApiCall === "function") {
    trace = recorder.recordApiCall({
      url,
      method: upperMethod,
      status: responseStatus,
      responseData,
    })
  }

  return {
    status: responseStatus,
    data: responseData,
    trace,
  }
}

/**
 * Tool B: Monad Testnet On-Chain Inspector with ExecutionRecorder hook.
 */
export async function executeBlockchainQuery({
  queryType = "receipt",
  txHash = null,
  address = null,
  recorder,
  rpcUrl = MONAD_RPC_URL,
}) {
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  })

  let trace = null

  if (queryType === "receipt" && txHash) {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
    const tx = await publicClient.getTransaction({ hash: txHash })

    const status =
      receipt.status === "success" || receipt.status === 1 || receipt.status === 1n
        ? "success"
        : "reverted"

    if (recorder && typeof recorder.recordBlockchainTx === "function") {
      trace = recorder.recordBlockchainTx({
        txHash,
        from: tx?.from || null,
        to: receipt?.to || tx?.to || null,
        value: tx?.value !== undefined ? tx.value.toString() : "0",
        blockNumber: receipt?.blockNumber !== undefined ? Number(receipt.blockNumber) : null,
        status,
      })
    }

    return {
      txHash,
      receipt: {
        status,
        to: receipt.to,
        blockNumber: Number(receipt.blockNumber),
      },
      tx: {
        from: tx?.from,
        to: tx?.to,
        value: tx?.value?.toString(),
      },
      trace,
    }
  } else if (queryType === "blockNumber") {
    const blockNumber = await publicClient.getBlockNumber()
    return { blockNumber: Number(blockNumber) }
  } else if (queryType === "balance" && address) {
    const balance = await publicClient.getBalance({ address })
    return { address, balanceWei: balance.toString() }
  }

  throw new Error(`Unsupported blockchain query type: ${queryType}`)
}

/**
 * Tool C: Deterministic Cryptographic Hasher with ExecutionRecorder hook.
 */
export function executeCryptoHasher({
  outputPayload,
  toolName = "deterministic_digest_generator",
  recorder,
}) {
  if (outputPayload === undefined) {
    throw new Error("Missing outputPayload for crypto hasher")
  }

  const canonicalString = canonicalJson(outputPayload)
  const canonicalHash = hashCanonical(outputPayload)

  let trace = null
  if (recorder && typeof recorder.recordToolOutput === "function") {
    trace = recorder.recordToolOutput({
      toolName,
      outputPayload,
    })
  }

  return {
    canonicalString,
    canonicalHash,
    trace,
  }
}
