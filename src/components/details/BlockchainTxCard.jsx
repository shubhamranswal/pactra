import { useState } from "react"

export default function BlockchainTxCard() {
  const [copied, setCopied] = useState(false)
  const txHash = "0x82af5c7198bb492a91bd"

  const handleCopy = () => {
    navigator.clipboard.writeText(txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary text-[18px]">receipt_long</span>
          <h3 className="font-display text-base font-semibold text-white">Blockchain Transaction</h3>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">done_all</span>
          <span>SUCCESS</span>
        </span>
      </div>

      {/* Transaction Details Compact Grid */}
      <div className="flex flex-col gap-2 font-mono text-xs">
        {/* Tx Hash */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Tx Hash</span>
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <span>0x82af...91bd</span>
            <button
              onClick={handleCopy}
              className="text-outline hover:text-white transition-colors cursor-pointer"
              title="Copy Hash"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Network</span>
          <span className="text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>Monad Testnet (EVM)</span>
          </span>
        </div>

        {/* Block Number */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Block Number</span>
          <span className="text-white font-medium">#182,931</span>
        </div>

        {/* Latency / Gas */}
        <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
          <span className="text-outline">Finality / Gas</span>
          <span className="text-tertiary font-medium">
            &lt; 380 ms finality <span className="text-outline">|</span> 0.00012 MON
          </span>
        </div>
      </div>

      {/* External Explorer CTA Button */}
      <a
        href="https://monad-explorer.testnet"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 w-full py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-high border border-outline-variant/60 hover:border-outline text-white font-mono text-xs font-medium transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
      >
        <span>View Transaction on Monad Explorer</span>
        <span className="material-symbols-outlined text-[15px] text-tertiary group-hover:translate-x-0.5 transition-transform">
          open_in_new
        </span>
      </a>
    </div>
  )
}
