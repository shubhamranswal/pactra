import { useState } from "react"
import { parseEther, isAddress } from "viem"
import MainLayout from "../layouts/MainLayout"
import CreatePactHeader from "../components/create/CreatePactHeader"
import ArchitectureSelector from "../components/create/ArchitectureSelector"
import AgentFormFields from "../components/create/AgentFormFields"
import InvariantsManager from "../components/create/InvariantsManager"
import EscrowPreviewCard from "../components/create/EscrowPreviewCard"
import PactCreatedModal from "../components/create/PactCreatedModal"
import { useWallet } from "../hooks/useWallet"
import { useCreatePact } from "../hooks/useCreatePact"
import { isPactEscrowConfigured } from "../config/contracts"

const DEFAULT_INVARIANTS = [
  { id: 1, label: "Sender Auth", satisfied: true, removable: false },
  { id: 2, label: "Recipient Address", satisfied: true, removable: false },
  { id: 3, label: "Token Whitelist", satisfied: true, removable: false },
  { id: 4, label: "Exact Amount", satisfied: true, removable: false },
  { id: 5, label: "Deadline Window", satisfied: true, removable: false },
  { id: 6, label: "TX Success / Merkle Root", satisfied: true, removable: false },
]

function getTimeoutDurationInSeconds(timeoutStr) {
  if (!timeoutStr) return 86400
  const lower = timeoutStr.toString().toLowerCase()
  if (lower.includes("12 hour") || lower.includes("12h")) return 12 * 3600
  if (lower.includes("24 hour") || lower.includes("24h")) return 24 * 3600
  if (lower.includes("48 hour") || lower.includes("48h")) return 48 * 3600
  if (lower.includes("7 day") || lower.includes("7d")) return 7 * 86400
  const match = lower.match(/(\d+)/)
  if (match) {
    const num = parseInt(match[1], 10)
    if (lower.includes("day")) return num * 86400
    if (lower.includes("hour")) return num * 3600
    if (lower.includes("min")) return num * 60
    return num * 3600
  }
  return 86400
}

function formatErrorMessage(err) {
  if (!err) return null
  const msg = typeof err === "string" ? err : err.message || ""
  if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied")) {
    return "Transaction request rejected in wallet."
  }
  if (msg.includes("insufficient funds") || msg.includes("exceeds the balance")) {
    return "Insufficient MON balance in your wallet for escrow amount + gas fee."
  }
  if (msg.includes("InvalidRecipient") || msg.includes("recipient")) {
    return "Invalid recipient address or self-recipient not allowed."
  }
  if (msg.includes("InvalidDeadline") || msg.includes("deadline")) {
    return "Invalid deadline timestamp provided."
  }
  if (msg.includes("ZeroEscrowAmount")) {
    return "Escrow amount must be greater than zero."
  }
  if (msg.includes("configured")) {
    return "PactEscrow contract address is missing in VITE_PACT_ESCROW_ADDRESS environment variable."
  }
  return msg.split("\n")[0].substring(0, 160)
}

