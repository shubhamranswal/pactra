import { Link } from "react-router-dom"

export default function PactTable({ pacts }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case "executing":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#38BDF8]/20 border border-[#38BDF8]/30 text-[#38BDF8] font-mono text-xs font-medium shadow-[0_0_16px_-4px_rgba(56,189,248,0.25)]">
            <svg className="animate-spin h-3 w-3 text-[#38BDF8]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
            </svg>
            <span>Executing</span>
          </div>
        )
      case "settling":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#D2BBFF] font-mono text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse"></span>
            <span>Settling</span>
          </div>
        )
      case "verified":
      case "completed":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] font-mono text-xs font-medium shadow-sm">
            <span className="material-symbols-outlined text-[14px]">check</span>
            <span>Verified</span>
          </div>
        )
      case "disputed":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F43F5E]/20 border border-[#F43F5E]/30 text-[#F43F5E] font-mono text-xs font-medium shadow-sm">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>Disputed</span>
          </div>
        )
      default:
        return (
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-[#94A3B8]">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0D0E11]/60 border-b border-white/5 text-[#64748B] font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3.5 px-6 font-medium">PACT</th>
              <th className="py-3.5 px-4 font-medium">PAYMENT / ROUTING</th>
              <th className="py-3.5 px-4 font-medium">AMOUNT</th>
              <th className="py-3.5 px-4 font-medium">STATUS</th>
              <th className="py-3.5 px-6 text-right font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans text-sm text-[#F8FAFC]">
            {pacts.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-[#64748B] font-mono text-xs">
                  No pacts found matching filter criteria.
                </td>
              </tr>
            ) : (
              pacts.map((pact) => (
                <tr
                  key={pact.id}
                  className="hover:bg-white/[0.04] transition-colors group"
                >
                  {/* Pact ID & Category */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#D2BBFF] shadow-sm group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[18px]">
                          {pact.status === "disputed" ? "gavel" : pact.status === "verified" ? "verified_user" : "layers"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <Link
                          to={`/agreement/${pact.id}`}
                          className="font-mono font-semibold text-[#D2BBFF] group-hover:underline flex items-center gap-1"
                        >
                          #{pact.id}
                        </Link>
                        <span className="font-mono text-xs text-[#64748B]">{pact.title}</span>
                      </div>
                    </div>
                  </td>

                  {/* Payment Routing */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#C0C1FF] font-mono text-xs font-semibold">
                        {pact.routingToken}
                      </span>
                      <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">
                        arrow_forward
                      </span>
                      <div className="flex items-center gap-1 font-mono text-xs text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
                        <span>{pact.beneficiary}</span>
                        <span className="material-symbols-outlined text-[13px] text-[#64748B]">
                          content_copy
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Amount / Value */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-white text-base">
                        {pact.amount}
                      </span>
                      <span className="font-mono text-[11px] text-[#64748B]">
                        {pact.oracleSpec}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4">{getStatusBadge(pact.status)}</td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <Link
                      to={`/agreement/${pact.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/20 text-[#D2BBFF] font-sans text-xs transition-all shadow-sm group/btn"
                    >
                      <span>Inspect</span>
                      <span className="material-symbols-outlined text-[15px] group-hover/btn:translate-x-0.5 transition-transform">
                        arrow_forward
                      </span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View (Matching Stitch screen 0e370d3c) */}
      <div className="md:hidden p-4 flex flex-col gap-3">
        {pacts.length === 0 ? (
          <div className="py-10 text-center text-[#64748B] font-mono text-xs">
            No pacts found matching filter criteria.
          </div>
        ) : (
          pacts.map((pact) => (
            <div
              key={pact.id}
              className="rounded-xl bg-[#14151A]/90 border border-white/10 p-4 shadow-sm hover:border-[#7C3AED]/40 transition-all flex flex-col gap-2.5"
            >
              {/* Card Top: ID + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-semibold text-[#D2BBFF]">
                    #{pact.id}
                  </span>
                  <span className="font-sans text-xs text-[#94A3B8] truncate">
                    {pact.title}
                  </span>
                </div>
                {getStatusBadge(pact.status)}
              </div>

              {/* Settlement Payload Details Box */}
              <div className="rounded-lg bg-[#0D0E11] p-3 border border-white/5 flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="font-mono text-[10px] text-[#64748B] uppercase">
                    SETTLEMENT PAYLOAD
                  </span>
                  <span className="font-mono text-xs text-[#F8FAFC] font-medium mt-0.5">
                    {pact.routingToken} <span className="text-[#64748B]">→</span> {pact.beneficiary}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-[#64748B] uppercase">
                    ORACLE SPEC
                  </span>
                  <span className="font-mono text-xs text-[#38BDF8] block truncate max-w-[120px] mt-0.5">
                    {pact.oracleSpec}
                  </span>
                </div>
              </div>

              {/* Card Bottom: Bond Value + Inspect Link */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                <span className="font-mono text-[#94A3B8]">
                  Bond: <strong className="text-white font-normal">{pact.amount}</strong>
                </span>
                <Link
                  to={`/agreement/${pact.id}`}
                  className="inline-flex items-center gap-1 font-sans text-xs font-medium text-[#D2BBFF] hover:underline"
                >
                  <span>Inspect</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table Protocol Footer */}
      <div className="px-6 py-3 bg-[#0D0E11]/80 border-t border-white/5 flex items-center justify-between text-[#64748B] text-xs flex-wrap gap-2">
        <span className="font-mono text-[11px] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
          Deterministic Parallel Verification on Monad EVM
        </span>
        <span className="font-mono text-[11px] text-[#38BDF8]">
          Real-time Gas: 0.0001 MON/tx
        </span>
      </div>
    </div>
  )
}
