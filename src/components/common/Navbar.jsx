import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import PactraLogo from "./PactraLogo"

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
              to="/agreement/P-1024"
              className={`h-16 flex items-center text-sm font-medium transition-colors gap-1.5 border-b-2 ${
                isActive("/agreement")
                  ? "text-[#D2BBFF] border-[#7C3AED]"
                  : "text-[#94A3B8] border-transparent hover:text-white"
              }`}
            >
              <span>Pacts</span>
              <span className="font-mono text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
                #P-1024
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

          {/* Connected Address Chip */}
          <div
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14151A]/80 border border-white/10 text-white hover:border-[#7C3AED]/50 transition-colors group cursor-pointer backdrop-blur-md"
            title="Connected Agent Key"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C0C1FF]"></span>
            <span className="font-mono text-[12px] text-[#F8FAFC]">0x4a9...e21</span>
            <span className="material-symbols-outlined text-[15px] text-[#94A3B8] group-hover:text-[#D2BBFF] transition-colors">
              content_copy
            </span>
          </div>

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
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]"></span>
              </span>
              <span className="font-mono text-xs text-[#38BDF8]">Monad Testnet (Chain ID 10143)</span>
            </div>
            <span className="font-mono text-xs text-[#94A3B8]">0x4a9...e21</span>
          </div>
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
            to="/agreement/P-1024"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${
              isActive("/agreement")
                ? "bg-[#7C3AED]/20 text-[#D2BBFF] border border-[#7C3AED]/30"
                : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>Pact Details (#P-1024)</span>
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