export default function CreateAgreement() {
  const [selectedArchitecture, setSelectedArchitecture] = useState("MON")
  const [providerAgent, setProviderAgent] = useState("PaymentAgent-B")
  const [recipientAddress, setRecipientAddress] = useState("0x71C5A82d54B98819446D61BcA49A92")
  const [token, setToken] = useState("MON")
  const [amount, setAmount] = useState("500.00")
  const [timeout, setTimeoutHours] = useState("24 Hours")
  const [collateral, setCollateral] = useState("100 USDC")
  const [invariants, setInvariants] = useState(DEFAULT_INVARIANTS)
  const [validationError, setValidationError] = useState("")
  const [modalDismissed, setModalDismissed] = useState(false)

  const { address, isConnected, isCorrectNetwork } = useWallet()

  const {
    createPact,
    transactionHash,
    createdPactId,
    isPending,
    isConfirming,
    isSuccess,
    error: contractError,
    reset,
  } = useCreatePact()

  const isSuccessModalOpen = isSuccess && !modalDismissed

  const handleSelectArchitecture = (archId, defaultToken) => {
    setSelectedArchitecture(archId)
    setToken(defaultToken)
  }

  const handleToggleInvariant = (id) => {
    setInvariants((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, satisfied: !inv.satisfied } : inv))
    )
  }

  const handleAddInvariant = (label) => {
    setInvariants((prev) => [
      ...prev,
      { id: Date.now(), label, satisfied: true, removable: true },
    ])
  }

  const handleRemoveInvariant = (id) => {
    setInvariants((prev) => prev.filter((inv) => inv.id !== id))
  }

  const handleInitiatePact = async () => {
    setValidationError("")
    setModalDismissed(false)
    reset()

    if (!isPactEscrowConfigured) {
      setValidationError("PactEscrow contract address is missing in VITE_PACT_ESCROW_ADDRESS.")
      return
    }

    if (!isConnected || !address) {
      setValidationError("Please connect your wallet first.")
      return
    }

    if (!isCorrectNetwork) {
      setValidationError("Please switch your wallet to Monad Testnet.")
      return
    }

    if (!isAddress(recipientAddress, { strict: false })) {
      setValidationError("Please enter a valid recipient EVM address.")
      return
    }

    if (recipientAddress.toLowerCase() === address.toLowerCase()) {
      setValidationError("Recipient cannot be your own connected wallet address.")
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError("Escrow amount must be greater than 0.")
      return
    }

    const durationSeconds = getTimeoutDurationInSeconds(timeout)
    const currentTimestampSeconds = Math.floor(Date.now() / 1000)
    const deadlineSeconds = currentTimestampSeconds + durationSeconds

    try {
      const valueWei = parseEther(amount.toString())
      await createPact({
        recipient: recipientAddress,
        deadlineSeconds,
        valueWei,
      })
    } catch (err) {
      console.error("Contract call failed:", err)
    }
  }

  const displayError = validationError || formatErrorMessage(contractError)

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-8">
        {/* Header & Breadcrumb Context */}
        <CreatePactHeader />

        {/* Form & Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Fields & Invariants (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-[#111318]/90 rounded-2xl p-5 sm:p-7 shadow-2xl border border-white/10 backdrop-blur-xl relative overflow-hidden flex flex-col gap-6">
              {/* Architecture Selector */}
              <ArchitectureSelector
                selectedArchitecture={selectedArchitecture}
                onSelectArchitecture={handleSelectArchitecture}
              />

              {/* Core Agent & Payment Form Fields */}
              <AgentFormFields
                providerAgent={providerAgent}
                setProviderAgent={setProviderAgent}
                recipientAddress={recipientAddress}
                setRecipientAddress={setRecipientAddress}
                token={token}
                setToken={setToken}
                amount={amount}
                setAmount={setAmount}
                timeout={timeout}
                setTimeoutHours={setTimeoutHours}
                collateral={collateral}
                setCollateral={setCollateral}
              />

              {/* Automated Invariants Verification Manager */}
              <InvariantsManager
                invariants={invariants}
                onToggleInvariant={handleToggleInvariant}
                onAddInvariant={handleAddInvariant}
                onRemoveInvariant={handleRemoveInvariant}
              />
            </div>

            {/* Inline Architecture Pre-flight Indicator */}
            <div className="bg-[#0D0E11]/90 border border-white/10 rounded-xl p-4 shadow-lg flex items-center justify-between backdrop-blur-md text-left flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                  <svg className="w-10 h-10 text-[#7C3AED] rotate-[-90deg]" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" fill="none" r="15.9155" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
                    <circle cx="18" cy="18" fill="none" r="15.9155" stroke="currentColor" strokeDasharray="100, 0" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-[#D2BBFF]">
                    100%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-sans text-xs sm:text-sm text-white font-medium">
                    Consensus Pre-flight Complete
                  </span>
                  <span className="font-mono text-[11px] text-[#64748B]">
                    Zero slippage risk • Parallel execution thread allocated
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs text-[#38BDF8] font-medium px-2.5 py-1 rounded bg-[#38BDF8]/10 border border-[#38BDF8]/20">
                ~0.4s finality
              </span>
            </div>
          </div>

          {/* Right Column: Execution Preview & Fund Escrow CTA */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <EscrowPreviewCard
              amount={amount}
              token={token}
              recipientAddress={recipientAddress}
              collateral={collateral}
              timeout={timeout}
              onInitiatePact={handleInitiatePact}
              isPending={isPending}
              isConfirming={isConfirming}
              isSuccess={isSuccess}
              error={displayError}
              isConnected={isConnected}
              isCorrectNetwork={isCorrectNetwork}
            />
          </div>
        </div>

        {/* Frontend Success / Review Modal */}
        <PactCreatedModal
          isOpen={isSuccessModalOpen}
          onClose={() => setModalDismissed(true)}
          pactDetails={{
            createdPactId,
            transactionHash,
            amount,
            token,
            recipientAddress,
            timeout,
            invariantsCount: invariants.filter((inv) => inv.satisfied).length,
          }}
        />
      </div>
    </MainLayout>
  )
}