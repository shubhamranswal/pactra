export default function FeatureCards() {
  const features = [
    {
      badge: "< 0.4s FINALITY",
      badgeColor: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20",
      icon: "bolt",
      iconColor: "text-[#38BDF8]",
      iconBg: "bg-[#38BDF8]/10 border-[#38BDF8]/30",
      glowColor: "bg-[#38BDF8]/15",
      hoverBorder: "hover:border-[#38BDF8]/40",
      title: "Ridiculously Fast",
      description:
        "Harnesses Monad's pipelined parallel EVM execution and asynchronous BFT consensus to verify and settle intents with ultra-low latency.",
      statLeft: "Latency: ~380ms",
      statRight: "10,000+ Real TPS",
    },
    {
      badge: "100% NON-CUSTODIAL",
      badgeColor: "text-[#D2BBFF] bg-[#7C3AED]/20 border-[#7C3AED]/30",
      icon: "lock",
      iconColor: "text-[#D2BBFF]",
      iconBg: "bg-[#7C3AED]/20 border-[#7C3AED]/30",
      glowColor: "bg-[#7C3AED]/20",
      hoverBorder: "hover:border-[#7C3AED]/40",
      title: "Isolated Escrow",
      description:
        "Autonomous smart vaults isolate funds in deterministic timelocks. Neither party nor intermediaries can expropriate collateral.",
      statLeft: "Security: Zero Admin Key",
      statRight: "Formal Verification",
    },
    {
      badge: "6-POINT INVARIANT CHECK",
      badgeColor: "text-[#C0C1FF] bg-[#6366F1]/10 border-[#6366F1]/20",
      icon: "verified",
      iconColor: "text-[#C0C1FF]",
      iconBg: "bg-[#6366F1]/10 border-[#6366F1]/30",
      glowColor: "bg-[#6366F1]/20",
      hoverBorder: "hover:border-[#6366F1]/40",
      title: "Deterministic Engine",
      description:
        "Multi-stage cryptographic proofs authenticate inference delivery, gas ceilings, and SLA bounds before atomic balance transfer.",
      statLeft: "Invariants: Cryptographic",
      statRight: "Atomic Settlement",
    },
  ]

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map((feat, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl backdrop-blur-xl bg-[#0B0C10]/80 border border-white/10 shadow-lg relative overflow-hidden group ${feat.hoverBorder} transition-all duration-300 flex flex-col justify-between`}
          >
            {/* Ambient Corner Glow */}
            <div
              className={`absolute -right-6 -top-6 w-28 h-28 ${feat.glowColor} rounded-full blur-2xl pointer-events-none group-hover:opacity-100 opacity-40 transition-opacity`}
            ></div>

            <div>
              {/* Header Icon + Tag */}
              <div className="flex items-center justify-between mb-5">
                <div
                  className={`w-11 h-11 rounded-xl ${feat.iconBg} border flex items-center justify-center ${feat.iconColor} shadow-inner group-hover:scale-105 transition-transform`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {feat.icon}
                  </span>
                </div>
                <span
                  className={`font-mono text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md border ${feat.badgeColor}`}
                >
                  {feat.badge}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="font-display text-xl font-bold text-[#F8FAFC] mb-2.5 tracking-tight">
                {feat.title}
              </h3>
              <p className="font-sans text-sm text-[#94A3B8] leading-relaxed">
                {feat.description}
              </p>
            </div>

            {/* Bottom Telemetry Micro-Row */}
            <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/5 font-mono text-xs text-[#64748B]">
              <span>{feat.statLeft}</span>
              <span className="text-[#38BDF8]">{feat.statRight}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
