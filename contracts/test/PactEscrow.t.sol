// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PactEscrow} from "../src/PactEscrow.sol";

contract PactEscrowTest is Test {
    PactEscrow public escrow;

    address public creator = address(0x1111);
    address public recipient = address(0x2222);
    address public stranger = address(0x3333);

    uint256 public constant INITIAL_BALANCE = 100 ether;
    uint256 public constant ESCROW_AMOUNT = 5 ether;
    uint256 public deadline;
    bytes32 public constant SAMPLE_EVIDENCE = keccak256("DELIVERY_PROOF_1024");

    // Event declarations for testing event emissions
    event PactCreated(
        uint256 indexed pactId, address indexed creator, address indexed recipient, uint256 amount, uint256 deadline
    );
    event EvidenceSubmitted(uint256 indexed pactId, address indexed recipient, bytes32 evidenceHash);
    event PactSettled(uint256 indexed pactId, address indexed recipient, uint256 amount);
    event PactRefunded(uint256 indexed pactId, address indexed creator, uint256 amount);

    function setUp() public {
        escrow = new PactEscrow();
        deadline = block.timestamp + 1 days;

        vm.deal(creator, INITIAL_BALANCE);
        vm.deal(recipient, INITIAL_BALANCE);
        vm.deal(stranger, INITIAL_BALANCE);
    }

    // 1. Successful pact creation
    function test_CreatePact_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        assertEq(pactId, 1);
        assertEq(escrow.getPactCount(), 1);
    }

    // 2. Zero escrow reverts
    function test_CreatePact_RevertIf_ZeroEscrowAmount() public {
        vm.prank(creator);
        vm.expectRevert(PactEscrow.ZeroEscrowAmount.selector);
        escrow.createPact{value: 0}(recipient, deadline);
    }

    // 3. Zero recipient reverts
    function test_CreatePact_RevertIf_ZeroRecipient() public {
        vm.prank(creator);
        vm.expectRevert(PactEscrow.InvalidRecipient.selector);
        escrow.createPact{value: ESCROW_AMOUNT}(address(0), deadline);
    }

    // 4. Self-recipient reverts
    function test_CreatePact_RevertIf_SelfRecipient() public {
        vm.prank(creator);
        vm.expectRevert(PactEscrow.SelfRecipientNotAllowed.selector);
        escrow.createPact{value: ESCROW_AMOUNT}(creator, deadline);
    }

    // 5. Invalid deadline reverts
    function test_CreatePact_RevertIf_InvalidDeadline() public {
        vm.startPrank(creator);
        vm.expectRevert(PactEscrow.InvalidDeadline.selector);
        escrow.createPact{value: ESCROW_AMOUNT}(recipient, block.timestamp);

        vm.expectRevert(PactEscrow.InvalidDeadline.selector);
        escrow.createPact{value: ESCROW_AMOUNT}(recipient, block.timestamp - 1);
        vm.stopPrank();
    }

    // 6. MAX_DURATION rejection
    function test_CreatePact_RevertIf_ExceedsMaxDuration() public {
        vm.prank(creator);
        uint256 tooFarDeadline = block.timestamp + escrow.MAX_DURATION() + 1 seconds;
        vm.expectRevert(PactEscrow.InvalidDeadline.selector);
        escrow.createPact{value: ESCROW_AMOUNT}(recipient, tooFarDeadline);
    }

    // 7. Exact deadline boundaries
    function test_CreatePact_ExactDeadlineBoundaries() public {
        vm.startPrank(creator);
        uint256 maxValidDeadline = block.timestamp + escrow.MAX_DURATION();
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, maxValidDeadline);
        assertEq(escrow.getPact(pactId).deadline, maxValidDeadline);

        vm.expectRevert(PactEscrow.InvalidDeadline.selector);
        escrow.createPact{value: ESCROW_AMOUNT}(recipient, maxValidDeadline + 1);
        vm.stopPrank();
    }

    // 8. Unique pact IDs
    function test_CreatePact_UniquePactIds() public {
        vm.startPrank(creator);
        uint256 id1 = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);
        uint256 id2 = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);
        vm.stopPrank();

        assertTrue(id1 != id2);
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    // 9. Pact data stored correctly
    function test_CreatePact_DataStoredCorrectly() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(pact.id, pactId);
        assertEq(pact.creator, creator);
        assertEq(pact.recipient, recipient);
        assertEq(pact.amount, ESCROW_AMOUNT);
        assertEq(pact.deadline, deadline);
        assertEq(pact.submittedAt, 0);
        assertEq(uint8(pact.status), uint8(PactEscrow.PactStatus.Funded));
        assertEq(pact.evidenceHash, bytes32(0));
    }

    // 10. Correct escrow balance
    function test_CreatePact_CorrectEscrowBalance() public {
        assertEq(address(escrow).balance, 0);

        vm.prank(creator);
        escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        assertEq(address(escrow).balance, ESCROW_AMOUNT);
    }

    // 11. Successful evidence submission
    function test_SubmitEvidence_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(pact.evidenceHash, SAMPLE_EVIDENCE);
        assertEq(uint8(pact.status), uint8(PactEscrow.PactStatus.Submitted));
    }

    // 12. submittedAt stored correctly
    function test_SubmitEvidence_SubmittedAtStoredCorrectly() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        uint256 submitTime = block.timestamp + 100;
        vm.warp(submitTime);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(pact.submittedAt, submitTime);
    }

    // 13. Unauthorized evidence submission
    function test_SubmitEvidence_RevertIf_UnauthorizedRecipient() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(stranger);
        vm.expectRevert(PactEscrow.UnauthorizedRecipient.selector);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);
    }

    // 14. Creator cannot submit evidence
    function test_SubmitEvidence_RevertIf_CreatorAttemptsSubmit() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.UnauthorizedRecipient.selector);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);
    }

    // 15. Zero evidence hash
    function test_SubmitEvidence_RevertIf_ZeroEvidenceHash() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.ZeroEvidenceHash.selector);
        escrow.submitEvidence(pactId, bytes32(0));
    }

    // 16. Duplicate evidence submission
    function test_SubmitEvidence_RevertIf_DuplicateEvidence() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.startPrank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);
        vm.stopPrank();
    }

    // 17. Evidence after deadline
    function test_SubmitEvidence_RevertIf_AfterDeadline() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.DeadlinePassed.selector);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);
    }

    // 18. Invalid pact ID for submitEvidence
    function test_SubmitEvidence_RevertIf_InvalidPactId() public {
        vm.startPrank(recipient);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.submitEvidence(0, SAMPLE_EVIDENCE);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.submitEvidence(999, SAMPLE_EVIDENCE);
        vm.stopPrank();
    }

    // 19. Successful settlement
    function test_SettlePact_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(creator);
        escrow.settlePact(pactId);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(uint8(pact.status), uint8(PactEscrow.PactStatus.Settled));
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
    }

    // 20. Settle after deadline while Submitted succeeds
    function test_SettlePact_AfterDeadlineWhileSubmittedSucceeds() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(deadline + 10 days);

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(creator);
        escrow.settlePact(pactId);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(uint8(pact.status), uint8(PactEscrow.PactStatus.Settled));
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
    }

    // 21. Unauthorized settlement
    function test_SettlePact_RevertIf_UnauthorizedSettler() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(stranger);
        vm.expectRevert(PactEscrow.UnauthorizedSettler.selector);
        escrow.settlePact(pactId);
    }

    // 22. Recipient cannot settle
    function test_SettlePact_RevertIf_RecipientAttemptsSettle() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.UnauthorizedSettler.selector);
        escrow.settlePact(pactId);
    }

    // 23. Settlement without evidence
    function test_SettlePact_RevertIf_EvidenceNotSubmitted() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.EvidenceNotSubmitted.selector);
        escrow.settlePact(pactId);
    }

    // 24. Double settlement
    function test_SettlePact_RevertIf_DoubleSettlement() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.startPrank(creator);
        escrow.settlePact(pactId);

        vm.expectRevert(PactEscrow.PactAlreadySettled.selector);
        escrow.settlePact(pactId);
        vm.stopPrank();
    }

    // 25. Invalid pact ID for settlePact
    function test_SettlePact_RevertIf_InvalidPactId() public {
        vm.startPrank(creator);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.settlePact(0);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.settlePact(999);
        vm.stopPrank();
    }

    // 26. Recipient claim after review succeeds
    function test_ClaimAfterReview_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(block.timestamp + escrow.REVIEW_PERIOD());

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(recipient);
        escrow.claimAfterReview(pactId);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(uint8(pact.status), uint8(PactEscrow.PactStatus.Settled));
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
    }

    // 27. Claim before review reverts
    function test_ClaimAfterReview_RevertIf_BeforeReviewPeriod() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(block.timestamp + escrow.REVIEW_PERIOD() - 1 seconds);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.ReviewPeriodActive.selector);
        escrow.claimAfterReview(pactId);
    }

    // 28. Unauthorized claim reverts
    function test_ClaimAfterReview_RevertIf_UnauthorizedRecipient() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(block.timestamp + escrow.REVIEW_PERIOD());

        vm.prank(stranger);
        vm.expectRevert(PactEscrow.UnauthorizedRecipient.selector);
        escrow.claimAfterReview(pactId);
    }

    // 29. Claim if not Submitted reverts
    function test_ClaimAfterReview_RevertIf_InvalidPactState() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(block.timestamp + escrow.REVIEW_PERIOD());

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.claimAfterReview(pactId);
    }

    // 30. Invalid pact ID for claimAfterReview
    function test_ClaimAfterReview_RevertIf_InvalidPactId() public {
        vm.startPrank(recipient);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.claimAfterReview(0);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.claimAfterReview(999);
        vm.stopPrank();
    }

    // 31. Successful refund after deadline (Funded status)
    function test_RefundPact_Success_AfterDeadline() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1);

        uint256 creatorBalBefore = creator.balance;

        escrow.refundPact(pactId);

        PactEscrow.Pact memory pact = escrow.getPact(pactId);
        assertEq(uint8(pact.status), uint8(PactEscrow.PactStatus.Refunded));
        assertEq(creator.balance, creatorBalBefore + ESCROW_AMOUNT);
    }

    // 32. Refund after submitted evidence reverts (Submitted status)
    function test_RefundPact_RevertIf_SubmittedEvidence() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(deadline + 1);

        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.refundPact(pactId);
    }

    // 33. Refund before deadline
    function test_RefundPact_RevertIf_BeforeDeadline() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.expectRevert(PactEscrow.DeadlineNotPassed.selector);
        escrow.refundPact(pactId);
    }

    // 34. Double refund
    function test_RefundPact_RevertIf_DoubleRefund() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1);

        escrow.refundPact(pactId);

        vm.expectRevert(PactEscrow.PactAlreadyRefunded.selector);
        escrow.refundPact(pactId);
    }

    // 35. Refund after settlement
    function test_RefundPact_RevertIf_AfterSettlement() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(creator);
        escrow.settlePact(pactId);

        vm.warp(deadline + 1);

        vm.expectRevert(PactEscrow.PactAlreadySettled.selector);
        escrow.refundPact(pactId);
    }

    // 36. Settlement after refund
    function test_SettlePact_RevertIf_AfterRefund() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1);
        escrow.refundPact(pactId);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.PactAlreadyRefunded.selector);
        escrow.settlePact(pactId);
    }

    // 37. Invalid pact ID for refundPact
    function test_RefundPact_RevertIf_InvalidPactId() public {
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.refundPact(0);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.refundPact(999);
    }

    // 38. Events emitted correctly
    function test_Events_EmittedCorrectly() public {
        vm.startPrank(creator);
        vm.expectEmit(true, true, true, true);
        emit PactCreated(1, creator, recipient, ESCROW_AMOUNT, deadline);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);
        vm.stopPrank();

        vm.startPrank(recipient);
        vm.expectEmit(true, true, true, true);
        emit EvidenceSubmitted(pactId, recipient, SAMPLE_EVIDENCE);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);
        vm.stopPrank();

        vm.startPrank(creator);
        vm.expectEmit(true, true, true, true);
        emit PactSettled(pactId, recipient, ESCROW_AMOUNT);
        escrow.settlePact(pactId);
        vm.stopPrank();

        uint256 pactId2 = 0;
        vm.startPrank(creator);
        pactId2 = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);
        vm.stopPrank();

        vm.warp(deadline + 1);
        vm.expectEmit(true, true, true, true);
        emit PactRefunded(pactId2, creator, ESCROW_AMOUNT);
        escrow.refundPact(pactId2);
    }

    // 39. Recipient contract rejecting ETH
    function test_RecipientContract_RejectEth_RevertsTransferFailed() public {
        RejectEthRecipient rejectingContract = new RejectEthRecipient();

        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(address(rejectingContract), deadline);

        vm.prank(address(rejectingContract));
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.TransferFailed.selector);
        escrow.settlePact(pactId);
    }

    // 40. Basic reentrancy attack attempt
    function test_ReentrancyGuard_PreventsAttack() public {
        ReentrantAttacker attacker = new ReentrantAttacker(escrow);
        vm.deal(address(attacker), INITIAL_BALANCE);

        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(address(attacker), deadline);

        vm.prank(address(attacker));
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        attacker.setAttackParams(pactId, ReentrantAttacker.ActionType.Settle);

        // Creator attempts to settle. The transfer to attacker triggers receive() which re-enters settlePact.
        // The reentrancy fails, causing TransferFailed revert or ReentrancyGuardReentrant revert.
        vm.prank(creator);
        vm.expectRevert();
        escrow.settlePact(pactId);
    }

    // 41. GetPact invalid pact ID
    function test_GetPact_RevertIf_InvalidPactId() public {
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.getPact(0);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.getPact(999);
    }

    // 42. Funds transferred correctly
    function test_FundsTransferredCorrectly() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        uint256 contractBalBefore = address(escrow).balance;
        uint256 recipientBalBefore = recipient.balance;

        vm.prank(creator);
        escrow.settlePact(pactId);

        assertEq(address(escrow).balance, contractBalBefore - ESCROW_AMOUNT);
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
    }

    // 43. Contract balance accounting
    function test_ContractBalanceAccounting() public {
        vm.startPrank(creator);
        uint256 id1 = escrow.createPact{value: 10 ether}(recipient, deadline);
        uint256 id2 = escrow.createPact{value: 20 ether}(recipient, deadline);
        vm.stopPrank();

        assertEq(address(escrow).balance, 30 ether);

        vm.prank(recipient);
        escrow.submitEvidence(id1, SAMPLE_EVIDENCE);

        vm.prank(creator);
        escrow.settlePact(id1);

        assertEq(address(escrow).balance, 20 ether);

        vm.warp(deadline + 1);
        escrow.refundPact(id2);

        assertEq(address(escrow).balance, 0 ether);
    }
}

contract RejectEthRecipient {
    receive() external payable {
        revert("NO_ETH");
    }
}

contract ReentrantAttacker {
    PactEscrow public targetEscrow;
    uint256 public pactIdToReenter;
    enum ActionType {
        Settle,
        Claim,
        Refund
    }
    ActionType public action;
    bool public attackAttempted;

    constructor(PactEscrow _escrow) {
        targetEscrow = _escrow;
    }

    function setAttackParams(uint256 _pactId, ActionType _action) external {
        pactIdToReenter = _pactId;
        action = _action;
        attackAttempted = false;
    }

    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;
            if (action == ActionType.Settle) {
                targetEscrow.settlePact(pactIdToReenter);
            } else if (action == ActionType.Claim) {
                targetEscrow.claimAfterReview(pactIdToReenter);
            } else if (action == ActionType.Refund) {
                targetEscrow.refundPact(pactIdToReenter);
            }
        }
    }
}
