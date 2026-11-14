// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {CipherQuizFoundation} from "../CipherQuizFoundation.sol";

/// @title ArenaInputReuseLab
/// @author CipherQuiz contributors
/// @notice Deliberately permissive local ciphertext issuer for the empty-proof regression only.
contract ArenaInputReuseLab is CipherQuizFoundation {
  /// @notice Ten pre-authorized handles, not externally proved inputs.
  euint64[10] public handles;
  error LocalOnly();

  // solhint-disable-next-line func-visibility
  constructor() {
    if (block.chainid != 31337) revert LocalOnly();
  }

  /// @notice Models the library's permitted intercontract input path, forbidden by Arena rules.
  /// @param owner Account allowed to use each handle.
  /// @param target Engine also allowed to compute, isolating proof enforcement from ACL rejection.
  /// @param values Distinct public dummy words; never production answer material.
  function authorize(
    address owner,
    address target,
    uint64[10] calldata values
  ) external {
    for (uint256 i; i < 10; ++i) {
      handles[i] = FHE.asEuint64(values[i]);
      FHE.allowThis(handles[i]);
      FHE.allow(handles[i], owner);
      FHE.allow(handles[i], target);
    }
  }
}
