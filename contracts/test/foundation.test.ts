import assert from 'node:assert/strict';
import { ethers } from 'hardhat';

describe('local toolchain', function () {
  it('runs only against the isolated local Hardhat chain', async function () {
    const network = await ethers.provider.getNetwork();
    assert.equal(network.chainId, 31337n);
  });
});
