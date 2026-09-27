export default function AgentFormFields({
  providerAgent,
  setProviderAgent,
  recipientAddress,
  setRecipientAddress,
  token,
  setToken,
  amount,
  setAmount,
  timeout,
  setTimeoutHours,
  collateral,
  setCollateral,
}) {
  const isMon = token === "MON"
  const balance = isMon ? "1,842.10 MON" : "4,280.00 USDC"
  const rate = isMon ? 4.28 : 1.0

  const handleQuickAdd = (added) => {
    const current = parseFloat(amount) || 0
    setAmount((current + added).toFixed(2))
  }

  const handleMax = () => {
    setAmount(isMon ? "1842.10" : "4280.00")
  }

  const usdValue = ((parseFloat(amount) || 0) * rate).toFixed(2)

  return (
    <div className="flex flex-col gap-5 text-left">
      {/* Field 1: Provider Agent */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="font-sans font-medium text-[#94A3B8]">
            Provider Agent (Originator)
          </label>
          <span className="font-mono text-[11px] text-[#38BDF8] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]"></span>
            VERIFIED AUTONOMOUS
          </span>
        </div>

        <div className="relative flex items-center bg-[#0D0E11]/90 border border-white/10 focus-within:border-[#7C3AED]/70 rounded-xl p-1.5 shadow-inner transition-colors">
          <div className="w-8 h-8 rounded-lg bg-[#181A20] border border-white/10 flex items-center justify-center text-[#38BDF8] shrink-0 ml-1">
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          </div>
          <input
            type="text"
            value={providerAgent}
            onChange={(e) => setProviderAgent(e.target.value)}
            className="w-full bg-transparent px-3 py-1.5 font-mono text-xs sm:text-sm text-white focus:outline-none"
            placeholder="Agent name or address"
          />
          <div className="flex items-center gap-2 pr-2">
            <span className="px-2 py-0.5 rounded bg-[#181A20] border border-white/10 text-[#64748B] font-mono text-[10px]">
              0x4a9...e21
            </span>
          </div>
        </div>
      </div>

      {/* Field 2: Target Counterparty Recipient */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="font-sans font-medium text-[#94A3B8]">
            Target Counterparty Agent (Recipient)
          </label>
          <span className="font-mono text-[11px] text-[#64748B]">
            CHAIN_ID: 10143
          </span>
        </div>

        <div className="relative flex items-center bg-[#0D0E11]/90 border border-white/10 focus-within:border-[#7C3AED]/70 rounded-xl p-1.5 shadow-inner transition-colors">
          <div className="w-8 h-8 rounded-lg bg-[#181A20] border border-white/10 flex items-center justify-center text-[#64748B] shrink-0 ml-1">
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          </div>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full bg-transparent px-3 py-1.5 font-mono text-xs sm:text-sm text-white focus:outline-none"
            placeholder="0x... or agent.monad"
          />
          <div className="flex items-center gap-1 pr-1">
            <button
              type="button"
              onClick={() => setRecipientAddress("0x71C5A82d54B98819446D61BcA49A92")}
              className="px-2 py-1 rounded text-[#38BDF8] hover:bg-white/5 font-mono text-[10px] transition-colors"
            >
              Paste Sample
            </button>
          </div>
        </div>

        {/* Counterparty Verification Badge */}
        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-[#64748B]">
          <div className="flex items-center gap-1.5 text-[#38BDF8]">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            <span>Atlas Arbitrage Node #042 • Verified</span>
          </div>
          <span>Reputation 99.8%</span>
        </div>
      </div>

      {/* Field 3: Payment Payload (Token + Amount + Presets) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="font-sans font-medium text-[#94A3B8]">
            Payment Payload Amount
          </label>
          <span className="font-mono text-[11px] text-[#64748B]">
            BAL: <strong className="text-white font-normal">{balance}</strong>
          </span>
        </div>

        <div className="grid grid-cols-12 gap-2">
          {/* Token Selector */}
          <div className="col-span-4 sm:col-span-3">
            <div className="relative">
              <select
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-[#0D0E11]/90 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 font-mono text-xs font-semibold text-white focus:border-[#7C3AED] focus:outline-none appearance-none cursor-pointer pr-7"
              >
                <option value="MON">MON (Native)</option>
                <option value="USDC">USDC (Stable)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-[#64748B] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="col-span-8 sm:col-span-9 relative">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-[#0D0E11]/90 border border-white/10 focus:border-[#7C3AED]/70 rounded-xl px-4 py-2.5 font-mono text-sm sm:text-base text-white text-right focus:outline-none shadow-inner transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#64748B] pointer-events-none">
              AMOUNT
            </span>
          </div>
        </div>

        {/* Quick presets & USD conversion */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 px-1">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleQuickAdd(50)}
              className="px-2.5 py-1 rounded bg-[#181A20] hover:bg-[#232730] text-[#94A3B8] hover:text-white transition-colors"
            >
              +50
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(100)}
              className="px-2.5 py-1 rounded bg-[#181A20] hover:bg-[#232730] text-[#94A3B8] hover:text-white transition-colors"
            >
              +100
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(500)}
              className="px-2.5 py-1 rounded bg-[#181A20] hover:bg-[#232730] text-[#94A3B8] hover:text-white transition-colors"
            >
              +500
            </button>
            <button
              type="button"
              onClick={handleMax}
              className="px-2.5 py-1 rounded bg-[#7C3AED]/20 text-[#D2BBFF] hover:bg-[#7C3AED]/30 font-medium transition-colors"
            >
              MAX
            </button>
          </div>
          <span className="font-mono text-xs text-[#38BDF8]">
            ≈ ${usdValue} USD
          </span>
        </div>
      </div>

      {/* Field 4: Execution Expiry & Collateral Guarantee (2 cols on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expiration Timeout */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-sans font-medium text-[#94A3B8]">
              Execution Expiry Timeout
            </label>
            <span className="font-mono text-[10px] text-[#38BDF8]">AUTO-REFUND</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["12 Hours", "24 Hours", "7 Days"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeoutHours(t)}
                className={`py-2 px-1 rounded-xl font-mono text-xs text-center transition-all ${
                  timeout === t
                    ? "bg-[#7C3AED] text-white font-medium shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                    : "bg-[#0D0E11] border border-white/10 text-[#94A3B8] hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Collateral Guarantee */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-sans font-medium text-[#94A3B8]">
              Collateral Guarantee
            </label>
            <span className="font-mono text-[10px] text-[#10B981]">STAKED</span>
          </div>
          <div className="relative flex items-center bg-[#0D0E11]/90 border border-white/10 focus-within:border-[#7C3AED]/70 rounded-xl p-1.5 shadow-inner transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[#181A20] border border-white/10 flex items-center justify-center text-[#10B981] shrink-0 ml-1">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
            <input
              type="text"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              className="w-full bg-transparent px-3 py-1.5 font-mono text-xs sm:text-sm text-white focus:outline-none"
              placeholder="e.g. 100 USDC"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
