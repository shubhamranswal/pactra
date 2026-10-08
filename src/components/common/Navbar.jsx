import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PactraLogo from "./PactraLogo"
import { shortenAddress } from "../../utils/address"

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true
    if (path !== "/" && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0B0E]/85 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand + Desktop Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            <PactraLogo className="h-8 w-auto transition-transform hover:scale-105" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`h-16 flex items-center text-sm font-medium transition-colors border-b-2 ${
                isActive("/")
                  ? "text-[#D2BBFF] border-[#7C3AED]"
                  : "text-[#94A3B8] border-transparent hover:text-white"
              }`}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className={`h-16 flex items-center text-sm font-medium transition-colors border-b-2 ${
                isActive("/dashboard")
                  ? "text-[#D2BBFF] border-[#7C3AED]"
                  : "text-[#94A3B8] border-transparent hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/agreement/1"
              className={`h-16 flex items-center text-sm font-medium transition-colors gap-1.5 border-b-2 ${
                isActive("/agreement")
                  ? "text-[#D2BBFF] border-[#7C3AED]"
                  : "text-[#94A3B8] border-transparent hover:text-white"
              }`}
            >
              <span>Pacts</span>
              <span className="font-mono text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
                #1
              </span>
            </Link>
          </nav>
        </div>

        {/* Right: Network telemetry, wallet badge & CTAs */}
        <div className="flex items-center gap-3">
          {/* Network Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D0E11]/80 border border-white/10 shadow-inner backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]"></span>
            </span>
            <span className="font-mono text-[11px] text-[#94A3B8] uppercase tracking-wider">
              Monad Testnet
            </span>
          </div>

          {/* Connected Address Chip / Wallet Connect Button */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== "loading"
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus || authenticationStatus === "authenticated")

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="h-9 px-3.5 sm:px-4 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 hover:bg-[#7C3AED]/30 text-[#D2BBFF] text-xs sm:text-sm font-medium tracking-wide transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse"></span>
                          <span className="whitespace-nowrap">Connect Wallet</span>
                        </button>
                      )
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="h-9 px-3 rounded-xl bg-[#F43F5E]/20 border border-[#F43F5E]/40 hover:bg-[#F43F5E]/30 text-[#F43F5E] text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">warning</span>
                          <span className="whitespace-nowrap">Wrong Network</span>
                        </button>
                      )
                    }

                    return (
                      <button
                        onClick={openAccountModal}
                        type="button"
                        className="h-9 px-3 py-1.5 rounded-xl bg-[#14151A]/80 border border-white/10 text-white hover:border-[#7C3AED]/50 transition-colors group cursor-pointer backdrop-blur-md flex items-center gap-2"
                        title={account.address}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        <span className="font-mono text-[12px] text-[#F8FAFC]">
                          {account.displayName || shortenAddress(account.address)}
                        </span>
                        <span className="material-symbols-outlined text-[15px] text-[#94A3B8] group-hover:text-[#D2BBFF] transition-colors">
                          account_balance_wallet
                        </span>
                      </button>
                    )
                  })()}
                </div>
              )
            }}
          </ConnectButton.Custom>

          {/* Create Pact CTA */}
          <Link
            to="/create-agreement"
            className="h-9 px-4 rounded-xl bg-[#7C3AED] text-white text-sm font-medium tracking-wide shadow-[0_0_24px_-4px_rgba(124,58,237,0.5)] hover:bg-[#6D28D9] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="whitespace-nowrap">Create Pact</span>
          </Link>

          {/* User profile avatar indicator */}
          <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-[#7C3AED]/40 transition-all">
            <span className="material-symbols-outlined text-[#D2BBFF] text-[18px]">smart_toy</span>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-[#14151A] border border-white/10 text-[#94A3B8] hover:text-white"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A0B0E]/95 backdrop-blur-2xl border-b border-white/10 px-4 pt-3 pb-5 flex flex-col gap-3">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== "loading"
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus || authenticationStatus === "authenticated")

              if (!ready) return null

              if (!connected) {
                return (
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]"></span>
                      </span>
                      <span className="font-mono text-xs text-[#38BDF8]">Monad Testnet</span>
                    </div>
                    <button
                      onClick={openConnectModal}
                      className="font-mono text-xs text-[#D2BBFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Connect Wallet
                    </button>
                  </div>
                )
              }

              if (chain.unsupported) {
                return (
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-1.5 text-[#F43F5E]">
                      <span className="material-symbols-outlined text-[15px]">warning</span>
                      <span className="font-mono text-xs font-semibold">Wrong Network</span>
                    </div>
                    <button
                      onClick={openChainModal}
                      className="font-mono text-xs text-[#F43F5E] underline flex items-center gap-1 cursor-pointer"
                    >
                      Switch Network
                    </button>
                  </div>
                )
              }

              return (
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                    </span>
                    <span className="font-mono text-xs text-[#10B981]">Monad Testnet</span>
                  </div>
                  <button
                    onClick={openAccountModal}
                    className="font-mono text-xs text-[#F8FAFC] hover:text-[#D2BBFF] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{account.displayName || shortenAddress(account.address)}</span>
                    <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">
                      account_balance_wallet
                    </span>
                  </button>
                </div>
              )
            }}
          </ConnectButton.Custom>
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${
              isActive("/")
                ? "bg-[#7C3AED]/20 text-[#D2BBFF] border border-[#7C3AED]/30"
                : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>Home</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${
              isActive("/dashboard")
                ? "bg-[#7C3AED]/20 text-[#D2BBFF] border border-[#7C3AED]/30"
                : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>Telemetry Dashboard</span>
            <span className="material-symbols-outlined text-[16px]">insights</span>
          </Link>
          <Link
            to="/agreement/1"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${
              isActive("/agreement")
                ? "bg-[#7C3AED]/20 text-[#D2BBFF] border border-[#7C3AED]/30"
                : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>Pact Details (#1)</span>
            <span className="font-mono text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
              LIVE
            </span>
          </Link>
          <Link
            to="/create-agreement"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full h-11 mt-2 rounded-xl bg-[#7C3AED] text-white text-sm font-medium flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Create Autonomous Pact</span>
          </Link>
        </div>
      )}
    </header>
  )
}

