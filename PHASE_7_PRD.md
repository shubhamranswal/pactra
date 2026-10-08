PROJECT: PACTRA  
PHASE: 7 — Execution, Evidence & Deterministic Verification  
BASELINE: Phase 5–6  
STATUS: PRD ONLY — NO IMPLEMENTATION  

---

# PACTRA — Phase 7 PRD: Execution, Evidence & Deterministic Verification

## 1. Executive Summary

### 1.1 Objective
Phase 7 advances the PACTRA protocol from a **payment-escrow container** (Phase 5–6) into a **machine-verifiable agreement and deterministic execution platform**. It establishes the standardized data models, execution recorder, cryptographic evidence manifest, and off-chain **Veridict** validation engine needed to prove whether counterparty agents fulfilled agreed machine-readable commitments before escrowed funds are released or disputed.

### 1.2 Why It Is Needed
Phase 5–6 delivered a robust on-chain foundation on Monad Testnet: funds lock in escrow, a raw 32-byte hash can be committed, and funds can be manually settled or refunded after a timeout. However:
- Agreements lack machine-readable acceptance criteria.
- The 32-byte `evidenceHash` is opaque and disconnected from the underlying execution.
- No automated or deterministic engine inspects whether the delivered work met the agreement terms.
- Without an objective evaluation layer, settlement remains reliant on human discretion or trust.

### 1.3 Unlocked Capabilities
Upon completion of Phase 7, PACTRA unlocks:
1. **Machine-Verifiable Pact Terms & Criteria**: Declarative definitions for Type A (execution counts), Type B (on-chain state/transactions), and Type C (cryptographic output hashes).
2. **Deterministic Execution Recording**: Standardized capturing of tool calls, API responses, and transaction receipts into a reproducible evidence manifest.
3. **Cryptographic Commitment**: Canonical serialization (RFC 8785) producing an immutable `keccak256` hash committed on-chain.
4. **Deterministic Veridict Engine**: Automated evaluation producing structured, binary `PASS` / `FAIL` verdicts without relying on non-deterministic LLM judgements for settlement.

---

## 2. Current System Baseline

Based directly on the architectural audit of the active codebase:

### 2.1 Smart Contract Layer
- **Contract**: `PactEscrow.sol` deployed on Monad Testnet (Chain ID `10143`) at `0x3d22Dc20a9Ff29Fd4EbbCD5B380e8d641eA577ce` (`contracts/broadcast/DeployPactEscrow.s.sol/10143/run-latest.json`).
- **State Enum**: `PactStatus { Funded (0), Submitted (1), Settled (2), Refunded (3) }`.
- **Pact Struct**: Contains `id`, `creator`, `recipient`, `amount`, `createdAt`, `deadline`, `submittedAt`, `status`, and `evidenceHash`.
- **Supported Operations**:
  - `createPact(recipient, deadline)` payable: locks native MON into escrow.
  - `submitEvidence(pactId, evidenceHash)`: recipient commits `bytes32`.
  - `settlePact(pactId)`: creator releases funds to recipient.
  - `claimAfterReview(pactId)`: recipient claims funds after a 3-day review period.
  - `refundPact(pactId)`: creator refunds funds if the deadline elapses without evidence submission.
- **Test Suite**: 43 passing Foundry tests in `contracts/test/PactEscrow.t.sol`.

### 2.2 Frontend Layer
- **Framework**: React 19 / Vite 8 / Tailwind CSS v4 / React Router 7.
- **Web3 Stack**: RainbowKit `^2.2.11`, wagmi `^2.19.5`, viem `^2.57.2`.
- **Config & ABI**: `src/config/contracts.js` and `src/contracts/pactEscrowAbi.js`.
- **Core Hooks**:
  - `useWallet.js`: Account & chain 10143 validation.
  - `useCreatePact.js`: On-chain creation, event parsing (`PactCreated`).
  - `usePact.js`: Reads on-chain pact state with numeric ID validation and RPC error isolation.
- **Pages**:
  - `CreateAgreement.jsx`: Form with client-side invariant preview and escrow initiation.
  - `PactDetails.jsx`: Displays live on-chain data, fallback error states, and local UI simulation toggles (`SimulationTestbed.jsx`).
  - `Dashboard.jsx`: Displays static mock pacts (`P-1020` to `P-1024`).

### 2.3 Off-Chain / Backend Layer
- **Current State**: None. No database, server, API routes, or execution logging services exist.

---

## 3. Problem Statement

While the current Phase 5–6 system allows agents to lock native tokens and submit an arbitrary 32-byte hash, it suffers from three critical bottlenecks:
1. **Terms and Acceptance Criteria Are Disconnected**: The contract records who created the pact and how much is escrowed, but has **zero awareness** of what work was commissioned, which APIs must be called, what addresses must receive secondary transactions, or what output must be produced.
2. **Evidence Is Unverifiable**: The existing `submitEvidence` function accepts any non-zero `bytes32`. There is no package manifest, no URI pointer to off-chain data, and no cryptographic verification that the hash matches an execution log.
3. **Settlement Relies on Trust or Blind Timeouts**: Once evidence is submitted, settlement depends entirely on the creator manually calling `settlePact` or the recipient waiting 3 days for `claimAfterReview`. There is no objective mechanism to evaluate whether the criteria were actually satisfied.

---

## 4. Phase 7 Goals

1. **Structured Agreement Specification**: Standardize a canonical JSON schema for Pact Terms and Machine-Verifiable Acceptance Criteria (Types A, B, and C).
2. **Canonical Criteria Commitment**: Generate deterministic hashes (`termsHash`, `criteriaHash`) committed during agreement creation.
3. **Execution Recording & Manifest Generation**: Build an off-chain Execution Recorder that captures API calls, blockchain receipts, and tool outputs into an immutable, canonically serialized Evidence Package.
4. **Cryptographic Proof Commitment**: Hash the Evidence Package using `keccak256(canonicalManifest)` and submit it on-chain via `submitEvidence`.
5. **Deterministic Veridict Validators**: Implement pure, deterministic validation functions for:
   - **Type A**: API invocation counts and HTTP status codes.
   - **Type B**: Monad on-chain transactions (sender, recipient, amount, block timestamp, receipt status).
   - **Type C**: Output payload canonical hash equivalence.
6. **Binary Verdict Generation**: Return a structured, reproducible `PASS` / `FAIL` evaluation result containing criteria-level proofs.
7. **Pact Details UI Integration**: Extend `src/pages/PactDetails.jsx` to display structured terms, criteria status, evidence inspection, and verification results, plus add interactive evidence submission and verification triggers.
8. **Preserve Baseline Security & Contracts**: Keep current deployment compatibility or provide an explicit, backward-compatible migration path.

---

## 5. Non-Goals

