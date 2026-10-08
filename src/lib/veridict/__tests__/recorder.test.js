import test from "node:test"
import assert from "node:assert/strict"
import { ExecutionRecorder, EVENT_TYPES } from "../recorder.js"
import { hashCanonical } from "../canonical.js"

test("ExecutionRecorder — Basic Initialization & Lifecycle", async (t) => {
  await t.test("initializes with empty event array and default size 0", () => {
    const recorder = new ExecutionRecorder()
    assert.equal(recorder.size, 0)
    assert.deepEqual(recorder.getTraces(), [])
  })

  await t.test("clears recorded traces correctly", () => {
    const recorder = new ExecutionRecorder()
    recorder.recordApiCall({ url: "https://api.pactra.network/test", method: "GET", status: 200 })
    assert.equal(recorder.size, 1)
    recorder.clear()
    assert.equal(recorder.size, 0)
    assert.deepEqual(recorder.getTraces(), [])
  })

  await t.test("enforces maxEvents overflow limit", () => {
    const recorder = new ExecutionRecorder({ maxEvents: 2 })
    recorder.recordApiCall({ url: "https://api.example.com/1", status: 200 })
    recorder.recordApiCall({ url: "https://api.example.com/2", status: 200 })
    assert.equal(recorder.size, 2)
    assert.throws(
      () => recorder.recordApiCall({ url: "https://api.example.com/3", status: 200 }),
      /ERR_RECORDING_OVERFLOW/
    )
  })
})

test("ExecutionRecorder — recordApiCall", async (t) => {
  await t.test("records API call with object argument and computes hash", () => {
    const recorder = new ExecutionRecorder()
    const responseData = { result: "ok", count: 42 }
    const event = recorder.recordApiCall({
      url: "https://api.weather.org/data",
      method: "post",
      status: 201,
      responseData,
    })

    assert.equal(event.type, EVENT_TYPES.API_CALL)
    assert.equal(event.url, "https://api.weather.org/data")
    assert.equal(event.method, "POST")
    assert.equal(event.status, 201)
    assert.equal(event.responseBodyHash, hashCanonical(responseData))
    assert.ok(event.id.startsWith("evt_api_"))
    assert.ok(typeof event.timestamp === "string")
  })

  await t.test("records API call with positional arguments", () => {
    const recorder = new ExecutionRecorder()
    const event = recorder.recordApiCall("https://api.test.org/check", "GET", 200)
    assert.equal(event.url, "https://api.test.org/check")
    assert.equal(event.method, "GET")
    assert.equal(event.status, 200)
  })

  await t.test("rejects invalid URL or status code", () => {
    const recorder = new ExecutionRecorder()
    assert.throws(
      () => recorder.recordApiCall({ url: "", status: 200 }),
      /ERR_MALFORMED_TELEMETRY.*url/
    )
    assert.throws(
      () => recorder.recordApiCall({ url: "https://valid.com", status: 999 }),
      /ERR_MALFORMED_TELEMETRY.*status/
    )
  })
})

