const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const root = path.resolve(process.argv[2] || '.');
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('href')),
      '#contenido',
      'The first Tab must focus the skip link',
    );
    const link = page.locator('.skip-link');
    assert.equal(await link.evaluate(e => getComputedStyle(e).visibility), 'visible');
    assert.equal(await link.evaluate(e => getComputedStyle(e).clipPath), 'none');
    const bounds = await link.boundingBox();
    assert(bounds && bounds.y >= 0 && bounds.height > 0, 'Focused link must be on screen');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#contenido');
    console.log('PASS: keyboard skip link is first, visible and navigates to content');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
