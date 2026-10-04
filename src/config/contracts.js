import { isAddress } from "viem"
import PactEscrowAbi from "../abi/PactEscrow.json"

export const PACT_ESCROW_ADDRESS = import.meta.env.VITE_PACT_ESCROW_ADDRESS || ""

export const isPactEscrowConfigured = isAddress(PACT_ESCROW_ADDRESS, { strict: false })

export const PACT_ESCROW_ABI = PactEscrowAbi
