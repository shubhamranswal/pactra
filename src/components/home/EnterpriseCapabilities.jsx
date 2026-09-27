import { Link } from "react-router-dom"

export default function EnterpriseCapabilities() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-left">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="font-mono text-xs text-[#38BDF8] uppercase tracking-widest">
          ENTERPRISE CAPABILITIES
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC] mt-1.5">
          Why PACTRA Gateway?
        </h2>
        <p className="font-sans text-sm sm:text-base text-[#94A3B8] mt-2">
          The high-throughput, programmable settlement layer built specifically for autonomous agents and decentralized workflows.
        </p>
      </div>

      {/* Capability 01: Agent Routing & Declarative Escrow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-24">
        {/* Left: Text & Features */}
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#7C3AED]/20 border border-[#7C3AED]/30 font-mono text-[11px] text-[#D2BBFF]">
            <span>01</span>
            <span>/</span>
            <span>AGENT ROUTING &amp; ESCROW</span>
          </div>

          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
            Declarative Smart Escrow Configuration
          </h3>

          <p className="font-sans text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            Define programmatic SLAs, multi-oracle proof requirements, and payment disbursement thresholds declaratively. PACTRA compiles agent rulesets into uncrackable Monad bytecode.
          </p>

          <ul className="space-y-2.5 font-sans text-sm text-[#F8FAFC]">
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#38BDF8]">
                check_circle
              </span>
              <span>Sub-second multi-sig authorization with zero counterparty risk</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#38BDF8]">
                check_circle
              </span>
              <span>Native MON, wrapped ERC-20, and cross-chain streaming support</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#38BDF8]">
                check_circle
              </span>
              <span>Automated dispute resolution via zero-knowledge invariant proofs</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link
              to="/create-agreement"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14151A]/80 border border-white/10 hover:border-[#7C3AED]/50 font-sans text-sm font-medium text-white hover:text-[#D2BBFF] transition-all shadow-sm group"
            >
              <span>Deploy Agent Pact Schema</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                arrow_outward
              </span>
            </Link>
          </div>
        </div>

        {/* Right: Declarative YAML Code Box */}
        <div className="lg:col-span-7">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl bg-[#0B0C10]/95">
            {/* Visual Top Bar */}
            <div className="px-4 py-3 bg-[#0D0E11] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F43F5E]/70"></div>
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]/70"></div>
                <div className="w-3 h-3 rounded-full bg-[#10B981]/70"></div>
                <span className="font-mono text-xs text-[#94A3B8] ml-2">pact-agent-v2.yaml</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#38BDF8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse"></span>
                <span>SYNTAX VALIDATED</span>
              </div>
            </div>

            {/* Futuristic Sub-Header Banner */}
            <div className="relative h-24 bg-gradient-to-r from-[#7C3AED]/20 via-[#38BDF8]/15 to-[#0B0C10] p-4 flex items-end justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#0A0B0E]/90 border border-white/15 text-[10px] font-mono text-[#D2BBFF]">
                  ISOMETRIC NODE FABRIC
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0A0B0E]/90 border border-white/15 text-[10px] font-mono text-[#38BDF8]">
                  MONAD PIPELINE #01
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#64748B]">Bytecode: 0x89ab...4e</span>
            </div>

            {/* Declarative Schema Code */}
            <div className="p-5 font-mono text-[13px] leading-relaxed text-[#94A3B8] overflow-x-auto bg-[#08090C]">
              <div><span className="text-[#38BDF8] font-semibold">version:</span> <span className="text-white">"pactra/v2.4"</span></div>
              <div><span className="text-[#C0C1FF] font-semibold">kind:</span> <span className="text-white">AgentSettlementContract</span></div>
              <div className="text-[#64748B]">metadata:</div>
              <div className="pl-4 text-[#94A3B8]">name: <span className="text-white">"deepseek-r1-inference-sla"</span></div>
              <div className="pl-4 text-[#94A3B8]">target_pact: <span className="text-[#D2BBFF]">"#P-1024"</span></div>
              <div className="text-[#64748B]">spec:</div>
              <div className="pl-4">escrow_amount: <span className="text-[#38BDF8] font-semibold">12500.00 MON</span></div>
              <div className="pl-4">timelock_epoch: <span className="text-white">1084</span></div>
              <div className="pl-4 text-[#64748B]">invariants:</div>
              <div className="pl-8 text-[#94A3B8]">- condition: <span className="text-[#38BDF8]">"latency_ms &lt;= 800"</span></div>
              <div className="pl-8 text-[#94A3B8]">- condition: <span className="text-[#38BDF8]">"proof_type == zkSNARK_groth16"</span></div>
              <div className="pl-8 text-[#94A3B8]">- condition: <span className="text-[#38BDF8]">"oracle_quorum &gt;= 3/4"</span></div>
              <div className="text-[#64748B]">action:</div>
              <div className="pl-4 text-[#7C3AED]">auto_disburse: <span className="text-white font-semibold">true</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Capability 02: Deterministic Verification Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left on Desktop: Topology & Live Telemetry Checks Box */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl bg-[#0B0C10]/95">
            <div className="px-4 py-3 bg-[#0D0E11] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">hub</span>
                <span className="font-mono text-xs text-white font-semibold">
                  MONAD TOPOLOGY &amp; INVARIANT VERIFIER
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 font-mono text-[10px] text-[#38BDF8]">
                REALTIME TELEMETRY
              </span>
            </div>

            {/* Glowing Topology Visual Conduit */}
            <div className="relative h-44 bg-gradient-to-br from-[#121316] via-[#14151A] to-[#0A0B0E] p-6 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#7C3AED_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>

              {/* Connected node visual */}
              <div className="relative z-10 flex items-center justify-around w-full mt-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#D2BBFF] shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#94A3B8] mt-1">Originator</span>
                </div>

                <div className="flex-1 mx-4 h-0.5 bg-gradient-to-r from-[#7C3AED] via-[#38BDF8] to-[#10B981] relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#0A0B0E] border border-white/10 text-[9px] font-mono text-[#38BDF8]">
                    0.38s Pipeline
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#94A3B8] mt-1">Smart Vault</span>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between text-xs font-mono text-[#64748B]">
                <span>Parallel Consensus: ACTIVE</span>
                <span className="text-[#10B981]">Quorum Verified</span>
              </div>
            </div>

            {/* Telemetry Status Cards */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#08090C] border-t border-white/5">
              <div className="p-3 rounded-lg bg-[#111318] border border-white/5 text-left">
                <div className="font-mono text-[10px] text-[#64748B]">SLA RUNTIME</div>
                <div className="font-mono text-sm font-semibold text-[#38BDF8]">382 ms (OK)</div>
              </div>
              <div className="p-3 rounded-lg bg-[#111318] border border-white/5 text-left">
                <div className="font-mono text-[10px] text-[#64748B]">ZK VERIFICATION</div>
                <div className="font-mono text-sm font-semibold text-[#D2BBFF]">MERKLE PASS</div>
              </div>
              <div className="p-3 rounded-lg bg-[#111318] border border-white/5 text-left">
                <div className="font-mono text-[10px] text-[#64748B]">ORACLE CONSENSUS</div>
                <div className="font-mono text-sm font-semibold text-[#10B981]">4/4 ATTESTED</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right on Desktop: Text & Checkmarks */}
        <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 font-mono text-[11px] text-[#38BDF8]">
            <span>02</span>
            <span>/</span>
            <span>DETERMINISTIC VERIFICATION ENGINE</span>
          </div>

          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
            Sub-Second Cryptographic Invariant Checking
          </h3>

          <p className="font-sans text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            Like API gateways mediate microservice traffic, PACTRA mediates autonomous value streams. Every agent action is validated against strict mathematical invariants before state execution.
          </p>

          <ul className="space-y-2.5 font-sans text-sm text-[#F8FAFC]">
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">
                check_circle
              </span>
              <span>Zero-knowledge validation of LLM and compute deliverables</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">
                check_circle
              </span>
              <span>Asynchronous invariant checks without blocking mempool traffic</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">
                check_circle
              </span>
              <span>Deterministic gas bounds guaranteed on Monad parallel BFT</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14151A]/80 border border-white/10 hover:border-[#38BDF8]/50 font-sans text-sm font-medium text-white hover:text-[#38BDF8] transition-all shadow-sm group"
            >
              <span>Inspect Verification Metrics</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                arrow_outward
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
