const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'allin-reflow-'));
  fs.mkdirSync(path.join(profile, 'Default'));
  fs.writeFileSync(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
    webkit: { webprefs: { default_font_size: 28 } },
  }));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    viewport: { width: 360, height: 740 },
  });
  try {
    const page = context.pages()[0];
    await page.goto(pathToFileURL(path.resolve(process.argv[2] || '.', 'index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '28px');
    await page.locator('details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
      'Large browser text must not create horizontal scrolling',
    );
    for (const answer of await page.locator('details p').all()) {
      assert(await answer.evaluate(e => e.scrollHeight <= e.clientHeight), 'FAQ answer must not clip');
    }
    console.log('PASS: actual 28px browser preference reflows at 360px and FAQ answers do not clip');
  } finally {
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