test("ExecutionRecorder — recordBlockchainTx", async (t) => {
  const validTxHash = "0x" + "a".repeat(64)
  const validFrom = "0x" + "1".repeat(40)
  const validTo = "0x" + "2".repeat(40)

  await t.test("records transaction and normalizes parameters", () => {
    const recorder = new ExecutionRecorder()
    const event = recorder.recordBlockchainTx({
      txHash: validTxHash,
      from: validFrom,
      to: validTo,
      value: "1000000000000000000",
      blockNumber: 12345,
      status: "success",
    })

    assert.equal(event.type, EVENT_TYPES.BLOCKCHAIN_TX)
    assert.equal(event.txHash, validTxHash.toLowerCase())
    assert.equal(event.from, validFrom.toLowerCase())
    assert.equal(event.to, validTo.toLowerCase())
    assert.equal(event.value, "1000000000000000000")
    assert.equal(event.blockNumber, 12345)
    assert.equal(event.chainId, 10143) // Monad testnet default
    assert.equal(event.status, "success")
  })

  await t.test("recordTx alias works identically", () => {
    const recorder = new ExecutionRecorder()
    const event = recorder.recordTx(validTxHash, validFrom, validTo, "500")
    assert.equal(event.type, EVENT_TYPES.BLOCKCHAIN_TX)
    assert.equal(event.value, "500")
  })

  await t.test("rejects malformed txHash or addresses", () => {
    const recorder = new ExecutionRecorder()
    assert.throws(
      () => recorder.recordBlockchainTx({ txHash: "0x123", from: validFrom }),
      /ERR_MALFORMED_TELEMETRY.*txHash/
    )
    assert.throws(
      () => recorder.recordBlockchainTx({ txHash: validTxHash, from: "invalid_address" }),
      /ERR_MALFORMED_TELEMETRY.*from/
    )
  })
})

test("ExecutionRecorder — recordToolOutput", async (t) => {
  await t.test("records tool output and computes outputHash", () => {
    const recorder = new ExecutionRecorder()
    const payload = { model: "claude-3-5-sonnet", tokens: 1500 }
    const event = recorder.recordToolOutput({
      toolName: "llm_generate",
      payload,
    })

    assert.equal(event.type, EVENT_TYPES.TOOL_OUTPUT)
    assert.equal(event.toolName, "llm_generate")
    assert.equal(event.outputHash, hashCanonical(payload))
  })

  await t.test("recordOutput alias works with positional arguments", () => {
    const recorder = new ExecutionRecorder()
    const payload = { result: 100 }
    const event = recorder.recordOutput("calculator", payload)
    assert.equal(event.toolName, "calculator")
    assert.equal(event.outputHash, hashCanonical(payload))
  })

  await t.test("rejects missing toolName or missing payload", () => {
    const recorder = new ExecutionRecorder()
    assert.throws(
      () => recorder.recordToolOutput({ toolName: "" }),
      /ERR_MALFORMED_TELEMETRY.*toolName/
    )
    assert.throws(
      () => recorder.recordToolOutput({ toolName: "compute" }),
      /ERR_MALFORMED_TELEMETRY.*payload/
    )
  })
})

test("ExecutionRecorder — Filtering & JSON Serialization", async (t) => {
  const validTxHash = "0x" + "b".repeat(64)
  const validFrom = "0x" + "3".repeat(40)

  await t.test("filters traces by event type", () => {
    const recorder = new ExecutionRecorder()
    recorder.recordApiCall({ url: "https://api.pactra.network/1", status: 200 })
    recorder.recordBlockchainTx({ txHash: validTxHash, from: validFrom })
    recorder.recordToolOutput({ toolName: "tool1", payload: "data" })

    assert.equal(recorder.getTraces().length, 3)
    assert.equal(recorder.getTraces(EVENT_TYPES.API_CALL).length, 1)
    assert.equal(recorder.getTraces(EVENT_TYPES.BLOCKCHAIN_TX).length, 1)
    assert.equal(recorder.getTraces(EVENT_TYPES.TOOL_OUTPUT).length, 1)
  })

  await t.test("toJSON and fromJSON preserve event traces", () => {
    const recorder = new ExecutionRecorder()
    recorder.recordApiCall({ url: "https://api.pactra.network/v1", status: 200 })
    recorder.recordBlockchainTx({ txHash: validTxHash, from: validFrom })

    const exported = recorder.toJSON()
    const restoredRecorder = new ExecutionRecorder()
    restoredRecorder.fromJSON(exported)

    assert.equal(restoredRecorder.size, 2)
    assert.equal(restoredRecorder.getTraces()[0].url, "https://api.pactra.network/v1")
    assert.equal(restoredRecorder.getTraces()[1].txHash, validTxHash.toLowerCase())
  })
})
