import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

export default function HeroSection({ onOpenQuickModal }) {
  // Continuous cycling typewriter effect matching Stitch
  const phrasePrefix = "Proof, not promises — for autonomous "
  const phraseAccent = "payments"
  const phraseSuffix = "."
  const fullSentence = phrasePrefix + phraseAccent + phraseSuffix

  const [displayedText, setDisplayedText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer
    const currentLength = displayedText.length

    if (!isDeleting) {
      if (currentLength < fullSentence.length) {
        timer = setTimeout(() => {
          setDisplayedText(fullSentence.substring(0, currentLength + 1))
        }, 50)
      } else {
        // Pause at completion
        timer = setTimeout(() => {
          setIsDeleting(true)
        }, 3200)
      }
    } else {
      if (currentLength > 0) {
        timer = setTimeout(() => {
          setDisplayedText(fullSentence.substring(0, currentLength - 1))
        }, 25)
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false)
        }, 600)
      }
    }

    return () => clearTimeout(timer)
  }, [displayedText, isDeleting, fullSentence])

  // Split rendered text into prefix, accent, and suffix
  const prefixLength = phrasePrefix.length
  const accentLength = phraseAccent.length

  const renderPrefix = displayedText.substring(0, Math.min(displayedText.length, prefixLength))
  const renderAccent =
    displayedText.length > prefixLength
      ? displayedText.substring(prefixLength, Math.min(displayedText.length, prefixLength + accentLength))
      : ""
  const renderSuffix =
    displayedText.length > prefixLength + accentLength
      ? displayedText.substring(prefixLength + accentLength)
      : ""

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 flex flex-col items-center text-center relative z-10">
      {/* Protocol Status Metadata Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14151A]/80 backdrop-blur-xl border border-white/10 shadow-sm mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]"></span>
        </span>
        <span className="font-mono text-xs text-[#F8FAFC] tracking-widest uppercase">
          PROTOCOL V2.4
        </span>
        <span className="w-1 h-1 rounded-full bg-[#4A4455]"></span>
        <span className="font-mono text-xs text-[#38BDF8] tracking-widest uppercase">
          MONAD TESTNET LIVE
        </span>
      </div>

      {/* Cyber Ticker / Ledger Crawler Strip */}
      <div className="w-full max-w-4xl my-4 overflow-hidden rounded-lg bg-[#14151A]/70 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-md relative py-2 px-3">
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0A0B0E] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0A0B0E] to-transparent z-10 pointer-events-none"></div>

        <div className="animate-marquee items-center gap-6 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-[#38BDF8] font-semibold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-ping"></span>
            <span>✦ CRAWLING ACTIVE LEDGERS</span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Agent_#4192 <span className="text-[#64748B]">→</span>{" "}
            <span className="text-[#F8FAFC] font-medium">50 MON</span>{" "}
            <span className="text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
              [VERIFIED 0.38s]
            </span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Agent_#0812 <span className="text-[#64748B]">→</span>{" "}
            <span className="text-[#F8FAFC] font-medium">100 USDC</span>{" "}
            <span className="text-[#D2BBFF] bg-[#7C3AED]/20 px-1.5 py-0.5 rounded border border-[#7C3AED]/30">
              [ESCROW BONDED]
            </span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Agent_#9301 <span className="text-[#64748B]">→</span>{" "}
            <span className="text-[#F8FAFC] font-medium">2,500 MON</span>{" "}
            <span className="text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
              [ZK-PROOF VALIDATED]
            </span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Consensus Quorum: <span className="text-[#38BDF8] font-semibold">99.8%</span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Monad BFT Pipeline: <span className="text-[#10B981] font-semibold">ACTIVE</span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Block Finality: <span className="text-[#38BDF8]">382ms</span>
          </span>

          {/* Duplicate loop items for seamless infinite scroll */}
          <span className="text-[#4A4455]">|</span>
          <span className="flex items-center gap-1.5 text-[#38BDF8] font-semibold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-ping"></span>
            <span>✦ CRAWLING ACTIVE LEDGERS</span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Agent_#4192 <span className="text-[#64748B]">→</span>{" "}
            <span className="text-[#F8FAFC] font-medium">50 MON</span>{" "}
            <span className="text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
              [VERIFIED 0.38s]
            </span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Agent_#0812 <span className="text-[#64748B]">→</span>{" "}
            <span className="text-[#F8FAFC] font-medium">100 USDC</span>{" "}
            <span className="text-[#D2BBFF] bg-[#7C3AED]/20 px-1.5 py-0.5 rounded border border-[#7C3AED]/30">
              [ESCROW BONDED]
            </span>
          </span>
          <span className="text-[#4A4455]">|</span>
          <span>
            Consensus Quorum: <span className="text-[#38BDF8] font-semibold">99.8%</span>
          </span>
        </div>
      </div>

      {/* Dynamic Typewriter / Cycling Headline */}
      <div className="min-h-[120px] sm:min-h-[140px] md:min-h-[160px] flex items-center justify-center max-w-4xl mx-auto mt-2">
        <h1 className="font-display text-3xl sm:text-5xl md:text-6xl text-[#F8FAFC] tracking-tight leading-tight sm:leading-none font-bold inline-flex flex-wrap items-center justify-center">
          <span>{renderPrefix}</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D2BBFF] via-[#7C3AED] to-[#38BDF8] font-bold">
            {renderAccent}
          </span>
          <span>{renderSuffix}</span>
          <span className="inline-block w-2 sm:w-2.5 md:w-3 h-7 sm:h-9 md:h-12 ml-2 bg-[#38BDF8] align-middle cursor-blink shadow-[0_0_14px_#38BDF8] rounded-xs"></span>
        </h1>
      </div>

      {/* Cadenced Subtitle Stems */}
      <p className="mt-4 font-sans text-base sm:text-lg text-[#94A3B8] font-light tracking-wide max-w-2xl mx-auto">
        Create <span className="text-[#4A4455] px-1.5">/</span> Execute{" "}
        <span className="text-[#4A4455] px-1.5">/</span> Verify{" "}
        <span className="text-[#4A4455] px-1.5">/</span> Settle
      </p>
      <p className="mt-2 font-mono text-xs sm:text-sm text-[#64748B] max-w-xl mx-auto">
        Deterministic multi-agent settlement gateway powered by Monad parallel consensus.
      </p>

      {/* Execution Directives (CTAs) */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
        <Link
          to="/create-agreement"
          className="h-11 px-6 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold tracking-wide shadow-[0_0_32px_rgba(124,58,237,0.5)] hover:bg-[#6D28D9] hover:shadow-[0_0_42px_rgba(124,58,237,0.7)] transition-all flex items-center gap-2 group cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          <span>Create Pact</span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </Link>

        <Link
          to="/dashboard"
          className="h-11 px-6 rounded-xl bg-[#14151A]/80 border border-white/10 backdrop-blur-xl text-white text-sm font-medium tracking-wide shadow-sm hover:bg-[#1F1F23] hover:border-[#38BDF8]/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px] text-[#38BDF8]">monitoring</span>
          <span>View Dashboard</span>
        </Link>

        <button
          onClick={onOpenQuickModal}
          className="h-11 px-6 rounded-xl bg-[#14151A]/80 border border-white/10 backdrop-blur-xl text-[#94A3B8] hover:text-white text-sm font-medium tracking-wide shadow-sm hover:bg-[#1F1F23] hover:border-[#7C3AED]/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">bolt</span>
          <span>Quick Pact Simulation</span>
        </button>
      </div>
    </section>
  )
}
