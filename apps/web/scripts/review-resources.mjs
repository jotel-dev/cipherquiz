// Optional, read-only visual reference review. Output stays in ignored test-results.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(import.meta.dirname, '../.design-research');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const requested = process.argv.slice(2);
const sources = [
  ['mobbin', 'https://mobbin.com'],
  ['recent', 'https://recent.design'],
  ['supahero', 'https://supahero.io/hero/figma'],
  ['refero', 'https://refero.design'],
  ['checklist', 'https://www.checklist.design'],
  ['originkit', 'https://www.originkit.dev'],
  ['coolors', 'https://coolors.co/faf9f6-ffffff-17151d-6d35e8-eae6f2'],
  ['navbar', 'https://navbar.gallery'],
  ['footer', 'https://footer.design'],
  ['checklist-onboarding', 'https://www.checklist.design/web-app/onboarding'],
  ['checklist-empty', 'https://www.checklist.design/web-app/empty-state'],
  ['checklist-loading', 'https://www.checklist.design/design-system/loading'],
  [
    'checklist-errors',
    'https://www.checklist.design/flows/showing-input-error',
  ],
  ['checklist-modal', 'https://www.checklist.design/design-system/modal'],
].filter(([name]) => !requested.length || requested.includes(name));
const results = [];
try {
  for (let offset = 0; offset < sources.length; offset += 2) {
    const batch = await Promise.all(
      sources.slice(offset, offset + 2).map(async ([name, url]) => {
        const page = await browser.newPage({
          viewport: { width: 1280, height: 900 },
        });
        try {
          const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          });
          await page.waitForTimeout(5000);
          if (name === 'mobbin')
            await page
              .getByText('Joyful onboarding', { exact: true })
              .first()
              .scrollIntoViewIfNeeded({ timeout: 5000 });
          if (name === 'checklist') {
            const links = await page
              .locator('a')
              .evaluateAll((items) =>
                items
                  .filter((item) =>
                    /Onboarding|Loading|Empty State|Showing input error|Modal|Button/.test(
                      item.textContent ?? '',
                    ),
                  )
                  .map((item) => ({ text: item.textContent, url: item.href })),
              );
            console.log(JSON.stringify({ checklistLinks: links.slice(0, 14) }));
          }
          await page.screenshot({
            path: resolve(directory, `${name}.png`),
            timeout: 10000,
          });
          return {
            name,
            url: page.url(),
            status: response?.status(),
            title: await page.title(),
            excerpt: (await page.locator('body').innerText()).slice(0, 1100),
          };
        } catch (error) {
          return { name, url, error: error.message.split('\n')[0] };
        } finally {
          await page.close();
        }
      }),
    );
    results.push(...batch);
    console.log(JSON.stringify(batch));
  }
  await writeFile(
    resolve(directory, 'results.json'),
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
