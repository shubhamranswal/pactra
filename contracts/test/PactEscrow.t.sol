// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PactEscrow} from "../src/PactEscrow.sol";

contract PactEscrowTest is Test {
    PactEscrow public escrow;

    address public creator = address(0x1111);
    address public recipient = address(0x2222);
    address public stranger = address(0x3333);
    address public verifier = address(0x4444);

    uint256 public constant INITIAL_BALANCE = 100 ether;
    uint256 public constant ESCROW_AMOUNT = 5 ether;
    uint256 public deadline;
    bytes32 public constant SAMPLE_EVIDENCE = keccak256("DELIVERY_PROOF_1024");
    bytes32 public constant SAMPLE_VERIFICATION = keccak256("AI_VERIFICATION_CANONICAL_HASH_1024");

    // Event declarations for testing event emissions
    event PactCreated(
        uint256 indexed pactId, address indexed creator, address indexed recipient, uint256 amount, uint256 deadline
    );
    event EvidenceSubmitted(uint256 indexed pactId, address indexed recipient, bytes32 evidenceHash);
    event EvidenceVerified(uint256 indexed pactId, bool approved, bytes32 verificationHash);
    event PactSettled(uint256 indexed pactId, address indexed recipient, uint256 amount);
    event PactRefunded(uint256 indexed pactId, address indexed creator, uint256 amount);

    function setUp() public {
        escrow = new PactEscrow(verifier);
        deadline = block.timestamp + 1 days;

        vm.deal(creator, INITIAL_BALANCE);
        vm.deal(recipient, INITIAL_BALANCE);
        vm.deal(stranger, INITIAL_BALANCE);
        vm.deal(verifier, INITIAL_BALANCE);
    }

    // 0. Constructor verification
    function test_Constructor_ConfiguresVerifier() public view {
        assertEq(escrow.verifier(), verifier);
    }

    function test_Constructor_RevertIf_ZeroVerifier() public {
        vm.expectRevert(PactEscrow.InvalidVerifier.selector);
        new PactEscrow(address(0));
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
        uint256 id3 = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertEq(escrow.getPactCount(), 3);
    }

    // 9. Data stored correctly
    function test_CreatePact_DataStoredCorrectly() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(p.id, pactId);
        assertEq(p.creator, creator);
        assertEq(p.recipient, recipient);
        assertEq(p.amount, ESCROW_AMOUNT);
        assertEq(p.createdAt, block.timestamp);
        assertEq(p.deadline, deadline);
        assertEq(p.submittedAt, 0);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Funded));
        assertEq(p.evidenceHash, bytes32(0));
        assertEq(uint256(p.verificationResult), uint256(PactEscrow.VerificationResult.None));
        assertEq(p.verificationHash, bytes32(0));
    }

    // 10. Correct escrow balance
    function test_CreatePact_CorrectEscrowBalance() public {
        vm.prank(creator);
        escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        assertEq(address(escrow).balance, ESCROW_AMOUNT);
        assertEq(creator.balance, INITIAL_BALANCE - ESCROW_AMOUNT);
    }

    // 11. Submit evidence success
    function test_SubmitEvidence_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Submitted));
        assertEq(p.evidenceHash, SAMPLE_EVIDENCE);
        assertEq(p.submittedAt, block.timestamp);
    }

    // 12. Submit evidence submittedAt stored correctly
    function test_SubmitEvidence_SubmittedAtStoredCorrectly() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(block.timestamp + 500);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(p.submittedAt, block.timestamp);
    }

    // 13. Unauthorized recipient cannot submit evidence
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

    // 15. Zero evidence hash reverts
    function test_SubmitEvidence_RevertIf_ZeroEvidenceHash() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.ZeroEvidenceHash.selector);
        escrow.submitEvidence(pactId, bytes32(0));
    }

    // 16. Evidence after deadline reverts
    function test_SubmitEvidence_RevertIf_AfterDeadline() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1 seconds);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.DeadlinePassed.selector);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);
    }

    // 17. Duplicate evidence submission reverts
    function test_SubmitEvidence_RevertIf_DuplicateEvidence() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.submitEvidence(pactId, keccak256("NEW_EVIDENCE"));
    }

    // 18. Invalid pact ID on evidence submit reverts
    function test_SubmitEvidence_RevertIf_InvalidPactId() public {
        vm.prank(recipient);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.submitEvidence(999, SAMPLE_EVIDENCE);
    }

    // 19. Creator settle pact success
    function test_SettlePact_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(creator);
        escrow.settlePact(pactId);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Settled));
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    // 20. Settle pact after deadline while submitted succeeds
    function test_SettlePact_AfterDeadlineWhileSubmittedSucceeds() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(deadline + 10 days);

        vm.prank(creator);
        escrow.settlePact(pactId);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Settled));
    }

    // 21. Unauthorized settler reverts
    function test_SettlePact_RevertIf_UnauthorizedSettler() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(stranger);
        vm.expectRevert(PactEscrow.UnauthorizedSettler.selector);
        escrow.settlePact(pactId);
    }

    // 22. Recipient cannot settle pact
    function test_SettlePact_RevertIf_RecipientAttemptsSettle() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.UnauthorizedSettler.selector);
        escrow.settlePact(pactId);
    }

    // 23. Settle without evidence reverts
    function test_SettlePact_RevertIf_EvidenceNotSubmitted() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.EvidenceNotSubmitted.selector);
        escrow.settlePact(pactId);
    }

    // 24. Double settlement reverts
    function test_SettlePact_RevertIf_DoubleSettlement() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(creator);
        escrow.settlePact(pactId);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.PactAlreadySettled.selector);
        escrow.settlePact(pactId);
    }

    // 25. Settle after refund reverts
    function test_SettlePact_RevertIf_AfterRefund() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1 seconds);

        escrow.refundPact(pactId);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.PactAlreadyRefunded.selector);
        escrow.settlePact(pactId);
    }

    // 26. Invalid pact ID on settle reverts
    function test_SettlePact_RevertIf_InvalidPactId() public {
        vm.prank(creator);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.settlePact(999);
    }

    // 27. Claim after review success
    function test_ClaimAfterReview_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(block.timestamp + escrow.REVIEW_PERIOD());

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(recipient);
        escrow.claimAfterReview(pactId);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Settled));
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    // 28. Claim before review period active reverts
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

    // 29. Unauthorized recipient on claim reverts
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

    // 30. Claim with invalid state reverts
    function test_ClaimAfterReview_RevertIf_InvalidPactState() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.claimAfterReview(pactId);
    }

    // 31. Invalid pact ID on claim reverts
    function test_ClaimAfterReview_RevertIf_InvalidPactId() public {
        vm.prank(recipient);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.claimAfterReview(999);
    }

    // 32. Refund after deadline success
    function test_RefundPact_Success_AfterDeadline() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1 seconds);

        uint256 creatorBalBefore = creator.balance;

        vm.prank(stranger);
        escrow.refundPact(pactId);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Refunded));
        assertEq(creator.balance, creatorBalBefore + ESCROW_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    // 33. Refund before deadline reverts
    function test_RefundPact_RevertIf_BeforeDeadline() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.expectRevert(PactEscrow.DeadlineNotPassed.selector);
        escrow.refundPact(pactId);
    }

    // 34. Refund with submitted evidence reverts
    function test_RefundPact_RevertIf_SubmittedEvidence() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.warp(deadline + 1 seconds);

        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.refundPact(pactId);
    }

    // 35. Double refund reverts
    function test_RefundPact_RevertIf_DoubleRefund() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.warp(deadline + 1 seconds);

        escrow.refundPact(pactId);

        vm.expectRevert(PactEscrow.PactAlreadyRefunded.selector);
        escrow.refundPact(pactId);
    }

    // 36. Refund after settlement reverts
    function test_RefundPact_RevertIf_AfterSettlement() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(creator);
        escrow.settlePact(pactId);

        vm.warp(deadline + 1 seconds);

        vm.expectRevert(PactEscrow.PactAlreadySettled.selector);
        escrow.refundPact(pactId);
    }

    // 37. Invalid pact ID on refund reverts
    function test_RefundPact_RevertIf_InvalidPactId() public {
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.refundPact(999);
    }

    // 38. Get pact invalid ID reverts
    function test_GetPact_RevertIf_InvalidPactId() public {
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.getPact(0);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.getPact(1);
    }

    // =========================================================================
    // PHASE 8: AI VERIFICATION ATTESTATION & AUTOMATED ESCROW RESOLUTION TESTS
    // =========================================================================

    // 1. Authorized verifier approval success
    function test_Verification_AuthorizedVerifier_Approval_Success() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(verifier);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Settled));
        assertEq(uint256(p.verificationResult), uint256(PactEscrow.VerificationResult.Approved));
        assertEq(p.verificationHash, SAMPLE_VERIFICATION);
        assertEq(recipient.balance, recipientBalBefore + ESCROW_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    // 2. Unauthorized verifier rejected
    function test_Verification_RevertIf_UnauthorizedVerifier() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        // Stranger fails
        vm.prank(stranger);
        vm.expectRevert(PactEscrow.UnauthorizedVerifier.selector);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        // Creator fails
        vm.prank(creator);
        vm.expectRevert(PactEscrow.UnauthorizedVerifier.selector);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        // Recipient fails
        vm.prank(recipient);
        vm.expectRevert(PactEscrow.UnauthorizedVerifier.selector);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);
    }

    // 3. Approval settles recipient
    function test_Verification_Approval_SettlesRecipient() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        uint256 balanceBefore = recipient.balance;

        vm.prank(verifier);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        assertEq(recipient.balance, balanceBefore + ESCROW_AMOUNT);
    }

    // 4. Rejected evidence refund path
    function test_Verification_Rejection_RefundPath() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        uint256 creatorBalBefore = creator.balance;

        vm.prank(verifier);
        escrow.submitVerification(pactId, false, SAMPLE_VERIFICATION);

        PactEscrow.Pact memory p = escrow.getPact(pactId);
        assertEq(uint256(p.status), uint256(PactEscrow.PactStatus.Refunded));
        assertEq(uint256(p.verificationResult), uint256(PactEscrow.VerificationResult.Rejected));
        assertEq(p.verificationHash, SAMPLE_VERIFICATION);
        assertEq(creator.balance, creatorBalBefore + ESCROW_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    // 5. Duplicate verification rejected
    function test_Verification_RevertIf_DuplicateVerification() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(verifier);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        vm.prank(verifier);
        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);
    }

    // 6. Verification without evidence rejected
    function test_Verification_RevertIf_EvidenceNotSubmitted() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(verifier);
        vm.expectRevert(PactEscrow.InvalidPactState.selector);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);
    }

    // 7. Wrong pact verification rejected
    function test_Verification_RevertIf_WrongPactId() public {
        vm.startPrank(verifier);
        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.submitVerification(0, true, SAMPLE_VERIFICATION);

        vm.expectRevert(PactEscrow.PactDoesNotExist.selector);
        escrow.submitVerification(999, true, SAMPLE_VERIFICATION);
        vm.stopPrank();
    }

    // 8. Zero verificationHash rejected
    function test_Verification_RevertIf_ZeroVerificationHash() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(verifier);
        vm.expectRevert(PactEscrow.ZeroVerificationHash.selector);
        escrow.submitVerification(pactId, true, bytes32(0));
    }

    // 9. Reentrancy on verification settlement
    function test_Verification_Reentrancy_Reverts() public {
        ReentrantAttacker attacker = new ReentrantAttacker(escrow);

        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(address(attacker), deadline);

        vm.prank(address(attacker));
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        attacker.setAttackParams(pactId, ReentrantAttacker.ActionType.Verify);

        vm.prank(verifier);
        vm.expectRevert(PactEscrow.TransferFailed.selector);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);
    }

    // 10. Multiple pacts cannot mix verification
    function test_Verification_MultiplePacts_CannotMixVerification() public {
        address recipient2 = address(0x5555);
        vm.deal(recipient2, INITIAL_BALANCE);

        vm.startPrank(creator);
        uint256 pact1 = escrow.createPact{value: 2 ether}(recipient, deadline);
        uint256 pact2 = escrow.createPact{value: 3 ether}(recipient2, deadline);
        vm.stopPrank();

        vm.prank(recipient);
        escrow.submitEvidence(pact1, SAMPLE_EVIDENCE);

        vm.prank(recipient2);
        escrow.submitEvidence(pact2, keccak256("DELIVERY_2"));

        uint256 rec1Before = recipient.balance;
        uint256 rec2Before = recipient2.balance;

        // Verify only pact 1
        bytes32 hash1 = keccak256("VERIFY_1");
        vm.prank(verifier);
        escrow.submitVerification(pact1, true, hash1);

        assertEq(recipient.balance, rec1Before + 2 ether);
        assertEq(recipient2.balance, rec2Before);
        assertEq(uint256(escrow.getPact(pact1).status), uint256(PactEscrow.PactStatus.Settled));
        assertEq(uint256(escrow.getPact(pact2).status), uint256(PactEscrow.PactStatus.Submitted));
        assertEq(escrow.getPact(pact1).verificationHash, hash1);
        assertEq(escrow.getPact(pact2).verificationHash, bytes32(0));

        // Reject pact 2
        uint256 creatorBal = creator.balance;
        bytes32 hash2 = keccak256("VERIFY_2");
        vm.prank(verifier);
        escrow.submitVerification(pact2, false, hash2);

        assertEq(creator.balance, creatorBal + 3 ether);
        assertEq(uint256(escrow.getPact(pact2).status), uint256(PactEscrow.PactStatus.Refunded));
        assertEq(escrow.getPact(pact2).verificationHash, hash2);
    }

    // 11. Approved pact cannot refund
    function test_Verification_ApprovedPact_CannotRefund() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(verifier);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        vm.warp(deadline + 1 seconds);

        vm.expectRevert(PactEscrow.PactAlreadySettled.selector);
        escrow.refundPact(pactId);
    }

    // 12. Rejected pact cannot settle
    function test_Verification_RejectedPact_CannotSettle() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        vm.prank(verifier);
        escrow.submitVerification(pactId, false, SAMPLE_VERIFICATION);

        vm.prank(creator);
        vm.expectRevert(PactEscrow.PactAlreadyRefunded.selector);
        escrow.settlePact(pactId);
    }

    // 13. Correct event emissions
    function test_Verification_CorrectEventEmissions() public {
        vm.prank(creator);
        uint256 pactId = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId, SAMPLE_EVIDENCE);

        // Test Approval Events
        vm.expectEmit(true, false, false, true);
        emit EvidenceVerified(pactId, true, SAMPLE_VERIFICATION);

        vm.expectEmit(true, true, false, true);
        emit PactSettled(pactId, recipient, ESCROW_AMOUNT);

        vm.prank(verifier);
        escrow.submitVerification(pactId, true, SAMPLE_VERIFICATION);

        // Test Rejection Events on a second pact
        vm.prank(creator);
        uint256 pactId2 = escrow.createPact{value: ESCROW_AMOUNT}(recipient, deadline);

        vm.prank(recipient);
        escrow.submitEvidence(pactId2, SAMPLE_EVIDENCE);

        vm.expectEmit(true, false, false, true);
        emit EvidenceVerified(pactId2, false, SAMPLE_VERIFICATION);

        vm.expectEmit(true, true, false, true);
        emit PactRefunded(pactId2, creator, ESCROW_AMOUNT);

        vm.prank(verifier);
        escrow.submitVerification(pactId2, false, SAMPLE_VERIFICATION);
    }

    // 14. Escrow balance conservation
    function test_Verification_EscrowBalanceConservation() public {
        vm.startPrank(creator);
        uint256 p1 = escrow.createPact{value: 10 ether}(recipient, deadline);
        uint256 p2 = escrow.createPact{value: 20 ether}(recipient, deadline);
        uint256 p3 = escrow.createPact{value: 15 ether}(recipient, deadline);
        vm.stopPrank();

        assertEq(address(escrow).balance, 45 ether);

        vm.startPrank(recipient);
        escrow.submitEvidence(p1, SAMPLE_EVIDENCE);
        escrow.submitEvidence(p2, SAMPLE_EVIDENCE);
        vm.stopPrank();

        // Settle p1
        vm.prank(verifier);
        escrow.submitVerification(p1, true, SAMPLE_VERIFICATION);
        assertEq(address(escrow).balance, 35 ether);

        // Refund p2 via verifier rejection
        vm.prank(verifier);
        escrow.submitVerification(p2, false, SAMPLE_VERIFICATION);
        assertEq(address(escrow).balance, 15 ether);

        // p3 remains funded with exact 15 ether
        PactEscrow.Pact memory remainingPact = escrow.getPact(p3);
        assertEq(uint256(remainingPact.status), uint256(PactEscrow.PactStatus.Funded));
        assertEq(remainingPact.amount, 15 ether);
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
        Refund,
        Verify
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
            } else if (action == ActionType.Verify) {
                targetEscrow.submitVerification(pactIdToReenter, true, keccak256("REENTRANT_VERIFY"));
            }
        }
    }
}
