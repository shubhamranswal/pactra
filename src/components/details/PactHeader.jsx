import { Link } from "react-router-dom"
import { shortenAddress } from "../../utils/address"

export default function PactHeader({ pact, pactId, mode, isDemo = false }) {
  const rawId = pact?.id || (pactId ? String(pactId).replace(/^[#P-]+/, "") : "")
  const displayId = rawId ? `#${rawId}` : ""
  const amountText = pact ? `${pact.amountFormatted} MON` : (isDemo ? "5 MON" : "—")
  const recipientText = pact?.recipient ? shortenAddress(pact.recipient) : (isDemo ? "0x7099...79C8" : "—")

  const statusLabel = pact ? pact.statusLabel.toUpperCase() : mode.toUpperCase()

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant/40 pb-5 text-left">
      <div className="flex flex-col gap-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-outline font-medium">
          <Link
            to="/dashboard"
            className="hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Dashboard
          </Link>
          <span className="text-outline-variant font-mono">/</span>
          <Link to="/dashboard" className="hover:text-on-surface transition-colors">
            Pacts
          </Link>
          <span className="text-outline-variant font-mono">/</span>
          <span className="font-mono text-primary font-semibold">{displayId}</span>
        </div>

        {/* Title & Live Status Radar Badge */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Pact {displayId}
          </h1>

          {/* Dynamic Main Status Badge */}
          {pact && !isDemo ? (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm ${pact.statusInfo.badgeClass}`}>
              <span className="material-symbols-outlined text-[15px]">{pact.statusInfo.icon}</span>
              <span className="font-mono text-xs tracking-wider uppercase font-bold text-white">
                {pact.statusLabel}
              </span>
            </div>
          ) : (
            <>
              {mode === "verifying" && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/25 border border-primary/50 text-primary shadow-[0_0_20px_rgba(124,58,237,0.45)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-85"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                  <span className="font-mono text-xs tracking-wider uppercase font-bold text-white">
                    VERIFYING
                  </span>
                </div>
              )}

              {mode === "passed" && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-success/60 text-emerald-300 shadow-[0_0_20px_rgba(160,185,129,0.45)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                  </span>
                  <span className="font-mono text-xs tracking-wider uppercase font-bold text-white">
                    SETTLED
                  </span>
                </div>
              )}

              {(mode === "mismatch" || mode === "expired") && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/20 border border-danger/60 text-danger shadow-[0_0_20px_rgba(239,68,68,0.45)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
                  </span>
                  <span className="font-mono text-xs tracking-wider uppercase font-bold text-white">
                    {mode === "expired" ? "EXPIRED / REFUNDED" : "REVERTED / REFUNDED"}
                  </span>
                </div>
              )}
            </>
          )}

          {isDemo ? (
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Interactive Simulation Mode
            </span>
          ) : (
            <span className="text-xs font-mono text-outline">
              Monad Testnet Native Escrow
            </span>
          )}
        </div>
      </div>

      {/* Quick Telemetry Badges */}
      <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto font-mono text-xs">
        {/* Obligation Summary Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/60">
          <span className="text-outline">ESCROW:</span>
          <span className="font-semibold text-white">{amountText}</span>
          <span className="text-tertiary">→</span>
          <span className="text-on-surface-variant font-medium">{recipientText}</span>
        </div>

        {/* Escrow State Badge */}
        {mode === "verifying" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-primary/40 text-primary">
            <span className="material-symbols-outlined text-[15px]">lock</span>
            <span className="font-bold text-white">{amountText}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-primary-container/40 text-primary">
              {pact ? pact.statusLabel.toUpperCase() : "LOCKED"}
            </span>
          </div>
        )}

        {mode === "passed" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-success/40 text-success">
            <span className="material-symbols-outlined text-[15px] text-success">lock_open</span>
            <span className="font-bold text-white">{amountText}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-success/20 text-success">
              RELEASED
            </span>
          </div>
        )}

        {(mode === "mismatch" || mode === "expired") && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-danger/40 text-danger">
            <span className="material-symbols-outlined text-[15px] text-danger">undo</span>
            <span className="font-bold text-white">{amountText}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-danger/20 text-danger">
              REFUNDED
            </span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/60 text-outline">
          <span className="material-symbols-outlined text-tertiary text-[15px]">verified</span>
          <span>{pact ? "On-Chain Slot" : statusLabel}</span>
        </div>
      </div>
    </div>
  )
}
