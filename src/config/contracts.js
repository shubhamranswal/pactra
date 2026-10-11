import { isAddress } from "viem"
import { pactEscrowAbi } from "../contracts/pactEscrowAbi.js"

export const PACT_ESCROW_ADDRESS =
  (typeof window !== "undefined" && window.localStorage?.getItem("PACT_ESCROW_ADDRESS")) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PACT_ESCROW_ADDRESS) ||
  (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_PACT_ESCROW_ADDRESS) ||
  "0x3d22Dc20a9Ff29Fd4EbbCD5B380e8d641eA577ce"

export const isPactEscrowConfigured = isAddress(PACT_ESCROW_ADDRESS, { strict: false })

export const PACT_ESCROW_ABI = pactEscrowAbi
export { pactEscrowAbi }
