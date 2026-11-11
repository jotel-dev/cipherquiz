import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QUESTIONS } from '../src/data/questions';

const screenshotDirectory = resolve(
  process.cwd(),
  '../../docs/frontend/screenshots',
);
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
async function accessibility(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map(({ id, nodes }) => ({
      id,
      elements: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}
async function screenshot(page: Page, name: string, width: number) {
  if (![390, 1440].includes(width)) return;
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotDirectory, `${name}-${width}.png`),
    fullPage: !['stake', 'wallet'].includes(name),
    animations: 'disabled',
  });
}

for (const width of [320, 375, 390, 428, 768, 1024, 1440]) {
  test(`complete practice experience at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Great minds.',
    );
    await expect(
      page.getByText(
        'This project is not audited, endorsed or operated by Zama. Use at your own risk.',
      ),
    ).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'landing', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Open navigation menu' }),
      ).toBeFocused();
    }
    await page.getByRole('link', { name: 'Play now', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await noOverflow(page);
    await screenshot(page, 'dashboard', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    await page.getByRole('link', { name: 'Start a practice round' }).click();
    await page.getByRole('radio', { name: /THE WORLD EXPLORER/ }).click();
    await noOverflow(page);
    await screenshot(page, 'categories', width);
    await page.getByRole('button', { name: 'Set up your round' }).click();
    await expect(
      page.getByRole('button', { name: 'Start practice round' }),
    ).toBeDisabled();
    await page.getByRole('radio', { name: '25', exact: true }).click();
    await page.getByLabel('Your pace').selectOption('0');
    await page.getByRole('checkbox').check();
    await screenshot(page, 'stake', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    await page.getByRole('button', { name: 'Start practice round' }).click();
    await expect(page).toHaveURL(/play/);
    await expect(page.getByRole('timer')).toHaveText('At your pace');
    await noOverflow(page);
    await screenshot(page, 'quiz', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    for (const [index, question] of QUESTIONS.Geography.entries()) {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        question.prompt,
      );
      const option = page.getByRole('radio').nth(question.answer);
      expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await option.click();
      await page
        .getByRole('button', {
          name: index === 9 ? 'Finish round' : 'Lock in answer',
        })
        .click();
    }
    await expect(page).toHaveURL(/results/);
    await expect(page.getByText('Your score is ready.')).toBeVisible();
    await screenshot(page, 'sealed-result', width);
    await page
      .getByRole('button', { name: 'Reveal practice result', exact: true })
      .click();
    await expect(page.locator('.result-score')).toHaveText('10/ 10');
    await expect(page.locator('.total-row dd')).toHaveText('50 credits');
    await noOverflow(page);
    await screenshot(page, 'results', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    await page.getByRole('link', { name: 'Your round history' }).click();
    await expect(page.locator('.round-row')).toHaveCount(1);
    await page.getByRole('button', { name: 'Edit display name' }).click();
    await page.getByLabel('Display name').fill('Ada');
    await page.getByRole('button', { name: 'Save display name' }).click();
    await expect(
      page.getByRole('heading', { name: 'Ada', exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'profile', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    await page
      .getByRole('button', { name: 'Connect a wallet', exact: true })
      .click();
    await expect(page.getByText('No browser wallet found')).toBeVisible();
    await screenshot(page, 'wallet', width);
    await page.keyboard.press('Escape');
    // Client-side navigation preserves the session's practice results.
    if (width < 1024) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page
        .getByRole('navigation', { name: 'Mobile navigation' })
        .getByRole('link', { name: 'Leaderboard' })
        .click();
    } else
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Leaderboard' })
        .click();
    await page.getByLabel('Filter by category').selectOption('History');
    await page.getByRole('button', { name: 'This week' }).click();
    await expect(page.getByRole('table')).toContainText('Yesterday');
    await expect(page.getByRole('table')).not.toContainText('The Archivist');
    await noOverflow(page);
    await screenshot(page, 'leaderboard', width);
    if ([390, 1440].includes(width)) await accessibility(page);
    expect(errors).toEqual([]);
  });
}

test('timer expiration, skips, leave confirmation and empty recovery', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/results');
  await expect(page.getByText('No result here just yet.')).toBeVisible();
  await page.getByRole('link', { name: 'Play a practice round' }).click();
  await page.getByRole('radio', { name: /THE LOGICAL MIND/ }).click();
  await page.getByRole('button', { name: 'Set up your round' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start practice round' }).click();
  await page.clock.install();
  await page.clock.fastForward(31000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    QUESTIONS.Mathematics[1]!.prompt,
  );
  await page.getByRole('link', { name: 'Leave round' }).click();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect(page).toHaveURL(/play/);
  for (let index = 1; index < 10; index++)
    await page.getByRole('button', { name: 'Skip question' }).click();
  await page.clock.runFor(900);
  await expect(page).toHaveURL(/results/);
  await page
    .getByRole('button', { name: 'Reveal practice result', exact: true })
    .click();
  await page.clock.runFor(700);
  await expect(page.locator('.result-score')).toHaveText('0/ 10');
  await expect(page.locator('.total-row dd')).toHaveText('0 credits');
});

test('API loading, failed and recovered states', async ({ page }) => {
  await page.route('**/health/live', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await page.goto('/');
  await expect(
    page.getByText('API offline · practice available'),
  ).toBeVisible();
  await page.unroute('**/health/live');
  await page.route('**/health/live', (route) =>
    route.fulfill({ json: { status: 'ok', service: 'cipherquiz-api' } }),
  );
  await page.getByRole('button', { name: 'Retry API connection' }).click();
  await expect(page.getByText('API online')).toBeVisible();
});
