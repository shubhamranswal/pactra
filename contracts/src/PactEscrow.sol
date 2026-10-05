// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PactEscrow
 * @notice Native token escrow contract for PACTRA machine-verifiable agreements (V2).
 * Supports autonomous AI verification attestation and automated escrow resolution.
 */
contract PactEscrow {
    enum PactStatus {
        Funded,
        Submitted,
        Settled,
        Refunded
    }

    enum VerificationResult {
        None,
        Approved,
        Rejected
    }

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
        VerificationResult verificationResult;
        bytes32 verificationHash;
    }

    // Constants
    uint256 public constant REVIEW_PERIOD = 3 days;
    uint256 public constant MAX_DURATION = 365 days;

    // Immutables & Config
    address public verifier;

    // Custom Errors
    error ZeroEscrowAmount();
    error InvalidRecipient();
    error SelfRecipientNotAllowed();
    error InvalidDeadline();
    error PactDoesNotExist();
    error UnauthorizedRecipient();
    error ZeroEvidenceHash();
    error InvalidPactState();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error UnauthorizedSettler();
    error EvidenceNotSubmitted();
    error PactAlreadySettled();
    error PactAlreadyRefunded();
    error ReviewPeriodActive();
    error TransferFailed();
    error ReentrancyGuardReentrant();
    error UnauthorizedVerifier();
    error InvalidVerifier();
    error VerificationAlreadySubmitted();
    error ZeroVerificationHash();

    // Events
    event PactCreated(
        uint256 indexed pactId, address indexed creator, address indexed recipient, uint256 amount, uint256 deadline
    );

    event EvidenceSubmitted(uint256 indexed pactId, address indexed recipient, bytes32 evidenceHash);

    event EvidenceVerified(uint256 indexed pactId, bool approved, bytes32 verificationHash);

    event PactSettled(uint256 indexed pactId, address indexed recipient, uint256 amount);

    event PactRefunded(uint256 indexed pactId, address indexed creator, uint256 amount);

    // State Variables
    uint256 private _pactIdCounter;
    mapping(uint256 => Pact) private _pacts;

    // Reentrancy Guard
    uint256 private _locked = 1;

    modifier nonReentrant() {
        if (_locked != 1) revert ReentrancyGuardReentrant();
        _locked = 2;
        _;
        _locked = 1;
    }

    /**
     * @notice Initializes the contract with an authorized verifier address.
     * @param _verifier Address authorized to submit machine verification verdicts.
     */
    constructor(address _verifier) {
        if (_verifier == address(0)) revert InvalidVerifier();
        verifier = _verifier;
    }

    /**
     * @notice Creates a new pact with native token escrow.
     * @param recipient Address of the party fulfilling the pact.
     * @param deadline Unix timestamp after which the pact expires.
     * @return pactId The unique ID of the created pact.
     */
    function createPact(address recipient, uint256 deadline) external payable returns (uint256) {
        if (msg.value == 0) revert ZeroEscrowAmount();
        if (recipient == address(0)) revert InvalidRecipient();
        if (recipient == msg.sender) revert SelfRecipientNotAllowed();
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_DURATION) revert InvalidDeadline();

        _pactIdCounter++;
        uint256 pactId = _pactIdCounter;

        _pacts[pactId] = Pact({
            id: pactId,
            creator: msg.sender,
            recipient: recipient,
            amount: msg.value,
            createdAt: block.timestamp,
            deadline: deadline,
            submittedAt: 0,
            status: PactStatus.Funded,
            evidenceHash: bytes32(0),
            verificationResult: VerificationResult.None,
            verificationHash: bytes32(0)
        });

        emit PactCreated(pactId, msg.sender, recipient, msg.value, deadline);

        return pactId;
    }

    /**
     * @notice Submits evidence hash for a funded pact before deadline.
     * @param pactId ID of the pact.
     * @param evidenceHash Cryptographic hash proving work or fulfillment.
     */
    function submitEvidence(uint256 pactId, bytes32 evidenceHash) external {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (msg.sender != pact.recipient) revert UnauthorizedRecipient();
        if (evidenceHash == bytes32(0)) revert ZeroEvidenceHash();
        if (pact.status != PactStatus.Funded) revert InvalidPactState();
        if (block.timestamp > pact.deadline) revert DeadlinePassed();

        pact.evidenceHash = evidenceHash;
        pact.submittedAt = block.timestamp;
        pact.status = PactStatus.Submitted;

        emit EvidenceSubmitted(pactId, msg.sender, evidenceHash);
    }

    /**
     * @notice Submits verification attestation by the authorized verifier.
     * Automatically resolves escrow:
     * - Approved: settles escrow funds directly to recipient.
     * - Rejected: refunds escrow funds directly to creator.
     * @param pactId ID of the pact to verify.
     * @param approved Boolean verdict: true for Approved, false for Rejected.
     * @param verificationHash Keccak-256 hash of the canonical verification verdict data.
     */
    function submitVerification(uint256 pactId, bool approved, bytes32 verificationHash) external nonReentrant {
        if (msg.sender != verifier) revert UnauthorizedVerifier();
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();
        if (verificationHash == bytes32(0)) revert ZeroVerificationHash();

        Pact storage pact = _pacts[pactId];

        if (pact.status != PactStatus.Submitted) revert InvalidPactState();
        if (pact.evidenceHash == bytes32(0)) revert EvidenceNotSubmitted();
        if (pact.verificationResult != VerificationResult.None) revert VerificationAlreadySubmitted();

        pact.verificationHash = verificationHash;
        uint256 amount = pact.amount;

        if (approved) {
            // Checks-Effects-Interactions
            pact.verificationResult = VerificationResult.Approved;
            pact.status = PactStatus.Settled;
            address recipient = pact.recipient;

            emit EvidenceVerified(pactId, true, verificationHash);
            emit PactSettled(pactId, recipient, amount);

            (bool success,) = recipient.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Checks-Effects-Interactions
            pact.verificationResult = VerificationResult.Rejected;
            pact.status = PactStatus.Refunded;
            address creator = pact.creator;

            emit EvidenceVerified(pactId, false, verificationHash);
            emit PactRefunded(pactId, creator, amount);

            (bool success,) = creator.call{value: amount}("");
            if (!success) revert TransferFailed();
        }
    }

    /**
     * @notice Settles a pact and releases escrow funds to the recipient (creator manual settlement).
     * @param pactId ID of the pact to settle.
     */
    function settlePact(uint256 pactId) external nonReentrant {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (msg.sender != pact.creator) revert UnauthorizedSettler();
        if (pact.status != PactStatus.Submitted) {
            if (pact.status == PactStatus.Settled) revert PactAlreadySettled();
            if (pact.status == PactStatus.Refunded) revert PactAlreadyRefunded();
            if (pact.status == PactStatus.Funded) revert EvidenceNotSubmitted();
            revert InvalidPactState();
        }

        uint256 amount = pact.amount;
        address recipient = pact.recipient;

        // Checks-Effects-Interactions
        pact.status = PactStatus.Settled;

        emit PactSettled(pactId, recipient, amount);

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Allows the recipient to claim escrow funds after the review period has elapsed without creator settlement.
     * @param pactId ID of the pact to claim.
     */
    function claimAfterReview(uint256 pactId) external nonReentrant {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (msg.sender != pact.recipient) revert UnauthorizedRecipient();
        if (pact.status != PactStatus.Submitted) {
            if (pact.status == PactStatus.Settled) revert PactAlreadySettled();
            if (pact.status == PactStatus.Refunded) revert PactAlreadyRefunded();
            revert InvalidPactState();
        }
        if (block.timestamp < pact.submittedAt + REVIEW_PERIOD) revert ReviewPeriodActive();

        uint256 amount = pact.amount;
        address recipient = pact.recipient;

        // Checks-Effects-Interactions
        pact.status = PactStatus.Settled;

        emit PactSettled(pactId, recipient, amount);

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Refunds escrow funds to the creator if the deadline has passed without evidence submission.
     * @param pactId ID of the pact to refund.
     */
    function refundPact(uint256 pactId) external nonReentrant {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (block.timestamp <= pact.deadline) revert DeadlineNotPassed();
        if (pact.status == PactStatus.Settled) revert PactAlreadySettled();
        if (pact.status == PactStatus.Refunded) revert PactAlreadyRefunded();
        if (pact.status != PactStatus.Funded) revert InvalidPactState();

        uint256 amount = pact.amount;
        address creator = pact.creator;

        // Checks-Effects-Interactions
        pact.status = PactStatus.Refunded;

        emit PactRefunded(pactId, creator, amount);

        (bool success,) = creator.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Fetches pact details by ID.
     * @param pactId ID of the pact.
     * @return Pact struct details.
     */
    function getPact(uint256 pactId) external view returns (Pact memory) {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();
        return _pacts[pactId];
    }

    /**
     * @notice Returns total number of pacts created.
     * @return Count of pacts.
     */
    function getPactCount() external view returns (uint256) {
        return _pactIdCounter;
    }
}
