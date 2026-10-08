import { useState } from "react"
import MainLayout from "../layouts/MainLayout"
import HeroSection from "../components/home/HeroSection"
import FeatureCards from "../components/home/FeatureCards"
import ExecutionPipeline from "../components/home/ExecutionPipeline"
import EnterpriseCapabilities from "../components/home/EnterpriseCapabilities"
import ComparisonSection from "../components/home/ComparisonSection"
import DiagnosticRibbon from "../components/home/DiagnosticRibbon"
import QuickPactModal from "../components/home/QuickPactModal"

export default function Home() {
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false)

  return (
    <MainLayout onOpenCreateModal={() => setIsQuickModalOpen(true)}>
      {/* 1. Hero with live crawler & cycling typewriter */}
      <HeroSection onOpenQuickModal={() => setIsQuickModalOpen(true)} />

      {/* 2. 3-Column Architecture feature cards */}
      <FeatureCards />

      {/* 3. 7-Step Interactive autonomous execution pipeline */}
      <ExecutionPipeline />

      {/* 4. Enterprise Capabilities (YAML schema preview + Invariant verifier) */}
      <EnterpriseCapabilities />

      {/* 5. Architecture Comparison Matrix Table */}
      <ComparisonSection />

      {/* 6. Real-time Telemetry Diagnostic Ribbon */}
      <DiagnosticRibbon />

      {/* 7. Quick Pact Escrow Simulation Modal */}
      <QuickPactModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
      />
    </MainLayout>
  )
}