/**
 * Truncates an Ethereum address to shortened format (e.g. 0x1234...5678).
 * Safely handles null, undefined, empty strings, and non-string inputs.
 *
 * @param {string} address - The address string to shorten.
 * @param {number} chars - Number of characters to display at prefix and suffix (default: 4).
 * @returns {string} Shortened address string or empty string if input is invalid.
 */
export function shortenAddress(address, chars = 4) {
  if (!address || typeof address !== "string") {
    return ""
  }

  const trimmed = address.trim()
  if (trimmed.length <= chars * 2 + 2) {
    return trimmed
  }

  return `${trimmed.substring(0, chars + 2)}...${trimmed.substring(trimmed.length - chars)}`
}
