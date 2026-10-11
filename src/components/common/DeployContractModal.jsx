import { useState } from "react"
import { useWalletClient, usePublicClient } from "wagmi"
import compiled from "../../contracts/compiledPactEscrow.json"
import { PACT_ESCROW_ADDRESS } from "../../config/contracts"
import { shortenAddress } from "../../utils/address"

export default function DeployContractModal() {
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState(null)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const isOldContract =
    PACT_ESCROW_ADDRESS.toLowerCase() === "0x3d22dc20a9ff29fd4ebbcd5b380e8d641ea577ce"

  const handleDeploy = async () => {
    if (!walletClient) {
      setError("Please connect your wallet first.")
      return
    }

    setIsDeploying(true)
    setError(null)

    try {
      console.log("Deploying updated PactEscrow contract via connected wallet...")
      const hash = await walletClient.deployContract({
        abi: compiled.abi,
        bytecode: compiled.bytecode,
      })

      console.log("Deploy tx submitted:", hash)

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        const newAddress = receipt.contractAddress

        if (!newAddress) {
          throw new Error("No contract address returned in deployment receipt.")
        }

        setDeployedAddress(newAddress)
        localStorage.setItem("PACT_ESCROW_ADDRESS", newAddress)

        // Persist to .env via Vite dev server middleware
        try {
          await fetch("/api/update-contract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: newAddress }),
          })
        } catch (e) {
          console.warn("Could not write to .env via API, saved in localStorage:", e)
        }

        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      console.error("Deploy failed:", err)
      setError(err?.shortMessage || err?.message || "Deployment failed.")
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      {/* Subtle indicator / deploy button in top navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
            isOldContract
              ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 animate-pulse"
              : "bg-surface-high border border-outline-variant/60 text-outline hover:text-white"
          }`}
          title="Escrow Contract Settings"
        >
          <span className="material-symbols-outlined text-[15px]">
            {isOldContract ? "upgrade" : "smart_toy"}
          </span>
          <span>{isOldContract ? "Upgrade Escrow" : shortenAddress(PACT_ESCROW_ADDRESS)}</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface-low border border-outline-variant/50 p-6 shadow-2xl flex flex-col gap-5 text-left relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-outline hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[24px]">
                rocket_launch
              </span>
              <h3 className="font-display text-lg font-bold text-white">
                Escrow Smart Contract
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/40 flex flex-col gap-1.5 text-xs font-mono">
              <span className="text-outline uppercase text-[10px]">Active Contract Address:</span>
              <span className="text-white break-all">{PACT_ESCROW_ADDRESS}</span>
              {isOldContract ? (
                <span className="text-amber-400 text-[11px] font-sans mt-1">
                  ⚠️ This is the legacy escrow contract. In this contract, funds are held in review and require manual two-wallet authorization to release.
                </span>
              ) : (
                <span className="text-emerald-400 text-[11px] font-sans mt-1">
                  ✓ Direct-Payout contract active: submitting evidence immediately transfers funds to the recipient!
                </span>
              )}
            </div>

            <div className="text-xs text-on-surface-variant font-sans leading-relaxed">
              Deploy the updated <strong className="text-white">Direct-Payout Escrow Contract</strong> on Monad Testnet. When deployed, clicking <em>"Submit Evidence"</em> in the UI will directly transfer the escrow amount from the contract to the receiver's wallet.
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-danger/15 border border-danger/40 text-danger text-xs font-mono break-all">
                {error}
              </div>
            )}

            {deployedAddress && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-success/40 text-emerald-300 text-xs font-mono">
                🎉 Deployed successfully at: <br />
                <span className="font-bold break-all">{deployedAddress}</span>
                <div className="text-[11px] text-white mt-1">Reloading app...</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-high text-outline hover:text-white text-xs font-mono"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDeploy}
                disabled={isDeploying}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-sans transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isDeploying ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin"></span>
                    <span>Deploying with MetaMask...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">deploy</span>
                    <span>Deploy Updated Contract (1-Click)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