The following areas are strictly **out of scope** for Phase 7 and reserved for Phase 8:
- **Full Dispute Court & Arbitrators**: No multi-agent dispute jury, escrow slashing, or manual arbitration tribunals.
- **Final Dispute Resolution Execution**: Phase 7 stops at generating the deterministic `PASS` / `FAIL` verdict. Autonomous escrow disbursement or slashing based on dispute outcomes belongs to Phase 8.
- **Reputation Registry / Scoring**: No agent scoring, penalty tracking, or reputation updates.
- **ERC-8004 Registry Integration**: No on-chain agent identity registration contracts or tokenized validation requests.
- **Subjective AI / LLM Judging (Type D Criteria)**: The LLM will **not** be used as a judge for subjective criteria (e.g., "was this text creative?").
- **Decentralized Validator P2P Network**: Validation in Phase 7 is executed deterministically by the verifier runtime; no multi-node consensus network is built in this phase.

---

## 6. User & Agent Stories

### 6.1 Pact Creator (Agent A / Originator)
- **US-1**: *As a pact creator, I want to define machine-verifiable acceptance criteria (e.g., required API call counts, target on-chain transactions, or committed output hashes) when creating an agreement so that execution can be verified deterministically without subjective human review.*
- **US-2**: *As a pact creator, I want my agreement terms to be canonically hashed and bound to the escrow contract so that the recipient cannot alter the requirements after escrow is funded.*

### 6.2 Pact Recipient / Executor (Agent B / Service Agent)
- **US-3**: *As an executor agent, I want an execution recorder to track my tool calls and transaction receipts during task execution so that an immutable evidence manifest is automatically generated.*
- **US-4**: *As an executor agent, I want to submit my evidence package and commit its cryptographic hash on-chain so that my fulfillment of the agreement is provable and auditable.*

### 6.3 Verifier / Veridict Engine
- **US-5**: *As a protocol verifier, I want to evaluate an evidence manifest against predefined acceptance criteria using deterministic validation code so that the outcome is reproducible and immune to LLM hallucination or manipulation.*
- **US-6**: *As a verifier, I want to verify that the submitted evidence hash matches `keccak256(canonicalManifest)` before inspecting criteria.*

### 6.4 System & User Experience
- **US-7**: *As a user inspecting a pact on the frontend, I want to view the exact acceptance criteria, inspect the submitted evidence, and review the itemized Veridict validation breakdown directly on the Pact Details page.*

---

## 7. Functional Requirements

### 7.1 Pact Terms & Criteria Definition
- **P7-FR-001**: **Pact Terms Schema**
  - *Description*: The system shall define a canonical JSON schema for Pact Terms, containing `pactId`, `originator`, `executor`, `description`, `escrowAmount`, `token`, `timeoutSeconds`, and `criteria`.
  - *Input*: Agreement parameters from `src/pages/CreateAgreement.jsx`.
  - *Output*: Validated JSON object conforming to `PactTermsSchema`.
  - *Validation Rules*: All required fields present; `timeoutSeconds >= 60` and `<= 31536000`; valid EVM addresses.
  - *Error Cases*: `ERR_INVALID_TERMS_SCHEMA` if fields are missing or malformed.

- **P7-FR-002**: **Acceptance Criteria Specification**
  - *Description*: The system shall support three deterministic criteria types:
    - **Type A (Deterministic API Count)**: `{ type: "TYPE_A_API_COUNT", targetEndpoint: string, minimumCount: number }`.
    - **Type B (Blockchain Transaction)**: `{ type: "TYPE_B_TX_VERIFY", recipient: address, minimumAmountWei: string, chainId: 10143 }`.
    - **Type C (Cryptographic Hash Match)**: `{ type: "TYPE_C_HASH_MATCH", expectedHash: bytes32 }`.
  - *Input*: Criteria objects array in pact definition.
  - *Output*: Canonical criteria list with assigned sequential `criterionId` (1, 2, ...).
  - *Validation Rules*: Minimum 1 criterion; Type A count > 0; Type B valid address and amount; Type C valid 66-character hex (`0x` + 64 hex characters).
  - *Error Cases*: `ERR_UNSUPPORTED_CRITERION_TYPE`, `ERR_INVALID_CRITERION_PARAMS`.

- **P7-FR-003**: **Canonical Terms Hashing**
  - *Description*: The system shall compute `termsHash = keccak256(canonicalJson(pactTerms))` and `criteriaHash = keccak256(canonicalJson(criteriaList))` using RFC 8785 JSON Canonicalization Scheme (JCS).
  - *Input*: Terms JSON / Criteria JSON.
  - *Output*: `bytes32` hex strings.
  - *Validation Rules*: Deterministic key ordering and whitespace stripping.
  - *Error Cases*: `ERR_CANONICALIZATION_FAILED`.

### 7.2 Pact Acceptance & Lifecycle State
- **P7-FR-004**: **Extended Lifecycle State Tracking**
  - *Description*: The protocol shall support tracking runtime execution states: `CREATED` -> `FUNDED` -> `ACCEPTED` -> `EXECUTING` -> `SUBMITTED` -> `VERIFYING` -> `SETTLED` / `REFUNDED`.
  - *Input*: State transition events.
  - *Output*: Updated lifecycle status.
  - *Validation Rules*: State transitions must strictly follow permitted paths; cannot transition to `EXECUTING` without being `FUNDED`.
  - *Error Cases*: `ERR_INVALID_LIFECYCLE_TRANSITION`.

### 7.3 Execution Recording
- **P7-FR-005**: **Execution Trace Recorder**
  - *Description*: The system shall provide an execution recorder module to capture execution events:
    - API requests/responses (timestamp, URL, method, status code, response body hash).
    - Monad transaction receipts (txHash, from, to, value, blockNumber, status).
    - Tool execution outputs (toolName, inputHash, outputPayload).
  - *Input*: Raw execution telemetry.
  - *Output*: In-memory or persisted `ExecutionTrace[]`.
  - *Validation Rules*: Every recorded event must include an ISO 8601 UTC timestamp and unique event ID.
  - *Error Cases*: `ERR_RECORDING_OVERFLOW`, `ERR_MALFORMED_TELEMETRY`.

### 7.4 Evidence Packaging
- **P7-FR-006**: **Evidence Manifest Compiler**
  - *Description*: The system shall compile recorded traces into a structured `EvidencePackage` containing:
    ```json
    {
      "pactId": "1",
      "pactTermsHash": "0x...",
      "executor": "0x...",
      "timestamp": 1791112500,
      "items": [
        {
          "criterionId": 1,
          "type": "TYPE_A_API_COUNT",
          "data": { ... }
        }
      ]
    }
    ```
  - *Input*: `ExecutionTrace[]`, `pactTermsHash`.
  - *Output*: Complete `EvidencePackage` JSON.
  - *Validation Rules*: Must include evidence items referencing all criteria defined in the pact.
  - *Error Cases*: `ERR_MISSING_CRITERION_EVIDENCE`.

