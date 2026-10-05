import { isAddress } from "viem"
import { pactEscrowAbi } from "../contracts/pactEscrowAbi"

export const PACT_ESCROW_ADDRESS = import.meta.env.VITE_PACT_ESCROW_ADDRESS || ""

export const isPactEscrowConfigured = isAddress(PACT_ESCROW_ADDRESS, { strict: false })

export const PACT_ESCROW_ABI = pactEscrowAbi

export const PACT_ESCROW_V1_ABI = pactEscrowAbi.map((item) => {
  if (item.name === "getPact" && item.type === "function" && item.outputs?.[0]?.components?.length > 9) {
    return {
      ...item,
      outputs: [
        {
          ...item.outputs[0],
          components: item.outputs[0].components.slice(0, 9),
        },
      ],
    }
  }
  return item
})

export { pactEscrowAbi }
