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
    // reset.css shortens every transition to 0.01 ms under reduced motion; those do not count
    const moving = await calm.page.evaluate(() => document.getAnimations().filter(a => a.transitionProperty && a.effect.getComputedTiming().duration > 1).length);
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
  'the desktop navbar keeps one row and no menu ticker': async browser => {
    for (const size of [[1440, 900], [1024, 768]]) {
      const { context, page } = await open(browser, size);
      await jump(page, 1200);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        ticker: document.querySelector('.nav__ticker').getClientRects().length,
        lines: Array.from(document.querySelectorAll('.nav__link')).map(link => link.getClientRects().length),
      }));
      assert.equal(r.ticker, 0, `${size.join('x')}: the menu ticker shows`);
      assert(r.lines.every(n => n === 1), `${size.join('x')}: links wrap, ${r.lines}`);
      await context.close();
    }
  },

  'the light shaders draw only while their section is in view': async browser => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => {
      window.__draws = new Map();
      for (const proto of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype]) {
        if (!proto) continue;
        const draw = proto.drawArrays;
        proto.drawArrays = function (...args) {
          const key = this.canvas.dataset.shader;
          window.__draws.set(key, (window.__draws.get(key) || 0) + 1);
          return draw.apply(this, args);
        };
      }
    });
    const page = await context.newPage();
    await page.goto(`${base}/index.html`);
    await page.waitForLoadState('load');
    const draws = key => page.evaluate(k => window.__draws.get(k) || 0, key);
    const webgl = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl')));
    const kinds = await page.evaluate(() => Array.from(document.querySelectorAll('canvas[data-shader]')).map(c => c.dataset.shader));
    assert.deepEqual(kinds.sort(), ['mist', 'mist', 'rays']);

    assert.equal(await draws('rays'), 0, 'nothing draws before the section is near');
    await jump(page, await sectionTop(page, 'emergencia'));
    await page.waitForTimeout(800);
    if (!webgl) {
      console.log('     (no WebGL in this browser: checking the CSS fallback only)');
    } else {
      const running = await draws('rays');
      assert(running > 3, `the rays draw in view, ${running}`);
      const size = await page.evaluate(() => {
        const c = document.querySelector('canvas[data-shader="rays"]');
        return { ratio: c.width / c.clientWidth, live: c.classList.contains('is-live') };
      });
      assert(size.ratio <= 1.5 + 0.01, `DPR capped, ${size.ratio}`);
      assert(size.live, 'the live canvas drops its fallback');
      await jump(page, 0);
      await page.waitForTimeout(300);
      const stopped = await draws('rays');
      await page.waitForTimeout(900);
      assert.equal(await draws('rays'), stopped, 'the rays stop once the section leaves the screen');
    }
    await context.close();

    const calm = await open(browser, [1440, 900], { reducedMotion: 'reduce' });
    await jump(calm.page, await sectionTop(calm.page, 'emergencia'));
    await calm.page.waitForTimeout(400);
    const still = await calm.page.evaluate(() => {
      const c = document.querySelector('canvas[data-shader="rays"]');
      return { live: c.classList.contains('is-live'), image: getComputedStyle(c).backgroundImage };
    });
    assert.equal(still.live, false, 'no shader under reduced motion');
    assert.match(still.image, /gradient/, 'a static gradient stays instead');
    await calm.context.close();
  },

  'emergency blocks reveal as soon as they show at 1366 and 1024': async browser => {
    for (const size of [[1366, 768], [1024, 768], [1440, 900]]) {
      const { context, page } = await open(browser, size);
      const start = await sectionTop(page, 'emergencia');
      for (const offset of [0, 300, 600]) {
        await jump(page, start + offset);
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(900);
      const blank = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#emergencia [data-reveal]'))
          .filter(block => {
            const r = block.getBoundingClientRect();
            return r.top < innerHeight - 40 && r.bottom > 40 && !block.classList.contains('is-in');
          })
          .map(block => block.className),
      );
      assert.deepEqual(blank, [], `${size.join('x')}: blocks on screen still hidden`);
      await context.close();
    }
  },

  'goal values sit 170 px further from the device on desktop': async browser => {
    const { context, page } = await open(browser, [1440, 900], { reducedMotion: 'reduce' });
    const r = await page.evaluate(() => {
      const section = document.getElementById('metas').getBoundingClientRect();
      const goal = document.querySelector('.goal');
      const dot = goal.querySelector('.goal__mark').getBoundingClientRect();
      return {
        gap: goal.querySelector('.goal__value').getBoundingClientRect().left - (dot.left + 6),
        title: document.getElementById('goals-title').getBoundingClientRect().left - section.left,
      };
    });
    assert(Math.abs(r.gap - 232) <= 3, `value starts ${r.gap} px from the dot`);
    assert(Math.abs(r.title - 600) <= 4, `heading at ${r.title}`);
    await context.close();
  },

  'the FAQ answer has no band screen, and neither does the page outside the journey': async browser => {
    const { context, page } = await open(browser, [1440, 900], { javaScriptEnabled: false });
    const r = await page.evaluate(() => {
      const body = document.body.cloneNode(true);
      body.querySelectorAll('.journey').forEach(el => el.remove());
      return {
        answer: document.querySelector('#preguntas .faq__a').textContent.trim(),
        screen: (body.textContent.match(/[^.]*pantalla[^.]*/gi) || []).map(s => s.trim()),
        meta: Array.from(document.querySelectorAll('meta[content]')).some(m => /pantalla/i.test(m.content)),
      };
    });
    assert.equal(r.answer, 'La pulsera te avisa primero a ti, con sonido y luz, y te pregunta si estás bien. Tienes unos segundos para responder; si lo haces, no se avisa a nadie.');
    assert.deepEqual(r.screen, []);
    assert.equal(r.meta, false);
    await context.close();
  },

  'goals and FAQ sit on soft blooms instead of one glow': async browser => {
    const { context, page } = await open(browser, [1440, 900], { reducedMotion: 'reduce' });
    const r = await page.evaluate(() => {
      const radial = s => Array.from(document.querySelectorAll(s)).filter(el => /radial-gradient/.test(getComputedStyle(el).backgroundImage)).length;
      return { goals: radial('#metas .bloom'), faq: radial('#preguntas .bloom'), glows: document.querySelectorAll('.goals__glow, .faq__glow').length };
    });
    assert.deepEqual(r, { goals: 3, faq: 2, glows: 0 });
    await context.close();
  },

  'the FAQ grass drifts slightly with scroll, and stays still under reduced motion': async browser => {
    for (const options of [{}, { reducedMotion: 'reduce' }]) {
      const { context, page } = await open(browser, [1440, 900], options);
      const top = await sectionTop(page, 'preguntas');
      const shift = async y => {
        await jump(page, y);
        await page.waitForTimeout(250);
        return page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.faq__grass--near')).transform).m42);
      };
      const early = await shift(top - 600);
      const late = await shift(top + 200);
      if (options.reducedMotion) {
        assert.deepEqual([early, late], [0, 0], 'still under reduced motion');
      } else {
        const moved = Math.abs(early - late);
        assert(moved >= 8 && moved <= 90, `slight parallax, moved ${moved}`);
      }
      await context.close();
    }
  },

  'section joints fade on the eased seam tokens': async browser => {
    const joints = [
      ['emergencia', 'top', 96], ['emergencia', 'bottom', 96],
      ['metas', 'top', 96], ['metas', 'bottom', 180],
      ['limites', 'top', 420], ['limites', 'bottom', 96],
      ['preguntas', 'top', 96], ['preguntas', 'bottom', 96],
      ['proyecto', 'top', 96],
    ];
    for (const [size, mobile] of [[[1440, 900], false], [[390, 844], true]]) {
      const { context, page } = await open(browser, size, { reducedMotion: 'reduce' });
      const found = await page.evaluate(list => list.map(([id, edge]) => {
        const seam = document.getElementById(id).querySelector(`.seam--${edge}`);
        if (!seam) return null;
        const style = getComputedStyle(seam);
        const r = seam.getBoundingClientRect();
        return { height: Math.round(r.height), stops: (style.backgroundImage.match(/rgba?\(/g) || []).length, width: Math.round(r.width) };
      }), joints);
      joints.forEach(([id, edge, px], i) => {
        const label = `${size.join('x')} ${id} ${edge}`;
        assert(found[i], `${label}: no seam`);
        const want = mobile ? 64 : px;
        assert(Math.abs(found[i].height - want) <= 1, `${label}: ${found[i].height} px, want ${want}`);
        assert.equal(found[i].stops, 9, `${label}: eased stops`);
        assert.equal(found[i].width, size[0], `${label}: full width`);
      });
      await context.close();
    }
  },

  'the limit cards stack and the ones below reveal on scroll': async browser => {
    for (const size of [[1440, 900], [1366, 768], [390, 844]]) {
      const { context, page } = await open(browser, size);
      const label = size.join('x');
      const cards = () => page.evaluate(() => Array.from(document.querySelectorAll('#limites .limit')).map(card => {
        const r = card.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, width: r.width, opacity: Number(getComputedStyle(card).opacity), index: card.querySelector('.limit__index') && card.querySelector('.limit__index').textContent.trim() };
      }));
      const start = await sectionTop(page, 'limites');
      await jump(page, start);
      await page.waitForTimeout(500);
      const first = await cards();
      assert.deepEqual(first.map(c => c.index), ['1 de 3', '2 de 3', '3 de 3'], `${label}: index labels`);
      assert(first[1].top < first[0].top && first[2].top < first[1].top, `${label}: the cards below peek above the front one`);
      assert(first[1].bottom > first[0].top, `${label}: the cards overlap as a stack`);
      assert(first[1].width < first[0].width && first[2].width < first[1].width, `${label}: cards behind are narrower`);
      const head = await box(page, '.limits__title');
      if (size[0] >= 1024) assert(Math.abs(head.top - first[2].top) <= 6, `${label}: heading ${head.top} and stack ${first[2].top} share a top line`);
      assert(first[0].top >= 0 && first[0].bottom <= size[1], `${label}: the front card is on screen`);

      const height = await page.evaluate(() => document.getElementById('limites').offsetHeight);
      await jump(page, start + height - size[1]);
      await page.waitForTimeout(500);
      const last = await cards();
      assert(last[0].opacity < 0.1 || last[0].bottom <= 0, `${label}: the first card lifted away`);
      assert(last[1].opacity < 0.1 || last[1].bottom <= 0, `${label}: the second card lifted away`);
      assert(Math.abs(last[2].top - first[0].top) <= 2, `${label}: the last card comes to the front, ${last[2].top} vs ${first[0].top}`);
      assert(Math.abs(last[2].width - first[0].width) <= 1, `${label}: at full width`);
      assert.equal(last[2].opacity, 1);
      await context.close();
    }
  },

  'the limit cards read as a list without JS and under reduced motion': async browser => {
    for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
      for (const size of [[1440, 900], [390, 844]]) {
        const { context, page } = await open(browser, size, options);
        const label = `${size.join('x')} ${JSON.stringify(options)}`;
        await jump(page, await sectionTop(page, 'limites'));
        await page.waitForTimeout(200);
        const list = await page.evaluate(() => Array.from(document.querySelectorAll('#limites .limit')).map(card => {
          const r = card.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, opacity: Number(getComputedStyle(card).opacity), text: card.querySelector('.limit__text').getBoundingClientRect().height };
        }));
        assert.equal(list.length, 3);
        list.forEach((card, i) => {
          assert.equal(card.opacity, 1, `${label}: card ${i + 1} visible`);
          assert(card.text > 0, `${label}: card ${i + 1} text shows`);
          if (i) assert(card.top >= list[i - 1].bottom, `${label}: card ${i + 1} overlaps the one above`);
        });
        await context.close();
      }
    }
  },

  'the closing is 1060 px tall at 1440 with 236 px team photos': async browser => {
    const { context, page } = await open(browser, [1440, 900], { reducedMotion: 'reduce' });
    const r = await page.evaluate(() => ({
      height: document.getElementById('proyecto').getBoundingClientRect().height,
      photos: Array.from(document.querySelectorAll('.member img')).map(img => Math.round(img.getBoundingClientRect().width) + 'x' + Math.round(img.getBoundingClientRect().height)),
      teamRight: 1440 - document.querySelector('.team').getBoundingClientRect().right,
    }));
    assert(Math.abs(r.height - 1060) <= 4, `closing ${r.height} px`);
    assert.deepEqual(r.photos, ['236x236', '236x236', '236x236', '236x236']);
    assert(Math.abs(r.teamRight - 48) <= 2, `team right edge ${r.teamRight}`);
    await context.close();
  },

  'the closing copy and team reveal softly, and stay visible without motion': async browser => {
    const { context, page } = await open(browser, [1440, 900]);
    const before = await page.evaluate(() => ({
      armed: document.querySelectorAll('#proyecto .is-armed').length,
      hidden: Number(getComputedStyle(document.querySelector('.member')).opacity),
    }));
    assert(before.armed >= 1, 'the closing blocks are armed');
    assert(before.hidden < 1, 'team hidden before it shows');
    await jump(page, await sectionTop(page, 'proyecto'));
    await page.waitForTimeout(1600);
    const after = await page.evaluate(() => Array.from(document.querySelectorAll('.member, .project__title')).map(el => Number(getComputedStyle(el).opacity)));
    assert(after.every(o => o === 1), `revealed: ${after}`);
    await context.close();

    const calm = await open(browser, [1440, 900], { reducedMotion: 'reduce' });
    assert.equal(await calm.page.locator('#proyecto .is-armed').count(), 0);
    await calm.context.close();
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
