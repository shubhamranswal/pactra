/**
 * Validates Type B Criterion: Blockchain Transaction Verification.
 * Verifies on-chain transaction receipt recipient, amount in wei, success status, and deadline.
 *
 * @param {object} criterion - { criterionId, recipient, minimumAmountWei, chainId }
 * @param {object} evidenceItem - { txHash, receipt, tx }
 * @param {object} [options] - { publicClient, pactDeadline }
 * @returns {Promise<object>} Validation result
 */
export async function validateTypeB(criterion, evidenceItem, options = {}) {
  if (!criterion || !criterion.recipient || !criterion.minimumAmountWei) {
    return {
      passed: false,
      criterionId: criterion?.criterionId,
      type: "TYPE_B_TX_VERIFY",
      error: "Invalid Type B criterion parameters",
    }
  }

  if (!evidenceItem || !evidenceItem.txHash) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_B_TX_VERIFY",
      error: "Missing txHash in evidence item",
    }
  }

  const { publicClient, pactDeadline } = options
  let receipt = evidenceItem.receipt || null
  let tx = evidenceItem.tx || null

  // If public client is provided, query on-chain state
  if (publicClient && typeof publicClient.getTransactionReceipt === "function") {
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: evidenceItem.txHash })
      if (typeof publicClient.getTransaction === "function") {
        tx = await publicClient.getTransaction({ hash: evidenceItem.txHash })
      }
    } catch (err) {
      return {
        passed: false,
        criterionId: criterion.criterionId,
        type: "TYPE_B_TX_VERIFY",
        txHash: evidenceItem.txHash,
        error: `Failed to fetch on-chain transaction: ${err.message}`,
      }
    }
  }

  if (!receipt) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_B_TX_VERIFY",
      txHash: evidenceItem.txHash,
      error: "No transaction receipt found or provided",
    }
  }

  // 1. Status check
  const isSuccess = receipt.status === "success" || receipt.status === 1 || receipt.status === 1n
  if (!isSuccess) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_B_TX_VERIFY",
      txHash: evidenceItem.txHash,
      error: "Transaction status is reverted or not successful",
    }
  }

  // 2. Recipient check
  const targetRecipient = (tx?.to || receipt.to || evidenceItem.recipient || "").toLowerCase()
  const expectedRecipient = criterion.recipient.toLowerCase()
  if (targetRecipient !== expectedRecipient) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_B_TX_VERIFY",
      txHash: evidenceItem.txHash,
      actualRecipient: targetRecipient,
      expectedRecipient,
      error: `Recipient mismatch: expected ${expectedRecipient}, got ${targetRecipient}`,
    }
  }

  // 3. Amount check
  const actualValueWei = BigInt(tx?.value !== undefined ? tx.value : evidenceItem.valueWei || 0n)
  const minRequiredWei = BigInt(criterion.minimumAmountWei)
  if (actualValueWei < minRequiredWei) {
    return {
      passed: false,
      criterionId: criterion.criterionId,
      type: "TYPE_B_TX_VERIFY",
      txHash: evidenceItem.txHash,
      actualAmountWei: actualValueWei.toString(),
      minimumAmountWei: criterion.minimumAmountWei,
      error: `Amount insufficient: required ${minRequiredWei.toString()}, got ${actualValueWei.toString()}`,
    }
  }

  // 4. Deadline check (if deadline is available)
  if (pactDeadline && evidenceItem.blockTimestamp) {
    if (Number(evidenceItem.blockTimestamp) > Number(pactDeadline)) {
      return {
        passed: false,
        criterionId: criterion.criterionId,
        type: "TYPE_B_TX_VERIFY",
        txHash: evidenceItem.txHash,
        error: `Transaction confirmed after pact deadline: ${evidenceItem.blockTimestamp} > ${pactDeadline}`,
      }
    }
  }

  return {
    passed: true,
    criterionId: criterion.criterionId,
    type: "TYPE_B_TX_VERIFY",
    txHash: evidenceItem.txHash,
    actualRecipient: targetRecipient,
    actualAmountWei: actualValueWei.toString(),
    details: `Confirmed on-chain to ${targetRecipient} with amount ${actualValueWei.toString()} wei`,
  }
}
