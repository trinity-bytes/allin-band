/**
 * Round 2 of the page outside the journey: disclosure ticker, mobile menu,
 * light shaders, goals, limits stack, FAQ, closing and section joints.
 * Everything goes through the public page. Never pass a Playwright handle to
 * assert: a failed comparison serializes its whole connection graph.
 * Run: PLAYWRIGHT_CORE_PATH=... CHROMIUM_PATH=... node tests/round2-page.cjs [repo root] [name filter]
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

const repo = path.resolve(process.argv[2] || '.');
const filter = process.argv[3] ? new RegExp(process.argv[3], 'i') : null;
const executablePath = process.env.CHROMIUM_PATH || undefined;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const SIZES = [[1440, 900], [1366, 768], [1024, 768], [820, 1180], [390, 844], [360, 640], [844, 390]];
const DISCLOSURE = 'Prototipo académico de Vivessence, UPC 2025. No es un dispositivo médico ni está a la venta. Imágenes ilustrativas.';

let base = '';

function serve() {
  const server = http.createServer((request, response) => {
    const file = path.join(repo, decodeURIComponent(new URL(request.url, 'http://x').pathname));
    fs.readFile(file, (error, body) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain' });
      response.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function open(browser, [width, height], options = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  const page = await context.newPage();
  await page.goto(`${base}/index.html`);
  await page.waitForLoadState('load');
  return { context, page };
}

const jump = (page, y) => page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
const sectionTop = (page, id) =>
  page.evaluate(name => document.getElementById(name).getBoundingClientRect().top + window.scrollY, id);
const box = (page, selector) =>
  page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
const tickerX = page =>
  page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.hero__ticker .ticker__track')).transform).m41);

const tests = {
  'the ticker closes the first viewport at every size': async browser => {
    for (const size of SIZES) {
      const { context, page } = await open(browser, size);
      await page.waitForTimeout(1700);
      const ticker = await box(page, '.hero__ticker');
      assert(ticker, 'the ticker exists');
      const label = size.join('x');
      assert(Math.abs(ticker.bottom - size[1]) <= 1, `${label}: bottom at ${ticker.bottom}`);
      assert(ticker.height <= 48, `${label}: one line, ${ticker.height} px`);
      const cta = await box(page, '.hero__cta');
      const intro = await box(page, '.hero__intro');
      const clear = r => r.bottom <= ticker.top || r.top >= ticker.bottom;
      assert(clear(cta) && clear(intro), `${label}: the ticker covers the hero copy`);
      if (size[1] >= 640) assert(cta.bottom <= ticker.top - 16, `${label}: the copy moved above the ticker`);
      await context.close();
    }
  },

  'the ticker moves to the left and pauses on hover and focus': async browser => {
    const { context, page } = await open(browser, [1440, 900]);
    await page.waitForTimeout(1700);
    const first = await tickerX(page);
    await page.waitForTimeout(500);
    const second = await tickerX(page);
    assert(second < first, `it moves right to left: ${first} then ${second}`);

    await page.locator('.hero__ticker').hover();
    await page.waitForTimeout(100);
    const hovered = await tickerX(page);
    await page.waitForTimeout(400);
    assert.equal(await tickerX(page), hovered, 'hover pauses it');

    await page.mouse.move(10, 10);
    await page.waitForTimeout(100);
    const resumed = await tickerX(page);
    await page.waitForTimeout(300);
    assert.notEqual(await tickerX(page), resumed, 'it resumes');

    await page.locator('.hero__ticker').focus();
    await page.waitForTimeout(100);
    const focused = await tickerX(page);
    await page.waitForTimeout(400);
    assert.equal(await tickerX(page), focused, 'focus pauses it');
    await context.close();
  },

  'assistive technology gets the disclosure once': async browser => {
    const { context, page } = await open(browser, [1440, 900]);
    const r = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.hero__ticker .ticker__track > *'));
      const shown = items.filter(item => !item.closest('[aria-hidden="true"]'));
      return { all: items.length, shown: shown.length, text: shown[0] && shown[0].textContent.trim(), cls: shown[0] && shown[0].className };
    });
    assert(r.all > 1, 'the loop has duplicates');
    assert.equal(r.shown, 1, 'only one copy is exposed');
    assert.equal(r.text, DISCLOSURE);
    assert.match(r.cls, /hero__disclosure/);
    await context.close();
  },

  'the ticker is static and readable under reduced motion and without JS': async browser => {
    for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
      for (const size of [[1440, 900], [390, 844], [844, 390]]) {
        const { context, page } = await open(browser, size, options);
        const label = `${size.join('x')} ${JSON.stringify(options)}`;
        const copies = await page.locator('.hero__ticker .ticker__track > *').count();
        assert.equal(copies, 1, `${label}: no duplicates`);
        const text = await box(page, '.hero__disclosure');
        const ticker = await box(page, '.hero__ticker');
        assert(text.left >= 0 && text.right <= size[0], `${label}: the text fits the width`);
        assert(text.bottom <= size[1] + 1, `${label}: in the first viewport`);
        // Without JS the navbar flows above the hero below 1024, so the end is approximate
        const flows = options.javaScriptEnabled === false && size[0] < 1024;
        if (!flows) assert(Math.abs(ticker.bottom - size[1]) <= 1, `${label}: bottom at ${ticker.bottom}`);
        const name = await page.evaluate(() => getComputedStyle(document.querySelector('.hero__ticker .ticker__track')).animationName);
        assert.equal(name, 'none', `${label}: no animation`);
        const cta = await box(page, '.hero__cta');
        if (size[1] >= 640) assert(cta.bottom <= ticker.top, `${label}: the wrapped text clears the button`);
        await context.close();
      }
    }
  },

  'head and navbar tell the truth in page order': async browser => {
    const { context, page } = await open(browser, [1440, 900]);
    const r = await page.evaluate(() => ({
      og: document.querySelector('meta[property="og:description"]').content,
      links: Array.from(document.querySelectorAll('.nav__link')).map(link => link.getAttribute('href')),
    }));
    assert(!/prueba una alerta/i.test(r.og), r.og);
    assert.deepEqual(r.links, ['#como-funciona', '#app', '#pulsera', '#limites', '#preguntas']);
    await context.close();
  },
  'the mobile menu fills the screen with numbered links and the ticker': async browser => {
    const { context, page } = await open(browser, [390, 844]);
    await page.waitForTimeout(300);
    await page.locator('#navToggle').click();
    await page.waitForTimeout(500);
    const nav = await box(page, '#navMenu');
    assert(nav.top <= 0 && nav.left <= 0 && nav.right >= 390 && nav.bottom >= 844, JSON.stringify(nav));
    const r = await page.evaluate(() => ({
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
      label: document.getElementById('navToggle').textContent.trim(),
      size: parseFloat(getComputedStyle(document.querySelector('.nav__link')).fontSize),
      number: getComputedStyle(document.querySelector('.nav__link'), '::before').content,
      ticker: Boolean(document.querySelector('#navMenu .ticker.is-moving[aria-hidden="true"]')),
      demo: document.querySelector('.nav__demo').getBoundingClientRect().width,
    }));
    assert.equal(r.expanded, 'true');
    assert.equal(r.label, 'Cerrar');
    assert(r.size >= 40, `large links, ${r.size}`);
    assert.match(r.number, /counter|0?1/);
    assert(r.ticker, 'the menu carries the ticker');
    assert(r.demo >= 340, 'full width demo button');
    await context.close();
  },

  'the mobile menu opens softly in under 400 ms': async browser => {
    const { context, page } = await open(browser, [390, 844]);
    await page.waitForTimeout(300);
    await page.locator('#navToggle').click();
    const r = await page.evaluate(() => {
      const nav = document.getElementById('navMenu');
      const running = document.getAnimations().filter(a => a.effect.target && nav.contains(a.effect.target) && a.transitionProperty);
      return {
        count: running.length,
        end: Math.max(0, ...running.map(a => a.effect.getComputedTiming().endTime)),
        props: Array.from(new Set(running.map(a => a.transitionProperty))),
      };
    });
    assert(r.count >= 6, `nav and links animate, ${r.count}`);
    assert(r.end <= 400, `ends at ${r.end}`);
    assert(r.props.every(prop => ['opacity', 'translate', 'visibility'].includes(prop)), r.props.join());
    await context.close();

    const calm = await open(browser, [390, 844], { reducedMotion: 'reduce' });
    await calm.page.locator('#navToggle').click();
    const moving = await calm.page.evaluate(() => document.getAnimations().filter(a => a.transitionProperty).length);
    assert.equal(moving, 0, 'nothing animates under reduced motion');
    await calm.context.close();
  },

  'the mobile menu holds scroll and focus, and Esc gives focus back': async browser => {
    const { context, page } = await open(browser, [390, 844]);
    await page.waitForTimeout(300);
    await jump(page, 400);
    await page.locator('#navToggle').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    await page.mouse.move(195, 700);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => Math.round(window.scrollY)), 400, 'the page stays put');

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => Boolean(document.activeElement.closest('.navbar')));
      assert(inside, `Tab ${i + 1} left the menu`);
    }
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('Shift+Tab');
      assert(await page.evaluate(() => Boolean(document.activeElement.closest('.navbar'))), 'Shift+Tab left the menu');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => ({
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
      focus: document.activeElement.id,
      visibility: getComputedStyle(document.getElementById('navMenu')).visibility,
      inert: document.querySelector('main').inert,
    }));
    assert.deepEqual(r, { expanded: 'false', focus: 'navToggle', visibility: 'hidden', inert: false });
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(400);
    assert(await page.evaluate(() => window.scrollY > 400), 'the page scrolls again');
    await context.close();
  },

  'the current link in the menu follows the active section': async browser => {
    const { context, page } = await open(browser, [390, 844]);
    await jump(page, await sectionTop(page, 'preguntas'));
    await page.waitForTimeout(300);
    await page.locator('#navToggle').click();
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      const current = document.querySelector('.nav__link[aria-current="true"]');
      const other = document.querySelector('.nav__link:not([aria-current])');
      return {
        href: current && current.getAttribute('href'),
        color: current && getComputedStyle(current).color,
        other: getComputedStyle(other).color,
      };
    });
    assert.equal(r.href, '#preguntas');
    assert.equal(r.color, 'rgb(240, 182, 90)');
    assert.notEqual(r.other, r.color);
    await context.close();
  },

  'a menu link closes the menu and reaches its section': async browser => {
    const { context, page } = await open(browser, [390, 844]);
    await page.waitForTimeout(300);
    await page.locator('#navToggle').click();
    await page.waitForTimeout(450);
    await page.locator('.nav__link[href="#limites"]').click();
    await page.waitForTimeout(1800);
    const r = await page.evaluate(() => ({
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
      top: document.getElementById('limites').getBoundingClientRect().top,
    }));
    assert.equal(r.expanded, 'false');
    assert(Math.abs(r.top) < 120, `the section is at ${r.top}`);
    await context.close();
  },

  'the menu scrolls on short screens and closes on desktop': async browser => {
    const { context, page } = await open(browser, [844, 390]);
    await page.waitForTimeout(300);
    await page.locator('#navToggle').click();
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      const nav = document.getElementById('navMenu');
      nav.scrollTop = nav.scrollHeight;
      const demo = document.querySelector('.nav__demo').getBoundingClientRect();
      return { overflow: getComputedStyle(nav).overflowY, tall: nav.scrollHeight > nav.clientHeight, demoBottom: demo.bottom };
    });
    assert.equal(r.overflow, 'auto');
    assert(r.tall, 'the content is taller than the screen');
    assert(r.demoBottom <= 390, `the demo button is reachable, ${r.demoBottom}`);

    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
      label: document.getElementById('navToggle').textContent.trim(),
      overflow: getComputedStyle(document.documentElement).overflowY,
      inert: document.querySelector('main').inert,
      position: getComputedStyle(document.getElementById('navMenu')).position,
    }));
    assert.deepEqual(after, { expanded: 'false', label: 'Menú', overflow: 'visible', inert: false, position: 'static' });
    await context.close();
  },
};

(async () => {
  const server = await serve();
  base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  let failed = 0;
  for (const [name, run] of Object.entries(tests)) {
    if (filter && !filter.test(name)) continue;
    try {
      await run(browser);
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${name}\n     ${String(error.message).split('\n')[0]}`);
    }
  }
  await browser.close();
  server.close();
  if (failed) process.exit(1);
})();
