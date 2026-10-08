/**
 * @file validateTypeB.js
 * @description Type B Deterministic Validator (Blockchain Transaction Verification on Monad).
 *
 * Implements Task 7.6.2 / P7-FR-009:
 * Queries the Monad Testnet node (or uses provided publicClient / telemetry data) to verify:
 * 1. Transaction receipt status is "success" (not reverted).
 * 2. Transaction recipient matches criterion.recipient.
 * 3. Transferred value meets or exceeds criterion.minimumAmountWei.
 * 4. (Optional) Sender matches executor.
 * 5. (Optional) Block timestamp is within pact deadline.
 */

import { isAddress } from "viem"
import { CRITERION_TYPES } from "../schema.js"

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/

/**
 * Deterministically validates an on-chain transaction against a Type B acceptance criterion.
 *
 * @param {object} criterion - The Type B criterion definition
 * @param {object} evidenceItem - The evidence item containing transaction telemetry
 * @param {object} [options] - Verification configuration
 * @param {object} [options.publicClient] - Optional viem publicClient for live RPC queries
 * @param {string} [options.executor] - Submitting executor address to verify tx.from
 * @param {number|bigint} [options.deadline] - Pact deadline timestamp in seconds
 * @param {boolean} [options.offline=false] - If true, evaluates cached telemetry without RPC query
 * @returns {Promise<object>} Validation result { criterionId, type, passed, status, txHash, summary, proof, errors }
 */
export async function validateTypeB(criterion, evidenceItem, options = {}) {
  const errors = []

  if (!criterion || typeof criterion !== "object") {
    return {
      criterionId: null,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      passed: false,
      status: "FAIL",
      txHash: null,
      summary: "Invalid criterion object provided to Type B validator.",
      proof: null,
      errors: ["Criterion must be an object."],
    }
  }

  const criterionId = criterion.id || null
  const expectedRecipient = criterion.recipient?.toLowerCase()
  const minimumAmountWei = criterion.minimumAmountWei
    ? BigInt(criterion.minimumAmountWei.toString())
    : 0n

  if (!expectedRecipient || !isAddress(expectedRecipient)) {
    errors.push("Type B criterion requires a valid 'recipient' address.")
  }

  if (!evidenceItem || typeof evidenceItem !== "object") {
    return {
      criterionId,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      passed: false,
      status: "FAIL",
      txHash: null,
      summary: "Missing evidence item for Type B criterion.",
      proof: null,
      errors: ["Evidence item must be an object."],
    }
  }

  const data = evidenceItem.data
  if (!data || typeof data !== "object") {
    return {
      criterionId,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      passed: false,
      status: "FAIL",
      txHash: null,
      summary: "Evidence item has no transaction data.",
      proof: null,
      errors: ["Evidence item data is missing or not an object."],
    }
  }

  const txHash = data.txHash
  if (!txHash || typeof txHash !== "string" || !TX_HASH_REGEX.test(txHash)) {
    return {
      criterionId,
      type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
      passed: false,
      status: "FAIL",
      txHash: txHash || null,
      summary: `Invalid transaction hash '${txHash}'. Must be a 66-character hex string.`,
      proof: null,
      errors: ["Invalid or missing txHash in evidence data."],
    }
  }

  let txFrom = data.from?.toLowerCase() || null
  let txTo = data.to?.toLowerCase() || null
  let txValue = data.value !== undefined ? BigInt(data.value.toString()) : 0n
  let txStatus = data.status || "success"
  let blockNumber = data.blockNumber ? Number(data.blockNumber) : null
  let blockTimestamp = data.timestamp ? Number(data.timestamp) : null

  // If a publicClient is provided and not strictly offline, query live on-chain state
  const client = options.publicClient
  if (client && !options.offline) {
    try {
      const [receipt, tx] = await Promise.all([
        client.getTransactionReceipt({ hash: txHash }),
        client.getTransaction({ hash: txHash }),
      ])

      if (!receipt) {
        errors.push(`Transaction receipt not found on-chain for hash '${txHash}'.`)
      } else {
        txStatus = receipt.status // "success" or "reverted"
        blockNumber = Number(receipt.blockNumber)
      }

      if (!tx) {
        errors.push(`Transaction details not found on-chain for hash '${txHash}'.`)
      } else {
        txFrom = tx.from?.toLowerCase() || txFrom
        txTo = tx.to?.toLowerCase() || txTo
        txValue = tx.value !== undefined ? BigInt(tx.value.toString()) : txValue
      }

      // If deadline check requested, query block timestamp
      if (options.deadline && receipt && blockNumber) {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(blockNumber) })
          if (block?.timestamp) {
            blockTimestamp = Number(block.timestamp)
          }
        } catch {
          // If block lookup fails, continue with receipt verification
        }
      }
    } catch (rpcErr) {
      errors.push(`RPC query error for '${txHash}': ${rpcErr.message || rpcErr}`)
    }
  }

  // Verification Rule 1: Status must be success
  if (txStatus !== "success") {
    errors.push(`ERR_TYPE_B_TX_REVERTED: Transaction '${txHash}' has status '${txStatus}'.`)
  }

  // Verification Rule 2: Recipient must match criterion.recipient
  if (expectedRecipient && txTo !== expectedRecipient) {
    errors.push(
      `ERR_TYPE_B_RECIPIENT_MISMATCH: Expected recipient '${expectedRecipient}', received '${txTo}'.`
    )
  }

  // Verification Rule 3: Transferred value must meet or exceed minimumAmountWei
  if (txValue < minimumAmountWei) {
    errors.push(
      `ERR_TYPE_B_AMOUNT_MISMATCH: Transferred value ${txValue.toString()} wei is less than required ${minimumAmountWei.toString()} wei.`
    )
  }

  // Verification Rule 4: Executor match (if provided)
  if (options.executor && txFrom) {
    const expectedExecutor = options.executor.toLowerCase()
    if (txFrom !== expectedExecutor) {
      errors.push(
        `ERR_TYPE_B_EXECUTOR_MISMATCH: Transaction sender '${txFrom}' does not match executor '${expectedExecutor}'.`
      )
    }
  }

  // Verification Rule 5: Deadline check (if provided and block timestamp known)
  if (options.deadline && blockTimestamp) {
    const deadlineNum = Number(options.deadline)
    if (blockTimestamp > deadlineNum) {
      errors.push(
        `ERR_TYPE_B_AFTER_DEADLINE: Transaction confirmed at ${blockTimestamp}, after pact deadline ${deadlineNum}.`
      )
    }
  }

  const passed = errors.length === 0

  const summary = passed
    ? `Transaction confirmed on Monad. Transferred ${txValue.toString()} wei to ${expectedRecipient}.`
    : `Verification failed: ${errors.join(" ")}`

  return {
    criterionId,
    type: CRITERION_TYPES.TYPE_B_TX_VERIFY,
    passed,
    status: passed ? "PASS" : "FAIL",
    txHash,
    summary,
    proof: {
      txHash,
      from: txFrom,
      to: txTo,
      amountWei: txValue.toString(),
      blockNumber,
      status: txStatus,
      timestamp: blockTimestamp,
    },
    errors,
  }
}
