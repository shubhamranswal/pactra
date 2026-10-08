import { defineChain } from "viem"
import { monadTestnet as baseMonadTestnet } from "viem/chains"

const customRpcUrl = import.meta.env.VITE_MONAD_RPC_URL

export const monadTestnet = defineChain({
  ...baseMonadTestnet,
  rpcUrls: {
    ...baseMonadTestnet.rpcUrls,
    default: {
      http: customRpcUrl
        ? [customRpcUrl, ...baseMonadTestnet.rpcUrls.default.http]
        : baseMonadTestnet.rpcUrls.default.http,
    },
  },
})
