import { useState, useCallback } from "react"
import { PACT_ESCROW_ADDRESS } from "../config/contracts"

export const AGENT_EXECUTION_STATES = {
  IDLE: "IDLE",
  RUNNING: "RUNNING",
  RECORDING: "RECORDING",
  VERIFYING: "VERIFYING",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR",
}

export function useGeminiAgent() {
  const [state, setState] = useState(AGENT_EXECUTION_STATES.IDLE)
  const [executionLog, setExecutionLog] = useState("")
  const [steps, setSteps] = useState([])
  const [traces, setTraces] = useState([])
  const [evidencePackage, setEvidencePackage] = useState(null)
  const [evidenceHash, setEvidenceHash] = useState(null)
  const [authoritativeTerms, setAuthoritativeTerms] = useState(null)
  const [authoritativePact, setAuthoritativePact] = useState(null)
  const [error, setError] = useState(null)

  const isRunning = state === AGENT_EXECUTION_STATES.RUNNING || state === AGENT_EXECUTION_STATES.RECORDING
  const isComplete = state === AGENT_EXECUTION_STATES.COMPLETED

  const executeAgent = useCallback(async (pactId, contractAddress) => {
    if (!pactId) {
      const err = new Error("Pact ID is required to execute Gemini Agent")
      setError(err)
      setState(AGENT_EXECUTION_STATES.ERROR)
      throw err
    }

    setState(AGENT_EXECUTION_STATES.RUNNING)
    setError(null)
    setExecutionLog("")
    setSteps([])
    setTraces([])
    setEvidencePackage(null)
    setEvidenceHash(null)

    const activeContract = contractAddress || PACT_ESCROW_ADDRESS

    try {
      const response = await fetch("/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pactId: String(pactId),
          contractAddress: activeContract,
        }),
      })

      const rawText = await response.text()
      let data = null
      try {
        data = rawText ? JSON.parse(rawText) : null
      } catch {
        // Failed to parse JSON response
      }

      if (!response.ok || !data?.success) {
        const errMsg =
          data?.message ||
          data?.error ||
          (response.status ? `Server error (HTTP ${response.status}): ${rawText.slice(0, 150)}` : "Agent execution failed")
        const execErr = new Error(errMsg)
        setError(execErr)
        setState(AGENT_EXECUTION_STATES.ERROR)
        throw execErr
      }

      setExecutionLog(data.executionLog || "Task executed successfully.")
      setSteps(data.steps || [])
      setTraces(data.traces || [])
      setEvidencePackage(data.evidencePackage || null)
      setEvidenceHash(data.evidenceHash || null)
      setAuthoritativeTerms(data.terms || null)
      setAuthoritativePact(data.pact || null)
      setState(AGENT_EXECUTION_STATES.COMPLETED)

      return data
    } catch (err) {
      console.error("[useGeminiAgent] Execution failed:", err)
      setError(err)
      setState(AGENT_EXECUTION_STATES.ERROR)
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setState(AGENT_EXECUTION_STATES.IDLE)
    setExecutionLog("")
    setSteps([])
    setTraces([])
    setEvidencePackage(null)
    setEvidenceHash(null)
    setAuthoritativeTerms(null)
    setAuthoritativePact(null)
    setError(null)
  }, [])

  return {
    executeAgent,
    reset,
    state,
    isRunning,
    isComplete,
    executionLog,
    steps,
    traces,
    evidencePackage,
    evidenceHash,
    authoritativeTerms,
    authoritativePact,
    error,
    errorMessage: error?.message || null,
  }
}
