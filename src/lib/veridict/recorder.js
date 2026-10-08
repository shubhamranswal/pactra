/**
 * @file recorder.js
 * @description In-memory Execution Recorder for collecting agent telemetry traces.
 *
 * Implements Task 7.3.1 / P7-FR-005:
 * Captures API calls, blockchain transactions, and tool outputs with deterministic hashes
 * and ISO 8601 UTC timestamps.
 */

import { hashCanonical } from "./canonical.js"

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/

export const EVENT_TYPES = Object.freeze({
  API_CALL: "API_CALL",
  BLOCKCHAIN_TX: "BLOCKCHAIN_TX",
  TOOL_OUTPUT: "TOOL_OUTPUT",
})

/**
 * ExecutionRecorder class collects telemetry events into an immutable/structured trace list.
 */
export class ExecutionRecorder {
  /**
   * @param {object} [options]
   * @param {number} [options.maxEvents=1000] - Maximum events permitted before ERR_RECORDING_OVERFLOW
   */
  constructor(options = {}) {
    let maxLimit = 1000
    if (typeof options === "object" && options !== null && typeof options.maxEvents === "number" && options.maxEvents > 0) {
      maxLimit = options.maxEvents
    }
    this.maxEvents = maxLimit
    this.events = []
    this.counter = 0
  }

  /**
   * Current number of recorded events.
   * @type {number}
   */
  get size() {
    return this.events.length
  }

  /**
   * Checks whether recorder has capacity for another event.
   * @private
   */
  _checkCapacity() {
    if (this.events.length >= this.maxEvents) {
      throw new Error(`ERR_RECORDING_OVERFLOW: Maximum event limit (${this.maxEvents}) exceeded`)
    }
  }

  /**
   * Records an HTTP/REST API request and response.
   * Supports both object ({ url, method, status, responseData, responseBodyHash })
   * and positional arguments (url, method, status, responseData, responseBodyHash).
   *
   * @param {object|string} arg1 - Options object or URL string
   * @param {string} [argMethod]
   * @param {number} [argStatus]
   * @param {*} [argResponseData]
   * @param {string} [argResponseBodyHash]
   * @returns {object} The recorded event object
   */
  recordApiCall(arg1, argMethod, argStatus, argResponseData, argResponseBodyHash) {
    this._checkCapacity()

    let url, method, status, responseData, responseBodyHash

    if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
      url = arg1.url || arg1.endpoint
      method = arg1.method
      status = arg1.status !== undefined ? arg1.status : arg1.statusCode
      responseData = arg1.responseData
      responseBodyHash = arg1.responseBodyHash
    } else {
      url = arg1
      method = argMethod
      status = argStatus
      responseData = argResponseData
      responseBodyHash = argResponseBodyHash
    }

    if (!url || typeof url !== "string") {
      throw new Error("ERR_MALFORMED_TELEMETRY: API call 'url' must be a non-empty string")
    }

    const normalizedMethod = typeof method === "string" ? method.trim().toUpperCase() : "GET"
    if (!normalizedMethod) {
      throw new Error("ERR_MALFORMED_TELEMETRY: API call 'method' must be a valid HTTP method string")
    }

    const numStatus = Number(status)
    if (!Number.isInteger(numStatus) || numStatus < 100 || numStatus > 599) {
      throw new Error(
        `ERR_MALFORMED_TELEMETRY: API call 'status' must be a valid HTTP status code (100-599), received ${status}`
      )
    }

    // Auto-calculate response body hash if not provided and data is present
    let bodyHash = responseBodyHash || null
    if (!bodyHash && responseData !== undefined) {
      try {
        bodyHash = hashCanonical(responseData)
      } catch {
        // If unhashable (e.g. function or cyclic), leave null or throw
        throw new Error("ERR_MALFORMED_TELEMETRY: Unable to compute canonical hash of responseData")
      }
    }

    const event = {
      id: `evt_api_${++this.counter}`,
      type: EVENT_TYPES.API_CALL,
      timestamp: new Date().toISOString(),
      url: url.trim(),
      method: normalizedMethod,
      status: numStatus,
      responseBodyHash: bodyHash,
      responseData: responseData !== undefined ? responseData : null,
    }

