import { isAddress } from "viem"
import { pactEscrowAbi } from "../contracts/pactEscrowAbi.js"

export const PACT_ESCROW_ADDRESS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PACT_ESCROW_ADDRESS) ||
  (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_PACT_ESCROW_ADDRESS) ||
  ""

export const isPactEscrowConfigured = isAddress(PACT_ESCROW_ADDRESS, { strict: false })

export const PACT_ESCROW_ABI = pactEscrowAbi
export { pactEscrowAbi }
