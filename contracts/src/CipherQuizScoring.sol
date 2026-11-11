// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {
  FHE,
  euint8,
  euint64,
  externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {CipherQuizFoundation} from "./CipherQuizFoundation.sol";

/// @title CipherQuizScoring
/// @author CipherQuiz contributors
/// @notice Token-free, single-player rounds with encrypted keys and final scores.
/// @dev Local proof of concept. Operators know the keys they encrypt. No upgrades.
contract CipherQuizScoring is CipherQuizFoundation {
  enum State {
    Missing,
    Open,
    Submitted,
    Finalized
  }

  struct Round {
    address player;
    uint64 deadline;
    bytes32 contentHash;
    State state;
    euint8 score;
    euint64[] keys;
  }

  /// @notice Sole key publisher, fixed at deployment.
  address public immutable OPERATOR;
  /// @notice Next round identifier; encrypted context uses at most 48 bits.
  uint64 public nextRoundId = 1;
  mapping(uint64 => Round) private _rounds;
  /// @notice Global consumption registry for external key and answer handles.
  mapping(bytes32 => bool) public usedInputs;

  error Unauthorized();
  error InvalidRound();
  error InvalidSetup();
  error InvalidState();
  error DeadlinePassed();
  error NotCompleted();
  error InputAlreadyUsed();

  /// @notice A new immutable round is open.
  /// @param roundId Monotonic round identifier.
  /// @param player Only permitted submitter.
  event RoundOpened(uint64 indexed roundId, address indexed player);
  /// @notice The player's single complete batch was accepted.
  /// @param roundId Submitted round.
  event AnswersSubmitted(uint64 indexed roundId);
  /// @notice The final score is now available to the player.
  /// @param roundId Closed round.
  event RoundFinalized(uint64 indexed roundId);

  /// @notice Fixes the sole key publisher for this contract's lifetime.
  /// @param authorizedOperator Sole key publisher.
  // Solidity 0.8 constructors have no visibility specifier.
  // solhint-disable-next-line func-visibility
  constructor(address authorizedOperator) {
    if (authorizedOperator == address(0)) revert InvalidSetup();
    OPERATOR = authorizedOperator;
  }

  /// @notice Atomically opens a round with immutable encrypted keys (choices 0..3).
  /// @dev Invalid encrypted keys always score zero; no secret-dependent revert.
  /// @param player Only permitted submitter and final score recipient.
  /// @param deadline Exclusive submission deadline in block timestamp seconds.
  /// @param contentHash Hash of the ordered public prompts, choices and versions.
  /// @param keys Encrypted choices, in public question order.
  /// @param proof Input proof bound to this contract and the operator.
  /// @return roundId New round identifier.
  function createRound(
    address player,
    uint64 deadline,
    bytes32 contentHash,
    externalEuint64[] calldata keys,
    bytes calldata proof
  ) external returns (uint64 roundId) {
    if (msg.sender != OPERATOR) revert Unauthorized();
    if (
      player == address(0) ||
      // Equality closes the submission window; retain the direct time comparison.
      // solhint-disable-next-line gas-strict-inequalities
      deadline <= block.timestamp ||
      contentHash == bytes32(0) ||
      keys.length == 0 ||
      keys.length > 10 ||
      nextRoundId > type(uint48).max
    ) revert InvalidSetup();
    roundId = nextRoundId;
    ++nextRoundId;
    Round storage round = _rounds[roundId];
    round.player = player;
    round.deadline = deadline;
    round.contentHash = contentHash;
    round.state = State.Open;
    for (uint256 i; i < keys.length; ++i) {
      _consume(keys[i]);
      euint64 key = FHE.fromExternal(keys[i], proof);
      FHE.allowThis(key);
      round.keys.push(key);
    }
    emit RoundOpened(roundId, player);
  }

  /// @notice Submits exactly one batch; malformed context or choices score zero.
  /// @dev Each plaintext is (roundId << 16) | (questionIndex << 8) | choice.
  /// Round IDs are capped at 48 bits; choice is 0..3 and question index is 0..9.
  /// @param roundId Target round.
  /// @param answers Context-bound encrypted answers in question order.
  /// @param proof Input proof bound to this contract and the player.
  function submitAnswers(
    uint64 roundId,
    externalEuint64[] calldata answers,
    bytes calldata proof
  ) external {
    Round storage round = _round(roundId);
    if (msg.sender != round.player) revert Unauthorized();
    if (round.state != State.Open) revert InvalidState();
    // solhint-disable-next-line gas-strict-inequalities
    if (block.timestamp >= round.deadline) revert DeadlinePassed();
    if (answers.length != round.keys.length) revert InvalidSetup();
    round.state = State.Submitted;
    euint8 score = FHE.asEuint8(0);
    for (uint256 i; i < answers.length; ++i) {
      _consume(answers[i]);
      euint64 answer = FHE.fromExternal(answers[i], proof);
      uint64 context = (roundId << 16) | (uint64(i) << 8);
      euint64 expected = FHE.add(round.keys[i], context);
      score = FHE.add(
        score,
        FHE.asEuint8(
          FHE.and(FHE.lt(round.keys[i], uint64(4)), FHE.eq(answer, expected))
        )
      );
    }
    FHE.allowThis(score);
    round.score = score;
    emit AnswersSubmitted(roundId);
  }

  /// @notice Operator or designated player closes a submitted or expired round.
  /// @dev An expired round without a submission receives an encrypted zero.
  /// @param roundId Round to finalize exactly once.
  function finalizeRound(uint64 roundId) external {
    Round storage round = _round(roundId);
    if (msg.sender != OPERATOR && msg.sender != round.player)
      revert Unauthorized();
    if (round.state == State.Finalized) revert InvalidState();
    if (round.state == State.Open) {
      if (block.timestamp < round.deadline) revert NotCompleted();
      round.score = FHE.asEuint8(0);
      FHE.allowThis(round.score);
    }
    round.state = State.Finalized;
    FHE.allow(round.score, round.player);
    emit RoundFinalized(roundId);
  }

  /// @notice Handles are public metadata, not plaintext or decryption permission.
  /// @param roundId Round to inspect.
  /// @return player Designated submitter.
  /// @return deadline Exclusive submission deadline.
  /// @return contentHash Public content commitment.
  /// @return state Round lifecycle state.
  /// @return score Encrypted score handle; zero handle until submission or expiry finalization.
  /// @return questionCount Number of immutable keys.
  function getRound(
    uint64 roundId
  )
    external
    view
    returns (
      address player,
      uint64 deadline,
      bytes32 contentHash,
      State state,
      euint8 score,
      uint256 questionCount
    )
  {
    Round storage round = _round(roundId);
    return (
      round.player,
      round.deadline,
      round.contentHash,
      round.state,
      round.score,
      round.keys.length
    );
  }

  /// @notice Exposes ciphertext metadata for inspection without granting access.
  /// @param roundId Round to inspect.
  /// @param index Zero-based question index.
  /// @return key Encrypted answer key handle.
  function getKeyHandle(
    uint64 roundId,
    uint256 index
  ) external view returns (euint64 key) {
    return _round(roundId).keys[index];
  }

  function _round(uint64 roundId) private view returns (Round storage round) {
    round = _rounds[roundId];
    if (round.state == State.Missing) revert InvalidRound();
  }

  function _consume(externalEuint64 input) private {
    bytes32 handle = externalEuint64.unwrap(input);
    if (usedInputs[handle]) revert InputAlreadyUsed();
    usedInputs[handle] = true;
  }
}
