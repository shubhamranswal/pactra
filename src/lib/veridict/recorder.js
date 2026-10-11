/**
 * ExecutionRecorder collects deterministic telemetry during agent execution.
 */
export class ExecutionRecorder {
  constructor() {
    this.traces = []
  }

  /**
   * Records an HTTP or external API call.
   */
  recordApiCall({ url, method = "GET", status = 200, responseData = null, id = null }) {
    const trace = {
      id: id || `api_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "API_CALL",
      timestamp: Math.floor(Date.now() / 1000),
      url,
      method: method.toUpperCase(),
      status: Number(status),
      responseData,
    }
    this.traces.push(trace)
    return trace
  }

  /**
   * Records an on-chain transaction reference.
   */
  recordBlockchainTx({ txHash, from = null, to = null, value = "0", blockNumber = null, status = "success" }) {
    const trace = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "BLOCKCHAIN_TX",
      timestamp: Math.floor(Date.now() / 1000),
      txHash,
      from,
      to,
      value: value.toString(),
      blockNumber,
      status,
    }
    this.traces.push(trace)
    return trace
  }

  /**
   * Records cryptographic tool output payload.
   */
  recordToolOutput({ toolName, outputPayload }) {
    const trace = {
      id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "TOOL_OUTPUT",
      timestamp: Math.floor(Date.now() / 1000),
      toolName,
      outputPayload,
    }
    this.traces.push(trace)
    return trace
  }

  getTraces() {
    return [...this.traces]
  }

  clear() {
    this.traces = []
  }
}
