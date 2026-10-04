import { useState, useMemo } from "react"
import MainLayout from "../layouts/MainLayout"
import DashboardHeader from "../components/dashboard/DashboardHeader"
import DashboardStats from "../components/dashboard/DashboardStats"
import DashboardFilters from "../components/dashboard/DashboardFilters"
import PactTable from "../components/dashboard/PactTable"
import ActivityStream from "../components/dashboard/ActivityStream"
import { usePacts } from "../hooks/usePacts"
import { useWallet } from "../hooks/useWallet"

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const { pacts, totalCount, isLoading, isError, error, refetch, stats } = usePacts()
  const { address, isConnected } = useWallet()

  const filteredPacts = useMemo(() => {
    return pacts.filter((pact) => {
      // Category / Lifecycle filtering
      if (activeFilter === "settling") {
        // Active pacts in progress: Funded (0) or Submitted (1)
        if (pact.status !== 0 && pact.status !== 1) return false
      } else if (activeFilter === "completed") {
        // Settled pacts: Settled (2)
        if (pact.status !== 2) return false
      } else if (activeFilter === "disputed") {
        // Refunded pacts: Refunded (3)
        if (pact.status !== 3) return false
      } else if (activeFilter === "my-pacts") {
        // Filter by connected wallet address
        if (!address) return false
        const userAddr = address.toLowerCase()
        const matchCreator = pact.creator?.toLowerCase() === userAddr
        const matchRecipient = pact.recipient?.toLowerCase() === userAddr
        if (!matchCreator && !matchRecipient) return false
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchId = pact.id.toLowerCase().includes(query)
        const matchTitle = pact.title?.toLowerCase().includes(query)
        const matchBeneficiary = pact.beneficiary?.toLowerCase().includes(query)
        const matchRecipient = pact.recipient?.toLowerCase().includes(query)
        const matchCreator = pact.creator?.toLowerCase().includes(query)
        const matchAmount = pact.amount?.toLowerCase().includes(query)
        const matchToken = pact.routingToken?.toLowerCase().includes(query)
        return (
          matchId ||
          matchTitle ||
          matchBeneficiary ||
          matchRecipient ||
          matchCreator ||
          matchAmount ||
          matchToken
        )
      }

      return true
    })
  }, [pacts, activeFilter, searchQuery, address])

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-8">
        {/* 1. Header with Protocol Context and Engine Latency */}
        <DashboardHeader />

        {/* 2. 4 Top Analytical KPI Cards */}
        <DashboardStats stats={stats} />

        {/* 3. Main Active Pacts Data Grid with Filter Tabs & Search */}
        <div className="flex flex-col rounded-2xl bg-[#121316]/75 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
          <DashboardFilters
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalCount={totalCount}
            isConnected={isConnected}
          />
          <PactTable
            pacts={filteredPacts}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error?.shortMessage || error?.message || ""}
            onRetry={refetch}
          />
        </div>

        {/* 4. Recent Activity Stream & Consensus Telemetry Histogram */}
        <ActivityStream pacts={pacts} />
      </div>
    </MainLayout>
  )
}