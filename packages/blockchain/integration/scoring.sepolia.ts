import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  parseAbi,
  toHex,
  keccak256,
  type Abi,
  type Address,
  type Hex,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { MemoryStorage, ZamaSDK } from '@zama-fhe/sdk';
import { createConfig } from '@zama-fhe/sdk/viem';
import { node } from '@zama-fhe/sdk/node';
import { sepolia as fheSepolia } from '@zama-fhe/sdk/chains';
import {
  MAX_GAS_PER_TX,
  assertReviewedOperator,
  readBudgetLedger,
  reserveGasBudget,
} from '../../../contracts/scripts/sepolia-policy.js';
import {
  isAclDenial,
  maskImmutables,
  packAnswer,
  readSettings,
} from './support.js';
import {
  CREATION_HASH,
  integrationCeilings,
  scoringAbi as abi,
} from './reviewed-deployment.js';
const aclAbi = parseAbi([
  'function persistAllowed(bytes32 handle, address account) view returns (bool)',
  'function isAllowedForDecryption(bytes32 handle) view returns (bool)',
]);

// Separate explicit command: never imported by local Hardhat tests or application code.
// No deployment path exists here. Never dump errors, requests, keys or SDK events.
test(
  'Sepolia encrypted scoring with the current SDK (existing deployment only)',
  { timeout: 1_200_000 },
  async (t) => {
    let stage = 'configuration';
    const sdks: ZamaSDK[] = [];
    try {
      const settings = readSettings(process.env);
      const ceilings = integrationCeilings(settings.maxFeePerGas);
      assert.ok(
        ceilings.total <= readBudgetLedger().remainingWei,
        'Insufficient aggregate headroom for complete three-write integration',
      );
      const operator = privateKeyToAccount(settings.operatorKey);
      assertReviewedOperator(operator.address);
      const player = privateKeyToAccount(settings.playerKey);
      const stranger = privateKeyToAccount(generatePrivateKey());
      assert.notEqual(
        operator.address,
        player.address,
        'Operator and player must differ',
      );
      const client = createPublicClient({
        chain: sepolia,
        transport: http(settings.rpc, { timeout: 30_000, retryCount: 0 }),
      });
      stage = 'network and deployment identity';
      assert.equal(await client.getChainId(), 11155111);
      const code = await client.getCode({ address: settings.address });
      assert.ok(code && code !== '0x', 'Existing scoring deployment required');
      // Compare the entire compiled runtime, masking only compiler-declared immutables.
      const artifactDir = new URL(
        '../../../contracts/artifacts/src/CipherQuizScoring.sol/',
        import.meta.url,
      );
      const artifact = JSON.parse(
        await readFile(new URL('CipherQuizScoring.json', artifactDir), 'utf8'),
      ) as { abi: Abi; bytecode: Hex; deployedBytecode: Hex };
      assert.equal(keccak256(artifact.bytecode), CREATION_HASH);
      const dbg = JSON.parse(
        await readFile(
          new URL('CipherQuizScoring.dbg.json', artifactDir),
          'utf8',
        ),
      ) as { buildInfo: string };
      const build = JSON.parse(
        await readFile(
          new URL(dbg.buildInfo.replaceAll('\\', '/'), artifactDir),
          'utf8',
        ),
      ) as {
        output: {
          contracts: Record<
            string,
            Record<
              string,
              {
                evm: {
                  deployedBytecode: {
                    immutableReferences: Record<
                      string,
                      { start: number; length: number }[]
                    >;
                  };
                };
              }
            >
          >;
        };
      };
      const refs =
        build.output.contracts['src/CipherQuizScoring.sol']?.CipherQuizScoring
          ?.evm.deployedBytecode.immutableReferences;
      assert.ok(
        refs,
        'Compiler immutable references required; run contracts build',
      );
      assert.equal(
        maskImmutables(code, refs),
        maskImmutables(artifact.deployedBytecode, refs),
        'Deployed runtime differs from reviewed artifact',
      );
      assert.equal(
        getAddress(
          await client.readContract({
            address: settings.address,
            abi,
            functionName: 'OPERATOR',
          }),
        ),
        operator.address,
      );
      assert.equal(
        await client.readContract({
          address: settings.address,
          abi,
          functionName: 'confidentialProtocolId',
        }),
        10001n,
      );

      // Slot/layout pinned to installed @fhevm/solidity 0.11.1 lib/Impl.sol.
      const configSlot = BigInt(
        '0x9e7b61f58c47dc699ac88507c4f5bb9f121c03808c5676a8078fe583e4649700',
      );
      const stored: Address[] = [];
      for (let index = 0; index < 3; index++) {
        const word = await client.getStorageAt({
          address: settings.address,
          slot: toHex(configSlot + BigInt(index), { size: 32 }),
        });
        assert.ok(word);
        stored.push(getAddress(`0x${word.slice(-40)}`));
      }
      const [acl, executor, kms] = stored as [Address, Address, Address];
      assert.equal(acl, getAddress(fheSepolia.aclContractAddress));
      assert.equal(
        executor,
        getAddress('0x92C920834Ec8941d2C77D188936E1f7A6f49c127'),
      );
      assert.equal(kms, getAddress(fheSepolia.kmsContractAddress));
      const inputVerifier = await client.readContract({
        address: executor,
        abi: parseAbi([
          'function getInputVerifierAddress() view returns (address)',
        ]),
        functionName: 'getInputVerifierAddress',
      });
      assert.equal(
        getAddress(inputVerifier),
        getAddress(fheSepolia.inputVerifierContractAddress),
      );
      for (const address of [acl, executor, kms, inputVerifier]) {
        const infrastructureCode = await client.getCode({ address });
        assert.ok(
          infrastructureCode && infrastructureCode !== '0x',
          'FHEVM infrastructure missing',
        );
      }
      for (const [account, requiredBalance] of [
        [operator, ceilings.operator],
        [player, ceilings.player],
      ] as const) {
        assert.ok(
          (await client.getBalance({ address: account.address })) >=
            requiredBalance,
          'Signer needs funding for its complete integration ceiling',
        );
      }
      t.diagnostic(
        JSON.stringify({
          stage,
          status: 'verified',
          chainId: 11155111,
          contract: settings.address,
          runtimeHash: keccak256(code),
          acl,
          executor,
          kms,
          inputVerifier,
        }),
      );

      const chain = { ...fheSepolia, network: settings.rpc };
      function actor(account: typeof operator) {
        const wallet = createWalletClient({
          account,
          chain: sepolia,
          transport: http(settings.rpc, { timeout: 30_000, retryCount: 0 }),
        });
        const sdk = new ZamaSDK(
          createConfig({
            chains: [chain],
            publicClient: client,
            walletClient: wallet,
            storage: new MemoryStorage(),
            permitStorage: new MemoryStorage(),
            relayers: { [chain.id]: node({ timeout: 180_000, debug: false }) },
            logger: { info() {}, debug() {}, warn() {}, error() {} },
          }),
        );
        sdks.push(sdk);
        return { account, wallet, sdk };
      }
      const author = actor(operator);
      const participant = actor(player);
      const outsider = actor(stranger);
      let spent = 0n;
      async function send(
        who: ReturnType<typeof actor>,
        functionName: 'createRound' | 'submitAnswers' | 'finalizeRound',
        args: readonly unknown[],
      ) {
        const started = Date.now();
        const data = {
          address: settings.address,
          abi: artifact.abi,
          functionName,
          args,
          account: who.account,
        };
        t.signal.throwIfAborted();
        await client.simulateContract(data);
        const estimate = await client.estimateContractGas(data);
        const gas = (estimate * 120n + 99n) / 100n;
        assert.ok(gas <= MAX_GAS_PER_TX, 'Transaction gas ceiling exceeded');
        const fees = await client.estimateFeesPerGas();
        assert.ok(
          fees.maxFeePerGas <= settings.maxFeePerGas,
          'Fee cap exceeded',
        );
        assert.ok(fees.maxPriorityFeePerGas <= settings.maxFeePerGas);
        assert.ok(
          spent + gas * settings.maxFeePerGas <= settings.totalGasBudget,
          'Total fee budget exceeded',
        );
        assert.ok(
          (await client.getBalance({ address: who.account.address })) >=
            gas * settings.maxFeePerGas,
          'Signer needs Sepolia ETH',
        );
        t.signal.throwIfAborted();
        const reservation = reserveGasBudget(
          functionName,
          gas,
          settings.maxFeePerGas,
        );
        t.diagnostic(
          JSON.stringify({
            operation: functionName,
            budgetReservationId: reservation.id,
            reservedWei: reservation.reservedWei.toString(),
            aggregateRemainingWei: reservation.remainingWei.toString(),
          }),
        );
        const hash = await who.wallet.writeContract({
          ...data,
          gas,
          type: 'eip1559',
          maxFeePerGas: settings.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        // Log hash immediately: a failed wait must not hide an already-broadcast transaction.
        t.diagnostic(
          JSON.stringify({
            operation: functionName,
            transactionHash: hash,
            status: 'broadcast',
          }),
        );
        const receipt = await client.waitForTransactionReceipt({
          hash,
          confirmations: 2,
          timeout: 180_000,
        });
        const fee = receipt.gasUsed * receipt.effectiveGasPrice;
        spent += fee;
        t.diagnostic(
          JSON.stringify({
            operation: functionName,
            transactionHash: hash,
            blockNumber: receipt.blockNumber.toString(),
            sender: who.account.address,
            gasEstimate: estimate.toString(),
            gasLimit: gas.toString(),
            gasUsed: receipt.gasUsed.toString(),
            feeWei: fee.toString(),
            totalFeeWei: spent.toString(),
            status: receipt.status,
            elapsedMs: Date.now() - started,
          }),
        );
        assert.equal(receipt.status, 'success');
        return receipt;
      }
      async function rejectsAction(
        account: typeof operator,
        functionName: 'createRound' | 'submitAnswers' | 'finalizeRound',
        args: readonly unknown[],
        expectedError: string,
      ) {
        await assert.rejects(
          client.simulateContract({
            address: settings.address,
            abi: artifact.abi,
            functionName,
            args,
            account,
          }),
          (error) => {
            if (!(error instanceof BaseError)) return false;
            const revert = error.walk(
              (cause) => cause instanceof ContractFunctionRevertedError,
            );
            return (
              revert instanceof ContractFunctionRevertedError &&
              revert.data?.errorName === expectedError
            );
          },
        );
        t.diagnostic(
          JSON.stringify({
            operation: functionName,
            expectedError,
            status: 'verified-eth-call-revert',
            broadcast: false,
          }),
        );
      }
      async function allowed(handle: Hex, account: Address) {
        return client.readContract({
          address: acl,
          abi: aclAbi,
          functionName: 'persistAllowed',
          args: [handle, account],
        });
      }
      async function deny(sdk: ZamaSDK, handle: Hex, label: string) {
        // Explicitly scope any new offchain permit to this scoring contract only.
        await sdk.permits.grantPermit([settings.address]);
        await assert.rejects(
          sdk.decryption.decryptValues(
            [{ encryptedValue: handle, contractAddress: settings.address }],
            { timeout: 180_000, signal: t.signal },
          ),
          isAclDenial,
        );
        t.diagnostic(
          JSON.stringify({
            operation: label,
            status: 'verified-sdk-acl-denial',
            remoteKmsDenial: 'not-tested-sdk-preflight',
          }),
        );
      }
      const keys = Array.from({ length: 4 }, () => BigInt(randomInt(4)));
      stage = 'real key encryption and input proof';
      const keyEncryptionStarted = Date.now();
      const encryptedKeys = await author.sdk.encrypt(
        {
          values: keys.map((value) => ({ type: 'euint64', value })),
          contractAddress: settings.address,
          userAddress: operator.address,
        },
        { signal: t.signal },
      );
      assert.equal(encryptedKeys.encryptedValues.length, 4);
      assert.ok(encryptedKeys.inputProof.length > 2);
      t.diagnostic(
        JSON.stringify({
          operation: stage,
          elapsedMs: Date.now() - keyEncryptionStarted,
        }),
      );
      const block = await client.getBlock();
      stage = 'round creation';
      const receipt = await send(author, 'createRound', [
        player.address,
        block.timestamp + 3600n,
        keccak256(toHex('CipherQuiz Sepolia disposable public fixture v1')),
        encryptedKeys.encryptedValues,
        encryptedKeys.inputProof,
      ]);
      const event = receipt.logs
        .filter(
          (log) => log.address.toLowerCase() === settings.address.toLowerCase(),
        )
        .map((log) => {
          try {
            return decodeEventLog({ abi, data: log.data, topics: log.topics });
          } catch {
            return undefined;
          }
        })
        .find((log) => log?.eventName === 'RoundOpened');
      assert.ok(event && event.eventName === 'RoundOpened');
      const roundId = event.args.roundId;
      assert.equal(getAddress(event.args.player), player.address);
      t.diagnostic(
        JSON.stringify({ roundId: roundId.toString(), status: 'opened' }),
      );
      stage =
        'unauthorized creation and premature finalization (eth_call only)';
      await rejectsAction(
        player,
        'createRound',
        [
          player.address,
          block.timestamp + 3600n,
          keccak256(toHex('CipherQuiz Sepolia disposable public fixture v1')),
          encryptedKeys.encryptedValues,
          encryptedKeys.inputProof,
        ],
        'Unauthorized',
      );
      await rejectsAction(stranger, 'finalizeRound', [roundId], 'Unauthorized');
      await rejectsAction(player, 'finalizeRound', [roundId], 'NotCompleted');
      for (let index = 0; index < keys.length; index++) {
        const handle = await client.readContract({
          address: settings.address,
          abi,
          functionName: 'getKeyHandle',
          args: [roundId, BigInt(index)],
        });
        assert.equal(await allowed(handle, settings.address), true);
        assert.equal(await allowed(handle, player.address), false);
        assert.equal(await allowed(handle, stranger.address), false);
        assert.equal(
          await client.readContract({
            address: acl,
            abi: aclAbi,
            functionName: 'isAllowedForDecryption',
            args: [handle],
          }),
          false,
        );
      }
      stage = 'real answer encryption and input proof';
      const answerEncryptionStarted = Date.now();
      const answers = keys.map((key, index) =>
        packAnswer(roundId, index, index < 2 ? key : (key + 1n) % 4n),
      );
      const encryptedAnswers = await participant.sdk.encrypt(
        {
          values: answers.map((value) => ({ type: 'euint64', value })),
          contractAddress: settings.address,
          userAddress: player.address,
        },
        { signal: t.signal },
      );
      assert.ok(encryptedAnswers.inputProof.length > 2);
      t.diagnostic(
        JSON.stringify({
          operation: stage,
          elapsedMs: Date.now() - answerEncryptionStarted,
        }),
      );
      stage = 'unauthorized and partial submission (eth_call only)';
      await rejectsAction(
        stranger,
        'submitAnswers',
        [
          roundId,
          encryptedAnswers.encryptedValues,
          encryptedAnswers.inputProof,
        ],
        'Unauthorized',
      );
      await rejectsAction(
        player,
        'submitAnswers',
        [
          roundId,
          encryptedAnswers.encryptedValues.slice(1),
          encryptedAnswers.inputProof,
        ],
        'InvalidSetup',
      );
      stage = 'invalid proof rejection (eth_call only)';
      await assert.rejects(
        client.simulateContract({
          address: settings.address,
          abi,
          functionName: 'submitAnswers',
          args: [roundId, encryptedAnswers.encryptedValues, '0x1234'],
          account: player,
        }),
        (error) =>
          error instanceof BaseError &&
          error.walk(
            (cause) => cause instanceof ContractFunctionRevertedError,
          ) instanceof ContractFunctionRevertedError,
      );
      stage = 'encrypted submission and score ACL';
      await send(participant, 'submitAnswers', [
        roundId,
        encryptedAnswers.encryptedValues,
        encryptedAnswers.inputProof,
      ]);
      stage = 'duplicate submission (eth_call only)';
      await rejectsAction(
        player,
        'submitAnswers',
        [
          roundId,
          encryptedAnswers.encryptedValues,
          encryptedAnswers.inputProof,
        ],
        'InvalidState',
      );
      const submitted = await client.readContract({
        address: settings.address,
        abi,
        functionName: 'getRound',
        args: [roundId],
      });
      const score = submitted[4];
      assert.equal(submitted[3], 2);
      assert.notEqual(score, toHex(0, { size: 32 }));
      assert.equal(await allowed(score, settings.address), true);
      assert.equal(await allowed(score, player.address), false);
      assert.equal(await allowed(score, operator.address), false);
      assert.equal(await allowed(score, stranger.address), false);
      await deny(participant.sdk, score, 'player before finalization');
      stage = 'finalization and final ACL';
      await send(author, 'finalizeRound', [roundId]);
      stage = 'duplicate finalization (eth_call only)';
      await rejectsAction(player, 'finalizeRound', [roundId], 'InvalidState');
      const finalized = await client.readContract({
        address: settings.address,
        abi,
        functionName: 'getRound',
        args: [roundId],
      });
      assert.equal(finalized[3], 3);
      assert.equal(finalized[4], score);
      assert.equal(await allowed(score, player.address), true);
      assert.equal(await allowed(score, operator.address), false);
      assert.equal(await allowed(score, stranger.address), false);
      assert.equal(
        await client.readContract({
          address: acl,
          abi: aclAbi,
          functionName: 'isAllowedForDecryption',
          args: [score],
        }),
        false,
      );
      stage = 'authorized KMS user decryption';
      await participant.sdk.permits.grantPermit([settings.address]);
      const decryptStarted = Date.now();
      const result = await participant.sdk.decryption.decryptValues(
        [{ encryptedValue: score, contractAddress: settings.address }],
        { timeout: 180_000, signal: t.signal },
      );
      assert.equal(BigInt(result[score] as bigint), 2n);
      t.diagnostic(
        JSON.stringify({
          operation: stage,
          status: 'verified',
          expectedScoreMatched: true,
          elapsedMs: Date.now() - decryptStarted,
        }),
      );
      stage = 'unauthorized user decryption';
      await deny(outsider.sdk, score, 'outsider final score');
      await deny(author.sdk, score, 'operator final score');
      t.diagnostic(
        'Live application workflow completed. Remote KMS denial is NOT established by SDK ACL rejection.',
      );
    } catch (error) {
      // Raw SDK/RPC errors may contain signing material, plaintexts or request bodies.
      const configurationMessage =
        stage === 'configuration' &&
        error instanceof Error &&
        /^(Missing |Set CIPHERQUIZ|Sepolia RPC)/.test(error.message)
          ? `: ${error.message}`
          : '';
      throw new Error(
        `Sepolia integration failed at ${stage}${configurationMessage}. Sensitive error details suppressed.`,
      );
    } finally {
      for (const sdk of sdks) sdk.terminate();
    }
  },
);
