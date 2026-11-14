// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {CipherQuizScoring} from "../CipherQuizScoring.sol";

/// @title ScoringForVaultLab
/// @author CipherQuiz contributors
/// @notice New local deployment illustrating a score-sharing interface; not a modification of Sepolia V1.
/// @dev Does not implement the proposed production funding/activation/finalization changes.
contract ScoringForVaultLab is CipherQuizScoring {
  /// @notice Sole local settlement consumer.
  address public immutable VAULT;
  error LocalOnly();

  /// @param operator Local answer publisher.
  /// @param vault Only settlement consumer.
  // solhint-disable-next-line func-visibility
  constructor(address operator, address vault) CipherQuizScoring(operator) {
    if (block.chainid != 31337) revert LocalOnly();
    if (vault == address(0)) revert InvalidSetup();
    VAULT = vault;
  }

  /// @notice Grants only same-transaction computation access for a finalized ten-question score.
  /// @param roundId Existing scoring round.
  /// @return score Authenticated original handle, not a supplied/re-encrypted score.
  function shareFinalizedScore(uint64 roundId) external returns (euint8 score) {
    if (msg.sender != VAULT) revert Unauthorized();
    (, , , State state, euint8 value, uint256 count) = this.getRound(roundId);
    if (state != State.Finalized || count != 10) revert InvalidState();
    FHE.allowTransient(value, VAULT);
    return value;
  }
}
