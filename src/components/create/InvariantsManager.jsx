import { useState } from "react"

export default function InvariantsManager({ invariants, onToggleInvariant, onAddInvariant, onRemoveInvariant }) {
  const [newInvariantText, setNewInvariantText] = useState("")

  const satisfiedCount = invariants.filter((inv) => inv.satisfied).length

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newInvariantText.trim()) return
    onAddInvariant(newInvariantText.trim())
    setNewInvariantText("")
  }

  return (
    <div className="pt-4 flex flex-col gap-3 text-left border-t border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-sans text-xs sm:text-sm font-medium text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">rule</span>
          Automated Verification Invariants
        </span>
        <span className="font-mono text-xs text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20">
          {satisfiedCount} of {invariants.length} SATISFIED
        </span>
      </div>

      <p className="font-sans text-xs text-[#94A3B8]">
        Cryptographic conditions enforced on-chain by the Monad execution engine prior to releasing escrow.
      </p>

      {/* Invariants Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
        {invariants.map((inv) => (
          <div
            key={inv.id}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
              inv.satisfied
                ? "bg-[#0D0E11]/90 border-white/10 text-white"
                : "bg-white/[0.02] border-white/5 text-[#64748B]"
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleInvariant(inv.id)}
              className="flex items-center gap-2 flex-1 text-left min-w-0 cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-colors ${
                  inv.satisfied ? "text-[#38BDF8]" : "text-[#64748B]"
                }`}
              >
                {inv.satisfied ? "check_circle" : "radio_button_unchecked"}
              </span>
              <span className="font-sans text-xs font-normal truncate">
                {inv.label}
              </span>
            </button>

            {inv.removable && (
              <button
                type="button"
                onClick={() => onRemoveInvariant(inv.id)}
                className="w-5 h-5 flex items-center justify-center text-[#64748B] hover:text-[#F43F5E] transition-colors"
                title="Remove Invariant"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Custom Invariant Row */}
      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newInvariantText}
          onChange={(e) => setNewInvariantText(e.target.value)}
          placeholder="Add custom invariant (e.g. Oracle quorum >= 3/4)"
          className="flex-1 bg-[#0D0E11]/80 border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-[#7C3AED] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newInvariantText.trim()}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-sans text-white hover:bg-white/10 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span>Add</span>
        </button>
      </form>
    </div>
  )
}
