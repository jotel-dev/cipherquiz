// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {
  FHE,
  ebool,
  euint8,
  euint64,
  externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CipherQuizFoundation} from "../CipherQuizFoundation.sol";

/// @title IScoringForVaultLab
/// @author CipherQuiz contributors
/// @notice Local experiment interface; the sharing method does not exist on deployed V1.
interface IScoringForVaultLab {
  /// @notice Reads authenticated round metadata.
  /// @param roundId Source round identifier.
  function getRound(
    uint64 roundId
  ) external view returns (address, uint64, bytes32, uint8, euint8, uint256);
  /// @notice Grants same-transaction vault computation access.
  /// @param roundId Finalized ten-question round.
  function shareFinalizedScore(uint64 roundId) external returns (euint8);
}

/// @title ConfidentialStakeVaultLab
/// @author CipherQuiz contributors
/// @notice Local-only token/accounting/composition experiment. Not an audited or production vault.
/// @dev Omits production activation, refunds, treasury withdrawal, pausing and content integrity.
contract ConfidentialStakeVaultLab is
  CipherQuizFoundation,
  IERC7984Receiver,
  ReentrancyGuard
{
  /// @notice Only token allowed to credit deposits.
  IERC7984 public immutable TOKEN;
  /// @notice Local capital provider and private house-ledger viewer.
  address public immutable HOUSE;
  address private immutable _CONFIGURER;
  /// @notice Source configured exactly once for the local experiment.
  IScoringForVaultLab public scorer;
  /// @notice Six-decimal base-unit scale used only by this fixture's fixed menu.
  uint64 public constant UNIT = 1_000_000;
  /// @notice Free player credits; getters reveal handles, not amounts.
  mapping(address => euint64) public freeBalance;
  /// @notice Actual last withdrawal handle, private to its owner.
  mapping(address => euint64) public lastWithdrawal;
  /// @notice Unreserved house capital; explicitly visible to HOUSE in this lab.
  euint64 public houseFree;

  struct Ticket {
    address player;
    bool settled;
    euint64 stake;
    ebool admitted;
    euint64 payout;
  }
  /// @notice One local ticket per source round; settled tickets retain metadata only.
  mapping(uint64 => Ticket) public tickets;

  error LocalOnly();
  error InvalidSetup();
  error Unauthorized();
  error InvalidRound();

  /// @param token Local allowlisted reference token.
  /// @param house Local capital provider (separate from scoring publisher).
  // solhint-disable-next-line func-visibility
  constructor(address token, address house) {
    if (block.chainid != 31337) revert LocalOnly();
    if (token == address(0) || house == address(0)) revert InvalidSetup();
    TOKEN = IERC7984(token);
    HOUSE = house;
    _CONFIGURER = msg.sender;
  }

  /// @notice One-time local wiring to break constructor address circularity.
  /// @param source New local score-sharing fixture.
  function configureScorer(address source) external {
    if (msg.sender != _CONFIGURER) revert Unauthorized();
    if (address(scorer) != address(0) || source.code.length == 0)
      revert InvalidSetup();
    scorer = IScoringForVaultLab(source);
  }

  /// @notice Credits the actual incoming transfer, never the requested amount.
  /// @param from Original token holder, always the credited user.
  /// @param amount Actual transfer supplied by the trusted token.
  /// @param data ABI-encoded uint8: 0 user deposit, 1 house capital.
  /// @return accepted Always encrypted true; public invalid setup reverts atomically.
  function onConfidentialTransferReceived(
    address,
    address from,
    euint64 amount,
    bytes calldata data
  ) external nonReentrant returns (ebool accepted) {
    if (msg.sender != address(TOKEN) || from == address(0))
      revert Unauthorized();
    uint8 mode = abi.decode(data, (uint8));
    if (mode == 0) {
      freeBalance[from] = _persist(FHE.add(freeBalance[from], amount), from);
    } else if (mode == 1 && from == HOUSE) {
      houseFree = _persist(FHE.add(houseFree, amount), HOUSE);
    } else revert InvalidSetup();
    accepted = FHE.asEbool(true);
    FHE.allowTransient(accepted, address(TOKEN));
  }

  /// @notice Locks before submission, with encrypted balance/liquidity/menu checks.
  /// @param roundId An Open ten-question round; one ticket per source round.
  /// @param externalStake Stake encrypted for this vault and player.
  /// @param proof Bound input proof.
  function lock(
    uint64 roundId,
    externalEuint64 externalStake,
    bytes calldata proof
  ) external nonReentrant {
    (address player, uint64 deadline, , uint8 state, , uint256 count) = scorer
      .getRound(roundId);
    if (player != msg.sender) revert Unauthorized();
    if (
      tickets[roundId].player != address(0) ||
      state != 1 ||
      count != 10 ||
      // solhint-disable-next-line gas-strict-inequalities
      block.timestamp >= deadline
    ) revert InvalidRound();
    euint64 requested = FHE.fromExternal(externalStake, proof);
    ebool menu = FHE.or(
      FHE.eq(requested, 10 * UNIT),
      FHE.or(FHE.eq(requested, 25 * UNIT), FHE.eq(requested, 50 * UNIT))
    );
    ebool admitted = FHE.and(
      menu,
      FHE.and(
        FHE.ge(freeBalance[player], requested),
        FHE.ge(houseFree, requested)
      )
    );
    euint64 stake = FHE.select(admitted, requested, FHE.asEuint64(0));
    freeBalance[player] = _persist(FHE.sub(freeBalance[player], stake), player);
    houseFree = _persist(FHE.sub(houseFree, stake), HOUSE);
    FHE.allowThis(admitted);
    FHE.allow(admitted, player);
    tickets[roundId] = Ticket(
      player,
      false,
      _persist(stake, player),
      admitted,
      euint64.wrap(bytes32(0))
    );
  }

  /// @notice Credits a total return once, consuming only the source's exact finalized score.
  /// @param roundId Previously locked local round.
  function settle(uint64 roundId) external nonReentrant {
    Ticket storage ticket = tickets[roundId];
    if (ticket.player == address(0) || ticket.settled) revert InvalidRound();
    (address player, , , uint8 state, , uint256 count) = scorer.getRound(
      roundId
    );
    if (player != ticket.player || state != 3 || count != 10)
      revert InvalidRound();
    ticket.settled = true;
    euint8 score = scorer.shareFinalizedScore(roundId);
    // All admitted stakes are multiples of 10 base units. Divide first to avoid
    // intermediate multiplication overflow; the menu also bounds every product.
    euint64 tenth = FHE.div(ticket.stake, uint64(10));
    euint64 payout = FHE.select(
      FHE.eq(score, uint8(10)),
      FHE.mul(tenth, uint64(20)),
      FHE.select(
        FHE.and(FHE.ge(score, uint8(8)), FHE.le(score, uint8(9))),
        FHE.mul(tenth, uint64(15)),
        FHE.select(
          FHE.eq(score, uint8(7)),
          FHE.mul(tenth, uint64(12)),
          FHE.asEuint64(0)
        )
      )
    );
    freeBalance[player] = _persist(
      FHE.add(freeBalance[player], payout),
      player
    );
    houseFree = _persist(
      FHE.add(houseFree, FHE.sub(FHE.mul(ticket.stake, uint64(2)), payout)),
      HOUSE
    );
    ticket.payout = _persist(payout, player);
    // Keep the original stake as audit metadata; settled=true removes its liability.
  }

  /// @notice Withdraws only the caller's free funds; retains credit for any zero/short transfer.
  /// @param externalAmount Requested base units encrypted for this vault and caller.
  /// @param proof Bound input proof.
  function withdraw(
    externalEuint64 externalAmount,
    bytes calldata proof
  ) external nonReentrant {
    euint64 requested = FHE.fromExternal(externalAmount, proof);
    euint64 selected = FHE.select(
      FHE.ge(freeBalance[msg.sender], requested),
      requested,
      FHE.asEuint64(0)
    );
    freeBalance[msg.sender] = _persist(
      FHE.sub(freeBalance[msg.sender], selected),
      msg.sender
    );
    FHE.allowTransient(selected, address(TOKEN));
    euint64 actual = TOKEN.confidentialTransfer(msg.sender, selected);
    freeBalance[msg.sender] = _persist(
      FHE.add(freeBalance[msg.sender], FHE.sub(selected, actual)),
      msg.sender
    );
    lastWithdrawal[msg.sender] = _persist(actual, msg.sender);
  }

  function _persist(euint64 value, address viewer) private returns (euint64) {
    FHE.allowThis(value);
    FHE.allow(value, viewer);
    return value;
  }
}