### 7.5 Cryptographic Evidence Commitment
- **P7-FR-007**: **Evidence Hashing & Commitment**
  - *Description*: The system shall compute `evidenceHash = keccak256(canonicalJson(EvidencePackage))` and submit it on-chain to `submitEvidence(pactId, evidenceHash)`.
  - *Input*: `EvidencePackage`.
  - *Output*: `bytes32` hash and on-chain transaction receipt.
  - *Validation Rules*: Transaction must be signed by `pact.recipient`; must occur before `pact.deadline`.
  - *Error Cases*: `ERR_EVIDENCE_HASH_MISMATCH`, `ERR_DEADLINE_PASSED`, `ERR_UNAUTHORIZED_SUBMITTER`.

### 7.6 Deterministic Veridict Validators
- **P7-FR-008**: **Type A Validator (API Execution Count)**
  - *Description*: Deterministically verifies that the count of successful HTTP calls (`status >= 200 && status < 300`) to `targetEndpoint` in the evidence package is `>= minimumCount`.
  - *Input*: Criterion specification, evidence item.
  - *Output*: `{ passed: boolean, actualCount: number, requiredCount: number }`.
  - *Validation Rules*: Only successful responses count; duplicate event IDs rejected.
  - *Error Cases*: `ERR_TYPE_A_INSUFFICIENT_CALLS`.

- **P7-FR-009**: **Type B Validator (Blockchain Transaction Verification)**
  - *Description*: Deterministically queries the Monad Testnet node (via viem `getTransactionReceipt` and `getTransaction`) to verify:
    1. `tx.from === executor`
    2. `tx.to.toLowerCase() === criterion.recipient.toLowerCase()`
    3. `tx.value >= BigInt(criterion.minimumAmountWei)`
    4. `receipt.status === "success"`
    5. `block.timestamp <= pact.deadline`
  - *Input*: Transaction hash from evidence, Monad RPC connection.
  - *Output*: `{ passed: boolean, txHash: string, blockNumber: number, confirmations: number }`.
  - *Validation Rules*: On-chain state must confirm inclusion; receipts with status `reverted` fail immediately.
  - *Error Cases*: `ERR_TYPE_B_TX_REVERTED`, `ERR_TYPE_B_AMOUNT_MISMATCH`, `ERR_TYPE_B_RECIPIENT_MISMATCH`, `ERR_TYPE_B_AFTER_DEADLINE`.

- **P7-FR-010**: **Type C Validator (Cryptographic Hash Equivalence)**
  - *Description*: Deterministically verifies that `keccak256(canonicalJson(evidence.outputPayload)) === criterion.expectedHash`.
  - *Input*: Output payload, expected `bytes32` hash.
  - *Output*: `{ passed: boolean, actualHash: string, expectedHash: string }`.
  - *Validation Rules*: Exact 32-byte equality.
  - *Error Cases*: `ERR_TYPE_C_HASH_MISMATCH`.

### 7.7 Veridict Verdict Generation
- **P7-FR-011**: **Aggregate Verdict Evaluation**
  - *Description*: The Veridict engine runs all validators for a pact. If **all** criteria pass, the overall verdict is `PASS`. If **any** criterion fails, the overall verdict is `FAIL`.
  - *Input*: Array of criterion validation results.
  - *Output*: Comprehensive `VeridictResult` JSON:
    ```json
    {
      "pactId": "1",
      "verdict": "PASS",
      "timestamp": 1791112600,
      "evidenceHash": "0x...",
      "criteriaResults": [
        {
          "criterionId": 1,
          "type": "TYPE_A_API_COUNT",
          "passed": true,
          "details": { ... }
        }
      ]
    }
    ```
  - *Validation Rules*: Binary outcome (`PASS` or `FAIL`); no intermediate scores.
  - *Error Cases*: `ERR_VERIDICT_INCOMPLETE_EVALUATION`.

### 7.8 UI Integration & Interactions
- **P7-FR-012**: **Interactive Evidence Submission UI**
  - *Description*: Add an "Submit Evidence" modal/panel on `src/pages/PactDetails.jsx` enabling the recipient wallet to upload/paste an evidence package, auto-calculate the `evidenceHash`, and submit it to `submitEvidence()` on-chain.
  - *Input*: User-selected evidence file or JSON payload.
  - *Output*: On-chain transaction invocation and real-time receipt notification.
  - *Validation Rules*: Visible and enabled only if connected wallet is `pact.recipient` and status is `Funded`.

- **P7-FR-013**: **Veridict Verification Inspector UI**
  - *Description*: Render a dedicated Veridict panel on `src/pages/PactDetails.jsx` displaying:
    - Overall status badge (`PASS` / `FAIL` / `AWAITING EVIDENCE`).
    - Itemized criteria breakdown with expandable proofs (API call count, tx explorer link, hash comparison).
    - "Run Veridict Verification" button to re-evaluate evidence in real time.

---

## 8. Technical Architecture

### 8.1 System Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Vite / React)                        │
│                                                                             │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ CreateAgreement.jsx   │  │ PactDetails.jsx      │  │ VeridictPanel    │  │
│  │ (Terms & Criteria UI) │  │ (Live Pact Inspector)│  │ (Proof Inspector)│  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│              │                         │                       │            │
│              ▼                         ▼                       ▼            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Hooks: useCreatePact, usePact, useSubmitEvidence, useVeridict         │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     OFF-CHAIN VERIDICT ENGINE        │  │     ON-CHAIN SMART CONTRACTS      │
│                                      │  │                                   │
│  ┌────────────────────────────────┐  │  │  PactEscrow.sol (Monad Testnet)   │
│  │ Execution Recorder & Telemetry │  │  │                                   │
│  └───────────────┬────────────────┘  │  │  - createPact{value}(...)         │
│                  ▼                   │  │  - submitEvidence(id, hash)       │
│  ┌────────────────────────────────┐  │  │  - settlePact(id)                 │
│  │ Canonical Manifest Serializer  │  │  │  - claimAfterReview(id)           │
│  │ (RFC 8785 -> keccak256 hash)   │  │  │  - refundPact(id)                 │
│  └───────────────┬────────────────┘  │  │  - getPact(id)                    │
│                  ▼                   │  │                                   │
│  ┌────────────────────────────────┐  │  │  [PactEscrowV2 Extension]:        │
│  │ Deterministic Validators       │  │  │  - termsHash                      │
│  │ - Type A (API Count)           │  │  │  - criteriaHash                   │
│  │ - Type B (Monad RPC Tx Query)  │  │  │  - evidenceURI                    │
│  │ - Type C (Hash Equivalence)    │  │  │                                   │
│  └───────────────┬────────────────┘  │  └─────────────────▲─────────────────┘
│                  ▼                   │                    │
│  ┌────────────────────────────────┐  │                    │
│  │ Structured Verdict: PASS/FAIL  │  │                    │
│  └────────────────────────────────┘  │                    │
└──────────────────────────────────────┘                    │
                   │                                        │
                   └────────────── commits hash ────────────┘
