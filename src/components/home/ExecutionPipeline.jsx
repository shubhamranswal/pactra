import { Link } from "react-router-dom"

export default function ExecutionPipeline() {
  const steps = [
    {
      icon: "smart_toy",
      iconColor: "text-[#D2BBFF]",
      iconBg: "bg-[#7C3AED]/20",
      title: "Agent A",
      tag: "Payer",
      tagColor: "bg-[#181A20] text-[#38BDF8]",
      subtitle: "0x8192...c09f • Originator Node",
      badge: (
        <div className="flex items-center gap-1.5 bg-[#121316]/90 border border-white/10 px-2.5 py-1 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse"></span>
          <span className="font-mono text-xs text-[#94A3B8]">ONLINE</span>
        </div>
      ),
      connectorColor: "from-[#7C3AED] via-[#38BDF8] to-[#4A4455]",
    },
    {
      icon: "handshake",
      iconColor: "text-[#EADDFF]",
      iconBg: "bg-[#7C3AED]/30",
      title: "Pact Intent",
      tag: "Signed",
      tagColor: "bg-[#7C3AED]/30 text-[#EADDFF]",
      subtitle: "Hash: 0x9bf4...88d2 • SLA Target < 800ms",
      badge: <span className="font-mono text-sm text-[#EADDFF] font-medium">12,500.00 MON</span>,
      connectorColor: "from-[#7C3AED] to-[#3131C0]",
    },
    {
      icon: "lock",
      iconColor: "text-[#C0C1FF]",
      iconBg: "bg-[#3131C0]/30",
      title: "Escrow Vault",
      tag: "Isolated",
      tagColor: "bg-[#3131C0]/40 text-[#C0C1FF]",
      subtitle: "Non-Custodial Multi-Sig Timelock",
      badge: (
        <div className="px-2.5 py-1 rounded bg-[#121316]/90 border border-white/10 font-mono text-xs text-[#C0C1FF] flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">security</span>
          SECURED
        </div>
      ),
      highlightBar: true,
      connectorColor: "from-[#3131C0] to-[#4A4455]",
    },
    {
      icon: "memory",
      iconColor: "text-[#38BDF8]",
      iconBg: "bg-[#38BDF8]/10",
      title: "Agent B",
      tag: "Executor",
      tagColor: "bg-[#181A20] text-[#94A3B8]",
      subtitle: "0x33e1...14aa • Inference Worker #41",
      badge: (
        <div className="flex items-center gap-1.5 font-mono text-sm text-[#38BDF8]">
          <span>Completed</span>
          <span className="material-symbols-outlined text-[16px]">task_alt</span>
        </div>
      ),
      connectorColor: "from-[#4A4455] to-[#38BDF8]",
    },
    {
      icon: "speed",
      iconColor: "text-[#38BDF8]",
      iconBg: "bg-[#38BDF8]/20",
      title: "Monad Consensus",
      tag: "BFT Engine",
      tagColor: "bg-[#38BDF8]/20 text-[#38BDF8]",
      subtitle: "Parallel Execution • 10,000 TPS Target",
      badge: (
        <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 font-mono text-xs text-[#38BDF8]">
          &lt; 0.4s FINALITY
        </span>
      ),
      connectorColor: "from-[#38BDF8] to-[#7C3AED]",
    },
    {
      icon: "verified",
      iconColor: "text-[#D2BBFF]",
      iconBg: "bg-[#7C3AED]/20",
      title: "Verified Proof",
      tag: "Deterministic",
      tagColor: "bg-[#7C3AED]/20 text-[#D2BBFF]",
      subtitle: "ZK Merkle State Transition Confirmed",
      badge: (
        <div className="w-6 h-6 rounded-full bg-[#7C3AED]/30 flex items-center justify-center text-[#D2BBFF]">
          <span className="material-symbols-outlined text-[16px]">check</span>
        </div>
      ),
      connectorColor: "from-[#7C3AED] to-[#7C3AED]",
    },
    {
      icon: "account_balance_wallet",
      iconColor: "text-white",
      iconBg: "bg-[#7C3AED] shadow-[0_0_16px_rgba(124,58,237,0.5)]",
      title: "Settlement Complete",
      tag: "Released",
      tagColor: "bg-[#7C3AED] text-white font-bold",
      subtitle: "Escrow funds programmatically disbursed",
      badge: (
        <div className="flex flex-col items-end">
          <span className="font-mono text-sm sm:text-base font-semibold text-[#38BDF8]">
            +12,500 MON
          </span>
          <span className="font-mono text-[10px] text-[#64748B]">
            Epoch 1084 • Block #4,198,223
          </span>
        </div>
      ),
      isFinal: true,
    },
  ]

  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col items-center">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-8 gap-2">
        <div className="text-left">
          <span className="font-mono text-xs text-[#38BDF8] uppercase tracking-widest">
            AUTONOMOUS LIFECYCLE
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
            Pact Execution Pipeline
          </h2>
        </div>
        <Link
          to="/agreement/P-1024"
          className="flex items-center gap-1 font-mono text-xs text-[#38BDF8] hover:underline"
        >
          <span>Inspect Active Flow #P-1024</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Sequential Pipeline Stream */}
      <div className="w-full max-w-2xl flex flex-col items-center relative z-10">
        {steps.map((step, idx) => (
          <div key={idx} className="w-full flex flex-col items-center">
            {/* Step Card */}
            <Link
              to="/agreement/P-1024"
              className={`w-full p-4 rounded-xl backdrop-blur-xl bg-[#0B0C10]/85 border border-white/10 shadow-md flex items-center justify-between group hover:border-[#7C3AED]/40 hover:bg-[#14151A]/90 transition-all cursor-pointer relative overflow-hidden`}
            >
              {step.highlightBar && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7C3AED]"></div>
              )}

              {step.isFinal && (
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#7C3AED]/25 rounded-full blur-xl pointer-events-none"></div>
              )}

              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-lg ${step.iconBg} flex items-center justify-center ${step.iconColor} shadow-sm group-hover:scale-105 transition-transform shrink-0`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {step.icon}
                  </span>
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-[#F8FAFC]">
                      {step.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${step.tagColor}`}
                    >
                      {step.tag}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#64748B]">
                    {step.subtitle}
                  </span>
                </div>
              </div>

              <div className="shrink-0">{step.badge}</div>
            </Link>

            {/* Down Connector */}
            {!step.isFinal && (
              <div className="h-6 flex flex-col items-center justify-center relative my-0.5">
                <div
                  className={`w-px h-full bg-gradient-to-b ${step.connectorColor}`}
                ></div>
                <span className="material-symbols-outlined text-[13px] text-[#38BDF8] -mt-1.5">
                  keyboard_arrow_down
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
