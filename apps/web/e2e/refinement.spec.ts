import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

async function navigate(page: Page, width: number, name: string) {
  if (width < 1024)
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const navigation = page.getByRole('navigation', {
    name: width < 1024 ? 'Mobile navigation' : 'Main navigation',
  });
  await navigation.getByRole('link', { name, exact: true }).click();
}

for (const width of [390, 1440]) {
  test(`refined navigation, illustration and approved branding at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const source = await page.request.get('/brand/cipherquiz-approved.png');
    expect(
      createHash('sha256')
        .update(await source.body())
        .digest('hex'),
    ).toBe('37c508940314e3928f2ee82c7049660f7a2cae9b94b3aa0f7ea88c244bb31058');
    const brand = page.locator('.site-header .brand-image');
    await expect(brand).toBeVisible();
    await expect
      .poll(() =>
        brand.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBe(2172);
    expect((await page.request.get('/brand/favicon-64.png')).ok()).toBe(true);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      '/brand/favicon-64.png',
    );
    await expect(
      page.locator('main .category-grid, main .stat-grid, main .payout-table'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Play Now', exact: true }),
    ).toHaveCount(1);
    await expect(
      page
        .locator('.hero-actions')
        .getByRole('link', { name: 'How It Works', exact: true }),
    ).toHaveCount(1);
    await page.getByRole('radio', { name: 'B Jordan', exact: true }).click();
    await expect(page.locator('.preview-feedback')).toContainText(
      'You knew it.',
    );
    await page
      .getByRole('button', { name: 'Try another sample question' })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Which planet is known as the Red Planet?',
      }),
    ).toBeVisible();
    await page.getByRole('radio', { name: 'A Venus', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.preview-feedback')).toContainText(
      'A little wiser already.',
    );
    // Radix defers roving focus; model a physical key press so keyup follows focus.
    await page.keyboard.press('ArrowRight', { delay: 50 });
    await expect(
      page.getByRole('radio', { name: 'B Mars', exact: true }),
    ).toBeChecked();
    await expect(page.locator('.preview-feedback')).toContainText(
      'You knew it.',
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    for (const [name, path] of [
      ['How It Works', '/how-it-works'],
      ['Play', '/dashboard'],
      ['Categories', '/categories'],
      ['Leaderboard', '/leaderboard'],
      ['Profile', '/profile'],
      ['Home', '/'],
    ] as const) {
      await navigate(page, width, name);
      await expect(page).toHaveURL(`http://127.0.0.1:5173${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (name === 'How It Works') {
        await page.screenshot({
          path: resolve(
            process.cwd(),
            `../../docs/frontend/screenshots/how-it-works-${width}.png`,
          ),
          fullPage: true,
          animations: 'disabled',
        });
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
      const fontFamilies = await page
        .locator('main')
        .evaluate((main) => [
          ...new Set(
            Array.from(main.querySelectorAll('*'), (element) =>
              getComputedStyle(element)
                .fontFamily.split(',')[0]
                ?.replaceAll(/["']/g, '')
                .trim(),
            ),
          ),
        ]);
      expect(
        fontFamilies.every((family) =>
          ['Manrope', 'Space Grotesk'].includes(family ?? ''),
        ),
      ).toBe(true);
    }
    await page.goto('/#how-it-works');
    await expect(page).toHaveURL(/\/how-it-works$/);
    await page.goto('/#categories');
    await expect(page).toHaveURL(/\/categories$/);
    await page.goto('/#privacy');
    await expect(page).toHaveURL(/\/how-it-works#confidentiality$/);
    await expect(
      page.getByRole('heading', { name: /Your knowledge\.\s*Your business\./ }),
    ).toBeVisible();
  });
}
