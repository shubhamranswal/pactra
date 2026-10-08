import { createPublicClient, http, formatEther, keccak256, stringToBytes, isAddress, isHash } from "viem"
import { monadTestnet } from "viem/chains"
import PactEscrowAbi from "../../src/abi/PactEscrow.json" with { type: "json" }

const rpcUrl = process.env.VITE_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"
const contractAddress = process.env.VITE_PACT_ESCROW_ADDRESS || ""

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(rpcUrl),
})

/**
 * Normalizes an object into canonical JSON format (sorted keys) for deterministic hashing.
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalJsonStringify).join(",")}]`
  }
  const sortedKeys = Object.keys(obj).sort()
  const keyValues = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`
  )
  return `{${keyValues.join(",")}}`
}

/**
 * Computes deterministic Keccak-256 hash of a PaymentEvidence object.
 */
export function hashPaymentEvidence(evidenceObj) {
  const canonicalJson = canonicalJsonStringify(evidenceObj)
  return keccak256(stringToBytes(canonicalJson))
}

/**
 * Observes an on-chain MON transaction, compares against pact expected terms,
 * and generates deterministic check results & canonical evidence commitment.
 */
export async function observeAndVerifyPayment({ pactId, txHash }) {
  if (!pactId || isNaN(Number(pactId)) || Number(pactId) <= 0) {
    throw new Error("Invalid pact ID provided.")
  }
  if (!txHash || !isHash(txHash)) {
    throw new Error("Invalid transaction hash format. Must be 0x followed by 64 hex characters.")
  }

  const cleanPactId = BigInt(pactId)

  // 1. Read live pact details from contract or return error
  if (!contractAddress || !isAddress(contractAddress, { strict: false })) {
    throw new Error("Contract address VITE_PACT_ESCROW_ADDRESS is missing or invalid.")
  }

  let pact
  try {
    pact = await publicClient.readContract({
      address: contractAddress,
      abi: PactEscrowAbi,
      functionName: "getPact",
      args: [cleanPactId],
    })
  } catch (err) {
    throw new Error(`Pact #${pactId} not found on contract: ${err.message || "PactDoesNotExist"}`, { cause: err })
  }

  // 2. Fetch transaction, receipt, and block from Monad RPC
  let transaction
  try {
    transaction = await publicClient.getTransaction({ hash: txHash })
  } catch (err) {
    throw new Error(`Transaction ${txHash} not found on Monad Testnet: ${err.message}`, { cause: err })
  }

  if (!transaction) {
    throw new Error(`Transaction ${txHash} returned null from Monad RPC.`)
  }

  let receipt
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash })
  } catch (err) {
    throw new Error(`Transaction receipt for ${txHash} not found: ${err.message}`, { cause: err })
  }

  let block
  try {
    block = await publicClient.getBlock({ blockHash: transaction.blockHash })
  } catch {
    block = { timestamp: BigInt(Math.floor(Date.now() / 1000)) }
  }

  // Extract expected values from Pact
  const expectedSender = pact.creator.toLowerCase()
  const expectedRecipient = pact.recipient.toLowerCase()
  const expectedAmountWei = pact.amount
  const expectedAmountMON = formatEther(pact.amount)
  const expectedDeadline = pact.deadline

  // Extract actual values from Transaction & Receipt
  const actualSender = (transaction.from || "").toLowerCase()
  const actualRecipient = (transaction.to || "").toLowerCase()
  const actualAmountWei = transaction.value
  const actualAmountMON = formatEther(transaction.value)
  const actualStatus = receipt.status === "success" ? "SUCCESS" : "REVERTED"
  const actualBlockTimestamp = block.timestamp
  const actualChainId = transaction.chainId || monadTestnet.id

  // 3. Perform Deterministic Checks
  const chainMatch = Number(actualChainId) === monadTestnet.id
  const senderMatch = actualSender === expectedSender
  const recipientMatch = actualRecipient === expectedRecipient
  const tokenMatch = !transaction.input || transaction.input === "0x"
  const amountMatch = actualAmountWei === expectedAmountWei
  const transactionSuccess = receipt.status === "success"
  const deadlineMatch = actualBlockTimestamp <= expectedDeadline

  const allPassed =
    chainMatch &&
    senderMatch &&
    recipientMatch &&
    tokenMatch &&
    amountMatch &&
    transactionSuccess &&
    deadlineMatch

  const deterministicResult = {
    chainMatch,
    senderMatch,
    recipientMatch,
    tokenMatch,
    amountMatch,
    transactionSuccess,
    deadlineMatch,
    allPassed,
    expected: {
      sender: pact.creator,
      recipient: pact.recipient,
      amountWei: expectedAmountWei.toString(),
      amountMON: expectedAmountMON,
      token: "Native MON",
      deadline: expectedDeadline.toString(),
    },
    actual: {
      sender: transaction.from,
      recipient: transaction.to || "0x0000000000000000000000000000000000000000",
      amountWei: actualAmountWei.toString(),
      amountMON: actualAmountMON,
      token: tokenMatch ? "Native MON" : "Contract Input Call",
      status: actualStatus,
      blockNumber: receipt.blockNumber.toString(),
      blockTimestamp: actualBlockTimestamp.toString(),
      chainId: Number(actualChainId),
    },
  }

  // 4. Build Canonical PaymentEvidence Object
  const paymentEvidence = {
    pactId: Number(pactId),
    txHash,
    chainId: Number(actualChainId),
    sender: transaction.from,
    recipient: transaction.to || "0x0000000000000000000000000000000000000000",
    amountWei: actualAmountWei.toString(),
    amountMON: actualAmountMON,
    transactionStatus: actualStatus,
    blockNumber: receipt.blockNumber.toString(),
    blockTimestamp: actualBlockTimestamp.toString(),
    checks: {
      senderMatch,
      recipientMatch,
      amountMatch,
      tokenMatch,
      transactionSuccess,
      deadlineMatch,
    },
  }

  // 5. Generate Evidence Hash
  const evidenceHash = hashPaymentEvidence(paymentEvidence)

  return {
    pactId: Number(pactId),
    txHash,
    evidenceHash,
    paymentEvidence,
    deterministicResult,
  }
}
