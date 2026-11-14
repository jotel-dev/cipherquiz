import assert from 'node:assert/strict';
import { ethers, fhevm, network } from 'hardhat';
import { FhevmType } from '@fhevm/hardhat-plugin';
import type { BaseContract } from 'ethers';

type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];
const U = 1_000_000n;

describe('local-only ERC7984 staking architecture experiment', function () {
  this.timeout(180000);
  let token: BaseContract, vault: BaseContract, scoring: BaseContract;
  let operator: Signer, player: Signer, house: Signer, stranger: Signer;
  let tokenAddress: string, vaultAddress: string, scoreAddress: string;

  async function deploy(name: string, ...args: unknown[]) {
    const value = await (await ethers.getContractFactory(name)).deploy(...args);
    await value.waitForDeployment();
    return value;
  }
  async function send(
    c: BaseContract,
    signer: Signer,
    method: string,
    ...args: unknown[]
  ) {
    return (await c.connect(signer).getFunction(method)(...args)).wait();
  }
  async function encrypted(target: string, signer: Signer, values: bigint[]) {
    const input = fhevm.createEncryptedInput(target, signer.address);
    for (const value of values) input.add64(value);
    return input.encrypt();
  }
  async function deposit(signer: Signer, amount: bigint, mode = 0) {
    const input = await encrypted(tokenAddress, signer, [amount]);
    return send(
      token,
      signer,
      'confidentialTransferAndCall(address,bytes32,bytes,bytes)',
      vaultAddress,
      input.handles[0],
      input.inputProof,
      ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [mode]),
    );
  }
  async function open(count = 10, source = scoring) {
    const id: bigint = await source.getFunction('nextRoundId')();
    const address = await source.getAddress();
    const input = await encrypted(
      address,
      operator,
      Array<bigint>(count).fill(0n),
    );
    const deadline =
      (await ethers.provider.getBlock('latest'))!.timestamp + 3600;
    await send(
      source,
      operator,
      'createRound',
      player.address,
      deadline,
      ethers.id('local public fixture'),
      input.handles,
      input.inputProof,
    );
    return id;
  }
  async function lock(id: bigint, amount: bigint) {
    const input = await encrypted(vaultAddress, player, [amount]);
    return send(vault, player, 'lock', id, input.handles[0], input.inputProof);
  }
  async function score(id: bigint, correct: number, source = scoring) {
    const address = await source.getAddress();
    const answers = Array.from(
      { length: 10 },
      (_, i) => (id << 16n) | (BigInt(i) << 8n) | (i < correct ? 0n : 1n),
    );
    const input = await encrypted(address, player, answers);
    await send(
      source,
      player,
      'submitAnswers',
      id,
      input.handles,
      input.inputProof,
    );
    await send(source, player, 'finalizeRound', id);
  }
  async function decrypt(
    handle: string,
    signer = player,
    target = vaultAddress,
  ) {
    return fhevm.userDecryptEuint(FhevmType.euint64, handle, target, signer);
  }
  async function credit(signer = player) {
    return decrypt(
      await vault.getFunction('freeBalance')(signer.address),
      signer,
    );
  }
  // The local debugger intentionally bypasses ACL only to check aggregate conservation.
  // Separate user-decryption tests below exercise the real local ACL gate.
  async function conserved(active: bigint[] = []) {
    const clear = (h: string) =>
      h === ethers.ZeroHash
        ? Promise.resolve(0n)
        : fhevm.debugger.decryptEuint(FhevmType.euint64, h);
    const assets = await clear(
      await token.getFunction('confidentialBalanceOf')(vaultAddress),
    );
    let liability = await clear(await vault.getFunction('houseFree')());
    for (const who of [player, house, stranger, operator])
      liability += await clear(
        await vault.getFunction('freeBalance')(who.address),
      );
    for (const id of active) {
      const t = await vault.getFunction('tickets')(id);
      if (!t.settled) liability += 2n * (await clear(t.stake));
    }
    assert.equal(
      assets,
      liability,
      'actual token assets equal free credits plus segregated stake/profit liabilities',
    );
  }

  beforeEach(async () => {
    assert.equal(network.name, 'hardhat');
    assert.equal((await ethers.provider.getNetwork()).chainId, 31337n);
    assert.equal(fhevm.isMock, true);
    [operator, player, house, stranger] = (await ethers.getSigners()) as [
      Signer,
      Signer,
      Signer,
      Signer,
    ];
    token = await deploy('ConfidentialTokenLab');
    tokenAddress = await token.getAddress();
    vault = await deploy(
      'ConfidentialStakeVaultLab',
      tokenAddress,
      house.address,
    );
    vaultAddress = await vault.getAddress();
    scoring = await deploy(
      'ScoringForVaultLab',
      operator.address,
      vaultAddress,
    );
    scoreAddress = await scoring.getAddress();
    await send(vault, operator, 'configureScorer', scoreAddress);
    await send(token, operator, 'mint', player.address, 100n * U);
    await send(token, operator, 'mint', house.address, 1000n * U);
    await deposit(player, 100n * U);
    await deposit(house, 1000n * U, 1);
  });

  for (const correct of [0, 6, 7, 8, 9, 10]) {
    it(`preserves the total-return tier for ${correct}/10 with real encrypted scoring and OZ token accounting`, async () => {
      const id = await open();
      await lock(id, 25n * U);
      assert.equal(await credit(), 75n * U);
      assert.equal(
        await decrypt(await vault.getFunction('houseFree')(), house),
        975n * U,
      );
      await conserved([id]);
      await score(id, correct);
      const receipt = await send(vault, stranger, 'settle', id);
      const factor =
        correct === 10 ? 20n : correct >= 8 ? 15n : correct === 7 ? 12n : 0n;
      const expected = (25n * U * factor) / 10n;
      const ticket = await vault.getFunction('tickets')(id);
      assert.equal(await decrypt(ticket.payout), expected);
      assert.equal(await credit(), 75n * U + expected);
      assert.equal(
        await decrypt(await vault.getFunction('houseFree')(), house),
        1025n * U - expected,
      );
      await conserved([id]);
      await assert.rejects(send(vault, player, 'settle', id));
      if (correct === 10) {
        const hcu = fhevm.computeTransactionHCU(receipt!);
        console.info('LOCAL MOCK ONLY staking settlement planning', {
          gas: receipt!.gasUsed.toString(),
          globalHCU: hcu.globalHCU,
          maxHCUDepth: hcu.maxHCUDepth,
        });
      }
    });
  }

  it('credits the actual zero on an insufficient deposit and rejects spoofed callbacks/capital modes atomically', async () => {
    await deposit(player, 1n * U); // player already deposited its entire token balance
    assert.equal(await credit(), 100n * U);
    await assert.rejects(
      send(
        vault,
        stranger,
        'onConfidentialTransferReceived',
        stranger.address,
        player.address,
        ethers.ZeroHash,
        '0x',
      ),
    );
    await send(token, operator, 'mint', player.address, 10n * U);
    await assert.rejects(deposit(player, 10n * U, 1));
    assert.equal(
      await decrypt(
        await token.getFunction('confidentialBalanceOf')(player.address),
        player,
        tokenAddress,
      ),
      10n * U,
    );
    await conserved();
  });

  it('keeps credits on failed/oversized withdrawals and never lets another caller withdraw a player balance', async () => {
    async function withdraw(who: Signer, amount: bigint) {
      const input = await encrypted(vaultAddress, who, [amount]);
      await send(vault, who, 'withdraw', input.handles[0], input.inputProof);
    }
    await withdraw(stranger, 25n * U);
    await withdraw(player, 101n * U);
    assert.equal(await credit(), 100n * U);
    await send(token, operator, 'blockRecipient', player.address);
    await withdraw(player, 25n * U);
    assert.equal(await credit(), 100n * U);
    assert.equal(
      await decrypt(await vault.getFunction('lastWithdrawal')(player.address)),
      0n,
    );
    await send(token, operator, 'blockRecipient', ethers.ZeroAddress);
    await withdraw(player, 25n * U);
    assert.equal(await credit(), 75n * U);
    assert.equal(
      await decrypt(
        await token.getFunction('confidentialBalanceOf')(player.address),
        player,
        tokenAddress,
      ),
      25n * U,
    );
    await conserved();
  });

  it('verifies the token operator model is time-limited full spending permission, not an ERC20 amount allowance', async () => {
    await send(token, operator, 'mint', player.address, 50n * U);
    const pull = await encrypted(tokenAddress, stranger, [25n * U]);
    const method = 'confidentialTransferFrom(address,address,bytes32,bytes)';
    await assert.rejects(
      send(
        token,
        stranger,
        method,
        player.address,
        stranger.address,
        pull.handles[0],
        pull.inputProof,
      ),
    );
    const until = (await ethers.provider.getBlock('latest'))!.timestamp + 60;
    await send(token, player, 'setOperator', stranger.address, until);
    await send(
      token,
      stranger,
      method,
      player.address,
      stranger.address,
      pull.handles[0],
      pull.inputProof,
    );
    assert.equal(
      await decrypt(
        await token.getFunction('confidentialBalanceOf')(stranger.address),
        stranger,
        tokenAddress,
      ),
      25n * U,
    );
    await ethers.provider.send('evm_setNextBlockTimestamp', [until + 1]);
    await ethers.provider.send('evm_mine', []);
    await assert.rejects(
      send(
        token,
        stranger,
        method,
        player.address,
        stranger.address,
        pull.handles[0],
        pull.inputProof,
      ),
    );
    await conserved();
  });

  it('masks invalid/overflowing stakes and exhausted house liquidity without overcommitting capital', async () => {
    const bad = await open();
    await lock(bad, (1n << 64n) - 1n);
    assert.equal(
      await decrypt((await vault.getFunction('tickets')(bad)).stake),
      0n,
    );
    const withdrawInput = await encrypted(vaultAddress, player, [60n * U]);
    await send(
      vault,
      player,
      'withdraw',
      withdrawInput.handles[0],
      withdrawInput.inputProof,
    );
    const poor = await open();
    await lock(poor, 50n * U);
    assert.equal(
      await decrypt((await vault.getFunction('tickets')(poor)).stake),
      0n,
    );
    assert.equal(await credit(), 40n * U);
    // Two reservations against a one-stake bankroll must not double-allocate it.
    const small = await deploy(
      'ConfidentialStakeVaultLab',
      tokenAddress,
      house.address,
    );
    const smallAddress = await small.getAddress();
    const smallScore = await deploy(
      'ScoringForVaultLab',
      operator.address,
      smallAddress,
    );
    await send(
      small,
      operator,
      'configureScorer',
      await smallScore.getAddress(),
    );
    await send(token, operator, 'mint', house.address, 25n * U);
    const bankInput = await encrypted(tokenAddress, house, [25n * U]);
    await send(
      token,
      house,
      'confidentialTransferAndCall(address,bytes32,bytes,bytes)',
      smallAddress,
      bankInput.handles[0],
      bankInput.inputProof,
      ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [1]),
    );
    await send(token, operator, 'mint', player.address, 100n * U);
    const input = await encrypted(tokenAddress, player, [100n * U]);
    await send(
      token,
      player,
      'confidentialTransferAndCall(address,bytes32,bytes,bytes)',
      smallAddress,
      input.handles[0],
      input.inputProof,
      ethers.AbiCoder.defaultAbiCoder().encode(['uint8'], [0]),
    );
    for (let n = 0; n < 2; n++) {
      const id = await open(10, smallScore);
      const stake = await encrypted(smallAddress, player, [25n * U]);
      await send(small, player, 'lock', id, stake.handles[0], stake.inputProof);
      assert.equal(
        await decrypt(
          (await small.getFunction('tickets')(id)).stake,
          player,
          smallAddress,
        ),
        n === 0 ? 25n * U : 0n,
      );
    }
    assert.equal(
      await decrypt(
        await small.getFunction('freeBalance')(player.address),
        player,
        smallAddress,
      ),
      75n * U,
    );
    assert.equal(
      await decrypt(
        await small.getFunction('houseFree')(),
        house,
        smallAddress,
      ),
      0n,
    );
    await conserved([bad, poor]);
  });

  it('rejects four-question or post-submission admission, premature settlement and wrong proof binding', async () => {
    const four = await open(4);
    await assert.rejects(lock(four, 25n * U));
    const id = await open();
    const wrong = await encrypted(tokenAddress, player, [25n * U]);
    await assert.rejects(
      send(vault, player, 'lock', id, wrong.handles[0], wrong.inputProof),
    );
    await lock(id, 25n * U);
    await assert.rejects(send(vault, player, 'settle', id));
    await score(id, 10);
    await assert.rejects(lock(id, 25n * U));
    const late = await open();
    await score(late, 10);
    await assert.rejects(lock(late, 25n * U)); // no ticket existed before the score became known
    const expired = await open();
    const deadline = (await scoring.getFunction('getRound')(expired)).deadline;
    await ethers.provider.send('evm_setNextBlockTimestamp', [Number(deadline)]);
    await ethers.provider.send('evm_mine', []);
    await assert.rejects(lock(expired, 25n * U));
    await assert.rejects(
      send(vault, operator, 'configureScorer', scoreAddress),
    );
  });

  it('grants only player credit/payout access, and uses only transient score access for settlement', async () => {
    const id = await open();
    await lock(id, 25n * U);
    await score(id, 7);
    await assert.rejects(send(scoring, stranger, 'shareFinalizedScore', id));
    await send(vault, stranger, 'settle', id);
    const payout = (await vault.getFunction('tickets')(id)).payout;
    for (const who of [stranger, operator, house])
      await assert.rejects(decrypt(payout, who), /not authorized|not allowed/i);
    await assert.rejects(
      fhevm.publicDecryptEuint(FhevmType.euint64, payout),
      /not authorized|not allowed/i,
    );
    const scoreHandle = (await scoring.getFunction('getRound')(id)).score;
    const { ACLAddress } = await fhevm.getCoprocessorConfig(scoreAddress);
    const acl = new ethers.Contract(
      ACLAddress,
      ['function persistAllowed(bytes32,address) view returns(bool)'],
      ethers.provider,
    );
    assert.equal(
      await acl.getFunction('persistAllowed')(scoreHandle, vaultAddress),
      false,
    );
    assert.equal(await decrypt(payout), 30n * U);
  });

  it('demonstrates that unchanged V1 cannot satisfy the new settlement handshake', async () => {
    const legacy = await deploy('CipherQuizScoring', operator.address);
    const other = await deploy(
      'ConfidentialStakeVaultLab',
      tokenAddress,
      house.address,
    );
    await send(other, operator, 'configureScorer', await legacy.getAddress());
    const id = await open(10, legacy);
    const input = await encrypted(await other.getAddress(), player, [25n * U]);
    await send(other, player, 'lock', id, input.handles[0], input.inputProof); // encrypted zero admission, no funds
    await score(id, 10, legacy);
    await assert.rejects(send(other, player, 'settle', id));
    assert.equal((await other.getFunction('tickets')(id)).settled, false);
  });
});
