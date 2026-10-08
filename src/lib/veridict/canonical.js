import { keccak256, stringToBytes } from "viem"

/**
 * Serializes a JavaScript value to canonical JSON string following RFC 8785 principles.
 * 
 * Rules:
 * 1. Object keys are strictly sorted by UTF-16 code units (Array.prototype.sort).
 * 2. No whitespace between tokens (no spaces after colons, commas, or brackets).
 * 3. Primitive types (string, number, boolean, null) follow standard JSON rules.
 * 4. BigInt values are converted to string to avoid serialization exceptions.
 * 5. Undefined values or functions inside objects are omitted, matching JSON.stringify.
 * 
 * @param {any} value - Value to serialize canonically.
 * @returns {string} Deterministic canonical JSON string.
 */
export function canonicalJson(value) {
  if (value === null) {
    return "null"
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Cannot canonically serialize non-finite number: ${value}`)
    }
    // Handle -0 -> 0 per RFC 8785 section 3.2.2.3
    if (Object.is(value, -0)) {
      return "0"
    }
    return JSON.stringify(value)
  }

  if (typeof value === "bigint") {
    return JSON.stringify(value.toString())
  }

  if (typeof value === "string") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    const serializedItems = value.map((item) => {
      // In JSON array serialization, undefined/functions/symbols serialize to null
      if (item === undefined || typeof item === "function" || typeof item === "symbol") {
        return "null"
      }
      return canonicalJson(item)
    })
    return `[${serializedItems.join(",")}]`
  }

  if (typeof value === "object") {
    // If object defines a custom toJSON method, invoke it first
    if (typeof value.toJSON === "function") {
      return canonicalJson(value.toJSON())
    }

    const sortedKeys = Object.keys(value).sort()
    const entries = []

    for (const key of sortedKeys) {
      const propVal = value[key]
      // Skip undefined, functions, and symbols in object values, matching JSON.stringify
      if (propVal === undefined || typeof propVal === "function" || typeof propVal === "symbol") {
        continue
      }
      entries.push(`${JSON.stringify(key)}:${canonicalJson(propVal)}`)
    }

    return `{${entries.join(",")}}`
  }

  // Standalone undefined/function/symbol returns undefined string representation
  return undefined
}

/**
 * Computes a 32-byte cryptographic keccak256 hash over the canonical JSON serialization of a value.
 *
 * @param {any} value - Object or value to canonically hash.
 * @returns {`0x${string}`} 32-byte hex keccak256 hash (0x-prefixed).
 */
export function hashCanonical(value) {
  const canonicalString = canonicalJson(value)
  if (canonicalString === undefined) {
    throw new TypeError("Cannot compute canonical hash for non-serializable value (undefined)")
  }
  return keccak256(stringToBytes(canonicalString))
}

export const keccak256CanonicalJson = hashCanonical

