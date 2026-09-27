import { useState } from "react"
import { useParams } from "react-router-dom"
import MainLayout from "../layouts/MainLayout"
import PactHeader from "../components/details/PactHeader"
import SimulationTestbed from "../components/details/SimulationTestbed"
import LifecycleTimeline from "../components/details/LifecycleTimeline"
import PaymentObligationCard from "../components/details/PaymentObligationCard"
import BlockchainTxCard from "../components/details/BlockchainTxCard"
import InvariantsChecklist from "../components/details/InvariantsChecklist"
import DynamicOutcomeCard from "../components/details/DynamicOutcomeCard"
import TelemetryStrip from "../components/details/TelemetryStrip"

export default function PactDetails() {
  const { id } = useParams()
  const pactId = id || "P-1024"

  const [mode, setMode] = useState("verifying")
  const [invariants, setInvariants] = useState({
    sender: true,
    recipient: true,
    token: true,
    amount: true,
    tx: true,
    deadline: true,
  })

  const handleSelectMode = (newMode) => {
    setMode(newMode)
    if (newMode === "verifying" || newMode === "passed") {
      setInvariants({
        sender: true,
        recipient: true,
        token: true,
        amount: true,
        tx: true,
        deadline: true,
      })
    } else if (newMode === "mismatch") {
      setInvariants({
        sender: true,
        recipient: false,
        token: true,
        amount: true,
        tx: true,
        deadline: true,
      })
    } else if (newMode === "expired") {
      setInvariants({
        sender: true,
        recipient: true,
        token: true,
        amount: true,
        tx: true,
        deadline: false,
      })
    }
  }

  const handleToggleInvariant = (key) => {
    const updated = {
      ...invariants,
      [key]: !invariants[key],
    }
    setInvariants(updated)

    const allPassed = Object.values(updated).every(Boolean)
    if (allPassed) {
      setMode("passed")
    } else {
      if (!updated.recipient) {
        setMode("mismatch")
      } else if (!updated.deadline) {
        setMode("expired")
      } else {
        setMode("mismatch")
      }
    }
  }

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 font-sans text-on-surface">
        {/* Ambient Glow Behind Top */}
        <div className="relative w-full">
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-[680px] h-[140px] bg-purple-600/15 blur-[90px] rounded-full"></div>
        </div>

        {/* 1. Header Section */}
        <PactHeader pactId={pactId} mode={mode} />

        {/* 2. Interactive Simulation Testing Bar */}
        <SimulationTestbed mode={mode} onSelectMode={handleSelectMode} />

        {/* 3. Lifecycle Timeline */}
        <LifecycleTimeline mode={mode} />

        {/* 4. Main Dual Grid: Payment & Blockchain Tx + Invariants & Dynamic Outcome */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <PaymentObligationCard pactId={pactId} />
            <BlockchainTxCard />
          </div>

          {/* Right Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <InvariantsChecklist
              invariants={invariants}
              mode={mode}
              onToggleInvariant={handleToggleInvariant}
            />
            <DynamicOutcomeCard mode={mode} invariants={invariants} />
          </div>
        </div>

        {/* 5. System Telemetry Strip */}
        <TelemetryStrip />
      </div>
    </MainLayout>
  )
}
