
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
import { classifySweepTransportErrors } from './sweep-error-classification.mjs';
import { installSweepTransportFixture, transportFixtureErrors } from './sweep-transport-fixture.mjs';

const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE
  || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PLAYWRIGHT);

const PAGE = process.argv[2];
if (!PAGE) { console.error('usage: sweep-area.mjs <page-id>'); process.exit(64); }

const KEY = 'skyblock-farming-maxer-v1';
const VARIANT_BUDGET_MS = Number(process.env.VARIANT_BUDGET_MS || 90000);
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
  const consoleErrors = [];
  const networkFailures = [];
  const requestFailures = [];
  p.setDefaultTimeout(3000);
  p.on('response',response=>{if(response.status()>=400)networkFailures.push({status:response.status(),url:response.url(),external:new URL(response.url()).origin!==new URL(BASE_URL).origin});});
  p.on('requestfailed', request => requestFailures.push({ url: request.url(),
    method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));
  let crashed = false;
  p.on('crash', () => { crashed = true; });
  p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  p.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({text:message.text(),url:message.location()?.url || ''});
  });
  const runTransportFixture = await installSweepTransportFixture(p, process.env.SWEEP_MARKET_FAILURE, BASE_URL);
  let transportFixture = null;

  if (seed) await p.addInitScript(([k, s]) => localStorage.setItem(k, s), [KEY, JSON.stringify(seed)]);

  const alive = async () => {
    try { await cap(p.evaluate(() => new Promise(r => requestAnimationFrame(() => r(1)))), 2500, 'raf'); return true; }
    catch { return false; }
  };
  const tap = async sel => cap(p.click(sel, { timeout: 3000 }), 4000, sel);

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
  const clickHandle = async h => cap(h.click({ timeout: 3000 }), 4000, 'click');

  let clicks = 0;
  let verdict = 'ok';
  try {
    await cap(p.goto(`${BASE_URL}/?t=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 9000 }), 10000, 'goto');
    /**
     * Wait for the navigation, not for the clock.
     *
     * This used to be a flat 900ms. `sweep-all.sh` runs four areas at once,
     * each with three browser contexts, against one local server -- so under
     * that load the nav enhancements had not finished building the rail yet and
     * the run reported `crops` as UNREACHABLE on a page whose link is perfectly
     * fine. A false UNREACHABLE is worse than a slow sweep: it cost a real
     * investigation, and the same check had just found a genuine one.
     */
    await cap(
      p.waitForSelector('[data-nav-toggle]', { state: 'visible', timeout: 8000 }),
      9000,
      'nav ready',
    );
    await p.waitForTimeout(400);
    if (runTransportFixture) transportFixture = await cap(runTransportFixture(), 8000, 'market transport fixture');
    if (process.env.SWEEP_INJECT_ERROR === '1') await p.evaluate(() => setTimeout(()=>{throw new Error('AUDIT_INJECTED_RUNTIME_ERROR');},0));
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
      /**
       * Open the navigation drawer first.
       *
       * The rail collapses to a 44px three-dot handle and hides its whole
       * `<nav>` until `.nav-open` is set, so every link is 0x0 until the
       * toggle is clicked. Without this the sweep reported *every* page as
       * "UNREACHABLE: page exists but no visible way to open it" -- which is
       * worse than useless, because this is the check that found the one
       * genuinely unreachable page.
       */
      const openNavigation = async () => {
        const rail = await p.$('.sidebar');
        const open = rail && await rail.evaluate(node => node.classList.contains('nav-open'));
        if (open) return;
        const toggle = await p.$('[data-nav-toggle]');
        if (!toggle) return;
        await cap(toggle.click({ timeout: 2000 }), 3000, 'nav toggle');
        await p.waitForTimeout(250);
      };
      await openNavigation();

      /**
       * A link that is merely late is not a link that is missing, so give it a
       * bounded chance to appear before calling the page unreachable. A page
       * genuinely hidden by CSS never becomes visible and still fails here.
       */
      await p.waitForSelector(`.sidebar [data-page="${PAGE}"]`, { state: 'visible', timeout: 5000 });
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
        await cap(select.selectOption(PAGE), 4000, 'selectOption');
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
      if (landed !== PAGE) { verdict = `navigated to ${landed} instead`; }

      const drawerIds = verdict !== 'ok' ? [] : await p.$$eval('button[data-open]', els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.dataset.open));
      for (const id of drawerIds) {
        if (outOfTime()) { verdict = `budget spent after ${clicks} clicks (drawers)`; break; }
        await tap(`button[data-open="${id}"]`);
        await p.waitForTimeout(80); clicks++;
        if (!await alive()) throw new Error(`FROZE opening ${id}`);
        if (!await p.$('.drawer .close')) throw new Error(`Drawer ${id} did not open`);
        await tap('.drawer .close');
        if (await p.$('.drawer')) throw new Error(`Drawer ${id} did not close`);
      }
      if (verdict === 'ok') {
        const slots = await p.$$eval('.slot-card', els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>({name:e.dataset.slot,target:e.dataset.setupTarget||'normal'})));
        for (const {name,target} of slots) {
          if (outOfTime()) { verdict = `budget spent after ${clicks} clicks (slots)`; break; }
          await tap(`.slot-card[data-slot="${name}"][data-setup-target="${target}"]`);
          await p.waitForTimeout(110); clicks++;
          if (!await p.$(`[data-item-editor="${name}"]`)) throw new Error(`Slot ${name} did not open`);
          if (!await alive()) throw new Error(`FROZE on slot ${name}`);
        }
      }

      // Every lever and radio on the page, since those are what this release changed.
      if (verdict === 'ok') {
        const currentControls = () => p.$$eval('.lever, [role="radio"], .sb-reforge-option, .planner-mode-tab, .planner-row, .setup-tab', els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>{
          const node=e.matches('.lever')?e.querySelector('input'):e;
          const attrs=node.getAttributeNames().filter(key=>key.startsWith('data-')).map(key=>`[${key}="${CSS.escape(node.getAttribute(key))}"]`).join('');
          const selector=node.tagName.toLowerCase()+attrs;
          return e.matches('.lever')?`label:has(${selector})`:selector;
        }));
        let index = 0;
        const seenControls = new Set();
        while (index < 40) {
          // Rankings can legitimately change after a price arrives. Snapshot
          // each next visible control anew; never click a stale detached row.
          const selector = (await currentControls()).find(value=>!seenControls.has(value));
          if (!selector) break;
          seenControls.add(selector);
          if (outOfTime()) { verdict = `budget spent after ${clicks} clicks (controls)`; break; }
          const before=await p.evaluate(key=>localStorage.getItem(key),KEY);
          const noOp=await p.locator(selector).first().evaluate(e=>e.getAttribute('aria-pressed')==='true'||e.getAttribute('aria-checked')==='true'||e.classList.contains('selected')||e.classList.contains('active'));
          await tap(selector);
          await p.waitForTimeout(70); clicks++; index++;
          const after=await p.evaluate(key=>localStorage.getItem(key),KEY);
          if (before===after && !noOp && !await p.$('.drawer')) throw new Error(`Control #${index} had no observable outcome: ${selector}`);
          if (!await alive()) throw new Error(`FROZE on control #${index}`);
          if (await p.$('.drawer .close')) await tap('.drawer .close');
        }
      }
    }
  } catch (error) {
    verdict = String(error.message || error);
  }

  const expectedLocalMiss = url => /\/(deploy-version\.json|favicon\.ico)(?:[?#]|$)/.test(url);
  // A rejected SkyCofl history request is a handled unknown-price input,
  // tested in market-average-prices.test.js. Retain its URL/status as evidence;
  // a local 400 or a 400 from another endpoint remains an error.
  const handledMarketHistory400 = row => row.external && row.status===400
    && new URL(row.url).hostname==='sky.coflnet.com'
    && /^\/api\/(?:bazaar\/[^/]+\/history|item\/price\/[^/]+\/history\/full)$/.test(new URL(row.url).pathname);
  const expectedExternal = row => row.external && ([403,429].includes(row.status) || handledMarketHistory400(row));
  const networkNotes = networkFailures.filter(expectedExternal);
  for (const row of networkFailures) if(!row.external && !expectedLocalMiss(row.url)) errs.push(`Local HTTP ${row.status}: ${row.url}`);
  const { remainingConsoleErrors, marketTransportNotes } = classifySweepTransportErrors(consoleErrors, requestFailures, BASE_URL);
  if (runTransportFixture && !transportFixture) errs.push('MARKET_TRANSPORT_FIXTURE_DID_NOT_COMPLETE');
  errs.push(...transportFixtureErrors(transportFixture, marketTransportNotes));
  for (const row of remainingConsoleErrors) {
    if (/ERR_TUNNEL/.test(row.text) || expectedLocalMiss(row.url)) continue;
    const status = Number(row.text.match(/server responded with a status of (\d+)/)?.[1]);
    const exact = networkFailures.find(f=>f.url===row.url&&f.status===status);
    const bareExpectedExternal = !row.url && [400,403,429].includes(status)
      && networkNotes.some(f=>f.status===status)
      && (status!==400 || networkFailures.filter(f=>f.status===400).every(handledMarketHistory400))
      && !networkFailures.some(f=>!f.external&&f.status===status&&!expectedLocalMiss(f.url));
    if ((exact && expectedExternal(exact)) || bareExpectedExternal) continue;
    errs.push(row.text.slice(0,180)+(row.url?` [${row.url}]`:''));
  }
  const unique = [...new Set(errs)];
  await cap(ctx.close(), 4000, 'ctx close').catch(() => {});
  return { label, verdict, clicks, crashed, errors: unique, marketTransportNotes, transportFixture,
    networkNotes: [...new Map(networkNotes.map(row=>[row.url,row])).values()] };
}

const browser = await chromium.launch();
if (process.env.SWEEP_INJECT_ERROR === '1') filled.injectAuditError = true;
const results = [];
for (const [label, viewport, seed] of VARIANTS) {
  results.push(await sweepVariant(browser, label, viewport, seed));
}
await cap(browser.close(), 5000, 'browser close').catch(() => {});

let worst = 0;
for (const r of results) {
  const bad = r.crashed || r.errors.length > 0 || (r.verdict !== 'ok' && !r.verdict.startsWith('budget'));
  const budget = r.verdict.startsWith('budget');
  if (bad) worst = Math.max(worst, 1);
  else if (budget) worst = Math.max(worst, 2);
  console.log(`[${PAGE}] ${r.label} ${r.verdict} (${r.clicks} clicks)`
    + (r.crashed ? ' RENDERER CRASHED' : '')
    + (r.errors.length ? ' | ' + r.errors.join(' ;; ') : '')
    + (r.networkNotes.length ? ' | EXTERNAL_HTTP_NOTE ' + JSON.stringify(r.networkNotes) : '')
    + (r.marketTransportNotes.length ? ' | EXTERNAL_MARKET_TRANSPORT_NOTE ' + JSON.stringify(r.marketTransportNotes) : '')
    + (r.transportFixture ? ' | MARKET_FAILURE_FIXTURE ' + JSON.stringify(r.transportFixture) : ''));
}
process.exit(worst);
