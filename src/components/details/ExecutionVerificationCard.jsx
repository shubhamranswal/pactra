import { useState, useMemo } from "react"
import { shortenAddress } from "../../utils/address"
import { SETTLEMENT_STATES } from "../../hooks/useEvidenceAndSettlement"
import { compileEvidencePackage } from "../../lib/veridict/manifest"
import { CRITERION_TYPES } from "../../lib/veridict/schema"

export default function ExecutionVerificationCard({
  pact,
  pactId,
  userAddress,
  isConnected,
  isCorrectNetwork,
  evidenceState,
  onRefetchPact,
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [testScenario, setTestScenario] = useState("pass") // "pass" | "fail" for technical inspector

  const {
    run,
    retrySettlement,
    reset,
    state,
    isVerifying,
    isSubmittingEvidence,
    isSettling,
    isComplete,
    verdict,
    veridictResult,
    evidenceHash,
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

  // Build standard acceptance criteria for this pact
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
          targetEndpoint: "https://api.pactra.network/v1/telemetry",
          minimumCount: 3,
        },
        {
          criterionId: 2,
          type: CRITERION_TYPES.TYPE_C,
          description: "Cryptographic Artifact: Output payload hash match",
          expectedHash: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        },
      ],
    }
  }, [pactId, pact?.id, pact?.creator, pact?.recipient])

  // Build evidence package (uses passing proof by default, or failing proof if selected in technical details)
  const evidencePackage = useMemo(() => {
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
              { id: "call_1", url: "https://api.pactra.network/v1/telemetry", method: "POST", status: 200 },
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
            { id: "call_1", url: "https://api.pactra.network/v1/telemetry", method: "POST", status: 200 },
            { id: "call_2", url: "https://api.pactra.network/v1/telemetry", method: "POST", status: 200 },
            { id: "call_3", url: "https://api.pactra.network/v1/telemetry", method: "POST", status: 200 },
          ],
        },
        {
          criterionId: 2,
          type: CRITERION_TYPES.TYPE_C,
          outputPayload: { status: "verified_execution", completedAt: 1791112500 },
        },
      ],
    })
    return pkg
  }, [testScenario, pactId, pact?.id, pact?.recipient, userAddress])

  // Automatic verification and settlement upon clicking "Provide Evidence"
  const handleProvideEvidence = async () => {
    try {
      await run({
        pact,
        evidencePackage,
        terms,
      })
      if (onRefetchPact) {
        setTimeout(() => onRefetchPact(), 1500)
      }
    } catch (err) {
      console.warn("Evidence execution halted:", err)
    }
  }

  // Handle settlement retry click
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
  }

  const isBusy = isVerifying || isSubmittingEvidence || isSettling
  const isPactSettled = pact?.status === 2 || isComplete || state === SETTLEMENT_STATES.SETTLED
  const isPactFunded = pact?.status === 0 && !isPactSettled
  const isPactSubmitted = (pact?.status === 1 || state === SETTLEMENT_STATES.EVIDENCE_SUBMITTED) && !isPactSettled

  const isVerificationFailed = state === SETTLEMENT_STATES.VERIFICATION_FAILED
  const isSubmissionFailed = state === SETTLEMENT_STATES.ERROR && !evidenceTxHash && !isPactSubmitted
  const isSettlementFailed = (state === SETTLEMENT_STATES.ERROR || isPactSubmitted) && !isPactSettled && Boolean(evidenceTxHash || isPactSubmitted)

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
              : "Verify execution invariants and submit evidence to disburse the escrowed payment directly to the recipient."}
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

      {/* 3. In-Progress Human-Readable Progress State */}
      {isBusy && (
        <div className="p-4 rounded-xl bg-primary-container/15 border border-primary/40 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0"></div>
          <div className="font-sans text-xs font-medium text-white">
            {statusMessage ||
              (isVerifying
                ? "Verifying your evidence..."
                : isSubmittingEvidence
                ? "Confirming evidence on-chain..."
                : "Releasing payment...")}
          </div>
        </div>
      )}

      {/* 4. SUCCESS STATE: Payment Released */}
      {isPactSettled && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-success/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
            <span>Payment Released</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            <span className="text-white font-semibold">{pact?.amountFormatted || "1.00"} MON</span> has been released to the recipient.
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
            <span className="text-outline font-sans">
              Pact: <span className="text-emerald-400 font-semibold">Settled</span>
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

      {/* 5. VERIFICATION FAILURE STATE */}
      {isVerificationFailed && !isBusy && (
        <div className="p-5 rounded-xl bg-danger/10 border border-danger/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
            <span>Evidence could not be verified</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            The escrowed payment has not been released. Please review your evidence and try again.
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

      {/* 6. SUBMISSION FAILURE STATE */}
      {isSubmissionFailed && !isBusy && (
        <div className="p-5 rounded-xl bg-danger/10 border border-danger/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>Evidence could not be submitted.</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Your payment has not been released. You can safely try again.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleProvideEvidence}
              className="px-4 py-2 rounded-xl bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/80 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 7. SETTLEMENT FAILURE / RETRY STATE */}
      {isSettlementFailed && !isBusy && (
        <div className="p-5 rounded-xl bg-cyan/10 border border-cyan/40 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-cyan font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Evidence verified</span>
          </div>

          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Payment release did not complete. Your evidence has already been submitted on-chain.
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

      {/* 8. CREATOR VIEW WHEN PACT IS SUBMITTED & AWAITING SETTLEMENT */}
      {isCreator && isPactSubmitted && !isPactSettled && !isBusy && !isSettlementFailed && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-success/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-sans text-xs font-semibold text-white">
              Evidence verified by recipient.
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

      {/* 9. PRIMARY SUBMIT EVIDENCE & RELEASE ACTION BUTTON */}
      {isPactFunded && !isBusy && !isVerificationFailed && !isSubmissionFailed && (
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
              onClick={handleProvideEvidence}
              className="w-full py-3.5 px-6 rounded-xl font-display text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)]"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Submit Evidence &amp; Release Payment to Recipient</span>
            </button>
          )}
        </div>
      )}

      {/* 10. OPTIONAL TECHNICAL DETAILS SECTION (COLLAPSED BY DEFAULT) */}
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
                  const result = veridictResult?.criteriaResults?.find((r) => r.criterionId === crit.criterionId)
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
                <span className={verdict === "PASS" ? "text-emerald-400 font-bold" : verdict === "FAIL" ? "text-danger font-bold" : "text-white"}>
                  {verdict || "Not evaluated"}
                </span>
              </div>

              <div>
                <span className="text-outline text-[10px] block">Evidence Hash</span>
                <span className="text-primary truncate block" title={evidenceHash || pact?.evidenceHash}>
                  {evidenceHash || pact?.evidenceHash || "—"}
                </span>
              </div>
            </div>

            {/* Tester toggle for verifying PASS vs FAIL handling */}
            {isPactFunded && !isBusy && (
              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                <span className="text-outline">Test Payload Simulator:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTestScenario("pass")}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                      testScenario === "pass"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "text-outline hover:text-white"
                    }`}
                  >
                    Valid Proof
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestScenario("fail")}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                      testScenario === "fail"
                        ? "bg-danger/20 text-danger border border-danger/40"
                        : "text-outline hover:text-white"
                    }`}
                  >
                    Failing Proof
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
