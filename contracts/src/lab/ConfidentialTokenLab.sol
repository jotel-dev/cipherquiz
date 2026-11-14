// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {CipherQuizFoundation} from "../CipherQuizFoundation.sol";

/// @title ConfidentialTokenLab
/// @author CipherQuiz contributors
/// @notice Local-only unrestricted mint/blocked-recipient fixture. Never a production token.
/// @dev Uses the real pinned OZ transfer implementation. The block switch simulates zero transfers.
contract ConfidentialTokenLab is ERC7984, CipherQuizFoundation {
  /// @notice Local zero-transfer failure injection target.
  address public blockedRecipient;

  error LocalOnly();

  // solhint-disable-next-line func-visibility
  constructor() ERC7984("Local Confidential Fixture", "LAB", "") {
    if (block.chainid != 31337) revert LocalOnly();
  }

  /// @notice Unrestricted local fixture mint only.
  /// @param to Recipient.
  /// @param amount Test base units.
  function mint(address to, uint64 amount) external {
    _mint(to, FHE.asEuint64(amount));
  }

  /// @notice Local failure injection, not an OZ API.
  /// @param recipient Recipient whose transfers become encrypted zero.
  function blockRecipient(address recipient) external {
    blockedRecipient = recipient;
  }

  function _update(
    address from,
    address to,
    euint64 amount
  ) internal override returns (euint64) {
    if (to == blockedRecipient) amount = FHE.asEuint64(0);
    return super._update(from, to, amount);
  }
}
