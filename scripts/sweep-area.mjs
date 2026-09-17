
/**
 * Click sweep for ONE page, in every viewport variant.
 *
 * Sharded on purpose: a frozen renderer makes every Playwright call wait out
 * its own timeout, so one bad page used to eat the whole run's budget and the
 * sweep looked like it hung. Per-area workers give each page its own small
 * deadline and its own process, so a hang costs that area and nothing else,
 * and the areas that work still report.
 *
 * Usage: node sweep-area.mjs <page-id>
 * Exit 0 = clean, 1 = froze or errored, 2 = ran out of budget.
 */
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE
  || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PLAYWRIGHT);

const PAGE = process.argv[2];
if (!PAGE) { console.error('usage: sweep-area.mjs <page-id>'); process.exit(64); }

const KEY = 'skyblock-farming-maxer-v1';
const VARIANT_BUDGET_MS = Number(process.env.VARIANT_BUDGET_MS || 35000);
/** Matches `npm run serve`; override with SWEEP_URL to point at another build. */
const BASE_URL = process.env.SWEEP_URL || 'http://127.0.0.1:4173';

function cap(promise, ms, what) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout: ${what}`)), ms); }),
  ]);
}

const filled = {
  page: 'dashboard', selectedCrop: 'melon',
  profile: {
    name: 'P', globalFortune: 900, cropFortune: { melon: 420 },
    toolProgress: { 'melon-dicer': { levels: { 'tool-mk-ii': 1, 'tool-mk-iii': 1, 'tool-enchant-dedication': 4 }, owned: { 'tool-mk-ii': true, 'tool-mk-iii': true, 'tool-reforge-bountiful-reforge': true }, costs: {}, manualGain: {} } },
    cropProgress: {},
    setups: { modelVersion: 1, activeId: 'normal', list: [{ id: 'normal', name: 'N', slots: { helmet: { skyblockId: 'H', displayName: 'Helianthus Helmet', rarity: 'LEGENDARY', reforge: 'mossy', enchantments: { pesterminator: 6 }, gems: [], recombobulated: true, skullTexture: null, source: 'sync', itemUuid: null }, chestplate: null, leggings: null, boots: null, equipment1: null, equipment2: null, equipment3: null, equipment4: null, pet: null, petItem: null } }] },
  },
};

const VARIANTS = [
  ['desktop-empty ', { width: 1280, height: 1000 }, null],
  ['desktop-filled', { width: 1280, height: 1000 }, filled],
  ['phone-filled  ', { width: 390, height: 844 }, filled],
];

async function sweepVariant(browser, label, viewport, seed) {
  const deadline = Date.now() + VARIANT_BUDGET_MS;
  const outOfTime = () => Date.now() >= deadline;

  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800 });
  const p = await ctx.newPage();
  const errs = [];
  let crashed = false;
  p.on('crash', () => { crashed = true; });
  p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  p.on('console', m => {
    if (m.type() === 'error' && !/ERR_TUNNEL|api\.hypixel|textures\.minecraft|favicon/.test(m.text())) {
      errs.push(m.text().slice(0, 110));
    }
  });
  if (seed) await p.addInitScript(([k, s]) => localStorage.setItem(k, s), [KEY, JSON.stringify(seed)]);

  const alive = async () => {
    try { await cap(p.evaluate(() => new Promise(r => requestAnimationFrame(() => r(1)))), 2500, 'raf'); return true; }
    catch { return false; }
  };
  const tap = async sel => { try { await cap(p.click(sel, { timeout: 2000 }), 3000, sel); } catch {} };

  /**
   * Only elements with a layout box. The planner keeps its old list in the DOM
   * as `.planner-v1-source` with display:none, and clicking those 0x0 nodes
   * burned the whole budget on timeouts while the page's real controls -- 30
   * revenue rows and 7 mode tabs -- were never touched at all.
   */
  const visibleHandles = async selector => {
    const handles = await p.$$(selector);
    const keep = [];
    for (const h of handles) {
      const box = await h.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) keep.push(h);
    }
    return keep;
  };
  const clickHandle = async h => { try { await cap(h.click({ timeout: 2000 }), 3000, 'click'); } catch {} };

  let clicks = 0;
  let verdict = 'ok';
  try {
    await cap(p.goto(`${BASE_URL}/?t=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 9000 }), 10000, 'goto');
    await p.waitForTimeout(900);
    if (!await alive()) throw new Error('FROZE on load');

    /**
     * Navigation is verified, never assumed. An earlier run reported every
     * phone page as "ok" while never leaving the dashboard, because below
     * 780px the sidebar was display:none and clicking a hidden nav button does
     * nothing at all. The icon rail is shown at every width now, so the button
     * path is the normal one; the select branch stays as a fallback for a page
     * served from an older cache, and the landing check below is what actually
     * makes the difference between "no error" and "it worked".
     */
    const reached = await (async () => {
      const navButton = await p.$(`[data-page="${PAGE}"]`);
      if (navButton && await navButton.isVisible()) {
        await tap(`[data-page="${PAGE}"]`);
        await p.waitForTimeout(200);
        return true;
      }
      const select = await p.$('.mobile-page-select-addon');
      const inSelect = select
        ? await select.$$eval('option', (os, want) => os.some(o => o.value === want), PAGE)
        : false;
      if (inSelect) {
        await cap(select.selectOption(PAGE), 4000, 'selectOption').catch(() => {});
        await p.waitForTimeout(250);
        return true;
      }
      // Offered nowhere at all: the page was deliberately folded away
      // (navigation-dedupe collapses gear and pets into setups), which is not
      // the same failure as a page that exists but has no way in.
      return navButton ? false : null;
    })();

    if (reached === null) { verdict = 'no such page'; }
    else if (reached === false) { verdict = 'UNREACHABLE: page exists but no visible way to open it'; }
    else {
      if (!await alive()) throw new Error('FROZE on nav');
      const landed = await p.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('skyblock-farming-maxer-v1'))?.page ?? null; }
        catch { return null; }
      });
      if (landed && landed !== PAGE) { verdict = `navigated to ${landed} instead`; }

      const drawerTriggers = verdict !== 'ok' ? [] : await visibleHandles('[data-open]');
      for (const trigger of drawerTriggers) {
        if (outOfTime()) { verdict = `budget spent after ${clicks} clicks (drawers)`; break; }
        const id = await trigger.evaluate(e => e.dataset.open).catch(() => '?');
        await clickHandle(trigger);
        await p.waitForTimeout(80); clicks++;
        if (!await alive()) throw new Error(`FROZE opening ${id}`);
        if (await p.$('.drawer .close')) await tap('.drawer .close');
        await p.waitForTimeout(60);
        if (!await alive()) throw new Error(`FROZE closing ${id}`);
      }

      if (verdict === 'ok') {
        for (const slot of await visibleHandles('.slot-card')) {
          if (outOfTime()) { verdict = `budget spent after ${clicks} clicks (slots)`; break; }
          const name = await slot.evaluate(e => e.dataset.slot).catch(() => '?');
          await clickHandle(slot);
          await p.waitForTimeout(110); clicks++;
          if (!await alive()) throw new Error(`FROZE on slot ${name}`);
        }
      }

      // Every lever and radio on the page, since those are what this release changed.
      if (verdict === 'ok') {
        const controls = await visibleHandles(
          '.lever, [role="radio"], .sb-reforge-option, .planner-mode-tab, .planner-row, .setup-tab',
        );
        let index = 0;
        for (const control of controls.slice(0, 40)) {
          if (outOfTime()) { verdict = `budget spent after ${clicks} clicks (controls)`; break; }
          await clickHandle(control);
          await p.waitForTimeout(70); clicks++; index++;
          if (!await alive()) throw new Error(`FROZE on control #${index}`);
          if (await p.$('.drawer .close')) await tap('.drawer .close');
        }
      }
    }
  } catch (error) {
    verdict = String(error.message || error);
  }

  const unique = [...new Set(errs)].slice(0, 2);
  await cap(ctx.close(), 4000, 'ctx close').catch(() => {});
  return { label, verdict, clicks, crashed, errors: unique };
}

const browser = await chromium.launch();
const results = [];
for (const [label, viewport, seed] of VARIANTS) {
  results.push(await sweepVariant(browser, label, viewport, seed));
}
await cap(browser.close(), 5000, 'browser close').catch(() => {});

let worst = 0;
for (const r of results) {
  const bad = /FROZE|timeout|Error|UNREACHABLE|instead/.test(r.verdict);
  const budget = r.verdict.startsWith('budget');
  if (bad) worst = Math.max(worst, 1);
  else if (budget) worst = Math.max(worst, 2);
  console.log(`[${PAGE}] ${r.label} ${r.verdict} (${r.clicks} clicks)`
    + (r.crashed ? ' RENDERER CRASHED' : '')
    + (r.errors.length ? ' | ' + r.errors.join(' ;; ') : ''));
}
process.exit(worst);
