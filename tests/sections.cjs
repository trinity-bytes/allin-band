const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');

const IDS = ['emergencia', 'metas', 'limites', 'preguntas'];

// Every element that owns visible text must be fully opaque, visible and
// inside the boxes of its clipping ancestors.
function hiddenText(ids) {
  const problems = [];
  for (const id of ids) {
    const section = document.getElementById(id);
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (el.closest('svg, [aria-hidden="true"]')) continue;
      // Stacked limit cards show one at a time by design; tests/round2-page.cjs covers them
      if (el.closest('.is-stacked .limit')) continue;
      const rect = el.getBoundingClientRect();
      const label = `#${id} "${node.textContent.trim().slice(0, 40)}"`;
      if (rect.width === 0 || rect.height === 0) problems.push(`${label} has no box`);
      let opacity = 1;
      for (let a = el; a; a = a.parentElement) {
        const style = getComputedStyle(a);
        opacity *= Number(style.opacity);
        if (a !== el && a !== document.documentElement && a !== document.body &&
            /hidden|clip/.test(style.overflowX + style.overflowY)) {
          const box = a.getBoundingClientRect();
          if (rect.left < box.left - 1 || rect.right > box.right + 1 ||
              rect.top < box.top - 1 || rect.bottom > box.bottom + 1) {
            problems.push(`${label} is clipped by ${a.className || a.tagName}`);
          }
        }
      }
      if (opacity < 0.999) problems.push(`${label} opacity ${opacity}`);
      if (getComputedStyle(el).visibility !== 'visible') problems.push(`${label} not visible`);
    }
  }
  return problems;
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  const url = pathToFileURL(path.resolve(process.argv[2] || '.', 'index.html')).href;
  try {
    // 1. Order around the journey markers, one heading each
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await noJs.newPage();
    await page.goto(url);
    const layout = await page.evaluate(ids => {
      const main = document.querySelector('main');
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_COMMENT);
      const markers = {};
      while (walker.nextNode()) markers[walker.currentNode.textContent.trim()] = walker.currentNode;
      const follows = (a, b) => Boolean(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return ids.map(id => {
        const section = document.getElementById(id);
        if (!section) return { id, missing: true };
        const heading = document.getElementById(section.getAttribute('aria-labelledby'));
        return {
          id,
          tag: section.tagName,
          inMain: main.contains(section),
          heading: heading && /^H[2-3]$/.test(heading.tagName) ? heading.textContent.trim() : '',
          beforeJourney: follows(section, markers['journey:start']),
          afterJourney: follows(markers['journey:end'], section),
          index: Array.prototype.indexOf.call(document.querySelectorAll('main section[id]'), section),
        };
      });
    }, IDS);
    for (const item of layout) assert(!item.missing, `#${item.id} must exist`);
    assert.deepEqual(layout.map(s => s.tag), ['SECTION', 'SECTION', 'SECTION', 'SECTION']);
    assert(layout.every(s => s.inMain), 'Sections live inside main');
    assert(layout.every(s => s.heading), 'Each section is labelled by its heading');
    assert(layout[0].beforeJourney, '#emergencia comes before the journey');
    assert(layout.slice(1).every(s => s.afterJourney), '#metas, #limites, #preguntas come after the journey');
    assert(layout.every((s, i) => i === 0 || s.index > layout[i - 1].index), 'Sections keep the order 02, 08, 09, 10');

    // 2. Without JavaScript every text is visible
    await page.locator('#preguntas details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.deepEqual(await page.evaluate(hiddenText, IDS), [], `No hidden text without JS at ${width}px`);
    }
    await noJs.close();

    // 3. FAQ asks "¿A quién le avisa?" and never limits the contacts
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    const live = await ctx.newPage();
    const errors = [];
    live.on('pageerror', error => errors.push(error.message));
    await live.goto(url);
    const questions = await live.locator('#preguntas summary').allTextContents();
    assert(questions.length >= 7, 'FAQ keeps its seven questions');
    assert(questions.some(q => q.trim() === '¿A quién le avisa?'), 'FAQ asks "¿A quién le avisa?"');
    assert(!questions.some(q => /cu[aá]ntos contactos/i.test(q)), 'The old contacts question is gone');
    const answers = (await live.locator('#preguntas details > :not(summary)').allTextContents()).join(' ');
    const pageText = await live.locator('#emergencia, #metas, #limites, #preguntas').allTextContents();
    for (const text of [answers, pageText.join(' ')]) {
      assert(!/hasta\s+5\b/i.test(text), 'No "Hasta 5" contact limit');
      assert(!/\d+\s+contactos/i.test(text), 'No numeric contact limit');
      assert(!/(m[aá]ximo|l[ií]mite)[^.]*contactos/i.test(text), 'No contact maximum');
    }
    const whoAnswer = await live.locator('#preguntas details', { hasText: '¿A quién le avisa?' }).locator(':scope > :not(summary)').textContent();
    assert(/centro de salud/i.test(whoAnswer) && /10 segundos/.test(whoAnswer), 'Who answer follows the report facts');

    // 4. Every FAQ item opens with Enter on its summary
    await live.locator('#preguntas details').evaluateAll(items => items.forEach(item => { item.open = false; }));
    const count = await live.locator('#preguntas summary').count();
    for (let i = 0; i < count; i += 1) {
      const summary = live.locator('#preguntas summary').nth(i);
      await summary.focus();
      await live.keyboard.press('Enter');
      assert.equal(await summary.evaluate(s => s.parentElement.open), true, `FAQ item ${i + 1} opens with Enter`);
    }

    // 5. With motion, scroll reveals end fully visible; reduced motion shows everything at once
    await live.reload();
    assert(await live.evaluate(() => document.documentElement.classList.contains('motion')));
    await scrollThrough(live);
    await live.waitForTimeout(2600);
    await live.locator('#preguntas details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    await live.waitForTimeout(400);
    assert.deepEqual(await live.evaluate(hiddenText, IDS), [], 'Revealed text ends fully visible');
    assert.deepEqual(errors, [], 'No page errors');
    await ctx.close();

    const calm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const still = await calm.newPage();
    await still.goto(url);
    await still.locator('#preguntas details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    assert.deepEqual(await still.evaluate(hiddenText, IDS), [], 'Reduced motion shows text without waiting');
    await calm.close();

    console.log('PASS: sections 02, 08, 09, 10 are ordered, visible without JS, FAQ is honest and keyboard friendly');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