```

### 8.2 End-to-End Data Flow

```text
Phase 7 End-to-End Execution Flow:

1. Originator defines Pact Terms & 3 Criteria Types (A, B, C)
     │
2. Canonical JCS creates termsHash & criteriaHash
     │
3. Originator funds Escrow on Monad via createPact{value: X}()
     │
4. Executor begins task -> Execution Recorder tracks calls & receipts
     │
5. Task completes -> Evidence Package compiled
     │
6. Canonical JCS produces evidenceHash = keccak256(canonicalEvidence)
     │
7. Executor submits evidenceHash on-chain via submitEvidence()
     │
8. Veridict Engine fetches Evidence Package & executes deterministic validators:
     ├─ Type A Validator: verifies HTTP calls >= minimumCount
     ├─ Type B Validator: queries Monad RPC for transaction receipt & amount
     └─ Type C Validator: verifies keccak256(output) == expectedHash
     │
9. Engine compiles Verdict: ALL PASS -> PASS / ANY FAIL -> FAIL
     │
10. Pact Details UI displays Itemized Proofs & Verification Status
     │
11. [STOPS HERE — Ready for Phase 8 Autonomous Settlement / Dispute]
```

---

## 9. Smart Contract Requirements

### 9.1 Compatibility Strategy: Baseline vs. V2 Evolution
The existing contract `PactEscrow.sol` deployed at `0x3d22Dc20a9Ff29Fd4EbbCD5B380e8d641eA577ce` stores:
```solidity
struct Pact {
    uint256 id;
    address creator;
    address recipient;
    uint256 amount;
    uint256 createdAt;
    uint256 deadline;
    uint256 submittedAt;
    PactStatus status;
    bytes32 evidenceHash;
}
```
Notice that the existing contract **already supports committing `evidenceHash`** via `submitEvidence(uint256 pactId, bytes32 evidenceHash)`.

To achieve Phase 7 goals without breaking the existing deployment:
1. **Phase 7 Step 1 (Immediate Zero-Breaking Compatibility)**:
   - Use the deployed `PactEscrow` contract as-is.
   - Bind `termsHash` and `criteriaHash` in the off-chain Evidence Manifest.
   - Commit `evidenceHash = keccak256(canonicalPackage)` directly to the active contract.
2. **Phase 7 Step 2 (Contract Extension — `PactEscrowV2.sol`)**:
   - Provide an updated contract version extending `Pact` with:
     - `bytes32 termsHash`
     - `string evidenceURI`
   - Add function: `createPactWithTerms(address recipient, uint256 deadline, bytes32 termsHash) external payable returns (uint256)`
   - Add function: `submitEvidenceWithURI(uint256 pactId, bytes32 evidenceHash, string calldata evidenceURI) external`
   - Retain full backward-compatibility with all Phase 5–6 interfaces and custom errors.

---

## 10. Backend & Execution Recorder Requirements

### 10.1 Module Structure
Implemented in a dedicated modular directory within the project (`src/lib/veridict/`):
1. **`schema.js`**: Zod / JSON schemas for `PactTerms`, `AcceptanceCriteria`, `EvidencePackage`, and `VeridictResult`.
2. **`canonical.js`**: Deterministic RFC 8785 canonical JSON serializer and `keccak256` hashing.
3. **`recorder.js`**: `ExecutionRecorder` class with methods `recordApiCall()`, `recordBlockchainTx()`, and `recordToolOutput()`.
4. **`validators/`**:
   - `validateTypeA.js` (API count)
   - `validateTypeB.js` (Monad RPC transaction checker using viem public client)
   - `validateTypeC.js` (Hash equivalence)
5. **`engine.js`**: `VeridictEngine.verify(terms, evidencePackage)` coordinating validation.

### 10.2 Canonical Serialization Standard
All hashing uses **RFC 8785 JSON Canonicalization Scheme (JCS)**:
- Lexicographically sorted object keys.
- No whitespace between tokens (`:`, `,`).
- Deterministic UTF-8 encoding.
- Hashing: `viem.keccak256(stringToBytes(canonicalJsonString))`.

---

## 11. Veridict Architecture

### 11.1 Input Specification
The Veridict engine accepts:
1. `terms`: The `PactTerms` JSON object.
2. `evidence`: The `EvidencePackage` JSON object.
3. `options`: Configuration including `monadRpcUrl` and optional viem `publicClient`.

### 11.2 Processing Pipeline
```text
Step 1: Hash Validation
  Verify: keccak256(canonical(evidence)) == committedOnChainEvidenceHash
  Verify: evidence.pactTermsHash == keccak256(canonical(terms))

Step 2: Criteria Matching
  For each criterion in terms.criteria:
    Locate matching evidence item by criterionId

Step 3: Deterministic Validator Execution
  If TYPE_A: validateTypeA(criterion, evidenceItem)
  If TYPE_B: validateTypeB(criterion, evidenceItem, publicClient)
  If TYPE_C: validateTypeC(criterion, evidenceItem)

Step 4: Verdict Synthesis
  If any validator returns passed === false -> Verdict = "FAIL"
  If all validators return passed === true -> Verdict = "PASS"
