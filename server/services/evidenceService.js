import { keccak256, stringToBytes } from "viem"

// In-memory off-chain storage mapping pactId or hash to raw evidence payload
const evidenceStore = new Map()

/**
 * Normalizes raw evidence payload (text, URL, or JSON) into a deterministic string.
 */
export function normalizeEvidence(evidence) {
  if (evidence === undefined || evidence === null) {
    return ""
  }
  if (typeof evidence === "string") {
    return evidence.trim()
  }
  if (typeof evidence === "object") {
    try {
      return JSON.stringify(evidence)
    } catch {
      return String(evidence).trim()
    }
  }
  return String(evidence).trim()
}

/**
 * Calculates bytes32 Keccak-256 hash of normalized evidence string.
 */
export function calculateEvidenceHash(evidence) {
  const normalized = normalizeEvidence(evidence)
  if (!normalized) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000"
  }
  return keccak256(stringToBytes(normalized))
}

/**
 * Stores raw evidence payload off-chain for a pact ID.
 */
export function storeEvidence(pactId, evidence) {
  const normalized = normalizeEvidence(evidence)
  const hash = calculateEvidenceHash(normalized)
  const entry = {
    pactId: pactId ? pactId.toString() : null,
    rawEvidence: evidence,
    normalized,
    hash,
    storedAt: Date.now(),
  }
  if (pactId) {
    evidenceStore.set(pactId.toString(), entry)
  }
  evidenceStore.set(hash.toLowerCase(), entry)
  return entry
}

/**
 * Retrieves off-chain stored evidence by pactId or evidenceHash.
 */
export function getEvidence(pactIdOrHash) {
  if (!pactIdOrHash) return null
  const key = pactIdOrHash.toString().toLowerCase()
  return evidenceStore.get(key) || null
}
