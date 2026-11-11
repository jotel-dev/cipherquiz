import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('wallet pending, rejected, connected, wrong-network, switch and disconnect states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const listeners: Record<string, ((value: unknown) => void)[]> = {};
    const state = {
      chain: '0xaa36a7',
      reject: true,
      accounts: [] as string[],
      requests: [] as string[],
    };
    const provider = {
      isMetaMask: false,
      on(event: string, callback: (value: unknown) => void) {
        (listeners[event] ??= []).push(callback);
      },
      removeListener(event: string, callback: (value: unknown) => void) {
        listeners[event] = (listeners[event] ?? []).filter(
          (item) => item !== callback,
        );
      },
      async request({
        method,
        params,
      }: {
        method: string;
        params?: unknown[];
      }) {
        state.requests.push(method);
        if (method === 'eth_chainId') return state.chain;
        if (method === 'eth_accounts') return state.accounts;
        if (method === 'eth_requestAccounts') {
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (state.reject)
            throw Object.assign(new Error('User rejected request'), {
              code: 4001,
            });
          state.accounts = ['0x1234567890123456789012345678901234567890'];
          return state.accounts;
        }
        if (method === 'wallet_requestPermissions')
          return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_switchEthereumChain') {
          state.chain = (params?.[0] as { chainId: string }).chainId;
          for (const callback of listeners.chainChanged ?? [])
            callback(state.chain);
          return null;
        }
        if (method === 'wallet_revokePermissions') {
          state.accounts = [];
          return null;
        }
        throw new Error(`Unexpected wallet method: ${method}`);
      },
    };
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      configurable: true,
    });
    Object.defineProperty(window, 'walletTestState', { value: state });
    window.addEventListener('wallet-test-allow', () => {
      state.reject = false;
    });
    window.addEventListener('wallet-test-wrong-chain', () => {
      state.chain = '0x1';
      for (const callback of listeners.chainChanged ?? [])
        callback(state.chain);
    });
  });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Connect wallet', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('.wallet-option').click();
  await expect(dialog.getByText('Waiting for your wallet…')).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText(
    'Connection wasn’t completed',
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event('wallet-test-allow')),
  );
  await dialog.locator('.wallet-option').click();
  await expect(
    dialog.getByText('Connected to Sepolia', { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new Event('wallet-test-wrong-chain')),
  );
  await expect(
    dialog.getByText('Your wallet is on an unsupported network.'),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Switch network', exact: true })
    .click();
  await expect(
    dialog.getByText('Connected to Sepolia', { exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog.getByRole('button', { name: 'Disconnect wallet' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Bring your own wallet.' }),
  ).toBeVisible();
  const methods = await page.evaluate(
    () =>
      (window as unknown as { walletTestState: { requests: string[] } })
        .walletTestState.requests,
  );
  expect(
    methods.some((method) =>
      /sendTransaction|sign|sendRawTransaction/i.test(method),
    ),
  ).toBe(false);
});
