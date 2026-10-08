import { useState } from "react"
import { CRITERION_TYPES } from "../../lib/veridict/schema"

export default function InvariantsManager({
  invariants,
  onToggleInvariant,
  onAddInvariant,
  onRemoveInvariant,
}) {
  const [activeTab, setActiveTab] = useState("typeA")
  const [endpoint, setEndpoint] = useState("https://api.pactra.network/v1/inference")
  const [minCount, setMinCount] = useState("5")
  const [txRecipient, setTxRecipient] = useState("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
  const [minWei, setMinWei] = useState("100000000000000000") // 0.1 MON
  const [hashValue, setHashValue] = useState("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
  const [customText, setCustomText] = useState("")

  const satisfiedCount = invariants.filter((inv) => inv.satisfied).length

  const handleAddCriterion = (e) => {
    e.preventDefault()

    if (activeTab === "typeA") {
      if (!endpoint.trim() || !minCount) return
      onAddInvariant({
        id: Date.now(),
        type: CRITERION_TYPES.TYPE_A_API_COUNT,
        label: `API Call Quorum: ${new URL(endpoint).pathname} (>= ${minCount} calls)`,
        targetEndpoint: endpoint.trim(),
        minimumCount: parseInt(minCount, 10) || 1,
        satisfied: true,
        removable: true,
      })
    } else if (activeTab === "typeB") {
      if (!txRecipient.trim() || !minWei) return
      onAddInvariant({
        id: Date.now(),
        type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
        label: `Monad Tx to ${txRecipient.slice(0, 6)}...${txRecipient.slice(-4)} (>= ${minWei} wei)`,
        recipient: txRecipient.trim(),
        minimumAmountWei: minWei.toString(),
        chainId: 10143,
        satisfied: true,
        removable: true,
      })
    } else if (activeTab === "typeC") {
      if (!hashValue.trim()) return
      onAddInvariant({
        id: Date.now(),
        type: CRITERION_TYPES.TYPE_C_HASH_MATCH,
        label: `Hash Match: ${hashValue.slice(0, 10)}...${hashValue.slice(-6)}`,
        expectedHash: hashValue.trim(),
        satisfied: true,
        removable: true,
      })
    } else if (activeTab === "custom") {
      if (!customText.trim()) return
      onAddInvariant({
        id: Date.now(),
        type: "INVARIANT",
        label: customText.trim(),
        satisfied: true,
        removable: true,
      })
      setCustomText("")
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case CRITERION_TYPES.TYPE_A_API_COUNT:
        return (
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
            Type A • API
          </span>
        )
      case CRITERION_TYPES.TYPE_B_TX_VERIFY:
        return (
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            Type B • Monad Tx
          </span>
        )
      case CRITERION_TYPES.TYPE_C_HASH_MATCH:
        return (
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#7C3AED]/20 text-[#D2BBFF] border border-[#7C3AED]/40">
            Type C • Hash
          </span>
        )
      default:
        return (
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8] border border-white/10">
            Invariant
          </span>
        )
    }
  }

  return (
    <div className="pt-4 flex flex-col gap-4 text-left border-t border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-sans text-xs sm:text-sm font-medium text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">verified</span>
          Machine-Verifiable Acceptance Criteria
        </span>
        <span className="font-mono text-xs text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20">
          {satisfiedCount} of {invariants.length} ACTIVE
        </span>
      </div>

      <p className="font-sans text-xs text-[#94A3B8]">
        Deterministic conditions evaluated by the Veridict engine prior to final settlement.
      </p>

      {/* Criteria & Invariants Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {invariants.map((inv) => (
          <div
            key={inv.id}
            className={`flex flex-col justify-between p-3 rounded-xl border transition-all gap-2 ${
              inv.satisfied
                ? "bg-[#0D0E11]/90 border-white/10 text-white"
                : "bg-white/[0.02] border-white/5 text-[#64748B]"
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              {getTypeBadge(inv.type)}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleInvariant(inv.id)}
                  className="text-left cursor-pointer"
                  title="Toggle active status"
                >
                  <span
                    className={`material-symbols-outlined text-[17px] transition-colors ${
                      inv.satisfied ? "text-[#38BDF8]" : "text-[#64748B]"
                    }`}
                  >
                    {inv.satisfied ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>
                {inv.removable && (
                  <button
                    type="button"
                    onClick={() => onRemoveInvariant(inv.id)}
                    className="w-5 h-5 flex items-center justify-center text-[#64748B] hover:text-[#F43F5E] transition-colors cursor-pointer"
                    title="Remove criterion"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>

            <span className="font-sans text-xs font-normal line-clamp-2">
              {inv.label}
            </span>
          </div>
        ))}
      </div>

      {/* Criterion Definition Builder Form */}
      <div className="bg-[#0D0E11]/80 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-xs text-[#D2BBFF] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">add_task</span>
            Define New Acceptance Criterion
          </span>

          {/* Type Selection Tabs */}
          <div className="flex items-center gap-1 bg-[#14151A] p-0.5 rounded-lg border border-white/10 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("typeA")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeTab === "typeA"
                  ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40"
                  : "text-[#64748B] hover:text-white"
              }`}
            >
              Type A (API)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("typeB")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeTab === "typeB"
                  ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                  : "text-[#64748B] hover:text-white"
              }`}
            >
              Type B (Tx)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("typeC")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeTab === "typeC"
                  ? "bg-[#7C3AED]/20 text-[#D2BBFF] border border-[#7C3AED]/40"
                  : "text-[#64748B] hover:text-white"
              }`}
            >
              Type C (Hash)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeTab === "custom"
                  ? "bg-white/10 text-white"
                  : "text-[#64748B] hover:text-white"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        <form onSubmit={handleAddCriterion} className="flex flex-col gap-2.5">
          {activeTab === "typeA" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="Target URL endpoint"
                className="sm:col-span-2 bg-[#14151A] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-[#38BDF8] focus:outline-none"
              />
              <input
                type="number"
                min="1"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                placeholder="Min calls (e.g. 5)"
                className="bg-[#14151A] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-[#38BDF8] focus:outline-none"
              />
            </div>
          )}

          {activeTab === "typeB" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={txRecipient}
                onChange={(e) => setTxRecipient(e.target.value)}
                placeholder="Recipient EVM Address (0x...)"
                className="sm:col-span-2 bg-[#14151A] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-[#10B981] focus:outline-none"
              />
              <input
                type="text"
                value={minWei}
                onChange={(e) => setMinWei(e.target.value)}
                placeholder="Min value in wei"
                className="bg-[#14151A] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-[#10B981] focus:outline-none"
              />
            </div>
          )}

          {activeTab === "typeC" && (
            <input
              type="text"
              value={hashValue}
              onChange={(e) => setHashValue(e.target.value)}
              placeholder="Expected 32-byte hash (0x...)"
              className="bg-[#14151A] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-[#7C3AED] focus:outline-none"
            />
          )}

          {activeTab === "custom" && (
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Custom verifiable condition (e.g. Quorum >= 3/4)"
              className="bg-[#14151A] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-[#64748B] focus:border-white focus:outline-none"
            />
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-sans text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Add to Pact Criteria</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
