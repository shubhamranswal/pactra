import { useState } from "react"
import { AGENT_EXECUTION_STATES } from "../../hooks/useGeminiAgent"

export default function AgentExecutionViewer({
  agentState,
  onExecuteAgent,
  isPactSettled = false,
  isRecipient = false,
}) {
  const [showRawManifest, setShowRawManifest] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)

  const {
    state,
    isRunning,
    isComplete,
    executionLog,
    steps,
    traces,
    evidencePackage,
    evidenceHash,
    errorMessage,
  } = agentState

  const handleCopyHash = () => {
    if (evidenceHash) {
      navigator.clipboard.writeText(evidenceHash)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* 1. Header Banner & Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0D0E11]/80 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-white">
                Pactra Agent Verification
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20">
                LIVE TASK RUNNER
              </span>
            </div>
            <p className="font-sans text-xs text-[#94A3B8] mt-0.5">
              Autonomous task execution using approved deterministic tools with real telemetry capture.
            </p>
          </div>
        </div>

        {!isPactSettled && (
          <button
            type="button"
            onClick={onExecuteAgent}
            disabled={isRunning}
            className={`px-4 py-2.5 rounded-xl font-sans text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${isRunning
              ? "bg-purple-600/40 text-purple-200 cursor-not-allowed border border-purple-500/30 animate-pulse"
              : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 border border-purple-400/30 active:scale-95"
              }`}
          >
            {isRunning ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                <span>Executing Agent...</span>
              </>
            ) : isComplete ? (
              <>
                <span className="material-symbols-outlined text-[16px]">replay</span>
                <span>Re-run Agent Task</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Run Pactra Agent</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 2. Real-Time Execution Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div
          className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${isRunning || isComplete
            ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
            : "bg-[#0D0E11]/40 border-white/5 text-[#64748B]"
            }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold">
            <span className="material-symbols-outlined text-[14px]">psychology</span>
            <span>1. Agent Prompting</span>
          </div>
          <span className="font-sans text-[11px] text-[#94A3B8]">
            {isRunning ? "Reasoning & Planning" : isComplete ? "Criteria Planned" : "Awaiting Trigger"}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${steps.length > 0
            ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
            : isRunning
              ? "bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse"
              : "bg-[#0D0E11]/40 border-white/5 text-[#64748B]"
            }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold">
            <span className="material-symbols-outlined text-[14px]">handyman</span>
            <span>2. Tool Invocations</span>
          </div>
          <span className="font-sans text-[11px] text-[#94A3B8]">
            {steps.length > 0 ? `${steps.length / 2} Tool Calls Executed` : "Whitelisted Tools"}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${traces.length > 0
            ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
            : "bg-[#0D0E11]/40 border-white/5 text-[#64748B]"
            }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span>3. Telemetry Recorded</span>
          </div>
          <span className="font-sans text-[11px] text-[#94A3B8]">
            {traces.length > 0 ? `${traces.length} Traces Logged` : "ExecutionRecorder"}
          </span>
        </div>

        <div
          className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${evidenceHash
            ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
            : "bg-[#0D0E11]/40 border-white/5 text-[#64748B]"
            }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            <span>4. Evidence Hash</span>
          </div>
          <span className="font-sans text-[11px] text-[#94A3B8]">
            {evidenceHash ? "Keccak-256 Ready" : "RFC 8785 Manifest"}
          </span>
        </div>
      </div>

      {/* 3. Error Banner (if any) */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <span className="material-symbols-outlined text-rose-400 text-[18px] shrink-0 mt-0.5">
            error
          </span>
          <div className="text-xs font-sans text-rose-200">
            <strong className="font-semibold block text-rose-300">Agent Execution Failed:</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 4. Agent Narrative Output */}
      {executionLog && (
        <div className="p-3.5 rounded-xl bg-[#0D0E11] border border-white/10 font-sans text-xs text-[#CBD5E1] leading-relaxed">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#38BDF8] mb-1 font-semibold">
            <span className="material-symbols-outlined text-[13px]">format_quote</span>
            <span>Gemini Agent Summary:</span>
          </div>
          <p className="whitespace-pre-line">{executionLog}</p>
        </div>
      )}

      {/* 5. Tool Invocations & Telemetry Terminal */}
      {traces.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-[#0B0C0E] border border-white/10 p-3.5">
          <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
            <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              Live Tool Execution Telemetry ({traces.length})
            </span>
            <span className="text-[10px] text-[#64748B]">DETERMINISTIC LOG</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 font-mono text-[11px]">
            {traces.map((trace, idx) => (
              <div
                key={trace.id || idx}
                className="flex items-center justify-between p-2 rounded-lg bg-[#14161C] border border-white/5 hover:border-white/10"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[#64748B] text-[9px]">#{idx + 1}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${trace.type === "API_CALL"
                      ? "bg-blue-500/10 text-blue-400"
                      : trace.type === "TOOL_OUTPUT"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-emerald-500/10 text-emerald-400"
                      }`}
                  >
                    {trace.type}
                  </span>
                  <span className="text-[#E2E8F0] truncate max-w-xs sm:max-w-md">
                    {trace.url || trace.toolName || trace.txHash || "Operation"}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {trace.status && (
                    <span
                      className={`text-[10px] font-semibold ${trace.status >= 200 && trace.status < 300
                        ? "text-emerald-400"
                        : "text-rose-400"
                        }`}
                    >
                      HTTP {trace.status}
                    </span>
                  )}
                  <span className="text-[#64748B] text-[10px]">
                    {trace.timestamp ? new Date(trace.timestamp * 1000).toLocaleTimeString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Cryptographic Evidence Hash & Raw JSON Inspector */}
      {evidenceHash && (
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-[18px]">
                fingerprint
              </span>
              <span className="font-mono text-xs font-semibold text-purple-200">
                Canonical Evidence Hash (Keccak-256):
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyHash}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 font-mono text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {copiedHash ? "check" : "content_copy"}
                </span>
                <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRawManifest(!showRawManifest)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white font-mono text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {showRawManifest ? "expand_less" : "code"}
                </span>
                <span>{showRawManifest ? "Hide Manifest JSON" : "Inspect Raw JSON"}</span>
              </button>
            </div>
          </div>

          <div className="font-mono text-xs text-purple-300 break-all bg-black/40 p-2.5 rounded-lg border border-purple-500/20 select-all">
            {evidenceHash}
          </div>

          {showRawManifest && evidencePackage && (
            <div className="mt-2 flex flex-col gap-1">
              <span className="font-mono text-[10px] text-[#94A3B8] uppercase">
                RFC 8785 Canonical EvidencePackage Payload:
              </span>
              <pre className="p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-56 select-all">
                {JSON.stringify(evidencePackage, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
