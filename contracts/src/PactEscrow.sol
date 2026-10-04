// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PactEscrow
 * @notice Native token escrow contract for PACTRA machine-verifiable agreements.
 */
contract PactEscrow {
    enum PactStatus {
        Created,
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
        PactStatus status;
        bytes32 evidenceHash;
    }

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
        if (deadline <= block.timestamp) revert InvalidDeadline();

        _pactIdCounter++;
        uint256 pactId = _pactIdCounter;

        _pacts[pactId] = Pact({
            id: pactId,
            creator: msg.sender,
            recipient: recipient,
            amount: msg.value,
            createdAt: block.timestamp,
            deadline: deadline,
            status: PactStatus.Funded,
            evidenceHash: bytes32(0)
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
        pact.status = PactStatus.Submitted;

        emit EvidenceSubmitted(pactId, msg.sender, evidenceHash);
    }

    /**
     * @notice Settles a pact and releases escrow funds to the recipient.
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
     * @notice Refunds escrow funds to the creator if the deadline has passed without settlement.
     * @param pactId ID of the pact to refund.
     */
    function refundPact(uint256 pactId) external nonReentrant {
        if (pactId == 0 || pactId > _pactIdCounter) revert PactDoesNotExist();

        Pact storage pact = _pacts[pactId];

        if (block.timestamp <= pact.deadline) revert DeadlineNotPassed();
        if (pact.status == PactStatus.Settled) revert PactAlreadySettled();
        if (pact.status == PactStatus.Refunded) revert PactAlreadyRefunded();
        if (pact.status != PactStatus.Funded && pact.status != PactStatus.Submitted) revert InvalidPactState();

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
