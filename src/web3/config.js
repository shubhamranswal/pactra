import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "viem"
import { monadTestnet } from "./chains"

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000"

export const config = getDefaultConfig({
  appName: "PACTRA",
  projectId: walletConnectProjectId,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]),
  },
  ssr: false,
})
