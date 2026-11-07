/**
 * Regressions from the independent verification of the nature redesign:
 * scroll position across resizes, the navbar highlight, the closing links,
 * report-checked copy and the hero at a large browser font.
 * Run: PLAYWRIGHT_CORE_PATH=... CHROMIUM_PATH=... node tests/interactions.cjs [repo root]
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

const repo = path.resolve(process.argv[2] || '.');
const url = pathToFileURL(path.join(repo, 'index.html')).href;
const executablePath = process.env.CHROMIUM_PATH || undefined;
const PANELS = ['como-funciona', 'tu-decides', 'aviso', 'app', 'pulsera'];

const jump = (page, y) => page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
const scrollY = page => page.evaluate(() => Math.round(window.scrollY));
const top = (page, id) =>
  page.$eval(`#${id}`, el => el.getBoundingClientRect().top + window.scrollY);

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2' };

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

// A hash load on the stacked page scrolls smoothly: wait until it stops
const settle = page =>
  page.evaluate(
    () =>
      new Promise(resolve => {
        let last = -1;
        let still = 0;
        (function tick() {
          still = window.scrollY === last ? still + 1 : 0;
          last = window.scrollY;
          if (still > 10) resolve();
          else requestAnimationFrame(tick);
        })();
      }),
  );

async function open(browser, size, hash = '', options = {}) {
  const context = await browser.newContext({ viewport: size, ...options });
  const page = await context.newPage();
  await page.goto(url + hash);
  await page.waitForLoadState('load');
  await page.waitForTimeout(400);
  await settle(page);
  return { context, page };
}

// The panel whose center is closest to the middle of the screen
const visiblePanel = (page, ids = PANELS) =>
  page.evaluate(list => {
    const mx = window.innerWidth / 2;
    const my = window.innerHeight / 2;
    const hit = list.find(id => {
      const r = document.getElementById(id).getBoundingClientRect();
      return r.left <= mx && r.right > mx && r.top <= my && r.bottom > my;
    });
    return hit || null;
  }, ids);

async function resizeKeepsPanel(browser, from, to) {
  for (const id of PANELS) {
    const { context, page } = await open(browser, from, `#${id}`);
    await page.setViewportSize(to);
    await page.waitForTimeout(450);
    assert.equal(
      await visiblePanel(page),
      id,
      `#${id} stays on screen going from ${from.width}x${from.height} to ${to.width}x${to.height}`,
    );
    await context.close();
  }
}

const tests = {
  'a resize in vertical mode keeps the reading position': async browser => {
    const { context, page } = await open(browser, { width: 390, height: 844 }, '', {
      hasTouch: true,
      isMobile: true,
    });
    const y = Math.round((await top(page, 'app')) + 900);
    await jump(page, y);
    await page.waitForTimeout(100);
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(350);
    assert.equal(await scrollY(page), y);
    await context.close();
  },

  'resizing inside the journey keeps the panel': async browser => {
    await resizeKeepsPanel(browser, { width: 1440, height: 900 }, { width: 1100, height: 800 });
    await resizeKeepsPanel(browser, { width: 1100, height: 800 }, { width: 1440, height: 900 });
  },

  'crossing the desktop breakpoint keeps the panel': async browser => {
    await resizeKeepsPanel(browser, { width: 768, height: 1024 }, { width: 1024, height: 768 });
    await resizeKeepsPanel(browser, { width: 1024, height: 768 }, { width: 1023, height: 768 });
    await resizeKeepsPanel(browser, { width: 1023, height: 768 }, { width: 1024, height: 768 });
  },

  'resizing next to the journey does not pull the page into it': async browser => {
    for (const id of ['emergencia', 'metas']) {
      const { context, page } = await open(browser, { width: 1440, height: 900 });
      await jump(page, (await top(page, id)) + 50);
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 1430, height: 890 });
      await page.waitForTimeout(450);
      const offset = (await scrollY(page)) - (await top(page, id));
      assert(Math.abs(offset - 50) < 120, `#${id} stays in place, offset ${offset}`);
      await context.close();
    }
  },

  'the navbar highlights the panel that fills the screen': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    await page.evaluate(() => { location.hash = 'tu-decides'; });
    await page.waitForTimeout(150);
    await settle(page);
    const second = await scrollY(page);
    const step = await page.$eval('.journey__stage', stage => stage.clientWidth + 2);
    const expected = [
      [0.25, '#como-funciona'],
      [2.25, ''],
      [3.25, '#app'],
      [3.75, '#pulsera'],
    ];
    for (const [f, href] of expected) {
      await jump(page, second + (f - 1) * step);
      await page.waitForTimeout(250);
      const current = await page.$$eval('.nav__link[aria-current]', links =>
        links.map(link => link.getAttribute('href')).join(),
      );
      assert.equal(current, href, `panel position ${f}`);
    }
    await context.close();
  },

  'the navbar highlights nothing on the closing section': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    await jump(page, await top(page, 'preguntas'));
    await page.waitForTimeout(250);
    assert.equal((await page.$$('.nav__link[aria-current]')).length, 1, 'Preguntas is highlighted first');
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await page.waitForTimeout(250);
    assert.equal((await page.$$('.nav__link[aria-current]')).length, 0);
    await context.close();
  },

  'the closing links take a mouse click': async browser => {
    const runs = [
      [{ width: 1440, height: 900 }, {}],
      [{ width: 1366, height: 768 }, {}],
      [{ width: 1024, height: 768 }, {}],
      [{ width: 1440, height: 900 }, { reducedMotion: 'reduce' }],
    ];
    for (const [size, options] of runs) {
      const { context, page } = await open(browser, size, '', options);
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      );
      await page.waitForTimeout(250);
      const blocked = await page.$$eval('.closing a[href]', links =>
        links
          .filter(link => {
            const r = link.getBoundingClientRect();
            if (r.top < 0 || r.bottom > window.innerHeight) return false;
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !link.contains(hit);
          })
          .map(link => link.getAttribute('href')),
      );
      assert.deepEqual(blocked, [], `${size.width}x${size.height} ${JSON.stringify(options)}`);
      await context.close();
    }
  },

  'a reload with an old hash does not cross the page': async browser => {
    // The navigation type is not reported on file:// pages
    const server = await serve();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html#tu-decides`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
    await jump(page, 0);
    await page.waitForTimeout(300);
    await page.addInitScript(() => {
      window.highest = 0;
      (function watch() {
        window.highest = Math.max(window.highest, window.scrollY);
        requestAnimationFrame(watch);
      })();
    });
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    const highest = await page.evaluate(() => window.highest);
    await context.close();
    server.close();
    assert(highest < 50, `the page reached y=${highest}`);
  },

  'the journey holds on its first and last panel': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const m = await page.evaluate(() => {
      const journey = document.querySelector('.journey');
      return {
        top: journey.getBoundingClientRect().top + window.scrollY,
        bottom: journey.getBoundingClientRect().bottom + window.scrollY,
      };
    });
    const shift = async y => {
      await jump(page, y);
      await page.waitForTimeout(120);
      return page.$eval('.journey__track', track => new DOMMatrix(getComputedStyle(track).transform).m41);
    };
    assert.equal(await shift(m.top + 700), 0, 'still on the first panel after 700 px');
    const end = await shift(m.bottom - 900);
    assert(end < -5000, `the track reached the last panel, ${end}`);
    assert.equal(await shift(m.bottom - 900 - 200), end, 'already on the last panel 200 px earlier');
    assert((await shift(m.bottom - 900 - 600)) > end, 'still moving 600 px before the end');
    await context.close();
  },

  'journey photos wait until the reader gets close': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const loaded = () =>
      // The first panel is near enough for native lazy loading; the landscape is the hero's
      page.$$eval('.journey img', images =>
        images.filter(image => image.naturalWidth > 0 && !/morning|landscape/.test(image.currentSrc)).length,
      );
    assert.equal(await loaded(), 0, 'nothing requested on the first screen');
    await jump(page, await top(page, 'emergencia'));
    await page.waitForTimeout(800);
    assert((await loaded()) > 0, 'requested on the way to the journey');
    await context.close();
  },

  'the pulse runner speeds up between beats': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const samples = await page.evaluate(() => {
      const animation = document.querySelector('.ecg__comet').getAnimations()[0];
      const frames = animation.effect.getKeyframes();
      const duration = animation.effect.getTiming().duration;
      animation.pause();
      const read = fraction => {
        animation.currentTime = duration * (frames[1].offset + (frames[2].offset - frames[1].offset) * fraction);
        return Number.parseFloat(getComputedStyle(document.querySelector('.ecg__comet')).strokeDashoffset);
      };
      return { count: frames.length, early: read(0) - read(0.25), late: read(0.75) - read(1) };
    });
    assert(samples.count >= 4, `one stretch per beat, ${samples.count} keyframes`);
    assert(samples.late > samples.early * 2, `early ${samples.early}, late ${samples.late}`);
    await context.close();
  },

  'the copy matches the report': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const text = await page.evaluate(() => document.body.textContent);
    assert.doesNotMatch(text, /Sin pantalla/);
    assert.doesNotMatch(text, /2 horas/);
    await context.close();
  },

  'the hero stays readable at a 28px browser font': async () => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'allinband-font-'));
    fs.mkdirSync(path.join(profile, 'Default'));
    fs.writeFileSync(
      path.join(profile, 'Default', 'Preferences'),
      JSON.stringify({ webkit: { webprefs: { default_font_size: 28 } } }),
    );
    const context = await chromium.launchPersistentContext(profile, {
      executablePath,
      viewport: { width: 360, height: 740 },
    });
    try {
      const page = context.pages()[0];
      await page.goto(url);
      await page.waitForLoadState('load');
      await page.waitForTimeout(3300);
      const r = await page.evaluate(() => {
        const box = selector => {
          const b = document.querySelector(selector).getBoundingClientRect();
          return { top: b.top, bottom: b.bottom };
        };
        return {
          vh: window.innerHeight,
          nav: box('.navbar'),
          title: box('.hero__title'),
          band: box('.hero__band'),
          intro: box('.hero__intro'),
          disclosure: box('.hero__disclosure'),
        };
      });
      assert(r.disclosure.bottom <= r.vh, `disclosure ends at ${r.disclosure.bottom}`);
      assert(r.disclosure.top >= r.nav.bottom - 1, 'the navbar does not cover the disclosure');
      assert(r.title.top >= r.nav.bottom - 1, 'the navbar does not cover the title');
      assert(r.band.top >= r.title.bottom - 1, 'the band does not cover the title');
      assert(r.intro.top >= r.band.bottom - 1, 'the band does not cover the intro');
    } finally {
      await context.close();
      fs.rmSync(profile, { recursive: true, force: true });
    }
  },
};

(async () => {
  const browser = await chromium.launch({ executablePath });
  let failed = 0;
  for (const [name, run] of Object.entries(tests)) {
    try {
      await run(browser);
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${name}\n     ${String(error.message).split('\n')[0]}`);
    }
  }
  await browser.close();
  if (failed) process.exit(1);
})();
