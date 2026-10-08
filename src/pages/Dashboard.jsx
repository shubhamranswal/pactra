import { useState, useMemo } from "react"
import MainLayout from "../layouts/MainLayout"
import DashboardHeader from "../components/dashboard/DashboardHeader"
import DashboardStats from "../components/dashboard/DashboardStats"
import DashboardFilters from "../components/dashboard/DashboardFilters"
import PactTable from "../components/dashboard/PactTable"
import ActivityStream from "../components/dashboard/ActivityStream"

const MOCK_PACTS = [
  {
    id: "P-1024",
    title: "Sub-second Escrow",
    routingToken: "5 MON",
    beneficiary: "0x71...A92",
    amount: "100 USDC",
    oracleSpec: "Oracle: Pyth Monad Feed",
    status: "executing",
  },
  {
    id: "P-1023",
    title: "State Transition Settled",
    routingToken: "100 USDC",
    beneficiary: "0x82...C14",
    amount: "250 USDC",
    oracleSpec: "Finalized in 410ms",
    status: "verified",
  },
  {
    id: "P-1022",
    title: "Arbitration Window Active",
    routingToken: "Pay Agent C",
    beneficiary: "0x4f...E91",
    amount: "150 USDC",
    oracleSpec: "Locked in Dispute Escrow",
    status: "disputed",
  },
  {
    id: "P-1021",
    title: "Inference SLA Vault",
    routingToken: "25 MON",
    beneficiary: "0x9a...D42",
    amount: "500 USDC",
    oracleSpec: "zkSNARK Groth16 Verified",
    status: "verified",
  },
  {
    id: "P-1020",
    title: "Parallel BFT Channel",
    routingToken: "50 MON",
    beneficiary: "0x12...B83",
    amount: "1,200 USDC",
    oracleSpec: "Epoch #84918 Attested",
    status: "settling",
  },
]

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPacts = useMemo(() => {
    return MOCK_PACTS.filter((pact) => {
      // Category filtering
      if (activeFilter === "settling") {
        if (pact.status !== "settling" && pact.status !== "executing") return false
      } else if (activeFilter === "disputed") {
        if (pact.status !== "disputed") return false
      } else if (activeFilter === "completed") {
        if (pact.status !== "verified" && pact.status !== "completed") return false
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchId = pact.id.toLowerCase().includes(query)
        const matchTitle = pact.title.toLowerCase().includes(query)
        const matchBeneficiary = pact.beneficiary.toLowerCase().includes(query)
        const matchAmount = pact.amount.toLowerCase().includes(query)
        const matchToken = pact.routingToken.toLowerCase().includes(query)
        return matchId || matchTitle || matchBeneficiary || matchAmount || matchToken
      }

      return true
    })
  }, [activeFilter, searchQuery])

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-8">
        {/* 1. Header with Protocol Context and Engine Latency */}
        <DashboardHeader />

        {/* 2. 4 Top Analytical KPI Cards */}
        <DashboardStats />

        {/* 3. Main Active Pacts Data Grid with Filter Tabs & Search */}
        <div className="flex flex-col rounded-2xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
          <DashboardFilters
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalCount={MOCK_PACTS.length}
          />
          <PactTable pacts={filteredPacts} />
        </div>

        {/* 4. Recent Activity Stream & Consensus Telemetry Histogram */}
        <ActivityStream />
      </div>
    </MainLayout>
  )
}