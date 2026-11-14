// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {FHE, euint8, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {HiddenScoreArena} from "../HiddenScoreArena.sol";
import {CipherQuizFoundation} from "../CipherQuizFoundation.sol";

/// @title ArenaEngineConsumerLab
/// @author CipherQuiz contributors
/// @notice Local-only evidence for transient settlement composition; never holds tokens.
contract ArenaEngineConsumerLab is CipherQuizFoundation {
  address private immutable _CONFIGURER;
  /// @notice One-time fixed engine.
  HiddenScoreArena public arena;
  /// @notice Once-only symbolic recording, not a financial claim.
  mapping(uint64 => bytes32) public recordedTerms;
  /// @notice Derived encrypted per-seat units.
  mapping(uint64 => euint64[2]) public units;
  error InvalidSetup();
  error AlreadyRecorded();

  // solhint-disable-next-line func-visibility
  constructor() {
    if (block.chainid != 31337) revert InvalidSetup();
    _CONFIGURER = msg.sender;
  }

  /// @notice Local one-time binding; not a production factory.
  /// @param source Engine reverse-bound to this consumer.
  function configure(address source) external {
    if (
      msg.sender != _CONFIGURER ||
      address(arena) != address(0) ||
      source.code.length == 0
    ) revert InvalidSetup();
    HiddenScoreArena candidate = HiddenScoreArena(source);
    if (candidate.CONSUMER() != address(this)) revert InvalidSetup();
    arena = candidate;
  }

  /// @notice Persists derived units using transient source ACL, permissionlessly and once only.
  /// @param id Terminal source round.
  function record(uint64 id) external {
    if (address(arena) == address(0)) revert InvalidSetup();
    if (recordedTerms[id] != bytes32(0)) revert AlreadyRecorded();
    (
      bytes32 terms,
      address[2] memory players,
      ,
      euint8 outcome,
      euint64[2] memory shares
    ) = arena.shareSettlement(id);
    recordedTerms[id] = terms;
    for (uint8 i; i < 2; ++i) {
      // Force real FHE computation on both original inputs; no raw handle copying claim.
      units[id][i] = FHE.select(
        FHE.eq(outcome, 0),
        FHE.asEuint64(0),
        shares[i]
      );
      FHE.allowThis(units[id][i]);
      FHE.allow(units[id][i], players[i]);
    }
  }
}
