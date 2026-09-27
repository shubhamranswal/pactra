import { Link } from "react-router-dom"

export default function ActivityStream() {
  const activities = [
    {
      id: "P-1023",
      title: "P-1023 verified",
      time: "1m ago",
      detailLabel: "Receipt:",
      detailValue: "0x9e12...4f3a",
      icon: "check",
      iconBg: "bg-[#38BDF8]/20 border-[#38BDF8]/30 text-[#38BDF8]",
    },
    {
      id: "P-1024",
      title: "100 USDC settled",
      time: "3m ago",
      detailLabel: "Note:",
      detailValue: "Instant disbursement to counterparty",
      icon: "payments",
      iconBg: "bg-[#6366F1]/20 border-[#6366F1]/30 text-[#C0C1FF]",
    },
    {
      id: "P-1024",
      title: "P-1024 executing",
      time: "In Flight",
      detailLabel: "Consensus:",
      detailValue: "Monad-BFT consensus round #4901",
      icon: "hourglass_empty",
      iconBg: "bg-[#7C3AED]/20 border-[#7C3AED]/30 text-[#D2BBFF]",
    },
    {
      id: "P-1022",
      title: "P-1022 arbitration requested",
      time: "14m ago",
      detailLabel: "Oracle:",
      detailValue: "Timeout threshold arbitration window",
      icon: "warning",
      iconBg: "bg-[#F43F5E]/20 border-[#F43F5E]/30 text-[#F43F5E]",
    },
  ]

  // 24-bar simulated latency distribution
  const latencyBars = [
    35, 48, 42, 60, 52, 70, 65, 80, 45, 58, 90, 76, 84, 92, 88, 94, 82, 96, 89, 95, 98, 100, 97, 85,
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
      {/* Left Bento (5 cols): Recent Activity Stream */}
      <div className="lg:col-span-5 flex flex-col rounded-xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-xl justify-between gap-5">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7C3AED] text-[20px]">
                sync_alt
              </span>
              <h3 className="font-display font-bold text-white text-lg">
                Recent Activity
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[#64748B]">Real-Time Ledger</span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {activities.map((act, idx) => (
              <Link
                key={idx}
                to={`/agreement/${act.id}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-[#38BDF8]/30 transition-all group"
              >
                <div
                  className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${act.iconBg}`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {act.icon}
                  </span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-xs sm:text-sm font-medium text-white group-hover:text-[#38BDF8] transition-colors truncate">
                      {act.title}
                    </span>
                    <span className="font-mono text-[10px] text-[#64748B] shrink-0">
                      {act.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    <span className="text-[#64748B]">{act.detailLabel}</span>
                    <span className="text-[#38BDF8] hover:underline truncate">
                      {act.detailValue}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs border-t border-white/5">
          <Link
            to="/agreement/P-1024"
            className="font-mono text-[11px] text-[#D2BBFF] hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View Full Block Ledger</span>
            <span className="material-symbols-outlined text-[13px]">north_east</span>
          </Link>
          <span className="font-mono text-[11px] text-[#38BDF8]">
            Latency: 38ms
          </span>
        </div>
      </div>

      {/* Right Bento (7 cols): Consensus Telemetry & Latency Histogram */}
      <div className="lg:col-span-7 flex flex-col rounded-xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-xl justify-between gap-5">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
            <div className="flex flex-col">
              <span className="font-mono text-[11px] uppercase text-[#64748B]">
                Consensus Telemetry
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-display font-bold text-white text-lg">
                  Sub-Second Finality
                </span>
                <span className="font-mono text-xs text-[#38BDF8] font-semibold">
                  0.41s Avg
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0E11]/80 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse"></span>
              <span className="font-mono text-xs text-white font-medium">
                10,000 TPS Capacity
              </span>
            </div>
          </div>

          {/* Latency / Block Execution Histogram */}
          <div className="w-full flex flex-col gap-2 py-4">
            <div className="h-28 w-full flex items-end justify-between gap-1 sm:gap-1.5 pt-4">
              {latencyBars.map((height, i) => {
                const isPeak = i >= 20
                return (
                  <div
                    key={i}
                    title={`Epoch #${84900 + i}: ${(0.35 + (height / 100) * 0.15).toFixed(3)}s`}
                    className={`w-full rounded-t transition-all hover:scale-y-110 cursor-pointer ${
                      isPeak
                        ? i === 22
                          ? "bg-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.7)]"
                          : "bg-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.5)]"
                        : "bg-white/10 hover:bg-[#7C3AED]/40"
                    }`}
                    style={{ height: `${height}%` }}
                  ></div>
                )
              })}
            </div>
            <div className="flex items-center justify-between text-[#64748B] font-mono text-[11px] pt-1">
              <span>-60s (Block #412091)</span>
              <span className="text-[#38BDF8] font-bold">Latest Settlement: 0.402s</span>
              <span>Now (Block #412151)</span>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0D0E11]/80 border border-white/5 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#38BDF8] text-[18px]">
              memory
            </span>
            <span className="font-mono text-white">Pipelined Consensus</span>
          </div>
          <span className="font-mono text-[11px] text-[#64748B]">
            Deterministic Non-Blocking EVM Execution
          </span>
        </div>
      </div>
    </div>
  )
}
