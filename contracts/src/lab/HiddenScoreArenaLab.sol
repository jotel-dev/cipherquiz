// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {
  FHE,
  euint8,
  euint64,
  externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {CipherQuizFoundation} from "../CipherQuizFoundation.sol";

/// @title HiddenScoreArenaLab
/// @author CipherQuiz contributors
/// @notice Local-only ten-question scoring/comparison experiment; no tokens or funding gates.
/// @dev Input keys are publisher-known. This fixture is not a deployable paid game.
contract HiddenScoreArenaLab is CipherQuizFoundation {
  enum State {
    Missing,
    Waiting,
    Active,
    Finalized,
    Cancelled
  }

  struct Round {
    address[2] players;
    bool[2] joined;
    bool[2] submitted;
    uint64 joinDeadline;
    uint64 duration;
    uint64 deadline;
    bytes32 contentHash;
    State state;
    euint8[2] scores;
    euint8 outcome;
    euint64[] answerKeys;
  }

  /// @notice Immutable local question publisher.
  address public immutable OPERATOR;
  /// @notice Sole consumer of encrypted outcomes, never raw scores.
  address public immutable CONSUMER;
  /// @notice IDs use 47 bits, leaving 17 bits for seat/question/choice context.
  uint64 public nextRoundId = 1;
  /// @notice All external handles are consumed at most once in this deployment.
  mapping(bytes32 => bool) public usedInputs;
  mapping(uint64 => Round) private _rounds;

  error LocalOnly();
  error Unauthorized();
  error InvalidSetup();
  error InvalidRound();
  error InvalidState();
  error DeadlinePassed();
  error NotCompleted();
  error InputAlreadyUsed();

  /// @notice Content and both designated seats are fixed before either join.
  /// @param roundId Monotonic round ID.
  event RoundCommitted(uint64 indexed roundId);
  /// @notice Both seats joined; the common submission window has started.
  /// @param roundId Activated round ID.
  event RoundActivated(uint64 indexed roundId);
  /// @notice One complete encrypted answer batch was accepted.
  /// @param roundId Active round ID.
  /// @param seat Public submitter index, 0 or 1.
  event AnswersSubmitted(uint64 indexed roundId, uint8 indexed seat);
  /// @notice Terminal state; neither score nor outcome is emitted in plaintext.
  /// @param roundId Closed round ID.
  event RoundClosed(uint64 indexed roundId);

  /// @param operator Fixed question publisher, distinct from players.
  /// @param consumer Fixed local entitlement fixture.
  // solhint-disable-next-line func-visibility
  constructor(address operator, address consumer) {
    if (block.chainid != 31337) revert LocalOnly();
    if (operator == address(0) || consumer.code.length == 0)
      revert InvalidSetup();
    OPERATOR = operator;
    CONSUMER = consumer;
  }

  /// @notice Commits exactly ten ordered encrypted keys and immutable public content.
  /// @param players Distinct reserved seats; no open matchmaking in this lab.
  /// @param joinDeadline Exclusive join expiry.
  /// @param duration Common answer window, 60..3600 seconds in this fixture.
  /// @param contentHash Canonical content/version/policy commitment; binding to truth is trusted.
  /// @param keys Ten encrypted choices, valid choices 0..3.
  /// @param proof Input proof bound to this contract and publisher.
  /// @return roundId New immutable challenge ID.
  function createRound(
    address[2] calldata players,
    uint64 joinDeadline,
    uint64 duration,
    bytes32 contentHash,
    externalEuint64[] calldata keys,
    bytes calldata proof
  ) external returns (uint64 roundId) {
    if (msg.sender != OPERATOR) revert Unauthorized();
    if (
      players[0] == address(0) ||
      players[1] == address(0) ||
      players[0] == players[1] ||
      players[0] == OPERATOR ||
      players[1] == OPERATOR ||
      // solhint-disable-next-line gas-strict-inequalities
      joinDeadline <= block.timestamp ||
      duration < 60 ||
      duration > 3600 ||
      contentHash == bytes32(0) ||
      keys.length != 10 ||
      nextRoundId > (uint64(1) << 47) - 1
    ) revert InvalidSetup();
    roundId = nextRoundId;
    ++nextRoundId;
    Round storage round = _rounds[roundId];
    round.players = players;
    round.joinDeadline = joinDeadline;
    round.duration = duration;
    round.contentHash = contentHash;
    round.state = State.Waiting;
    for (uint256 i; i < 10; ++i) {
      _consume(keys[i]);
      euint64 key = FHE.fromExternal(keys[i], proof);
      FHE.allowThis(key);
      round.answerKeys.push(key);
    }
    emit RoundCommitted(roundId);
  }

  /// @notice Consents to the immutable challenge; deliberately does not lock any funds.
  /// @param roundId Existing waiting challenge.
  function joinRound(uint64 roundId) external {
    Round storage round = _round(roundId);
    uint8 seat = _seat(round);
    if (round.state != State.Waiting || round.joined[seat])
      revert InvalidState();
    // solhint-disable-next-line gas-strict-inequalities
    if (block.timestamp >= round.joinDeadline) revert DeadlinePassed();
    round.joined[seat] = true;
    if (round.joined[0] && round.joined[1]) {
      round.state = State.Active;
      round.deadline = uint64(block.timestamp) + round.duration;
      emit RoundActivated(roundId);
    }
  }

  /// @notice Computes a score from answers, never from a player-supplied score.
  /// @dev Plaintext format: (roundId << 17) | (seat << 16) | (index << 8) | choice.
  /// Invalid context/key/choice contributes encrypted zero without a secret-dependent revert.
  /// @param roundId Active challenge.
  /// @param answers Exactly ten sender-bound encrypted contextual answers.
  /// @param proof Contract- and sender-bound input proof.
  function submitAnswers(
    uint64 roundId,
    externalEuint64[] calldata answers,
    bytes calldata proof
  ) external {
    Round storage round = _round(roundId);
    uint8 seat = _seat(round);
    if (round.state != State.Active || round.submitted[seat])
      revert InvalidState();
    // solhint-disable-next-line gas-strict-inequalities
    if (block.timestamp >= round.deadline) revert DeadlinePassed();
    if (answers.length != 10) revert InvalidSetup();
    round.submitted[seat] = true;
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

  /// @notice Permissionless close: compare both submissions, or apply immutable timeout policy.
  /// @dev Encrypted outcome: 1 A wins, 2 B wins, 3 tie, 4 refund/cancel.
  /// A single timely submission wins by forfeit even with score zero. Neither submission refunds.
  /// @param roundId Waiting-expired or completed/expired active round.
  function finalizeRound(uint64 roundId) external {
    Round storage round = _round(roundId);
    euint8 outcome;
    if (round.state == State.Waiting) {
      if (block.timestamp < round.joinDeadline) revert NotCompleted();
      round.state = State.Cancelled;
      outcome = FHE.asEuint8(4);
    } else if (round.state == State.Active) {
      if (
        !(round.submitted[0] && round.submitted[1]) &&
        block.timestamp < round.deadline
      ) revert NotCompleted();
      round.state = State.Finalized;
      if (round.submitted[0] && round.submitted[1]) {
        outcome = FHE.select(
          FHE.gt(round.scores[0], round.scores[1]),
          FHE.asEuint8(1),
          FHE.select(
            FHE.eq(round.scores[0], round.scores[1]),
            FHE.asEuint8(3),
            FHE.asEuint8(2)
          )
        );
      } else {
        outcome = FHE.asEuint8(
          round.submitted[0] ? 1 : (round.submitted[1] ? 2 : 4)
        );
      }
    } else revert InvalidState();
    FHE.allowThis(outcome);
    round.outcome = outcome;
    for (uint8 i; i < 2; ++i) {
      if (!round.submitted[i]) {
        round.scores[i] = FHE.asEuint8(0);
        FHE.allowThis(round.scores[i]);
      }
      FHE.allow(round.scores[i], round.players[i]);
      FHE.allow(outcome, round.players[i]);
    }
    emit RoundClosed(roundId);
  }

  /// @notice Shares only authenticated terminal outcome with the fixed consumer in this transaction.
  /// @param roundId Closed challenge.
  /// @return players Immutable beneficiaries.
  /// @return outcome Encrypted settlement category.
  function shareFinalizedOutcome(
    uint64 roundId
  ) external returns (address[2] memory players, euint8 outcome) {
    if (msg.sender != CONSUMER) revert Unauthorized();
    Round storage round = _round(roundId);
    if (round.state != State.Finalized && round.state != State.Cancelled)
      revert InvalidState();
    FHE.allowTransient(round.outcome, CONSUMER);
    return (round.players, round.outcome);
  }

  /// @notice Public lifecycle and ciphertext metadata; handles grant no decryption rights.
  /// @param roundId Challenge to inspect.
  /// @return round Stored metadata including immutable key handles.
  function getRound(uint64 roundId) external view returns (Round memory round) {
    return _round(roundId);
  }

  function _round(uint64 id) private view returns (Round storage round) {
    round = _rounds[id];
    if (round.state == State.Missing) revert InvalidRound();
  }

  function _seat(Round storage round) private view returns (uint8) {
    if (msg.sender == round.players[0]) return 0;
    if (msg.sender == round.players[1]) return 1;
    revert Unauthorized();
  }

  function _consume(externalEuint64 input) private {
    bytes32 handle = externalEuint64.unwrap(input);
    if (usedInputs[handle]) revert InputAlreadyUsed();
    usedInputs[handle] = true;
  }
}