    this.events.push(event)
    return event
  }

  /**
   * Records an on-chain blockchain transaction on Monad.
   * Supports both object ({ txHash, from, to, value, blockNumber, status, chainId })
   * and positional arguments (txHash, from, to, value, blockNumber, status, chainId).
   *
   * @param {object|string} arg1
   * @param {string} [argFrom]
   * @param {string} [argTo]
   * @param {string|number|bigint} [argValue]
   * @param {number} [argBlockNumber]
   * @param {string} [argStatus]
   * @param {number} [argChainId]
   * @returns {object} The recorded event object
   */
  recordBlockchainTx(arg1, argFrom, argTo, argValue, argBlockNumber, argStatus, argChainId) {
    this._checkCapacity()

    let txHash, from, to, value, blockNumber, status, chainId

    if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
      txHash = arg1.txHash
      from = arg1.from
      to = arg1.to
      value = arg1.value
      blockNumber = arg1.blockNumber
      status = arg1.status
      chainId = arg1.chainId
    } else {
      txHash = arg1
      from = argFrom
      to = argTo
      value = argValue
      blockNumber = argBlockNumber
      status = argStatus
      chainId = argChainId
    }

    if (!txHash || typeof txHash !== "string" || !TX_HASH_REGEX.test(txHash)) {
      throw new Error(
        `ERR_MALFORMED_TELEMETRY: 'txHash' must be a 66-character hex string starting with '0x', received ${txHash}`
      )
    }

    if (!from || typeof from !== "string" || !EVM_ADDRESS_REGEX.test(from)) {
      throw new Error(
        `ERR_MALFORMED_TELEMETRY: 'from' must be a valid 42-character EVM address, received ${from}`
      )
    }

    if (to !== null && to !== undefined) {
      if (typeof to !== "string" || !EVM_ADDRESS_REGEX.test(to)) {
        throw new Error(
          `ERR_MALFORMED_TELEMETRY: 'to' must be a valid 42-character EVM address or null, received ${to}`
        )
      }
    }

    const event = {
      id: `evt_tx_${++this.counter}`,
      type: EVENT_TYPES.BLOCKCHAIN_TX,
      timestamp: new Date().toISOString(),
      txHash: txHash.toLowerCase(),
      from: from.toLowerCase(),
      to: to ? to.toLowerCase() : null,
      value: value !== undefined ? String(value) : "0",
      blockNumber: blockNumber !== undefined && blockNumber !== null ? Number(blockNumber) : null,
      status: status === "reverted" || status === 0 ? "reverted" : "success",
      chainId: typeof chainId === "number" ? chainId : 10143, // Default to Monad Testnet (10143)
    }

    this.events.push(event)
    return event
  }

  /**
   * Alias for recordBlockchainTx.
   */
  recordTx(...args) {
    return this.recordBlockchainTx(...args)
  }

  /**
   * Alias for recordBlockchainTx.
   */
  recordTransaction(...args) {
    return this.recordBlockchainTx(...args)
  }

  /**
   * Records a local tool or agent calculation execution output.
   * Supports both object ({ toolName, payload, outputPayload, inputHash })
   * and positional arguments (toolName, payload, inputHash).
   *
   * @param {object|string} arg1
   * @param {*} [argPayload]
   * @param {string} [argInputHash]
   * @returns {object} The recorded event object
   */
  recordToolOutput(arg1, argPayload, argInputHash) {
    this._checkCapacity()

    let toolName, payload, inputHash

    if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
      toolName = arg1.toolName
      payload = arg1.outputPayload !== undefined ? arg1.outputPayload : arg1.payload
      inputHash = arg1.inputHash
    } else {
      toolName = arg1
      payload = argPayload
      inputHash = argInputHash
    }

    if (!toolName || typeof toolName !== "string") {
      throw new Error("ERR_MALFORMED_TELEMETRY: 'toolName' must be a non-empty string")
    }

    if (payload === undefined) {
      throw new Error("ERR_MALFORMED_TELEMETRY: 'payload' must be provided for tool output")
    }

    let outputHash
    try {
      outputHash = hashCanonical(payload)
    } catch {
      throw new Error("ERR_MALFORMED_TELEMETRY: Unable to compute canonical hash of payload")
    }

    const event = {
      id: `evt_tool_${++this.counter}`,
      type: EVENT_TYPES.TOOL_OUTPUT,
      timestamp: new Date().toISOString(),
      toolName: toolName.trim(),
      inputHash: inputHash || null,
      payload,
      outputHash,
    }

    this.events.push(event)
    return event
  }

  /**
   * Alias for recordToolOutput.
   */
  recordOutput(...args) {
    return this.recordToolOutput(...args)
  }

  /**
   * Returns a copy of the recorded traces, optionally filtered by event type.
   *
   * @param {string} [filterType] - Optional EVENT_TYPES filter
   * @returns {Array<object>}
   */
  getTraces(filterType) {
    if (filterType) {
      return this.events.filter((e) => e.type === filterType).map((e) => ({ ...e }))
    }
    return this.events.map((e) => ({ ...e }))
  }

  /**
   * Alias for getTraces.
   */
  getEvents(filterType) {
    return this.getTraces(filterType)
  }

  /**
   * Clears all recorded events and resets the event counter.
   */
  clear() {
    this.events = []
    this.counter = 0
  }

  /**
   * Serializes recorded events to JSON array.
   *
   * @returns {Array<object>}
   */
  toJSON() {
    return this.getTraces()
  }

  /**
   * Loads serialized traces from an array, validating event structure.
   *
   * @param {Array<object>} jsonArray
   */
  fromJSON(jsonArray) {
    if (!Array.isArray(jsonArray)) {
      throw new Error("ERR_MALFORMED_TELEMETRY: Expected an array of events")
    }
    this.clear()
    for (const item of jsonArray) {
      if (!item || typeof item !== "object" || !item.type) {
        throw new Error("ERR_MALFORMED_TELEMETRY: Invalid event item in jsonArray")
      }
      if (item.type === EVENT_TYPES.API_CALL) {
        this.recordApiCall(item)
      } else if (item.type === EVENT_TYPES.BLOCKCHAIN_TX) {
        this.recordBlockchainTx(item)
      } else if (item.type === EVENT_TYPES.TOOL_OUTPUT) {
        this.recordToolOutput(item)
      } else {
        throw new Error(`ERR_MALFORMED_TELEMETRY: Unknown event type '${item.type}'`)
      }
    }
  }
}
