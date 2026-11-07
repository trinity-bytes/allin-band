/**
 * Round 2 of the journey (S18 to S22): open timeline, crossfade, space between
 * panels, alert rail, concept tag, centered chart and the strap callout.
 * Run: PLAYWRIGHT_CORE_PATH=... CHROMIUM_PATH=... node tests/round2-journey.cjs [repo root]
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

const repo = path.resolve(process.argv[2] || '.');
const executablePath = process.env.CHROMIUM_PATH || undefined;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const GROUND = [14, 26, 20];
const GAP = 240;
let url = '';

function serve() {
  const server = http.createServer((request, response) => {
    const file = path.join(repo, decodeURIComponent(new URL(request.url, 'http://x').pathname));
    fs.readFile(path.extname(file) ? file : path.join(file, 'index.html'), (error, body) => {
      response.writeHead(error ? 404 : 200, { 'Content-Type': TYPES[path.extname(file) || '.html'] || 'text/plain' });
      response.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function open(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForLoadState('load');
  await page.waitForTimeout(250);
  return { context, page };
}

const jump = (page, top) => page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top);

// The vertical position where panel i stands still in horizontal mode
const panelTop = (page, i) =>
  page.evaluate(index => {
    const journey = document.querySelector('.journey');
    const step = document.querySelector('.journey__stage').clientWidth + 240;
    const top = journey.getBoundingClientRect().top + window.scrollY;
    return top + window.innerHeight * 0.9 + index * step;
  }, i);

async function showPanel(page, i) {
  await jump(page, await panelTop(page, i));
  await page.waitForTimeout(200);
}

const loadPhotos = page =>
  page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('.journey img'));
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode().catch(() => {})));
  });

// Reads pixels from a screenshot without any image library
async function pixels(page, png, points) {
  const reader = await page.context().newPage();
  const result = await reader.evaluate(
    async ({ data, spots }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      return spots.map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3));
    },
    { data: png.toString('base64'), spots: points },
  );
  await reader.close();
  return result;
}

const near = (a, b, tolerance) => a.every((value, i) => Math.abs(value - b[i]) <= tolerance);

const tests = {
  'S22: panel 07 and #tu-decides use the approved copy and no screen on the band': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    assert.equal(await page.textContent('#pulsera .panel__intro'), 'Una correa tejida, un módulo de sensores y una luz de estado.');
    assert.equal(await page.textContent('#tu-decides .step__text'), 'Tu pulsera suena, se ilumina y te pregunta si estás bien.');
    await context.close();
  },

  'S18: timeline stops are open text on a 2 px rule': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const stops = await page.$$eval('.moments__tab', tabs =>
      tabs.map(tab => {
        const style = getComputedStyle(tab);
        const rule = getComputedStyle(tab, '::before');
        return { background: style.backgroundColor, filter: style.backdropFilter, radius: style.borderTopLeftRadius,
          rule: rule.height, ruleColor: rule.backgroundColor, time: getComputedStyle(tab.querySelector('.moments__time')).color };
      }),
    );
    stops.forEach((stop, i) => {
      assert.equal(stop.background, 'rgba(0, 0, 0, 0)', `stop ${i} has no surface`);
      assert.equal(stop.filter, 'none', `stop ${i} has no blur`);
      assert.equal(stop.radius, '0px', `stop ${i} has no card corners`);
      assert.equal(stop.rule, '2px', `stop ${i} sits on a 2 px rule`);
    });
    assert.equal(stops[0].time, 'rgb(240, 182, 90)', 'the active hour is amber');
    assert.equal(stops[1].time, 'rgb(255, 253, 247)', 'other hours stay paper');
    await context.close();
  },

  'S18: auto-advance progress is drawn on the rule': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    await jump(page, await page.$eval('.journey', el => el.getBoundingClientRect().top + window.scrollY));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1500);
    const box = await page.$eval('.moments__tab[aria-selected="true"]', tab => {
      const stop = tab.getBoundingClientRect();
      const fill = tab.querySelector('.moments__fill');
      const r = fill.getBoundingClientRect();
      return { offset: r.top - stop.top, height: r.height, width: r.width, stop: stop.width, color: getComputedStyle(fill).backgroundColor };
    });
    assert(Math.abs(box.offset) < 1, `progress sits on the rule, offset ${box.offset}`);
    assert.equal(box.height, 2, 'progress is as thick as the rule');
    assert(box.width > 0 && box.width < box.stop, `progress is partial, ${box.width} of ${box.stop}`);
    assert.equal(box.color, 'rgb(240, 182, 90)', 'progress is amber');
    await context.close();
  },

  'S18: the message is open text with an amber rule': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const message = await page.$eval('.moment.is-active .moment__message', el => {
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, filter: style.backdropFilter, width: style.borderLeftWidth, color: style.borderLeftColor };
    });
    assert.equal(message.background, 'rgba(0, 0, 0, 0)', 'no surface');
    assert.equal(message.filter, 'none', 'no blur');
    assert.equal(message.width, '2px', 'a 2 px rule');
    assert.equal(message.color, 'rgb(240, 182, 90)', 'the rule is amber');
    await context.close();
  },

  'S18: moments crossfade and the layout does not jump': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    await jump(page, await page.$eval('.journey', el => el.getBoundingClientRect().top + window.scrollY));
    await page.waitForTimeout(150);
    const duration = await page.$eval('.moment', el => parseFloat(getComputedStyle(el).transitionDuration));
    assert(duration >= 0.4 && duration <= 0.5, `crossfade lasts 400 to 500 ms, got ${duration}s`);
    const sample = await page.evaluate(
      () =>
        new Promise(resolve => {
          const moments = Array.from(document.querySelectorAll('.moment'));
          const box = () => {
            const m = document.querySelector('.moments').getBoundingClientRect();
            const r = document.querySelector('.moments__tabs').getBoundingClientRect();
            return [m.height, r.top];
          };
          const before = box();
          document.querySelectorAll('.moments__tab')[1].click();
          setTimeout(() => {
            resolve({
              leaving: Number(getComputedStyle(moments[0]).opacity),
              entering: Number(getComputedStyle(moments[1]).opacity),
              before,
              after: box(),
            });
          }, 140);
        }),
    );
    assert(sample.leaving > 0 && sample.leaving < 1, `the old moment is fading, ${sample.leaving}`);
    assert(sample.entering > 0 && sample.entering < 1, `the new moment is fading in, ${sample.entering}`);
    assert.deepEqual(sample.after, sample.before, 'the layout holds still');
    await page.waitForTimeout(600);
    assert.equal(await page.$eval('.moment.is-active', el => getComputedStyle(el).opacity), '1');
    await context.close();
  },

  'S18: reduced motion changes moments without a fade': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
    assert.equal(await page.$eval('.moment', el => getComputedStyle(el).transitionDuration), '0s');
    await context.close();
  },

  'S19: 240 px of ground between panels, and every stop still lands flush': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const gaps = await page.$$eval('.panel', panels =>
      panels.slice(1).map((panel, i) => panel.getBoundingClientRect().left - panels[i].getBoundingClientRect().right),
    );
    gaps.forEach(gap => assert.equal(Math.round(gap), GAP, 'gap between panels'));
    for (let i = 0; i < 5; i += 1) {
      await showPanel(page, i);
      const left = await page.$$eval('.panel', (panels, index) => panels[index].getBoundingClientRect().left, i);
      assert(Math.abs(left) < 1, `panel ${i} stands flush at its stop, left ${left}`);
    }
    await context.close();
  },

  'S19: the progress head stays over the current panel': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    for (let i = 0; i < 5; i += 1) {
      await showPanel(page, i);
      const share = await page.evaluate(() => {
        const rail = document.querySelector('.journey__progress').getBoundingClientRect();
        const head = document.querySelector('.journey__head').getBoundingClientRect();
        return (head.left + head.width * (74.4 / 80) - rail.left) / rail.width;
      });
      assert(Math.abs(share - (i + 0.5) / 5) < 0.01, `head at ${share} on panel ${i}`);
    }
    await context.close();
  },

  'S19: photos fade into the ground and no line remains': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    await loadPhotos(page);
    for (let i = 0; i < 4; i += 1) {
      // Stop halfway through the gap after panel i
      await jump(page, (await panelTop(page, i)) + (1440 + GAP / 2 - 720));
      await page.waitForTimeout(200);
      const edges = await page.$$eval('.panel', (panels, index) => [
        panels[index].getBoundingClientRect().right,
        panels[index + 1].getBoundingClientRect().left,
      ], i);
      const png = await page.screenshot();
      const y = 620;
      const [inPanel, inGap, inNext] = await pixels(page, png, [
        [Math.round(edges[0]) - 2, y],
        [Math.round((edges[0] + edges[1]) / 2), y],
        [Math.round(edges[1]) + 2, y],
      ]);
      assert(near(inGap, GROUND, 1), `gap ${i} is forest ground, ${inGap}`);
      assert(near(inPanel, GROUND, 3), `panel ${i} ends in the ground, ${inPanel}`);
      assert(near(inNext, GROUND, 3), `panel ${i + 1} starts in the ground, ${inNext}`);
    }
    await context.close();
  },

  'S19: fades sit behind the copy': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const report = await page.$$eval('.panel', panels =>
      panels.map(panel => {
        const fade = getComputedStyle(panel, '::before');
        const flow = getComputedStyle(panel.querySelector('.panel__flow'));
        return { id: panel.id, image: fade.backgroundImage, z: fade.zIndex, flow: flow.position };
      }),
    );
    report.forEach(panel => {
      assert(/gradient/.test(panel.image), `${panel.id} has a fade`);
      assert.equal(panel.z, '0', `${panel.id} fade is under the copy`);
      assert.equal(panel.flow, 'relative', `${panel.id} copy is painted over the fade`);
    });
    await context.close();
  },

  'S19: stacked panels join with short seams': async browser => {
    const { context, page } = await open(browser, { width: 390, height: 844 }, { hasTouch: true, isMobile: true });
    const size = await page.$eval('#como-funciona', el => getComputedStyle(el, '::before').backgroundSize);
    assert(/64px/.test(size), `mobile seams are 64 px, got ${size}`);
    await context.close();
  },

  'S20: no temperature on the family phone, wallpaper barely visible, notice translucent': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const text = await page.textContent('.family__phone');
    assert(!/Temp|°C/.test(text), 'no temperature');
    const looks = await page.evaluate(() => {
      const dim = getComputedStyle(document.querySelector('.family__phone .phone__dim')).backgroundColor;
      const notice = getComputedStyle(document.querySelector('.family__phone .notice'));
      return { dim, background: notice.backgroundColor, filter: notice.backdropFilter };
    });
    const alpha = color => Number(color.match(/[\d.]+\)$/)[0].slice(0, -1));
    assert(alpha(looks.dim) >= 0.9, `the wallpaper is barely visible, ${looks.dim}`);
    assert.equal(alpha(looks.background), 0.42, `the notice uses --mist-soft, ${looks.background}`);
    assert(/blur/.test(looks.filter), 'the notice blurs what is behind it');
    await context.close();
  },

  'S20: the rail says who is told and when, in order, on desktop and stacked': async browser => {
    const sizes = [[{ width: 1440, height: 900 }, {}], [{ width: 390, height: 844 }, { hasTouch: true, isMobile: true }]];
    for (const [viewport, options] of sizes) {
      const { context, page } = await open(browser, viewport, options);
      assert.equal(await page.locator('.chain').count(), 0, 'the contact list is gone');
      const steps = await page.$$eval('.rail__step', items =>
        items.map(item => {
          const r = item.getBoundingClientRect();
          return { when: item.querySelector('.rail__when').textContent, who: item.querySelector('.rail__who').textContent,
            top: r.top, visible: r.height > 0 };
        }),
      );
      assert.deepEqual(steps.map(step => [step.when, step.who]), [
        ['Al instante', 'Centro de salud y Ana'],
        ['A los 10 segundos', 'Luis, si nadie responde'],
        ['Cuando alguien confirma', 'Todos lo saben'],
      ]);
      assert(steps.every(step => step.visible), 'every step is laid out');
      assert(steps[0].top < steps[1].top && steps[1].top < steps[2].top, 'steps read top to bottom');
      await context.close();
    }
  },

  'S20: the rail lights up in order, once per entry': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const lit = () => page.$$eval('.rail__body', bodies => bodies.map(body => Number(getComputedStyle(body).opacity)));
    const line = () => page.$$eval('.rail__step', steps =>
      steps.map(step => new DOMMatrix(getComputedStyle(step, '::after').transform).d));
    const before = await lit();
    assert(before.every(value => value < 0.5), `steps wait until the panel is seen, ${before}`);
    await showPanel(page, 2);
    await page.waitForTimeout(500);
    const early = await lit();
    assert(early[0] > early[2], `the first step lights before the last, ${early}`);
    await page.waitForTimeout(3000);
    assert.deepEqual(await lit(), [1, 1, 1], 'every step ends lit');
    assert.deepEqual((await line()).slice(0, 2), [1, 1], 'the rail line is fully drawn');
    await showPanel(page, 4);
    await page.waitForTimeout(100);
    assert((await lit())[2] < 0.5, 'leaving resets the sequence');
    await showPanel(page, 2);
    await page.waitForTimeout(400);
    const again = await lit();
    assert(again[0] > again[2], `entering plays it again, ${again}`);
    await context.close();
  },

  'S20: the rail is whole with reduced motion and without JS': async browser => {
    for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
      const { context, page } = await open(browser, { width: 1440, height: 900 }, options);
      const opacity = await page.$$eval('.rail__body', bodies => bodies.map(body => getComputedStyle(body).opacity));
      assert.deepEqual(opacity, ['1', '1', '1'], JSON.stringify(options));
      await context.close();
    }
  },

  'S21: the concept tag straddles the top of the phone': async browser => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const { context, page } = await open(browser, viewport);
      const box = await page.evaluate(() => {
        const tag = document.querySelector('.app__tag');
        const phone = document.querySelector('.app__phone').getBoundingClientRect();
        const r = tag.getBoundingClientRect();
        return { text: tag.textContent.trim(), top: r.top, bottom: r.bottom, center: (r.left + r.right) / 2,
          phoneTop: phone.top, phoneCenter: (phone.left + phone.right) / 2 };
      });
      assert.equal(box.text, 'Concepto, datos de ejemplo');
      assert(box.top < box.phoneTop && box.bottom > box.phoneTop, 'the tag crosses the top edge');
      assert(Math.abs(box.center - box.phoneCenter) < 1, 'the tag is centered on the phone');
      await context.close();
    }
  },

  'S21: the chart is centered in its card': async browser => {
    const { context, page } = await open(browser, { width: 1440, height: 900 });
    const box = await page.$eval('.app-panel--history', card => {
      const c = card.getBoundingClientRect();
      const svg = card.querySelector('.app-panel__chart');
      const content = Array.from(svg.children).map(el => el.getBoundingClientRect());
      const left = Math.min(...content.map(r => r.left));
      const right = Math.max(...content.map(r => r.right));
      return { left: left - c.left, right: c.right - right };
    });
    assert(Math.abs(box.left - box.right) < 2, `same space on both sides, ${box.left} and ${box.right}`);
    await context.close();
  },

  // The strap is black and the metal module next to it is almost as dark under
  // the scrim, so darkness alone cannot tell them apart: the dot must also sit
  // where Figma 70:678 puts it, as a share of the photo (921, 197 on a 1440 x 960 cover)
  'S22: the strap dot lands on the strap at every desktop size': async browser => {
    const sizes = [[1440, 900], [1366, 768], [1024, 768], [1280, 720], [1920, 1080], [2560, 1440]];
    for (const [width, height] of sizes) {
      const { context, page } = await open(browser, { width, height });
      await loadPhotos(page);
      await showPanel(page, 4);
      await page.waitForTimeout(1200);
      const spot = await page.$eval('.band__callout--strap', el => {
        const r = el.getBoundingClientRect();
        const photo = document.querySelector('.band__overlay').getBoundingClientRect();
        const unit = parseFloat(getComputedStyle(el, '::before').width);
        const x = r.left + unit / 2;
        const y = (r.top + r.bottom) / 2;
        return { dot: [Math.round(x), Math.round(y)], x: (x - photo.left) / photo.width, y: (y - photo.top) / photo.height };
      });
      assert(Math.abs(spot.x - 921 / 1440) < 0.005, `${width}x${height}: dot at ${spot.x} of the photo width`);
      assert(Math.abs(spot.y - 227 / 960) < 0.005, `${width}x${height}: dot at ${spot.y} of the photo height`);
      await page.addStyleTag({ content: '.band__overlay { visibility: hidden; }' });
      const png = await page.screenshot();
      const [pixel] = await pixels(page, png, [spot.dot]);
      const light = Math.max(...pixel);
      assert(light < 70, `${width}x${height}: the dot at ${spot.dot} sits on the black strap, got ${pixel}`);
      await context.close();
    }
  },

  'Panels still fit the horizontal journey at 1366x768 and 1024x768': async browser => {
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
      const { context, page } = await open(browser, viewport);
      assert.equal(await page.locator('.journey.is-horizontal').count(), 1, `${viewport.width}x${viewport.height} stays horizontal`);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
        0,
        'no horizontal page scroll',
      );
      await context.close();
    }
  },
};

async function main() {
  const server = await serve();
  url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  let failed = 0;
  try {
    for (const [name, run] of Object.entries(tests)) {
      try {
        await run(browser);
        console.log(`PASS: ${name}`);
      } catch (error) {
        failed += 1;
        console.log(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0, 4).join('\n  ')}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`${Object.keys(tests).length - failed} of ${Object.keys(tests).length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
