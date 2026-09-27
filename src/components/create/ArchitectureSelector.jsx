export default function ArchitectureSelector({ selectedArchitecture, onSelectArchitecture }) {
  const options = [
    {
      id: "MON",
      title: "Send MON",
      badge: "NATIVE",
      badgeColor: "text-[#38BDF8] bg-[#38BDF8]/10",
      icon: "bolt",
      iconColor: "text-[#38BDF8]",
      iconBg: "bg-[#38BDF8]/15",
      description: "Instant 10,000 TPS Monad parallel consensus",
      token: "MON",
    },
    {
      id: "USDC",
      title: "Send Tokens (USDC)",
      badge: "STABLE",
      badgeColor: "text-[#C0C1FF] bg-[#3131C0]/30",
      icon: "monetization_on",
      iconColor: "text-[#C0C1FF]",
      iconBg: "bg-[#3131C0]/30",
      description: "Deterministic volatility-shielded settlement",
      token: "USDC",
    },
    {
      id: "AGENT",
      title: "Pay Another Agent",
      badge: "M2M SUB-TASK",
      badgeColor: "text-[#D2BBFF] bg-[#7C3AED]/20",
      icon: "smart_toy",
      iconColor: "text-[#D2BBFF]",
      iconBg: "bg-[#7C3AED]/20",
      description: "Agent-to-agent autonomous delegation pact",
      token: "MON",
    },
  ]

  return (
    <div className="flex flex-col gap-2.5 text-left">
      <label className="font-mono text-xs uppercase tracking-wider text-[#94A3B8]">
        Select Escrow Execution Architecture
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((opt) => {
          const isSelected = selectedArchitecture === opt.id
          return (
            <div
              key={opt.id}
              onClick={() => onSelectArchitecture(opt.id, opt.token)}
              className={`cursor-pointer relative p-3.5 sm:p-4 rounded-xl transition-all duration-200 shadow-sm flex flex-col justify-between gap-3 ${
                isSelected
                  ? "bg-[#181A20] border border-[#7C3AED] shadow-[0_0_20px_-4px_rgba(124,58,237,0.35)]"
                  : "bg-[#111318] border border-white/10 hover:border-white/20 hover:bg-[#14151A]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg ${opt.iconBg} ${opt.iconColor} flex items-center justify-center shrink-0`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {opt.icon}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-sans text-xs sm:text-sm font-semibold text-white">
                        {opt.title}
                      </span>
                      <span
                        className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-medium ${opt.badgeColor}`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-[#7C3AED] text-white"
                      : "bg-white/10 text-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">check</span>
                </div>
              </div>

              <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                {opt.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