```

### 11.3 Output Structure
```json
{
  "pactId": "1",
  "verdict": "PASS",
  "verifiedAt": 1791112650,
  "evidenceHash": "0x1234...abcd",
  "onChainCommitted": true,
  "criteria": [
    {
      "criterionId": 1,
      "type": "TYPE_A_API_COUNT",
      "status": "PASS",
      "summary": "5 of 5 required calls verified.",
      "proof": {
        "required": 5,
        "actual": 6,
        "endpoint": "https://api.pactra.network/v1/inference"
      }
    },
    {
      "criterionId": 2,
      "type": "TYPE_B_TX_VERIFY",
      "status": "PASS",
      "summary": "Transaction confirmed on Monad Testnet.",
      "proof": {
        "txHash": "0x456...789",
        "blockNumber": 68095123,
        "amountWei": "100000000000000000",
        "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      }
    },
    {
      "criterionId": 3,
      "type": "TYPE_C_HASH_MATCH",
      "status": "PASS",
      "summary": "Payload hash matches committed hash.",
      "proof": {
        "expectedHash": "0x89a...b01",
        "actualHash": "0x89a...b01"
      }
    }
  ]
}
```

---

## 12. Measurable Acceptance Criteria

Phase 7 is complete when all of the following criteria are met:
1. **Terms & Criteria Definition**: An agreement can be initialized with at least one Type A, Type B, and Type C criterion, generating canonical `termsHash` and `criteriaHash`.
2. **Execution Trace Capture**: The `ExecutionRecorder` correctly captures tool outputs, API calls, and transaction hashes into a structured manifest without data loss.
3. **Deterministic Hashing**: Calling `keccak256(canonicalJson(manifest))` produces identical 32-byte hashes across different JavaScript runtimes and platforms.
4. **On-Chain Commitment**: The calculated `evidenceHash` can be submitted via `submitEvidence()` to `PactEscrow` on Monad Testnet, transitioning status to `Submitted` (1).
5. **Type A Validator**: Correctly yields `PASS` when API count `>= minimumCount` and `FAIL` when `< minimumCount`.
6. **Type B Validator**: Correctly queries Monad Testnet for a transaction and yields `PASS` if sender, recipient, amount, and deadline match, and `FAIL` if any field differs or transaction reverted.
7. **Type C Validator**: Correctly yields `PASS` if output payload hash matches `expectedHash` and `FAIL` if mismatched.
8. **Binary Aggregate Verdict**: The Veridict engine produces an aggregate `PASS` or `FAIL` with itemized proofs.
9. **UI Evidence Submission**: A recipient user can paste or upload evidence and submit the transaction on `src/pages/PactDetails.jsx`.
10. **UI Verification Inspector**: `src/pages/PactDetails.jsx` displays real criteria, evidence hash, and Veridict pass/fail breakdown.
11. **Regression Prevention**: All 43 Foundry tests in `contracts/test/PactEscrow.t.sol` continue to pass.
12. **Build & Lint Cleanliness**: `npm run build` and `npm run lint` succeed with 0 errors.

---

## 13. UI Requirements

Rather than redesigning the frontend, Phase 7 extends existing pages:

### 13.1 `CreateAgreement.jsx` Updates
- Replace hardcoded invariant labels in `DEFAULT_INVARIANTS` with dynamic criterion builders:
  - Add Type A selector (Target Endpoint + Min Call Count).
  - Add Type B selector (Expected Monad Tx Recipient + Minimum MON).
  - Add Type C selector (Expected Output Hash).
- Display canonical `termsHash` preview in `src/components/create/EscrowPreviewCard.jsx`.

### 13.2 `PactDetails.jsx` Updates
- **Replace Mock Simulation**: Retain `SimulationTestbed.jsx` for demoing, but connect `InvariantsChecklist.jsx` to live Veridict criteria results when viewing on-chain pacts.
- **Add Evidence Submission Action**:
  - Add a **"Submit Execution Evidence"** button visible only to `pact.recipient` when `pact.status === 0` (Funded).
  - Opens a modal where the agent/user pastes the `EvidencePackage` JSON.
  - Automatically calculates `evidenceHash` and invokes `submitEvidence(pactId, evidenceHash)`.
- **Add Veridict Results Card**:
  - Displays the live verification verdict (`PASS` in emerald, `FAIL` in rose).
  - Lists each criterion with its individual validator status, actual vs. expected metrics, and links to Monad Explorer.

---

## 14. Error Cases & Handling

| Error Code | Trigger Condition | System Response |
|---|---|---|
| `ERR_TERMS_HASH_MISMATCH` | Evidence package references a `pactTermsHash` differing from pact's defined terms | Veridict fails immediately with `FAIL` verdict |
| `ERR_DEADLINE_PASSED` | Recipient attempts `submitEvidence()` after `pact.deadline` | Smart contract reverts with `DeadlinePassed()` |
| `ERR_ZERO_EVIDENCE_HASH` | Attempting to submit `bytes32(0)` | Smart contract reverts with `ZeroEvidenceHash()` |
| `ERR_UNAUTHORIZED_SUBMISSION` | Caller other than `pact.recipient` calls `submitEvidence` | Smart contract reverts with `UnauthorizedRecipient()` |
| `ERR_DUPLICATE_SUBMISSION` | Evidence submitted for a pact already in `Submitted` status | Smart contract reverts with `InvalidPactState()` |
| `ERR_TYPE_A_CALL_COUNT` | Actual verified API calls < required minimum calls | Type A validator returns `passed: false` |
| `ERR_TYPE_B_TX_NOT_FOUND` | Monad node has no record of txHash or tx is pending | Type B validator returns `passed: false` (Tx unconfirmed) |
| `ERR_TYPE_B_TX_MISMATCH` | Tx recipient != expected recipient or value < minimum amount | Type B validator returns `passed: false` with detail mismatch |
| `ERR_TYPE_C_HASH_MISMATCH` | `keccak256(canonicalOutput) != expectedHash` | Type C validator returns `passed: false` with actual vs. expected |
| `ERR_CANONICALIZATION` | Non-serializable values (circular references, BigInt without custom serializer) | Serializer rejects with explicit formatting error |

---

## 15. Security Requirements

1. **Deterministic Verification Only**: Under no circumstances shall an LLM/Gemini output determine the `PASS`/`FAIL` outcome of any criterion. Evaluation logic is strictly deterministic JavaScript/EVM code.
2. **Reentrancy Protection**: All state-modifying contract functions interacting with value transfers must enforce the established `nonReentrant` modifier.
3. **Checks-Effects-Interactions**: Any contract state updates must be committed prior to external asset calls.
4. **Zero-Address & Self-Recipient Rejection**: Retain active zero-address and sender-equality safeguards in contract and frontend.
5. **No Secret / Private Key Storage on Client**: Private keys are held only in user wallets (via RainbowKit/wagmi). No server keys or admin keys stored in frontend code.
6. **Canonical Serialization Integrity**: RFC 8785 prevents malleability attacks where an attacker adjusts whitespace or JSON key order to fake a valid evidence hash.

---

## 16. Testing Strategy

### 16.1 Smart Contract Tests (`contracts/test/`)
- Preserve all 43 existing tests in `contracts/test/PactEscrow.t.sol`.
- For `PactEscrowV2` (if upgrading), add tests for:
  - `createPactWithTerms`: verifies `termsHash` storage and event emission.
  - `submitEvidenceWithURI`: verifies `evidenceURI` storage and event emission.

### 16.2 Unit Tests (`src/test/veridict/`)
- `canonical.test.js`: Validates RFC 8785 deterministic ordering across nested JSON objects.
- `typeAValidator.test.js`: Tests exact count, under count, and mixed HTTP status codes.
- `typeBValidator.test.js`: Mocking viem public client to test confirmed tx, wrong recipient, under-amount, reverted tx, and timeout tx.
- `typeCValidator.test.js`: Tests exact keccak match, slight payload alterations, and casing discrepancies.
- `engine.test.js`: Tests full evaluation pipeline for:
  - Scenario 1: All criteria pass -> `PASS`.
  - Scenario 2: One criterion fails -> `FAIL`.
  - Scenario 3: Corrupt evidence hash -> `FAIL`.

### 16.3 Frontend Integration Tests
- Component rendering tests for `VeridictPanel` and `SubmitEvidenceModal`.
- Hook execution tests for `useSubmitEvidence`.

---

## 17. Task Breakdown

### Phase 7.1 — Pact Terms & Acceptance Criteria Schema

#### Task 7.1.1: Canonical Serialization & Hashing Utility
- **Objective**: Implement RFC 8785 JSON Canonicalization Scheme and `keccak256` hashing utility.
- **Files Affected**:
  - `src/lib/veridict/canonical.js` (New)
  - `src/lib/veridict/__tests__/canonical.test.js` (New)
- **Dependencies**: None.
- **Implementation Details**: Pure function `canonicalJson(obj)` that recursively sorts object keys and strips whitespace; pure function `hashCanonical(obj)` returning `viem.keccak256(stringToBytes(canonicalJson(obj)))`.
- **Acceptance Criteria**: Produces identical hash regardless of property key insertion order.
- **Tests**: Unit tests testing nested objects, arrays, special characters, and numeric types.
- **Definition of Done**: Tested and passing 100% test coverage.

#### Task 7.1.2: Pact Terms & Acceptance Criteria Schema Definition
- **Objective**: Define schemas for Pact Terms and Criteria Types A, B, and C.
- **Files Affected**:
  - `src/lib/veridict/schema.js` (New)
  - `src/lib/veridict/__tests__/schema.test.js` (New)
- **Dependencies**: Task 7.1.1.
- **Implementation Details**: Export validation schemas and TypeScript/JSDoc types for `PactTerms`, `CriterionTypeA`, `CriterionTypeB`, `CriterionTypeC`.
- **Acceptance Criteria**: Schema validator rejects invalid addresses, negative call counts, or unsupported types.
- **Tests**: Valid terms pass; missing fields or invalid types fail with descriptive errors.
- **Definition of Done**: Schema module exported and validated against test fixtures.

#### Task 7.1.3: Dynamic Criteria Builder UI in CreateAgreement
- **Objective**: Extend agreement creation form with dynamic criteria definition inputs.
- **Files Affected**:
  - `src/pages/CreateAgreement.jsx`
  - `src/components/create/InvariantsManager.jsx`
- **Dependencies**: Task 7.1.2.
- **Implementation Details**: Allow user to add Type A (API count), Type B (Tx verify), or Type C (hash match) criteria; compute live `termsHash` preview.
- **Acceptance Criteria**: User can configure criteria and see updated `termsHash` in the UI preview.
- **Tests**: Verify form state updates criteria array correctly.
- **Definition of Done**: UI renders cleanly without breaking layout; lint passes.

---

### Phase 7.2 — Pact Acceptance & Execution Lifecycle State

#### Task 7.2.1: Lifecycle State Model & Helper Definitions
- **Objective**: Formalize the expanded lifecycle state machine and status mapping in frontend utilities.
- **Files Affected**:
  - `src/hooks/usePact.js`
  - `src/lib/veridict/lifecycle.js` (New)
- **Dependencies**: Task 7.1.2.
- **Implementation Details**: Define lifecycle statuses (`FUNDED`, `ACCEPTED`, `EXECUTING`, `SUBMITTED`, `VERIFYING`, `SETTLED`, `REFUNDED`), state transition validation rules, and UI color/badge metadata.
- **Acceptance Criteria**: `canTransition(from, to)` helper correctly restricts illegal transitions.
- **Tests**: Unit tests for all valid and invalid state transitions.
- **Definition of Done**: Module integrated into `src/hooks/usePact.js`.

#### Task 7.2.2: Lifecycle Timeline UI Integration
- **Objective**: Update the 6-step lifecycle timeline component to reflect actual pact criteria and state.
- **Files Affected**:
  - `src/components/details/LifecycleTimeline.jsx`
- **Dependencies**: Task 7.2.1.
- **Implementation Details**: Map on-chain status and evidence existence to timeline steps. If status is `Submitted`, highlight verification step.
- **Acceptance Criteria**: Component accurately displays progress based on live pact properties.
- **Tests**: Visual inspection of timeline in all lifecycle states.
- **Definition of Done**: Tested across `Funded`, `Submitted`, `Settled`, and `Refunded` states.

---

### Phase 7.3 — Execution Recorder

#### Task 7.3.1: Execution Recorder Core Module
- **Objective**: Implement the off-chain `ExecutionRecorder` to collect agent tool calls and network interactions.
- **Files Affected**:
  - `src/lib/veridict/recorder.js` (New)
  - `src/lib/veridict/__tests__/recorder.test.js` (New)
- **Dependencies**: Task 7.1.1.
- **Implementation Details**: Class storing recorded events in an array; methods `recordApiCall(url, method, status, responseData)`, `recordTx(txHash, from, to, value)`, and `recordOutput(payload)`; method `getTraces()`.
- **Acceptance Criteria**: Traces capture timestamps, normalize parameters, and prevent circular references.
- **Tests**: Unit tests verifying event recording and serialization.
- **Definition of Done**: Recorder exports events in structured schema format.

---

### Phase 7.4 — Evidence Package & Manifest

#### Task 7.4.1: Evidence Manifest Compiler
- **Objective**: Implement compiler taking recorded traces and building a structured `EvidencePackage`.
- **Files Affected**:
  - `src/lib/veridict/manifest.js` (New)
  - `src/lib/veridict/__tests__/manifest.test.js` (New)
- **Dependencies**: Tasks 7.1.2, 7.3.1.
- **Implementation Details**: Match recorded traces against pact criteria; format evidence items with `criterionId`; include `pactId` and `pactTermsHash`.
- **Acceptance Criteria**: Compiles clean `EvidencePackage` conforming to `EvidencePackageSchema`.
- **Tests**: Tests ensuring missing criteria produce explicit compilation warnings.
- **Definition of Done**: Compiler generates valid test manifests.

---

### Phase 7.5 — Cryptographic Evidence Commitment

#### Task 7.5.1: `useSubmitEvidence` Hook Implementation
- **Objective**: Create a React hook to handle on-chain evidence submission via wagmi/viem.
- **Files Affected**:
  - `src/hooks/useSubmitEvidence.js` (New)
- **Dependencies**: Task 7.1.1.
- **Implementation Details**: Encapsulate `writeContractAsync` calling `submitEvidence(pactId, evidenceHash)` on `PactEscrow`; track pending, confirming, receipt, and error states; handle wallet rejections.
- **Acceptance Criteria**: Submits hash, awaits receipt, and returns transaction hash.
- **Tests**: Mock write contract test verifying parameters passed.
- **Definition of Done**: Hook ready for component consumption.

#### Task 7.5.2: Evidence Submission Modal in PactDetails
- **Objective**: Build the modal UI for counterparty agents to submit evidence packages.
- **Files Affected**:
  - `src/components/details/SubmitEvidenceModal.jsx` (New)
  - `src/pages/PactDetails.jsx`
- **Dependencies**: Task 7.5.1.
- **Implementation Details**: Modal providing JSON input / file upload; computes `evidenceHash` in real time using Task 7.1.1; triggers `useSubmitEvidence`; refetches pact data on success.
- **Acceptance Criteria**: User can paste package, see hash match, and submit transaction via wallet.
- **Tests**: Manual test submitting sample evidence to local/testnet contract.
- **Definition of Done**: Modal opens from PactDetails and successfully commits hash.

---

### Phase 7.6 — Deterministic Veridict Validators

#### Task 7.6.1: Type A Deterministic Validator (API Execution Count)
- **Objective**: Implement validator for Type A criteria.
- **Files Affected**:
  - `src/lib/veridict/validators/validateTypeA.js` (New)
  - `src/lib/veridict/validators/__tests__/validateTypeA.test.js` (New)
- **Dependencies**: Task 7.1.2.
- **Implementation Details**: Count valid HTTP calls (`status >= 200 && status < 300`) to matching `targetEndpoint`; return `{ passed: count >= minimumCount, actualCount: count, requiredCount: minimumCount }`.
- **Acceptance Criteria**: Pure, deterministic function; rejects duplicate event IDs.
- **Tests**: Test pass, fail, status 500 exclusion, wrong endpoint exclusion.
- **Definition of Done**: 100% unit test pass rate.

#### Task 7.6.2: Type B Deterministic Validator (Blockchain Transaction)
- **Objective**: Implement validator for Type B criteria querying Monad Testnet.
- **Files Affected**:
  - `src/lib/veridict/validators/validateTypeB.js` (New)
  - `src/lib/veridict/validators/__tests__/validateTypeB.test.js` (New)
- **Dependencies**: Task 7.1.2.
- **Implementation Details**: Use viem `publicClient` to fetch receipt and transaction; verify recipient, amount in wei, success status, and block timestamp before deadline.
- **Acceptance Criteria**: Accurately verifies on-chain transaction data.
- **Tests**: Mock viem tests for success, wrong recipient, insufficient amount, reverted status, and post-deadline block.
- **Definition of Done**: Passes all test scenarios.

#### Task 7.6.3: Type C Deterministic Validator (Cryptographic Hash Match)
- **Objective**: Implement validator for Type C criteria.
- **Files Affected**:
  - `src/lib/veridict/validators/validateTypeC.js` (New)
  - `src/lib/veridict/validators/__tests__/validateTypeC.test.js` (New)
- **Dependencies**: Tasks 7.1.1, 7.1.2.
- **Implementation Details**: Calculate `keccak256(canonicalJson(outputData))` and compare with `expectedHash`.
- **Acceptance Criteria**: Strict 32-byte equality check.
- **Tests**: Passes with exact matching output; fails with any mutation.
- **Definition of Done**: 100% unit test pass rate.

---

### Phase 7.7 — Veridict Result Engine

#### Task 7.7.1: Veridict Engine Orchestrator
- **Objective**: Implement the aggregate Veridict verification runner.
- **Files Affected**:
  - `src/lib/veridict/engine.js` (New)
  - `src/lib/veridict/__tests__/engine.test.js` (New)
- **Dependencies**: Tasks 7.6.1, 7.6.2, 7.6.3.
- **Implementation Details**: `VeridictEngine.evaluate(terms, evidencePackage, publicClient)` running validators across all criteria; produces structured `VeridictResult` (`verdict: "PASS" | "FAIL"`).
- **Acceptance Criteria**: Returns `PASS` only if all criteria pass; returns `FAIL` with itemized failure details if any criterion fails.
- **Tests**: Integration tests for all-pass, partial-fail, and corrupted evidence packages.
- **Definition of Done**: Passes all end-to-end evaluation tests.

---

### Phase 7.8 — Frontend Pact Details UI Integration

#### Task 7.8.1: `VeridictPanel` Component
- **Objective**: Build the verification evaluation panel for Pact Details.
- **Files Affected**:
  - `src/components/details/VeridictPanel.jsx` (New)
  - `src/pages/PactDetails.jsx`
- **Dependencies**: Task 7.7.1.
- **Implementation Details**: Displays Veridict status badge (`PASS` / `FAIL` / `AWAITING EVIDENCE`), itemized criteria checklist with expandable proof metrics, and a "Run Veridict Check" action.
- **Acceptance Criteria**: Accurately reflects verification result with clear visual indicators.
- **Tests**: Test render in verifying, pass, and fail states.
- **Definition of Done**: Component integrated smoothly into the `src/pages/PactDetails.jsx` grid.

#### Task 7.8.2: Replace Invariant Simulation with Live Criterion Verifiers
- **Objective**: Connect `InvariantsChecklist.jsx` to live Veridict criterion evaluations.
- **Files Affected**:
  - `src/components/details/InvariantsChecklist.jsx`
- **Dependencies**: Task 7.8.1.
- **Implementation Details**: When inspecting a live pact, render actual agreement criteria rather than static mock items, while preserving demo mode simulation toggles for demo views.
- **Acceptance Criteria**: Live pact displays real criteria status; demo pact preserves simulation buttons.
- **Tests**: Verify switching between live pact and demo simulation mode.
- **Definition of Done**: Fully functional on live and demo pact views.

---

### Phase 7.9 — Testing, Security & Integration Validation

#### Task 7.9.1: End-to-End Test Suite for Veridict Pipeline
- **Objective**: Build automated E2E test verifying full flow: Pact Creation -> Recording -> Manifest -> Hash -> Validation -> Result.
- **Files Affected**:
  - `src/lib/veridict/__tests__/e2e.test.js` (New)
- **Dependencies**: All Phase 7 tasks.
- **Implementation Details**: End-to-end integration test creating terms, recording traces, generating manifest, calculating hash, and verifying via Veridict engine for both PASS and FAIL scenarios.
- **Acceptance Criteria**: Both PASS and FAIL paths run without unexpected exceptions.
- **Tests**: Automated test suite execution.
- **Definition of Done**: E2E test passes cleanly.

#### Task 7.9.2: Regression Audit & Production Build Verification
- **Objective**: Verify that existing smart contracts, frontend build, and lint checks remain completely intact.
- **Files Affected**: Full project workspace.
- **Dependencies**: Task 7.9.1.
- **Implementation Details**: Execute `npm run lint` and `npm run build`; verify zero warnings/errors; verify all 43 tests in `contracts/test/PactEscrow.t.sol` remain compatible.
- **Acceptance Criteria**: `npm run build` succeeds; `npm run lint` exits with code 0.
- **Definition of Done**: Clean build and test confirmation documented.

---

## 18. Dependency Graph

```text
7.1.1 (Canonical Hashing)
  ├──> 7.1.2 (Schema Definition)
  │      ├──> 7.1.3 (Create UI Form)
  │      ├──> 7.2.1 (Lifecycle Model) ──> 7.2.2 (Lifecycle Timeline UI)
  │      ├──> 7.4.1 (Manifest Compiler)
  │      ├──> 7.6.1 (Type A Validator) ──┐
  │      ├──> 7.6.2 (Type B Validator) ──┼──> 7.7.1 (Veridict Engine)
  │      └──> 7.6.3 (Type C Validator) ──┘        │
  │                                               ├──> 7.8.1 (Veridict Panel UI)
  │                                               └──> 7.8.2 (Invariants Checklist Update)
  ├──> 7.3.1 (Execution Recorder) ────────> 7.4.1 ─┘
  └──> 7.5.1 (useSubmitEvidence Hook) ────> 7.5.2 (Submit Evidence Modal UI)
                                                  │
                                                  ▼
                                       7.9.1 (E2E Test Suite)
                                                  │
                                                  ▼
                                       7.9.2 (Regression & Build Audit)
```

### Parallel Work Streams
- **Stream 1 (Data & Off-Chain Engine)**: Tasks 7.1.1 -> 7.1.2 -> 7.3.1 -> 7.4.1 -> 7.6.1/7.6.2/7.6.3 -> 7.7.1 can proceed in parallel with UI tasks.
- **Stream 2 (Frontend & Contract Hooks)**: Tasks 7.1.3, 7.2.2, 7.5.1, and 7.5.2 can be developed alongside the validator modules.
- **Synchronization Point**: Task 7.8.1 joins the Veridict Engine with the UI.

---

## 19. Recommended Implementation Order

1. **Step 1: Canonical Serialization & Hashing** (Task 7.1.1) — Absolute mathematical prerequisite.
2. **Step 2: Schemas & Criteria Definitions** (Task 7.1.2) — Contract for all data structures.
3. **Step 3: Execution Recorder & Manifest Compiler** (Tasks 7.3.1, 7.4.1) — Enables evidence capture.
4. **Step 4: Deterministic Validators** (Tasks 7.6.1, 7.6.2, 7.6.3) — Core verification logic.
5. **Step 5: Veridict Engine Orchestrator** (Task 7.7.1) — Synthesizes binary PASS/FAIL.
6. **Step 6: On-Chain Evidence Submission Hook & Modal** (Tasks 7.5.1, 7.5.2) — Links off-chain hash to Monad contract.
7. **Step 7: Frontend Lifecycle & Criteria Creation** (Tasks 7.1.3, 7.2.1, 7.2.2) — Allows creating structured pacts.
8. **Step 8: Veridict UI Integration in PactDetails** (Tasks 7.8.1, 7.8.2) — Exposes verification and proofs in UI.
9. **Step 9: Testing & Regression Auditing** (Tasks 7.9.1, 7.9.2) — End-to-end verification and build validation.

---

## 20. Definition of Done (Phase 7)

Phase 7 is officially complete when:
- [x] Canonical serialization (RFC 8785) and `keccak256` hashing produce reproducible hashes.
- [x] Schemas for Pact Terms and Criteria Types A, B, and C are implemented with schema validation.
- [x] The `ExecutionRecorder` captures trace events into a validated `EvidencePackage`.
- [x] Counterparty agents can submit an `evidenceHash` directly from `src/pages/PactDetails.jsx` via `submitEvidence()` on Monad Testnet.
- [x] Pure deterministic validators verify Type A (API calls), Type B (Monad transactions), and Type C (hash match) criteria.
- [x] The Veridict engine produces an aggregate binary `PASS` or `FAIL` with itemized proofs.
- [x] `src/pages/PactDetails.jsx` renders the live Veridict inspection card and criterion checklist.
- [x] Automated E2E tests pass for both PASS and FAIL execution flows.
- [x] `npm run build` and `npm run lint` pass with 0 errors.
- [x] Existing 43 Foundry contract tests in `contracts/test/PactEscrow.t.sol` continue to pass.

---

## 21. Phase 8 Boundary

To prevent scope creep, the following capabilities are **explicitly deferred to Phase 8**:
1. **Automated Settlement / Slashing Execution**: Phase 7 evaluates and displays the `PASS`/`FAIL` verdict. Triggering automated contract payouts or escrow slashing based on the Veridict result belongs to Phase 8.
2. **Dispute Filing & Court Arbitration**: Raising formal challenges, locking funds in dispute escrow, multi-agent dispute arbitration, and verdict appeals.
3. **Subjective Criteria Evaluation (Type D)**: Non-deterministic qualitative criteria review.
4. **Agent Reputation Registry & Slashing**: ERC-8004 feedback and reputation score adjustments based on contract outcomes.
5. **Decentralized Validator Quorum**: Running multi-validator BFT consensus over Veridict execution traces.

---

### PHASE 7 TASK CHECKLIST

- [x] **7.1.1** Implement RFC 8785 canonical serialization & `keccak256` hashing utility
- [x] **7.1.2** Define Pact Terms & Acceptance Criteria schemas (Types A, B, C)
- [x] **7.1.3** Build dynamic criteria definition inputs in `CreateAgreement.jsx`
- [x] **7.2.1** Define formal lifecycle state transition rules & status mappings
- [x] **7.2.2** Update `LifecycleTimeline.jsx` to reflect dynamic on-chain criteria states
- [x] **7.3.1** Implement core `ExecutionRecorder` module for capturing telemetry traces
- [x] **7.4.1** Implement `EvidencePackage` compiler & manifest generator
- [x] **7.5.1** Create `useSubmitEvidence` wagmi/viem hook for on-chain commitment
- [x] **7.5.2** Build `SubmitEvidenceModal` on `PactDetails.jsx` for recipient commitment
- [x] **7.6.1** Implement Type A deterministic validator (API call count)
- [x] **7.6.2** Implement Type B deterministic validator (Monad RPC transaction verification)
- [x] **7.6.3** Implement Type C deterministic validator (Cryptographic hash equivalence)
- [x] **7.7.1** Implement `VeridictEngine` orchestrator returning aggregate `PASS`/`FAIL`
- [x] **7.8.1** Build `VeridictPanel` UI component for displaying live verification proofs
- [x] **7.8.2** Connect `InvariantsChecklist.jsx` to live criteria evaluations on `PactDetails`
- [x] **7.9.1** Build and verify automated E2E test suite for Veridict pipeline
- [x] **7.9.2** Run regression audit verifying 0 lint errors, clean build, and 43 Foundry tests passing

