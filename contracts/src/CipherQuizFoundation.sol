// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CipherQuizFoundation
/// @author CipherQuiz contributors
/// @notice Abstract compilation boundary only. No gameplay or token functionality.
/// @dev Confirms the official FHEVM library and network config resolve together.
abstract contract CipherQuizFoundation is ZamaEthereumConfig {} // solhint-disable-line no-empty-blocks
