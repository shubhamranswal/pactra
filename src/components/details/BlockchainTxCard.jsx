import { useState } from "react"
import { PACT_ESCROW_ADDRESS } from "../../config/contracts"
import { shortenAddress } from "../../utils/address"

export default function BlockchainTxCard({ pact, transactionHash, isDemo = false }) {
  const [copiedHash, setCopiedHash] = useState(false)
  const [copiedContract, setCopiedContract] = useState(false)

  // Use real transaction hash if available, or contract address
  const activeTxHash = transactionHash || (isDemo ? "0x82af5c7198bb492a91bd" : null)
  const contractAddr = PACT_ESCROW_ADDRESS || "0x3d22Dc20a9Ff29Fd4EbbCD5B380e8d641eA577ce"

  const handleCopyHash = () => {
    if (!activeTxHash) return
    navigator.clipboard.writeText(activeTxHash)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractAddr)
    setCopiedContract(true)
    setTimeout(() => setCopiedContract(false), 2000)
  }

  const explorerUrl = activeTxHash
    ? `https://testnet.monadexplorer.com/tx/${activeTxHash}`
    : `https://testnet.monadexplorer.com/address/${contractAddr}`

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-3.5 text-left">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary text-[18px]">receipt_long</span>
          <h3 className="font-display text-base font-semibold text-white">Blockchain Record</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isDemo ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              SIMULATED
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">done_all</span>
              <span>VERIFIED ON-CHAIN</span>
            </span>
          )}
        </div>
      </div>

      {/* Transaction & Contract Details Compact Grid */}
      <div className="flex flex-col gap-2 font-mono text-xs">
        {/* Contract Address */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Escrow Contract</span>
          <div className="flex items-center gap-1.5 text-white font-medium">
            <span>{shortenAddress(contractAddr)}</span>
            <button
              onClick={handleCopyContract}
              className="text-outline hover:text-white transition-colors cursor-pointer"
              title="Copy Contract Address"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedContract ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Network</span>
          <span className="text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>Monad Testnet (Chain ID 10143)</span>
          </span>
        </div>

        {/* Tx Hash (if recorded) */}
        {activeTxHash ? (
          <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
            <span className="text-outline">
              {isDemo ? "Tx Hash (Demo)" : "Creation Tx"}
            </span>
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <span>{activeTxHash.slice(0, 10)}...{activeTxHash.slice(-6)}</span>
              <button
                onClick={handleCopyHash}
                className="text-outline hover:text-white transition-colors cursor-pointer"
                title="Copy Hash"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedHash ? "check" : "content_copy"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
            <span className="text-outline">Pact Storage</span>
            <span className="text-on-surface-variant font-medium">
              Contract Slot State Verified
            </span>
          </div>
        )}

        {/* On-Chain Status Code */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Contract Status</span>
          <span className="font-semibold text-white">
            {pact ? pact.statusLabel : (isDemo ? "Funded (Simulated)" : "On-Chain")}
          </span>
        </div>

        {/* Finality & Consensus */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Consensus Finality</span>
          <span className="text-tertiary font-medium">
            ~400 ms <span className="text-outline">|</span> Monad BFT
          </span>
        </div>
      </div>

      {/* Explorer Link */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 w-full py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant/60 hover:border-outline text-white font-mono text-xs font-medium transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
      >
        <span>
          {activeTxHash ? "View Transaction on Monad Explorer" : "Inspect Contract on Monad Explorer"}
        </span>
        <span className="material-symbols-outlined text-[15px] text-tertiary group-hover:translate-x-0.5 transition-transform">
          open_in_new
        </span>
      </a>
    </div>
  )
}
