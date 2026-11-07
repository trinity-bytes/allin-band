/**
 * Horizontal journey (sections 03 to 07) and the morning pulse.
 * Run: PLAYWRIGHT_CORE_PATH=... CHROMIUM_PATH=... node tests/journey.cjs [repo root]
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

const PANELS = ['como-funciona', 'tu-decides', 'aviso', 'app', 'pulsera'];
const url = pathToFileURL(path.join(path.resolve(process.argv[2] || '.'), 'index.html')).href;

// Waits until the window has stopped scrolling for a few frames
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise(resolve => {
        let last = -1;
        let still = 0;
        (function tick() {
          if (window.scrollY === last) still += 1;
          else still = 0;
          last = window.scrollY;
          if (still > 6) resolve();
          else requestAnimationFrame(tick);
        })();
      }),
  );
}

function inViewport(page, selectorOrHandle) {
  const check = el => {
    const r = el.getBoundingClientRect();
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w, h,
      inside: r.left >= -1 && r.right <= w + 1 && r.top >= -1 && r.bottom <= h + 1 };
  };
  return typeof selectorOrHandle === 'string'
    ? page.$eval(selectorOrHandle, check)
    : selectorOrHandle.evaluate(check);
}

async function assertStacked(page, label) {
  const report = await page.evaluate(ids => {
    const rects = ids.map(id => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      return { id, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left,
        transform: getComputedStyle(el.parentElement).transform };
    });
    return { rects, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  }, PANELS);
  assert.equal(report.scrollWidth, report.clientWidth, `${label}: no horizontal page scroll`);
  report.rects.forEach((r, i) => {
    assert(Math.abs(r.left) < 1, `${label}: ${r.id} starts at the left edge (left=${r.left})`);
    assert(r.transform === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(r.transform), `${label}: ${r.id} track has no translateX`);
    if (i > 0) assert(r.top >= report.rects[i - 1].bottom - 1, `${label}: ${r.id} sits below ${report.rects[i - 1].id}`);
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const errors = [];
  try {
    /* 1. Desktop: horizontal journey, every panel reachable by its hash link */
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desktop.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url);
    await page.waitForSelector('.journey.is-horizontal', { timeout: 3000 });
    const sideBySide = await page.evaluate(() => {
      const a = document.getElementById('como-funciona').getBoundingClientRect();
      const b = document.getElementById('tu-decides').getBoundingClientRect();
      return Math.abs(a.top - b.top) < 1 && b.left >= a.right - 1;
    });
    assert(sideBySide, 'Desktop panels sit side by side');

    for (const id of PANELS) {
      await page.evaluate(target => {
        let link = document.querySelector(`a[href="#${target}"]`);
        if (!link) {
          link = document.createElement('a');
          link.href = `#${target}`;
          link.textContent = target;
          document.body.prepend(link);
        }
        link.click();
      }, id);
      await page.waitForTimeout(100);
      await settle(page);
      const box = await inViewport(page, `#${id}`);
      assert(box.inside, `#${id} must be fully in the viewport after its hash link (${JSON.stringify(box)})`);
      const heading = await inViewport(page, `#${id} h2`);
      assert(heading.inside, `#${id} heading must be visible`);
      assert.equal(await page.evaluate(() => location.hash), `#${id}`, 'hash is updated');
      const current = await page.$$eval('.nav__link[aria-current="true"]', els => els.map(el => el.getAttribute('href')));
      assert(current.every(href => href === `#${id}`), `Only #${id} may be current in the navbar, got ${current}`);
    }
    console.log('PASS: every journey panel is reached by its hash link at 1440x900');

    /* 2. Keyboard: Tab from the last focusable element before the journey reaches each panel */
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await settle(page);
    await page.evaluate(() => {
      const journey = document.querySelector('.journey');
      const tabbable = Array.from(document.querySelectorAll('a[href], button, [tabindex]')).filter(el => {
        if (el.tabIndex < 0 || el.disabled) return false;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        return el.getClientRects().length > 0;
      });
      const before = tabbable.filter(el => journey.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
      before[before.length - 1].focus();
    });
    const reached = new Set();
    for (let i = 0; i < 40 && reached.size < PANELS.length; i += 1) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(60);
      await settle(page);
      const info = await page.evaluate(ids => {
        const el = document.activeElement;
        const panel = el.closest('section[id]');
        const r = el.getBoundingClientRect();
        const w = document.documentElement.clientWidth;
        return {
          panel: panel && ids.includes(panel.id) ? panel.id : null,
          inside: r.left >= -1 && r.right <= w + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
          desc: el.tagName + (el.id ? '#' + el.id : '') + ' ' + JSON.stringify([r.left, r.top, r.right, r.bottom]),
        };
      }, PANELS);
      if (!info.panel) {
        if (reached.size) break;
        continue;
      }
      assert(info.inside, `Focused element in #${info.panel} must be inside the viewport: ${info.desc}`);
      reached.add(info.panel);
    }
    assert.deepEqual([...reached].sort(), [...PANELS].sort(), 'Tab reaches a focusable element in every panel');
    console.log('PASS: Tab reaches every panel and the focused element is in view');

    /* 4. Pulse: hovering or focusing a timeline item changes the pulse frequency */
    await page.click('a[href="#como-funciona"]');
    await page.waitForTimeout(100);
    await settle(page);
    const bpm = () => page.$eval('.ecg', el => Number(el.dataset.bpm));
    const readout = () => page.$eval('.moment.is-active .readout__value', el => el.textContent.trim());
    const tabs = page.locator('.moments__tab');
    assert.equal(await tabs.count(), 3, 'Three timeline items');
    await tabs.nth(2).hover();
    await page.waitForTimeout(150);
    assert.equal(await bpm(), 124, 'Hovering the alert raises the pulse');
    assert.equal(await readout(), '124');
    assert(await page.$eval('.ecg', el => el.classList.contains('ecg--alert')), 'Alert pulse turns amber');
    await tabs.nth(0).hover();
    await page.waitForTimeout(150);
    assert.equal(await bpm(), 62, 'Hovering the normal morning slows the pulse');
    await page.mouse.move(5, 5);
    await tabs.nth(1).focus();
    await page.waitForTimeout(150);
    assert.equal(await bpm(), 96, 'Focusing a timeline item changes the pulse');
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    assert.equal(await bpm(), 124, 'Arrow keys move along the timeline');
    assert.equal(
      await page.$eval('.moments__tab[aria-selected="true"] .moments__progress', el => getComputedStyle(el).display),
      'none',
      'Once the reader takes the timeline, the auto-advance progress disappears',
    );
    console.log('PASS: hover and focus on the timeline change the pulse frequency');
    await desktop.close();

    /* Auto-advance: about every 6 s while in view; none under reduced motion */
    const auto = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const autoPage = await auto.newPage();
    await autoPage.goto(url + '#como-funciona');
    await autoPage.waitForSelector('.journey.is-horizontal');
    await autoPage.evaluate(() => document.querySelector('a[href="#como-funciona"]').click());
    await settle(autoPage);
    await autoPage.mouse.move(5, 5);
    const startBpm = await autoPage.$eval('.ecg', el => Number(el.dataset.bpm));
    await autoPage.waitForFunction(
      start => Number(document.querySelector('.ecg').dataset.bpm) !== start,
      startBpm,
      { timeout: 8000 },
    );
    console.log('PASS: the morning timeline advances on its own while in view');
    await auto.close();

    /* 3. Vertical fallbacks: reduced motion, mobile, short viewport, no JS */
    const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    reducedPage.on('pageerror', e => errors.push(String(e)));
    await reducedPage.goto(url);
    await reducedPage.waitForTimeout(300);
    assert.equal(await reducedPage.$('.journey.is-horizontal'), null, 'Reduced motion stays vertical');
    await assertStacked(reducedPage, 'reduced motion 1440x900');
    const before = await reducedPage.$eval('.ecg', el => el.dataset.bpm);
    await reducedPage.evaluate(() => document.getElementById('como-funciona').scrollIntoView());
    await reducedPage.waitForTimeout(6800);
    assert.equal(await reducedPage.$eval('.ecg', el => el.dataset.bpm), before, 'No auto-advance under reduced motion');
    await reduced.close();
    console.log('PASS: reduced motion stacks the panels and never auto-advances');

    const fallbacks = [
      { label: 'mobile 390x844', options: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
      { label: 'mobile 360x640', options: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true } },
      { label: 'short viewport 1440x560', options: { viewport: { width: 1440, height: 560 } } },
      { label: 'no JS 1440x900', options: { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false } },
    ];
    for (const { label, options } of fallbacks) {
      const context = await browser.newContext(options);
      const p = await context.newPage();
      p.on('pageerror', e => errors.push(String(e)));
      await p.goto(url);
      await p.waitForTimeout(300);
      assert.equal(await p.$('.journey.is-horizontal'), null, `${label} stays vertical`);
      await assertStacked(p, label);
      if (label.startsWith('no JS')) {
        const states = await p.$$eval('.moment', els => els.filter(el => el.getClientRects().length && getComputedStyle(el).visibility === 'visible').length);
        assert.equal(states, 3, 'Without JS every morning moment is readable');
      }
      await context.close();
    }
    console.log('PASS: mobile, short viewports and no JS stack the panels vertically');

    assert.deepEqual(errors, [], 'No page errors');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
