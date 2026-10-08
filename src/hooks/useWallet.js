import { useAccount, useChainId } from "wagmi"
import { monadTestnet } from "../web3/chains"
import { shortenAddress } from "../utils/address"

export function useWallet() {
  const { address, isConnected, chain, status } = useAccount()
  const chainId = useChainId()

  const isCorrectNetwork = isConnected && chainId === monadTestnet.id
  const displayAddress = shortenAddress(address)

  return {
    address,
    displayAddress,
    isConnected,
    chainId,
    chain,
    isCorrectNetwork,
    status,
  }
}
