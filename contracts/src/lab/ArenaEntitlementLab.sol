// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {FHE, euint8, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {CipherQuizFoundation} from "../CipherQuizFoundation.sol";
import {HiddenScoreArenaLab} from "./HiddenScoreArenaLab.sol";

/// @title ArenaEntitlementLab
/// @author CipherQuiz contributors
/// @notice Local-only cross-contract encrypted entitlement experiment; holds no tokens.
/// @dev Two symbolic units represent equal stakes, not actual credited or withdrawable money.
contract ArenaEntitlementLab is CipherQuizFoundation {
  address private immutable _CONFIGURER;
  /// @notice One-time configured local Arena source.
  HiddenScoreArenaLab public arena;
  /// @notice Replay protection for symbolic settlements.
  mapping(uint64 => bool) public recorded;
  /// @notice Per-seat symbolic entitlement, encrypted and viewable only by its beneficiary.
  mapping(uint64 => euint64[2]) public units;

  error LocalOnly();
  error InvalidSetup();
  error AlreadyRecorded();

  // solhint-disable-next-line func-visibility
  constructor() {
    if (block.chainid != 31337) revert LocalOnly();
    _CONFIGURER = msg.sender;
  }

  /// @notice One-time wiring for local construction only; not production factory attestation.
  /// @param source Arena bound back to this consumer.
  function configureArena(address source) external {
    if (
      msg.sender != _CONFIGURER ||
      address(arena) != address(0) ||
      source.code.length == 0
    ) revert InvalidSetup();
    HiddenScoreArenaLab value = HiddenScoreArenaLab(source);
    if (value.CONSUMER() != address(this)) revert InvalidSetup();
    arena = value;
  }

  /// @notice Derives each entitlement with FHE; no caller/backend supplies a winning player.
  /// @param roundId Existing terminal Arena round, recorded at most once.
  function record(uint64 roundId) external {
    if (address(arena) == address(0)) revert InvalidSetup();
    if (recorded[roundId]) revert AlreadyRecorded();
    recorded[roundId] = true;
    (address[2] memory players, euint8 outcome) = arena.shareFinalizedOutcome(
      roundId
    );
    euint64 first = FHE.select(
      FHE.eq(outcome, 1),
      FHE.asEuint64(2),
      FHE.select(FHE.eq(outcome, 2), FHE.asEuint64(0), FHE.asEuint64(1))
    );
    units[roundId][0] = first;
    units[roundId][1] = FHE.sub(FHE.asEuint64(2), first);
    for (uint8 i; i < 2; ++i) {
      FHE.allowThis(units[roundId][i]);
      FHE.allow(units[roundId][i], players[i]);
    }
  }
}
