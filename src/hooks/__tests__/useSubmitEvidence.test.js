import test from "node:test"
import assert from "node:assert/strict"
import { formatContractError } from "../useSubmitEvidence.js"

test("useSubmitEvidence — formatContractError mapping", async (t) => {
  await t.test("returns null for null / undefined errors", () => {
    assert.equal(formatContractError(null), null)
    assert.equal(formatContractError(undefined), null)
  })

  await t.test("maps user rejected / denied signatures", () => {
    assert.equal(
      formatContractError({ message: "User rejected the request." }),
      "Transaction signature rejected in wallet."
    )
    assert.equal(
      formatContractError({ shortMessage: "User denied transaction signature" }),
      "Transaction signature rejected in wallet."
    )
  })

  await t.test("maps UnauthorizedRecipient contract revert", () => {
    assert.equal(
      formatContractError({ message: "execution reverted: UnauthorizedRecipient()" }),
      "Unauthorized: Only the designated counterparty recipient can submit evidence for this pact."
    )
  })

  await t.test("maps ZeroEvidenceHash contract revert", () => {
    assert.equal(
      formatContractError({ shortMessage: "ZeroEvidenceHash()" }),
      "Invalid evidence hash: Cannot submit a zero hash (0x0)."
    )
  })

  await t.test("maps InvalidPactState contract revert", () => {
    assert.equal(
      formatContractError({ message: "reverted with custom error InvalidPactState" }),
      "Invalid pact state: Evidence can only be submitted for a Funded pact."
    )
  })

  await t.test("maps DeadlinePassed contract revert", () => {
    assert.equal(
      formatContractError({ message: "reverted with DeadlinePassed()" }),
      "Pact deadline has passed. Evidence submission window is closed."
    )
  })

  await t.test("maps PactDoesNotExist contract revert", () => {
    assert.equal(
      formatContractError({ message: "PactDoesNotExist()" }),
      "Pact does not exist on-chain."
    )
  })

  await t.test("maps connector and chain mismatch errors", () => {
    assert.equal(
      formatContractError({ message: "connector not connected" }),
      "Wallet is not connected."
    )
    assert.equal(
      formatContractError({ message: "chain mismatch detected" }),
      "Please switch network to Monad Testnet."
    )
  })

  await t.test("falls back to details or truncated message", () => {
    assert.equal(
      formatContractError({ details: "RPC node timeout after 10000ms" }),
      "RPC node timeout after 10000ms"
    )
    assert.equal(
      formatContractError("Something unexpected happened\nMore info"),
      "Something unexpected happened"
    )
  })
})
