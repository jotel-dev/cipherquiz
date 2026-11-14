// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {
  FHE,
  euint8,
  euint64,
  externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {CipherQuizFoundation} from "./CipherQuizFoundation.sol";

/// @title HiddenScoreArena
/// @author CipherQuiz contributors
/// @notice Token-free, two-player ten-question engine. Entitlements are units, not money.
/// @dev Derived from the Phase A circuit. Publisher knows keys; no funding/admission gate.
/// Not audited or approved for deployment. No admin can replace keys or adjudicate results.
contract HiddenScoreArena is CipherQuizFoundation {
  enum State {
    Missing,
    Waiting,
    Active,
    Finalized,
    Cancelled
  }
  enum Closure {
    None,
    Completed,
    AnswerExpired,
    JoinExpired,
    PublisherCancelled,
    PlayerCancelled
  }

  struct Config {
    address[2] players;
    bytes32[10] questions;
    bytes32 bankRoot;
    uint64 joinDeadline;
    uint32 duration;
  }

  struct Round {
    Config config;
    State state;
    Closure closure;
    uint8 joined;
    uint8 submitted;
    uint64 deadline;
    bytes32 contentHash;
    bytes32 keyCommitment;
    bytes32 termsHash;
    euint64[10] answerKeys;
    euint8[2] scores;
    euint8 outcome;
    euint64[2] shares;
  }

  struct PublicRound {
    address[2] players;
    State state;
    Closure closure;
    uint8 joined;
    uint8 submitted;
    uint64 joinDeadline;
    uint64 deadline;
    uint32 duration;
    bytes32 bankRoot;
    bytes32 contentHash;
    bytes32 keyCommitment;
    bytes32 termsHash;
  }

  /// @notice Immutable publisher; cannot be a designated player.
  address public immutable OPERATOR;
  /// @notice Immutable outcome/share consumer; never granted raw score access.
  address public immutable CONSUMER;
  /// @notice Explicit token-free rules domain; a funded successor needs a different version.
  bytes32 public constant RULES_HASH = keccak256(
    "CipherQuiz.Arena.TokenFree.v1"
  );
  /// @notice Full answer context fits uint64 with a 47-bit round ID.
  uint64 public constant MAX_ROUND_ID = (uint64(1) << 47) - 1;
  /// @notice Next expected creation nonce, beginning at one.
  uint64 public nextRoundId = 1;
  /// @notice Imported external key/answer handles are consumed deployment-wide.
  mapping(bytes32 => bool) public usedInputs;
  mapping(uint64 => Round) private _rounds;

  error Unauthorized();
  error InvalidSetup();
  error InvalidRound();
  error InvalidState();
  error DeadlinePassed();
  error NotCompleted();
  error InputAlreadyUsed();
  error CommitmentMismatch();

  /// @notice Immutable challenge commitment; no plaintext key or score.
  /// @param roundId Created ID.
  /// @param termsHash Domain-bound commitment to rules, config and encrypted key handles.
  event RoundCreated(uint64 indexed roundId, bytes32 indexed termsHash);
  /// @notice A player accepted the stored terms.
  /// @param roundId Challenge ID.
  /// @param seat Public consenting seat.
  event PlayerJoined(uint64 indexed roundId, uint8 indexed seat);
  /// @notice Both players joined; common clock is fixed.
  /// @param roundId Challenge ID.
  /// @param deadline Exclusive answer deadline.
  event RoundActivated(uint64 indexed roundId, uint64 indexed deadline);
  /// @notice One encrypted batch accepted; no answers or scores emitted.
  /// @param roundId Challenge ID.
  /// @param seat Public submitting seat.
  event AnswersSubmitted(uint64 indexed roundId, uint8 indexed seat);
  /// @notice Public lifecycle reason, never the secret winner or score.
  /// @param roundId Challenge ID.
  /// @param reason Public close reason.
  event RoundClosed(uint64 indexed roundId, Closure indexed reason);

  /// @param operator Fixed publisher.
  /// @param consumer Existing fixed settlement-consumer contract; no later rebinding.
  // solhint-disable-next-line func-visibility
  constructor(address operator, address consumer) {
    if (operator == address(0) || consumer.code.length == 0)
      revert InvalidSetup();
    OPERATOR = operator;
    CONSUMER = consumer;
  }

  /// @notice Commits the same ten ordered question hashes/keys before any consent.
  /// @dev Hash commitments do not prove semantic answer truth or bank membership.
  /// @param expectedId Explicit creation nonce; races cannot silently change answer context.
  /// @param config Public immutable content/players/timing.
  /// @param keys Exactly ten encrypted choices, intended domain 0..3.
  /// @param proof Proof bound to this contract and the direct publisher caller.
  /// @return roundId Created round.
  function createRound(
    uint64 expectedId,
    Config calldata config,
    externalEuint64[] calldata keys,
    bytes calldata proof
  ) external returns (uint64 roundId) {
    if (msg.sender != OPERATOR) revert Unauthorized();
    if (expectedId != nextRoundId || expectedId > MAX_ROUND_ID)
      revert InvalidSetup();
    _validate(config);
    // The library's empty-proof pre-authorized-handle path is outside this protocol.
    if (keys.length != 10 || proof.length == 0) revert InvalidSetup();
    roundId = nextRoundId;
    ++nextRoundId;
    Round storage round = _rounds[roundId];
    round.config = config;
    round.state = State.Waiting;
    round.contentHash = keccak256(abi.encode(config.questions));
    round.keyCommitment = keccak256(abi.encode(keys));
    round.termsHash = keccak256(
      abi.encode(
        RULES_HASH,
        block.chainid,
        address(this),
        OPERATOR,
        CONSUMER,
        roundId,
        config,
        round.keyCommitment
      )
    );
    for (uint256 i; i < 10; ++i) {
      _consume(keys[i]);
      euint64 key = FHE.fromExternal(keys[i], proof);
      FHE.allowThis(key);
      round.answerKeys[i] = key;
    }
    emit RoundCreated(roundId, round.termsHash);
  }

  /// @notice Consents to exact terms; no deposits or financial approval are implied.
  /// @param roundId Waiting challenge.
  /// @param expectedTermsHash Commitment independently checked by the player's client.
  function joinRound(uint64 roundId, bytes32 expectedTermsHash) external {
    Round storage round = _round(roundId);
    uint8 seat = _seat(round);
    if (round.state != State.Waiting || (round.joined & (1 << seat)) != 0)
      revert InvalidState();
    // solhint-disable-next-line gas-strict-inequalities
    if (block.timestamp >= round.config.joinDeadline) revert DeadlinePassed();
    if (expectedTermsHash != round.termsHash) revert CommitmentMismatch();
    round.joined |= uint8(1 << seat);
    emit PlayerJoined(roundId, seat);
    if (round.joined == 3) {
      round.state = State.Active;
      round.deadline = uint64(block.timestamp) + round.config.duration;
      emit RoundActivated(roundId, round.deadline);
    }
  }

  /// @notice Withdraw waiting consent; publisher can cancel only before any player joined.
  /// @dev No voluntary cancellation after activation, regardless of submission count.
  /// @param roundId Waiting challenge.
  function cancelRound(uint64 roundId) external {
    Round storage round = _round(roundId);
    if (round.state != State.Waiting) revert InvalidState();
    // At/after expiry use permissionless finalization so the reason is deterministic.
    // solhint-disable-next-line gas-strict-inequalities
    if (block.timestamp >= round.config.joinDeadline) revert DeadlinePassed();
    Closure reason;
    if (msg.sender == OPERATOR && round.joined == 0)
      reason = Closure.PublisherCancelled;
    else {
      uint8 seat = _seat(round);
      if ((round.joined & (1 << seat)) == 0) revert Unauthorized();
      reason = Closure.PlayerCancelled;
    }
    round.state = State.Cancelled;
    _close(roundId, round, FHE.asEuint8(4), reason);
  }

  /// @notice Computes an encrypted score from a complete batch, never a claimed score.
  /// @dev Pack (roundId << 17) | (seat << 16) | (index << 8) | choice.
  /// Wrong context, invalid key or invalid choice contributes zero without a validity reveal.
  /// @param roundId Active challenge.
  /// @param answers Ten encrypted contextual words.
  /// @param proof Input proof bound to this contract and direct player caller.
  function submitAnswers(
    uint64 roundId,
    externalEuint64[] calldata answers,
    bytes calldata proof
  ) external {
    Round storage round = _round(roundId);
    uint8 seat = _seat(round);
    if (round.state != State.Active || (round.submitted & (1 << seat)) != 0)
      revert InvalidState();
    // solhint-disable-next-line gas-strict-inequalities
    if (block.timestamp >= round.deadline) revert DeadlinePassed();
    if (answers.length != 10 || proof.length == 0) revert InvalidSetup();
    round.submitted |= uint8(1 << seat);
    euint8 score = FHE.asEuint8(0);
    for (uint256 i; i < 10; ++i) {
      _consume(answers[i]);
      euint64 answer = FHE.fromExternal(answers[i], proof);
      uint64 context =
        (roundId << 17) | (uint64(seat) << 16) | (uint64(i) << 8);
      score = FHE.add(
        score,
        FHE.asEuint8(
          FHE.and(
            FHE.lt(round.answerKeys[i], uint64(4)),
            FHE.eq(answer, FHE.add(round.answerKeys[i], context))
          )
        )
      );
    }
    FHE.allowThis(score);
    round.scores[seat] = score;
    emit AnswersSubmitted(roundId, seat);
  }

  /// @notice Anyone closes a completed/expired round. No publisher-controlled adjudication.
  /// @dev Outcome: 1 A wins, 2 B wins, 3 tie, 4 cancellation/refund. Sole submitter wins even at zero.
  /// @param roundId Waiting-expired or active-completed/expired challenge.
  function finalizeRound(uint64 roundId) external {
    Round storage round = _round(roundId);
    euint8 outcome;
    Closure reason;
    if (round.state == State.Waiting) {
      if (block.timestamp < round.config.joinDeadline) revert NotCompleted();
      round.state = State.Cancelled;
      reason = Closure.JoinExpired;
      outcome = FHE.asEuint8(4);
    } else if (round.state == State.Active) {
      if (round.submitted != 3 && block.timestamp < round.deadline)
        revert NotCompleted();
      round.state = State.Finalized;
      reason = round.submitted == 3 ? Closure.Completed : Closure.AnswerExpired;
      if (round.submitted == 3) {
        outcome = FHE.select(
          FHE.gt(round.scores[0], round.scores[1]),
          FHE.asEuint8(1),
          FHE.select(
            FHE.eq(round.scores[0], round.scores[1]),
            FHE.asEuint8(3),
            FHE.asEuint8(2)
          )
        );
      } else
        outcome = FHE.asEuint8(
          round.submitted == 1 ? 1 : (round.submitted == 2 ? 2 : 4)
        );
    } else revert InvalidState();
    _close(roundId, round, outcome, reason);
  }

  /// @notice Fixed consumer gets original outcome/shares with same-transaction ACL, no raw scores.
  /// @dev Repeated reads are allowed. Future vault must enforce once-only financial settlement itself.
  /// @param roundId Terminal challenge.
  /// @return termsHash Frozen identity binding beneficiaries and policy.
  /// @return players Fixed beneficiaries.
  /// @return joined Public consent mask, not proof of actual funding.
  /// @return outcome Original encrypted result.
  /// @return shares Encrypted 0..2 entitlement units; never token credits.
  function shareSettlement(
    uint64 roundId
  )
    external
    returns (
      bytes32 termsHash,
      address[2] memory players,
      uint8 joined,
      euint8 outcome,
      euint64[2] memory shares
    )
  {
    if (msg.sender != CONSUMER) revert Unauthorized();
    Round storage round = _round(roundId);
    if (round.state != State.Finalized && round.state != State.Cancelled)
      revert InvalidState();
    FHE.allowTransient(round.outcome, CONSUMER);
    for (uint8 i; i < 2; ++i) FHE.allowTransient(round.shares[i], CONSUMER);
    return (
      round.termsHash,
      round.config.players,
      round.joined,
      round.outcome,
      round.shares
    );
  }

  /// @notice Compact lifecycle/config metadata for clients; no answer plaintext or decrypted score.
  /// @param roundId Existing challenge.
  /// @return result Public metadata; bit zero is seat A and bit one is B.
  function getPublicRound(
    uint64 roundId
  ) external view returns (PublicRound memory result) {
    Round storage round = _round(roundId);
    result = PublicRound(
      round.config.players,
      round.state,
      round.closure,
      round.joined,
      round.submitted,
      round.config.joinDeadline,
      round.deadline,
      round.config.duration,
      round.config.bankRoot,
      round.contentHash,
      round.keyCommitment,
      round.termsHash
    );
  }

  /// @notice Exactly ten ordered manifest hashes, common to both seats.
  /// @param roundId Existing challenge.
  /// @return questions Immutable manifest leaves, not plaintext keys.
  function getQuestions(
    uint64 roundId
  ) external view returns (bytes32[10] memory questions) {
    return _round(roundId).config.questions;
  }

  /// @notice Immutable encrypted key handles for commitment verification; no ACL grant.
  /// @param roundId Existing challenge.
  /// @return keys Ten public ciphertext handles.
  function getKeyHandles(
    uint64 roundId
  ) external view returns (euint64[10] memory keys) {
    return _round(roundId).answerKeys;
  }

  /// @notice Public ciphertext handles only; zero handles until the relevant computation.
  /// @param roundId Existing challenge.
  /// @return scores Per-seat encrypted scores, viewable by their owner only after closure.
  /// @return outcome Encrypted comparison/refund result.
  /// @return shares Per-seat encrypted entitlement units.
  function getResults(
    uint64 roundId
  )
    external
    view
    returns (euint8[2] memory scores, euint8 outcome, euint64[2] memory shares)
  {
    Round storage round = _round(roundId);
    return (round.scores, round.outcome, round.shares);
  }

  function _close(
    uint64 id,
    Round storage round,
    euint8 outcome,
    Closure reason
  ) private {
    round.closure = reason;
    round.outcome = outcome;
    FHE.allowThis(outcome);
    if (round.state == State.Cancelled) {
      // Units reflect joined seats only. They still do not prove any deposit took place.
      round.shares[0] = FHE.asEuint64(round.joined & 1);
      round.shares[1] = FHE.asEuint64((round.joined >> 1) & 1);
    } else {
      round.shares[0] = FHE.select(
        FHE.eq(outcome, 1),
        FHE.asEuint64(2),
        FHE.select(FHE.eq(outcome, 2), FHE.asEuint64(0), FHE.asEuint64(1))
      );
      round.shares[1] = FHE.sub(FHE.asEuint64(2), round.shares[0]);
    }
    for (uint8 i; i < 2; ++i) {
      if ((round.submitted & (1 << i)) == 0) {
        round.scores[i] = FHE.asEuint8(0);
        FHE.allowThis(round.scores[i]);
      }
      FHE.allowThis(round.shares[i]);
      FHE.allow(round.shares[i], round.config.players[i]);
      FHE.allow(round.scores[i], round.config.players[i]);
      FHE.allow(outcome, round.config.players[i]);
    }
    emit RoundClosed(id, reason);
  }

  function _validate(Config calldata config) private view {
    if (
      config.players[0] == address(0) ||
      config.players[1] == address(0) ||
      config.players[0] == config.players[1] ||
      config.players[0] == OPERATOR ||
      config.players[1] == OPERATOR ||
      config.players[0] == CONSUMER ||
      config.players[1] == CONSUMER ||
      config.bankRoot == bytes32(0) ||
      // solhint-disable-next-line gas-strict-inequalities
      config.joinDeadline <= block.timestamp ||
      config.duration < 60 ||
      config.duration > 3600 ||
      config.joinDeadline > type(uint64).max - config.duration
    ) revert InvalidSetup();
    for (uint256 i; i < 10; ++i) {
      if (config.questions[i] == bytes32(0)) revert InvalidSetup();
      for (uint256 j; j < i; ++j)
        if (config.questions[i] == config.questions[j]) revert InvalidSetup();
    }
  }

  function _round(uint64 id) private view returns (Round storage round) {
    round = _rounds[id];
    if (round.state == State.Missing) revert InvalidRound();
  }

  function _seat(Round storage round) private view returns (uint8) {
    if (msg.sender == round.config.players[0]) return 0;
    if (msg.sender == round.config.players[1]) return 1;
    revert Unauthorized();
  }

  function _consume(externalEuint64 input) private {
    bytes32 handle = externalEuint64.unwrap(input);
    if (usedInputs[handle]) revert InputAlreadyUsed();
    usedInputs[handle] = true;
  }
}
