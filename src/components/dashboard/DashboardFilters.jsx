import { Link } from "react-router-dom"

export default function DashboardFilters({
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  totalCount,
}) {
  const filters = [
    { key: "all", label: `ALL (${totalCount})` },
    { key: "settling", label: "SETTLING" },
    { key: "disputed", label: "DISPUTED" },
    { key: "completed", label: "COMPLETED" },
  ]

  return (
    <div className="p-4 sm:p-6 bg-[#181920]/80 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Title & Live Badge */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
          Active Pacts
        </h2>
        <span className="px-2 py-0.5 rounded bg-[#7C3AED] text-white font-mono text-xs font-bold shadow-sm">
          {totalCount} LIVE
        </span>
        <span className="text-[#64748B] text-xs hidden sm:inline">• Multi-Agent Ledger</span>
      </div>

      {/* Controls: Segment Pills, Search, Create Pact */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Segmented Filter Pills */}
        <div className="flex items-center bg-[#0D0E11]/80 border border-white/5 p-1 rounded-xl">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                activeFilter === f.key
                  ? "bg-[#7C3AED]/20 text-white border border-[#7C3AED]/30 font-semibold shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:w-48 md:w-56">
          <input
            type="text"
            placeholder="Search pact / address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0D0E11]/80 border border-white/10 rounded-xl px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-[#64748B] focus:border-[#7C3AED] focus:outline-none transition-colors"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[#64748B] pointer-events-none">
            search
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Create Pact Button */}
        <Link
          to="/create-agreement"
          className="px-4 py-1.5 rounded-xl bg-[#7C3AED] text-white font-sans text-xs sm:text-sm font-medium tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:bg-[#6D28D9] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[17px]">add</span>
          <span>Create Pact</span>
        </Link>
      </div>
    </div>
  )
}
