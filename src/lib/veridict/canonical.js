import { keccak256, stringToBytes } from "viem"

/**
 * Deterministic JSON Canonicalization Scheme according to RFC 8785.
 * Recursively sorts object keys lexicographically and strips whitespace.
 *
 * @param {any} data
 * @returns {string} Canonical JSON string
 */
export function canonicalJson(data) {
  if (data === null || data === undefined) {
    return "null"
  }
  if (typeof data === "boolean") {
    return data ? "true" : "false"
  }
  if (typeof data === "number") {
    if (!Number.isFinite(data)) {
      throw new Error("Cannot canonicalize non-finite numbers")
    }
    return JSON.stringify(data)
  }
  if (typeof data === "string") {
    return JSON.stringify(data)
  }
  if (typeof data === "bigint") {
    return JSON.stringify(data.toString())
  }
  if (Array.isArray(data)) {
    const items = data.map((item) => canonicalJson(item))
    return `[${items.join(",")}]`
  }
  if (typeof data === "object") {
    const keys = Object.keys(data).sort()
    const entries = keys.map((key) => {
      const val = canonicalJson(data[key])
      return `${JSON.stringify(key)}:${val}`
    })
    return `{${entries.join(",")}}`
  }
  return JSON.stringify(data)
}

/**
 * Computes keccak256 hash of canonicalized JSON data.
 *
 * @param {any} obj
 * @returns {`0x${string}`} keccak256 hash
 */
export function hashCanonical(obj) {
  const canonicalString = canonicalJson(obj)
  return keccak256(stringToBytes(canonicalString))
}
