import { useState } from "react"

export default function TelemetryStrip() {
  const [copied, setCopied] = useState(false)
  const contractAddr = "0x9b4c09d8131238914ef"

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full rounded-xl bg-surface-container/60 border border-outline-variant/40 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-outline">
      <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-on-surface-variant">RPC Latency:</span>
          <span className="text-tertiary font-semibold">0.38s</span>
        </div>

        <span className="text-outline-variant hidden sm:inline">•</span>

        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">local_gas_station</span>
          <span className="text-on-surface-variant">Gas Used:</span>
          <span className="text-white font-semibold">0.00012 MON</span>
        </div>

        <span className="text-outline-variant hidden sm:inline">•</span>

        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-primary">hub</span>
          <span className="text-on-surface-variant">Consensus:</span>
          <span className="text-white font-semibold">Monad-BFT Verified</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span>Contract: 0x9b4c...14ef</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition-colors cursor-pointer"
          title="Copy Contract"
        >
          <span className="material-symbols-outlined text-[14px]">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </div>
    </div>
  )
}
