import { useState } from "react"

export default function PaymentObligationCard({ pactId = "P-1024" }) {
  const [copied, setCopied] = useState(false)
  const recipientAddr = "0x71C5A82d54B98819446D61BcA49A92"

  const handleCopy = () => {
    navigator.clipboard.writeText(recipientAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-surface-low border border-outline-variant/50 p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(168,85,247,0.7)]"></div>
          <h3 className="font-display text-base font-semibold text-white">Payment Obligation</h3>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-outline px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40">
          Pact Rule #{pactId.replace(/^P-/, "")}
        </span>
      </div>

      {/* Key Obligation Metrics List */}
      <div className="flex flex-col gap-3 font-sans text-sm">
        {/* WHO (From) */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-outline">From Originator</div>
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>PaymentAgent-B</span>
                <span className="text-xs font-mono text-outline-variant">(AI Agent)</span>
              </div>
            </div>
          </div>
          <div className="font-mono text-xs text-on-surface-variant bg-surface-high px-2 py-1 rounded">
            0x8192...c09f
          </div>
        </div>

        {/* HOW MUCH & TOKEN */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-outline">Payment Amount &amp; Token</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display text-2xl font-bold text-white tracking-tight">5 MON</span>
              <span className="font-mono text-xs text-tertiary font-medium">≈ $18.40 USD</span>
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-1 rounded text-xs font-mono font-semibold bg-tertiary/10 border border-tertiary/30 text-tertiary">
              MONAD NATIVE
            </span>
          </div>
        </div>

        {/* TO WHOM (Recipient) */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-outline">Designated Recipient</span>
            <span className="text-[10px] font-mono text-primary font-medium uppercase">Expected Address</span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-surface-high/80 px-2.5 py-1.5 rounded border border-outline-variant/40">
            <span className="font-mono text-xs text-white truncate font-medium">
              {recipientAddr}
            </span>
            <button
              onClick={handleCopy}
              className="text-outline hover:text-white transition-colors cursor-pointer"
              title="Copy Address"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copied ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* BY WHEN & ESCROW (2 col sub-grid) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Deadline */}
          <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-outline">Deadline (UTC)</span>
            <div className="mt-1">
              <span className="font-mono text-sm font-bold text-white">18:00 UTC</span>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-tertiary">
                <span className="material-symbols-outlined text-[13px]">alarm</span>
                <span>Timelock Active</span>
              </div>
            </div>
          </div>

          {/* Escrow Collateral */}
          <div className="p-3 rounded-lg bg-surface-container/60 border border-primary/30 flex flex-col justify-between relative overflow-hidden">
            <div className="pointer-events-none absolute -right-4 -bottom-4 w-14 h-14 bg-primary-container/20 rounded-full blur-xl"></div>
            <span className="text-[11px] font-mono uppercase text-primary font-medium">
              Escrow Collateral
            </span>
            <div className="mt-1">
              <span className="font-mono text-sm font-bold text-primary">100 USDC</span>
              <div className="mt-1 text-[10px] font-sans text-on-surface-variant">
                Isolated Non-Custodial Vault
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
