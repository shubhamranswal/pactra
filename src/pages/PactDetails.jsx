import { useState, useMemo } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import PactHeader from "../components/details/PactHeader"
import SimulationTestbed from "../components/details/SimulationTestbed"
import LifecycleTimeline from "../components/details/LifecycleTimeline"
import PaymentObligationCard from "../components/details/PaymentObligationCard"
import BlockchainTxCard from "../components/details/BlockchainTxCard"
import InvariantsChecklist from "../components/details/InvariantsChecklist"
import DynamicOutcomeCard from "../components/details/DynamicOutcomeCard"
import TelemetryStrip from "../components/details/TelemetryStrip"
import SubmitEvidenceModal from "../components/details/SubmitEvidenceModal"
import VeridictPanel from "../components/details/VeridictPanel"
import { usePact } from "../hooks/usePact"
import { PACT_ESCROW_ADDRESS } from "../config/contracts"
import { shortenAddress } from "../utils/address"

export default function PactDetails() {
  const { id } = useParams()
  const location = useLocation()

  const [forceDemoMode, setForceDemoMode] = useState(false)
  const [simulatedMode, setSimulatedMode] = useState(null)
  const [customInvariants, setCustomInvariants] = useState(null)
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)

  const {
    pact,
    cleanId,
    isLoading,
    isNotFound,
    isInvalidId,
    isRpcError,
    errorMessage,
    refetch,
  } = usePact(id)

  // Derive transaction hash from navigation state or session storage cache
  const navTxHash = location.state?.transactionHash || null
  const transactionHash = useMemo(() => {
    if (navTxHash) {
      if (id) {
        try {
          sessionStorage.setItem(`pact_tx_${id}`, navTxHash)
        } catch {
          // ignore storage errors
        }
      }
      return navTxHash
    }
    if (id) {
      try {
        return sessionStorage.getItem(`pact_tx_${id}`) || null
      } catch {
        return null
      }
    }
    return null
  }, [navTxHash, id])

  const isDemo = forceDemoMode || (!pact && !isLoading && (isNotFound || isInvalidId || isRpcError))

  // Derive mode directly from real contract status
  const derivedMode = pact
    ? (pact.status === 2 ? "passed" : pact.status === 3 ? "expired" : "verifying")
    : "verifying"

  const mode = simulatedMode ?? derivedMode

  const defaultInvariants = useMemo(() => {
    if (simulatedMode) {
      if (simulatedMode === "passed") {
        return {
          sender: true,
          recipient: true,
          token: true,
          amount: true,
          tx: true,
          deadline: true,
        }
      }
      if (simulatedMode === "expired") {
        return {
          sender: true,
          recipient: true,
          token: true,
          amount: true,
          tx: false,
          deadline: false,
        }
      }
      if (simulatedMode === "mismatch") {
        return {
          sender: true,
          recipient: false,
          token: true,
          amount: true,
          tx: true,
          deadline: true,
        }
      }
      return {
        sender: true,
        recipient: true,
        token: true,
        amount: true,
        tx: false,
        deadline: true,
      }
    }

    // Default: Truthful on-chain invariant state
    if (pact) {
      return {
        sender: true,
        recipient: true,
        token: true,
        amount: true,
        tx: Boolean(pact.hasEvidence),
        deadline: !pact.isExpired,
      }
    }

    return {
      sender: true,
      recipient: true,
      token: true,
      amount: true,
      tx: false,
      deadline: true,
    }
  }, [simulatedMode, pact])

  const invariants = customInvariants ?? defaultInvariants

  const handleResetToLive = () => {
    setForceDemoMode(false)
    setSimulatedMode(null)
    setCustomInvariants(null)
  }

  const handleSelectMode = (newMode) => {
    setSimulatedMode(newMode)
    setCustomInvariants(null)
  }

  const handleToggleInvariant = (key) => {
    const base = customInvariants ?? defaultInvariants
    const updated = {
      ...base,
      [key]: !base[key],
    }
    setCustomInvariants(updated)

    const allPassed = Object.values(updated).every(Boolean)
    if (allPassed) {
      setSimulatedMode("passed")
    } else {
      if (!updated.recipient) {
        setSimulatedMode("mismatch")
      } else if (!updated.deadline) {
        setSimulatedMode("expired")
      } else {
        setSimulatedMode("mismatch")
      }
    }
  }

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 font-sans text-on-surface">
        {/* Ambient Top Glow */}
        <div className="relative w-full">
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-[680px] h-[140px] bg-purple-600/15 blur-[90px] rounded-full"></div>
        </div>

        {/* 1. LOADING STATE */}
        {isLoading && !forceDemoMode && (
          <div className="rounded-2xl bg-surface-low border border-outline-variant/40 p-12 sm:p-16 shadow-2xl flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto my-12">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
              <span className="material-symbols-outlined text-primary text-[20px] absolute">hourglass_top</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-lg font-bold text-white">
                Reading Pact #{id}
              </h3>
              <p className="font-mono text-xs text-outline">
                Querying Monad Testnet contract state...
              </p>
            </div>
          </div>
        )}

        {/* 2. INVALID PACT ID STATE */}
        {!isLoading && isInvalidId && !forceDemoMode && (
          <div className="rounded-2xl bg-surface-low border border-danger/40 p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center gap-5 max-w-2xl mx-auto my-10">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger">
              <span className="material-symbols-outlined text-[32px]">error</span>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Invalid Pact Identifier
              </h2>
              <p className="font-sans text-sm text-on-surface-variant mt-2 max-w-md">
                The identifier <code className="font-mono text-danger font-semibold bg-danger/10 px-1.5 py-0.5 rounded">"{id}"</code> is not a valid on-chain pact ID. On-chain pact identifiers are positive sequential numbers (e.g. 1, 2, 3...).
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
              <button
                onClick={() => setForceDemoMode(true)}
                className="px-4 py-2.5 rounded-xl bg-surface-high border border-outline-variant/60 hover:border-primary text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Load Interactive Demo View
              </button>
              <Link
                to="/create-agreement"
                className="px-4 py-2.5 rounded-xl bg-primary-container text-white text-xs font-sans font-semibold hover:bg-primary-container/80 transition-colors shadow-sm"
              >
                Create Agreement
              </Link>
              <Link
                to="/dashboard"
                className="px-4 py-2.5 rounded-xl bg-surface-container text-outline hover:text-white text-xs font-mono transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* 3. NOT-FOUND STATE */}
        {!isLoading && isNotFound && !forceDemoMode && (
          <div className="rounded-2xl bg-surface-low border border-outline-variant/40 p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center gap-5 max-w-2xl mx-auto my-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Pact #{cleanId || id} Not Found On-Chain
              </h2>
              <p className="font-sans text-sm text-on-surface-variant mt-2 max-w-md">
                No agreement with identifier #{cleanId || id} was found in the Monad Testnet escrow contract (
                <span className="font-mono text-xs text-primary">{shortenAddress(PACT_ESCROW_ADDRESS)}</span>
                ). The contract returned <code className="font-mono text-xs text-amber-300">PactDoesNotExist()</code>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
              <button
                onClick={() => setForceDemoMode(true)}
                className="px-4 py-2.5 rounded-xl bg-surface-high border border-outline-variant/60 hover:border-primary text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                View as Interactive Simulation Demo
              </button>
              <Link
                to="/create-agreement"
                className="px-4 py-2.5 rounded-xl bg-primary-container text-white text-xs font-sans font-semibold hover:bg-primary-container/80 transition-colors shadow-sm"
              >
                Create New Pact
              </Link>
              <Link
                to="/dashboard"
                className="px-4 py-2.5 rounded-xl bg-surface-container text-outline hover:text-white text-xs font-mono transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* 4. RPC ERROR STATE */}
        {!isLoading && isRpcError && !forceDemoMode && (
          <div className="rounded-2xl bg-surface-low border border-danger/40 p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center gap-5 max-w-2xl mx-auto my-10">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger">
              <span className="material-symbols-outlined text-[32px]">wifi_off</span>
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                RPC Communication Error
              </h2>
              <p className="font-sans text-sm text-on-surface-variant mt-2 max-w-md">
                Unable to reach the Monad Testnet node to read contract state. Check your connection or RPC endpoint.
              </p>
              {errorMessage && (
                <div className="mt-3 p-3 rounded-xl bg-surface-highest/80 border border-outline-variant/40 font-mono text-xs text-rose-300 text-left max-w-md break-all">
                  {errorMessage}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
              <button
                onClick={() => refetch()}
                className="px-4 py-2.5 rounded-xl bg-primary-container text-white text-xs font-sans font-semibold hover:bg-primary-container/80 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Retry RPC Query</span>
              </button>
              <button
                onClick={() => setForceDemoMode(true)}
                className="px-4 py-2.5 rounded-xl bg-surface-high border border-outline-variant/60 hover:border-primary text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Continue in Simulation Mode
              </button>
            </div>
          </div>
        )}

        {/* 5. SUCCESS / REAL DATA VIEW (or explicit Demo simulation view) */}
        {((pact && !isLoading) || forceDemoMode) && (
          <>
            {/* Header Section */}
            <PactHeader
              pact={pact}
              pactId={pact?.id || cleanId || id}
              mode={mode}
              isDemo={isDemo}
              onSubmitEvidenceClick={() => setIsEvidenceModalOpen(true)}
            />

            {/* Interactive Simulation Testing Bar */}
            <SimulationTestbed
              mode={mode}
              onSelectMode={handleSelectMode}
              isLivePact={Boolean(pact)}
              onResetToLive={handleResetToLive}
            />

            {/* Lifecycle Timeline */}
            <LifecycleTimeline mode={mode} pact={pact} />

            {/* Recipient Submission Prompt Banner (when funded) */}
            {pact?.status === 0 && (
              <div className="rounded-xl bg-primary-container/15 border border-primary/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-white">
                      Counterparty Execution & Commitment
                    </h3>
                    <p className="text-xs font-sans text-on-surface-variant">
                      Task completed? Paste or load your evidence manifest to commit the cryptographic hash on Monad Testnet.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEvidenceModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-primary-container text-white font-sans text-xs font-semibold hover:bg-primary-container/80 transition-colors shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Submit Evidence</span>
                </button>
              </div>
            )}

            {/* Main Dual Grid: Payment & Blockchain Tx + Invariants & Dynamic Outcome */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <PaymentObligationCard
                  pact={pact}
                  pactId={pact?.id || cleanId || id}
                  isDemo={isDemo}
                />
                <BlockchainTxCard
                  pact={pact}
                  transactionHash={transactionHash}
                  isDemo={isDemo}
                />
              </div>

              {/* Right Column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <VeridictPanel
                  pact={pact}
                  pactId={pact?.id || cleanId || id}
                  mode={mode}
                  isDemo={isDemo}
                />
                <InvariantsChecklist
                  invariants={invariants}
                  mode={mode}
                  onToggleInvariant={handleToggleInvariant}
                  pact={pact}
                  isDemo={isDemo}
                />
                <DynamicOutcomeCard
                  mode={mode}
                  invariants={invariants}
                  pact={pact}
                />
              </div>
            </div>

            {/* System Telemetry Strip */}
            <TelemetryStrip />

            {/* Evidence Submission Modal */}
            <SubmitEvidenceModal
              isOpen={isEvidenceModalOpen}
              onClose={() => setIsEvidenceModalOpen(false)}
              pact={pact}
              pactId={pact?.id || cleanId || id}
              onSuccess={() => refetch()}
            />
          </>
        )}
      </div>
    </MainLayout>
  )
}
