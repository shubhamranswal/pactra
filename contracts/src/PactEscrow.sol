// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PactEscrow
 * @notice Native token escrow contract for PACTRA machine-verifiable agreements.
 */
contract PactEscrow {
    enum PactStatus {
        Funded,
        Submitted,
        Settled,
        Refunded
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
    }

    // Constants
    uint256 public constant REVIEW_PERIOD = 3 days;
    uint256 public constant MAX_DURATION = 365 days;

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

    // Events
    event PactCreated(
        uint256 indexed pactId, address indexed creator, address indexed recipient, uint256 amount, uint256 deadline
    );

    event EvidenceSubmitted(uint256 indexed pactId, address indexed recipient, bytes32 evidenceHash);

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
            evidenceHash: bytes32(0)
        });

        emit PactCreated(pactId, msg.sender, recipient, msg.value, deadline);

        return pactId;
    }

    /**
     * @notice Submits evidence hash for a funded pact before deadline and immediately releases escrow funds to the recipient.
     * @param pactId ID of the pact.
     * @param evidenceHash Cryptographic hash proving work or fulfillment.
     */
    function submitEvidence(uint256 pactId, bytes32 evidenceHash) external nonReentrant {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (msg.sender != pact.recipient && msg.sender != pact.creator) revert UnauthorizedRecipient();
        if (evidenceHash == bytes32(0)) revert ZeroEvidenceHash();
        if (pact.status != PactStatus.Funded) revert InvalidPactState();
        if (block.timestamp > pact.deadline) revert DeadlinePassed();

        pact.evidenceHash = evidenceHash;
        pact.submittedAt = block.timestamp;
        pact.status = PactStatus.Settled;

        uint256 amount = pact.amount;
        address recipient = pact.recipient;

        emit EvidenceSubmitted(pactId, msg.sender, evidenceHash);
        emit PactSettled(pactId, recipient, amount);

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Settles a pact and releases escrow funds to the recipient.
     * @param pactId ID of the pact to settle.
     */
    function settlePact(uint256 pactId) external nonReentrant {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (msg.sender != pact.creator && msg.sender != pact.recipient) revert UnauthorizedSettler();
        if (pact.status == PactStatus.Settled) revert PactAlreadySettled();
        if (pact.status == PactStatus.Refunded) revert PactAlreadyRefunded();
        if (pact.status != PactStatus.Funded && pact.status != PactStatus.Submitted) revert InvalidPactState();

        uint256 amount = pact.amount;
        address recipient = pact.recipient;

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
