import { useState, useMemo, useEffect } from "react"
import { shortenAddress } from "../../utils/address"
import { SETTLEMENT_STATES } from "../../hooks/useEvidenceAndSettlement"
import { compileEvidencePackage } from "../../lib/veridict/manifest"
import { CRITERION_TYPES } from "../../lib/veridict/schema"
import { hashCanonical } from "../../lib/veridict/canonical"
import { VeridictEngine } from "../../lib/veridict/engine"
import { useGeminiAgent } from "../../hooks/useGeminiAgent"
import AgentExecutionViewer from "./AgentExecutionViewer"

const VALID_OUTPUT_PAYLOAD = { status: "verified_execution", completedAt: 1791112500 }
const VALID_PAYLOAD_HASH = hashCanonical(VALID_OUTPUT_PAYLOAD)

export default function ExecutionVerificationCard({
  pact,
  pactId,
  userAddress,
  isConnected,
  isCorrectNetwork,
  evidenceState,
  onRefetchPact,
}) {
  // Option A (Gemini Agent) is the default; Option B (Simulation Testbed) is available as alternative
  const [executionMode, setExecutionMode] = useState("optionA") // "optionA" | "optionB"
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [testScenario, setTestScenario] = useState("pass") // "pass" | "fail" for Option B simulation

  // Autonomous Gemini Agent hook
  const agent = useGeminiAgent()
  const [agentVerdict, setAgentVerdict] = useState(null)
  const [agentVeridictResult, setAgentVeridictResult] = useState(null)
  const [isVeridictEvaluating, setIsVeridictEvaluating] = useState(false)

  const {
    run,
    retrySettlement,
    reset,
    state,
    isVerifying,
    isSubmittingEvidence,
    isSettling,
    isComplete,
    verdict: simVerdict,
    veridictResult: simVeridictResult,
    evidenceHash: simEvidenceHash,
    evidenceTxHash,
    settlementTxHash,
    statusMessage,
  } = evidenceState

  // Derived user roles
  const isRecipient = Boolean(
    userAddress && pact?.recipient && userAddress.toLowerCase() === pact.recipient.toLowerCase()
  )
  const isCreator = Boolean(
    userAddress && pact?.creator && userAddress.toLowerCase() === pact.creator.toLowerCase()
  )

  // Standard acceptance criteria for this pact
  const terms = useMemo(() => {
    const id = pactId || pact?.id || "1"
    const targetRecipient = pact?.recipient || "0x0000000000000000000000000000000000000000"
    return {
      pactId: id,
      originator: pact?.creator || "0x0000000000000000000000000000000000000000",
      executor: targetRecipient,
      description: "Machine-verifiable service execution and delivery",
      criteria: [
        {
          criterionId: 1,
          type: CRITERION_TYPES.TYPE_A,
          description: "API Execution: Minimum 3 verified successful telemetry calls",
          targetEndpoint: "http://localhost:3001/api/test-telemetry",
          minimumCount: 3,
        },
        {
          criterionId: 2,
          type: CRITERION_TYPES.TYPE_C,
          description: "Cryptographic Artifact: Output payload hash match",
          expectedHash: VALID_PAYLOAD_HASH,
        },
      ],
    }
  }, [pactId, pact?.id, pact?.creator, pact?.recipient])

  // Option B: Simulated evidence package
  const simEvidencePackage = useMemo(() => {
    const id = pactId || pact?.id || "1"
    const executor = pact?.recipient || userAddress || "0x0000000000000000000000000000000000000000"

    if (testScenario === "fail") {
      const { evidencePackage: pkg } = compileEvidencePackage({
        pactId: id,
        executor,
        items: [
          {
            criterionId: 1,
            type: CRITERION_TYPES.TYPE_A,
            calls: [
              { id: "call_1", url: "http://localhost:3001/api/test-telemetry", method: "POST", status: 200 },
            ],
          },
          {
            criterionId: 2,
            type: CRITERION_TYPES.TYPE_C,
            outputPayload: { status: "corrupted_output", nonce: 999 },
          },
        ],
      })
      return pkg
    }

    const { evidencePackage: pkg } = compileEvidencePackage({
      pactId: id,
      executor,
      items: [
        {
          criterionId: 1,
          type: CRITERION_TYPES.TYPE_A,
          calls: [
            { id: "call_1", url: "http://localhost:3001/api/test-telemetry", method: "POST", status: 200 },
            { id: "call_2", url: "http://localhost:3001/api/test-telemetry", method: "POST", status: 200 },
            { id: "call_3", url: "http://localhost:3001/api/test-telemetry", method: "POST", status: 200 },
          ],
        },
        {
          criterionId: 2,
          type: CRITERION_TYPES.TYPE_C,
          outputPayload: VALID_OUTPUT_PAYLOAD,
        },
      ],
    })
    return pkg
  }, [testScenario, pactId, pact?.id, pact?.recipient, userAddress])

  // Deterministic Veridict evaluation of Agent Evidence Package (Option A)
  useEffect(() => {
    if (!agent.evidencePackage) {
      setAgentVerdict(null)
      setAgentVeridictResult(null)
      return
    }

    let isCurrent = true
    setIsVeridictEvaluating(true)

    const activeTerms = agent.authoritativeTerms || terms
    VeridictEngine.evaluate({
      pact,
      terms: activeTerms,
      evidencePackage: agent.evidencePackage,
    })
      .then((res) => {
        if (isCurrent) {
          setAgentVerdict(res.verdict)
          setAgentVeridictResult(res)
          setIsVeridictEvaluating(false)
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error("Veridict evaluation failed for agent package:", err)
          setAgentVerdict("FAIL")
          setIsVeridictEvaluating(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [agent.evidencePackage, pact, terms, agent.authoritativeTerms])

  // Trigger Gemini Agent Task
  const handleExecuteAgent = async () => {
    try {
      const targetId = pactId || pact?.id || "1"
      await agent.executeAgent(targetId)
    } catch (err) {
      console.warn("Gemini agent execution error:", err)
    }
  }

  // Option A Settlement (Recipient-only MetaMask submission)
  const handleOptionASettle = async () => {
    if (!isRecipient) return
    try {
      await run({
        pact,
        evidencePackage: agent.evidencePackage,
        terms: agent.authoritativeTerms || terms,
        forceSettle: true,
      })
      if (onRefetchPact) {
        setTimeout(() => onRefetchPact(), 1500)
      }
    } catch (err) {
      console.warn("Option A settlement halted:", err)
    }
  }

  // Option B Simulation settlement
  const handleOptionBProvideEvidence = async () => {
    try {
      await run({
        pact,
        evidencePackage: simEvidencePackage,
        terms,
      })
      if (onRefetchPact) {
        setTimeout(() => onRefetchPact(), 1500)
      }
    } catch (err) {
      console.warn("Option B evidence execution halted:", err)
    }
  }

  const handleRetrySettlement = async () => {
    try {
      await retrySettlement()
      if (onRefetchPact) {
        setTimeout(() => onRefetchPact(), 1500)
      }
    } catch (err) {
      console.warn("Settlement retry halted:", err)
    }
  }

  const handleTryAgain = () => {
    reset()
    if (executionMode === "optionA") {
      agent.reset()
    }
  }

  const isBusy = isVerifying || isSubmittingEvidence || isSettling
  const isPactSettled = pact?.status === 2 || isComplete || state === SETTLEMENT_STATES.SETTLED
  const isPactFunded = pact?.status === 0 && !isPactSettled
  const isPactSubmitted = (pact?.status === 1 || state === SETTLEMENT_STATES.EVIDENCE_SUBMITTED) && !isPactSettled

  const isVerificationFailed = state === SETTLEMENT_STATES.VERIFICATION_FAILED
  const isSubmissionFailed = state === SETTLEMENT_STATES.ERROR && !evidenceTxHash && !isPactSubmitted
  const isSettlementFailed = (state === SETTLEMENT_STATES.ERROR || isPactSubmitted) && !isPactSettled && Boolean(evidenceTxHash || isPactSubmitted)

  const activeVerdict = executionMode === "optionA" ? agentVerdict : simVerdict
  const activeVeridictResult = executionMode === "optionA" ? agentVeridictResult : simVeridictResult
  const activeEvidenceHash = executionMode === "optionA" ? agent.evidenceHash : (simEvidenceHash || pact?.evidenceHash)

  const explorerTxUrl = settlementTxHash
    ? `https://testnet.monadexplorer.com/tx/${settlementTxHash}`
    : evidenceTxHash
      ? `https://testnet.monadexplorer.com/tx/${evidenceTxHash}`
      : null

  return (
    <div className="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 sm:p-7 shadow-xl flex flex-col gap-6 text-left relative overflow-hidden">
      {/* 1. Primary Header: Clean & User-Centric */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-outline-variant/30 pb-5">
        <div>
          <h3 className="font-display text-xl font-bold text-white">
            Evidence &amp; Payment
          </h3>
          <p className="font-sans text-xs text-on-surface-variant mt-1 leading-relaxed max-w-lg">
            {isPactSettled
              ? "The agreement has been fulfilled and the escrowed payment has been released to the recipient."
              : "Execute automated verification or simulation to validate task invariants and disburse the escrowed payment directly to the recipient."}
          </p>
        </div>

        {/* Status Pill */}
        <div className="shrink-0">
          {isPactSettled ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-success/40 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Pact Settled
            </span>
          ) : isPactSubmitted ? (
            <span className="px-3 py-1 rounded-full bg-cyan/15 border border-cyan/40 text-cyan font-mono text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan animate-pulse"></span>
              Evidence Verified
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-primary-container/25 border border-primary/40 text-primary font-mono text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Funded
            </span>
          )}
        </div>
      </div>

      {/* 2. Key Pact Terms Overview: Payment & Recipient */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container/60 border border-outline-variant/30">
        <div>
          <span className="font-mono text-[11px] text-outline uppercase tracking-wider block">
            Payment
          </span>
          <div className="font-display text-2xl font-bold text-white tracking-tight mt-0.5">
            {pact ? `${pact.amountFormatted} MON` : "—"}
          </div>
        </div>

        <div>
          <span className="font-mono text-[11px] text-outline uppercase tracking-wider block">
            Recipient
          </span>
          <div className="font-mono text-sm text-white font-medium mt-1 truncate" title={pact?.recipient}>
            {pact?.recipient ? shortenAddress(pact.recipient) : "—"}
          </div>
        </div>
      </div>

      {/* 3. Execution Mode Switch: Option A (Gemini Agent) vs Option B (Simulation Testbed) */}
      {!isPactSettled && (
        <div className="flex items-center p-1 rounded-xl bg-surface-container/70 border border-outline-variant/30 text-xs">
          <button
            type="button"
            onClick={() => setExecutionMode("optionA")}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${executionMode === "optionA"
              ? "bg-purple-600 text-white shadow-md font-semibold"
              : "text-outline hover:text-white"
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            <span>Pactra Agent Verification</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${executionMode === "optionA" ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-400"
              }`}>

            </span>
          </button>

          <button
            type="button"
            onClick={() => setExecutionMode("optionB")}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${executionMode === "optionB"
              ? "bg-surface-highest text-white shadow-md font-semibold border border-outline-variant/50"
              : "text-outline hover:text-white"
              }`}
          >
          </button>
        </div>
      )}

      {/* 4. In-Progress Human-Readable Progress State */}
      {isBusy && (
        <div className="p-4 rounded-xl bg-primary-container/15 border border-primary/40 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0"></div>
          <div className="font-sans text-xs font-medium text-white">
            {statusMessage ||
              (isVerifying
                ? "Verifying evidence deterministically..."
                : isSubmittingEvidence
                  ? "Confirming evidence on-chain with MetaMask..."
                  : "Releasing escrowed payment...")}
          </div>
        </div>
      )}

      {/* 5. SUCCESS STATE: Payment Released */}
      {isPactSettled && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-success/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
            <span>Payment Released</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            <span className="text-white font-semibold">{pact?.amountFormatted || "1.00"} MON</span> has been successfully disbursed to the designated recipient ({pact?.recipient ? shortenAddress(pact.recipient) : "—"}).
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
            <span className="text-outline font-sans">
              Status: <span className="text-emerald-400 font-semibold">Settled</span>
            </span>

            {explorerTxUrl && (
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
              >
                <span>View Transaction</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 6. VERIFICATION FAILURE STATE */}
      {isVerificationFailed && !isBusy && (
        <div className="p-5 rounded-xl bg-danger/10 border border-danger/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
            <span>Evidence could not be verified</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            The escrowed payment has not been released. The evidence payload failed deterministic Veridict criteria checks.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleTryAgain}
              className="px-4 py-2 rounded-xl bg-surface-high border border-outline-variant hover:border-white text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 7. SUBMISSION FAILURE STATE */}
      {isSubmissionFailed && !isBusy && (
        <div className="p-5 rounded-xl bg-danger/10 border border-danger/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>Evidence could not be submitted.</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Your payment has not been released. The on-chain transaction failed or was rejected. You can safely try again.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={executionMode === "optionA" ? handleOptionASettle : handleOptionBProvideEvidence}
              className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/80 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 8. SETTLEMENT FAILURE / RETRY STATE */}
      {isSettlementFailed && !isBusy && (
        <div className="p-5 rounded-xl bg-cyan/10 border border-cyan/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-cyan font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Evidence verified on-chain</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Evidence was submitted on-chain, but payment release confirmation is still pending.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleRetrySettlement}
              className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/80 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retry Payment Release</span>
            </button>

            {explorerTxUrl && (
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-outline hover:text-white flex items-center gap-1"
              >
                <span>View Evidence Tx</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 9. OPTION A: AUTONOMOUS GEMINI AGENT EXECUTION & RECIPIENT SETTLEMENT */}
      {executionMode === "optionA" && !isPactSettled && !isBusy && !isVerificationFailed && !isSubmissionFailed && (
        <div className="flex flex-col gap-5">
          {/* Autonomous Execution Terminal & Telemetry */}
          <AgentExecutionViewer
            agentState={agent}
            onExecuteAgent={handleExecuteAgent}
            isPactSettled={isPactSettled}
            isRecipient={isRecipient}
          />

          {/* Veridict Gate & Recipient MetaMask Settlement */}
          {agent.isComplete && agent.evidencePackage && (
            <div className="p-5 rounded-xl bg-surface-container/70 border border-outline-variant/40 flex flex-col gap-4">
              {/* Veridict Evaluation Status */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-[20px]">fact_check</span>
                  <span className="font-display font-semibold text-sm text-white">
                    Veridict Verification Gate:
                  </span>
                </div>

                <div>
                  {isVeridictEvaluating ? (
                    <span className="font-mono text-xs text-purple-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                      Evaluating Invariants...
                    </span>
                  ) : agentVerdict === "PASS" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-success/40 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      PASS
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-danger/15 border border-danger/40 text-danger font-mono text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      FAIL
                    </span>
                  )}
                </div>
              </div>

              {/* Criteria Result Badges */}
              {agentVeridictResult?.criteriaResults && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {agentVeridictResult.criteriaResults.map((cr) => (
                    <div
                      key={cr.criterionId}
                      className={`p-2 rounded-lg border flex items-center justify-between ${cr.passed
                        ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                        : "bg-danger/5 border-danger/30 text-danger"
                        }`}
                    >
                      <span className="truncate pr-2">Criterion #{cr.criterionId}: {cr.type}</span>
                      <span className="font-bold">{cr.passed ? "PASS" : "FAIL"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Option A Recipient-Only Approval Workflow */}
              {agentVerdict === "PASS" && isPactFunded && (
                <div className="flex flex-col gap-3 pt-1">
                  {!isConnected ? (
                    <div className="p-3.5 rounded-xl bg-surface-highest/60 border border-outline-variant/40 text-center font-sans text-xs text-outline">
                      Connect your recipient wallet (<span className="font-mono text-white">{shortenAddress(pact?.recipient)}</span>) to approve settlement.
                    </div>
                  ) : !isCorrectNetwork ? (
                    <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/40 text-center font-sans text-xs text-danger">
                      Please switch network to Monad Testnet (Chain ID 10143) to release funds.
                    </div>
                  ) : pact?.isExpired ? (
                    <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/40 text-center font-sans text-xs text-danger">
                      Pact deadline has passed. Evidence submission is closed.
                    </div>
                  ) : !isRecipient ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs font-sans">
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                        <span>Recipient-Only Approval Required</span>
                      </div>
                      <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                        {isCreator
                          ? `You are connected as Creator (${shortenAddress(userAddress)}). Under Option A, only the designated recipient (${shortenAddress(pact?.recipient)}) is authorized to review the verified evidence and trigger settlement.`
                          : `Connected wallet (${shortenAddress(userAddress)}) is not the designated recipient (${shortenAddress(pact?.recipient)}). Switch to the recipient wallet to release escrow funds.`}
                      </p>
                      <button
                        type="button"
                        disabled
                        className="w-full mt-1 py-3 px-4 rounded-xl bg-surface-highest/60 text-outline border border-outline-variant/30 text-xs font-mono font-medium cursor-not-allowed"
                      >
                        Recipient Approval Required
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-sans text-xs text-emerald-200">
                        <strong className="text-emerald-300 block mb-0.5">Recipient Review Approved:</strong>
                        Veridict has verified the Gemini Agent evidence package. As the designated recipient, you can now sign the transaction to release <strong className="text-white">{pact?.amountFormatted} MON</strong> directly to your wallet.
                      </div>

                      <button
                        type="button"
                        onClick={handleOptionASettle}
                        className="w-full py-3.5 px-6 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)] active:scale-[0.99]"
                      >
                        <span className="material-symbols-outlined text-[18px]">lock_open</span>
                        <span>Sign &amp; Release Escrow to Recipient</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 10. OPTION B: SIMULATION TESTBED & MANUAL SETTLEMENT */}
      {executionMode === "optionB" && !isPactSettled && !isBusy && !isVerificationFailed && !isSubmissionFailed && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/30 text-xs font-sans text-on-surface-variant leading-relaxed">
            <strong className="text-white block mb-1">Option B Simulation Testbed</strong>
            Simulate deterministic Veridict verification with mock API telemetry and cryptographic hashes.
          </div>

          {/* Test Scenario Simulator Toggle */}
          {isPactFunded && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-highest/50 border border-outline-variant/30 text-xs font-mono">
              <span className="text-outline">Simulation Payload:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestScenario("pass")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${testScenario === "pass"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-outline hover:text-white"
                    }`}
                >
                  Valid Proof (PASS)
                </button>
                <button
                  type="button"
                  onClick={() => setTestScenario("fail")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${testScenario === "fail"
                    ? "bg-danger/20 text-danger border border-danger/40"
                    : "text-outline hover:text-white"
                    }`}
                >
                  Corrupted Proof (FAIL)
                </button>
              </div>
            </div>
          )}

          {/* Option B Action Button */}
          {isPactFunded && (
            <div className="pt-1 flex flex-col gap-2">
              {!isConnected ? (
                <div className="p-3 rounded-xl bg-surface-highest/60 border border-outline-variant/40 text-center font-sans text-xs text-outline">
                  Connect wallet to view payment options.
                </div>
              ) : !isCorrectNetwork ? (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/40 text-center font-sans text-xs text-danger">
                  Please switch network to Monad Testnet to interact with this pact.
                </div>
              ) : pact?.isExpired ? (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/40 text-center font-sans text-xs text-danger">
                  Pact deadline has passed. Evidence submission is closed.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOptionBProvideEvidence}
                  className="w-full py-3.5 px-6 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)]"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Provide confirmation to release payment to recipient</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 11. CREATOR VIEW WHEN PACT IS SUBMITTED & AWAITING SETTLEMENT */}
      {isCreator && isPactSubmitted && !isPactSettled && !isBusy && !isSettlementFailed && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-success/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-sans text-xs font-semibold text-white">
              Evidence verified on-chain.
            </div>
            <div className="font-sans text-xs text-on-surface-variant mt-0.5">
              Confirm settlement to release the escrow payment.
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetrySettlement}
            className="px-4 py-2 rounded-xl bg-success text-black font-semibold text-xs hover:bg-success/90 transition-all cursor-pointer shadow-md self-start sm:self-center"
          >
            Release Payment
          </button>
        </div>
      )}

      {/* 12. OPTIONAL TECHNICAL DETAILS SECTION (COLLAPSED BY DEFAULT) */}
      <div className="pt-2 border-t border-outline-variant/20">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-outline hover:text-white font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{showTechnicalDetails ? "Hide verification details" : "View verification details"}</span>
          <span className="material-symbols-outlined text-[16px]">
            {showTechnicalDetails ? "expand_less" : "expand_more"}
          </span>
        </button>

        {showTechnicalDetails && (
          <div className="mt-3 p-4 rounded-xl bg-surface-highest/50 border border-outline-variant/30 flex flex-col gap-3.5 text-xs font-mono">
            {/* Criteria breakdown */}
            <div>
              <span className="text-outline uppercase text-[10px] tracking-wider block mb-1.5">
                Acceptance Criteria
              </span>
              <div className="flex flex-col gap-1.5">
                {terms.criteria.map((crit) => {
                  const result = activeVeridictResult?.criteriaResults?.find((r) => r.criterionId === crit.criterionId)
                  const passed = result?.passed
                  return (
                    <div
                      key={crit.criterionId}
                      className="p-2 rounded bg-surface-container/60 border border-outline-variant/20 flex items-center justify-between text-[11px]"
                    >
                      <span className="truncate pr-2">
                        #{crit.criterionId} — {crit.description}
                      </span>
                      <span className={passed ? "text-emerald-400 font-bold" : "text-outline"}>
                        {result ? (passed ? "PASS" : "FAIL") : "PENDING"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hashes and Verdict */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-outline text-[10px] block">Verdict</span>
                <span className={activeVerdict === "PASS" ? "text-emerald-400 font-bold" : activeVerdict === "FAIL" ? "text-danger font-bold" : "text-white"}>
                  {activeVerdict || "Not evaluated"}
                </span>
              </div>

              <div>
                <span className="text-outline text-[10px] block">Evidence Hash</span>
                <span className="text-primary truncate block" title={activeEvidenceHash}>
                  {activeEvidenceHash || "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
