import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from '../../src/config.js';

const engines = await import(process.env.PLAYWRIGHT_MODULE);
const engine = process.env.AUDIT_BROWSER || 'chromium';
const out = process.env.AUDIT_OUT;
if (!engines[engine] || !out) throw new Error('Browser engine and AUDIT_OUT are required.');
await mkdir(out, { recursive: true });
const cases = [];
const add = (viewport, check, status, evidence) => cases.push({ engine, viewport, check, status, evidence });
const seed = {
  schemaVersion: DATA_SCHEMA_VERSION, page: 'dashboard', selectedCrop: 'melon', search: '', drawer: null,
  profile: { name: 'Disposable cross-browser audit', globalFortune: 0, cropFortune: {},
    levels: {}, owned: {}, costs: {}, manualGain: {}, toolProgress: {}, cropProgress: {} },
};
const browser = await engines[engine].launch();
const geometry = page => page.evaluate(() => {
  const details = document.querySelector('details[data-pet-item-dropdown]');
  const menu = details?.querySelector('.sb-pet-dropdown-menu');
  const main = document.querySelector('main');
  if (!details?.open || !menu) return { open: false, mainTop: main?.scrollTop };
  const m = menu.getBoundingClientRect();
  const options = [...menu.querySelectorAll('[data-pet-item-option]')].map(e => {
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { id: e.dataset.petItemOption, label: e.textContent.trim(), x, y, top: r.top, bottom: r.bottom,
      canHit: r.top >= 0 && r.bottom <= innerHeight + 1 && !!hit && (hit === e || e.contains(hit)) };
  });
  return { open: true, viewport: { width: innerWidth, height: innerHeight }, mainTop: main.scrollTop,
    mainMax: main.scrollHeight - main.clientHeight, menuTop: m.top, menuBottom: m.bottom, options };
});
const wheelToLast = async page => {
  const main = await page.locator('main').boundingBox();
  await page.mouse.move(main.x + main.width / 2, main.y + main.height - 20);
  for (let i = 0; i < 6; i++) {
    const g = await geometry(page);
    if (g.options?.at(-1)?.canHit) return g;
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(180);
  }
  return geometry(page);
};
try {
  for (const [name, width, height] of [['320-portrait', 320, 568], ['390-portrait', 390, 844], ['800-landscape', 800, 360]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [], httpErrors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) httpErrors.push({ status: r.status(), path: new URL(r.url()).pathname }); });
    await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [STORAGE_KEY, seed]);
    try {
      await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
      await page.locator('[data-activity-mode="farm"]').waitFor({ timeout: 15000 });
      // Allow startup hydration before testing a normally opened navigation.
      // Retain retries as evidence; never force hidden controls or mutate route state.
      await page.waitForTimeout(2200);
      const navigationAttempts = [];
      for (let attempt = 0; attempt < 4; attempt++) {
        const toggle = page.locator('[data-nav-toggle]');
        if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.tap();
        await page.waitForTimeout(250);
        const expanded = await toggle.getAttribute('aria-expanded');
        try {
          await page.locator('.sidebar [data-page="setups"]').tap({ timeout: 1800 });
          navigationAttempts.push({ attempt, expanded, selected: true });
          break;
        } catch (e) {
          navigationAttempts.push({ attempt, expanded, selected: false, message: String(e).split('\\n')[0],
            afterExpanded: await toggle.getAttribute('aria-expanded') });
          await page.waitForTimeout(400);
        }
      }
      add(name, 'settled-navigation-retries', navigationAttempts.some(a => !a.selected) ? 'NOTE' : 'PASS', navigationAttempts);
      await page.waitForTimeout(250);
      const landed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).page, STORAGE_KEY);
      add(name, 'normal-tap-navigation', landed === 'setups' ? 'PASS' : 'FAIL', { landed });
      await page.locator('.slot-card[data-slot="petItem"][data-setup-target="normal"]').tap();
      const summary = page.locator('details[data-pet-item-dropdown] > summary');
      await summary.waitFor({ state: 'visible' });
      await summary.tap();
      await page.waitForTimeout(150);
      const immediate = await wheelToLast(page);
      add(name, 'last-option-point-in-time-hit', immediate.options?.at(-1)?.canHit ? 'PASS' : 'FAIL', immediate);
      await page.screenshot({ path: join(out, name + '-immediate.png') });
      const postCapture = await geometry(page);
      await page.waitForTimeout(2100);
      const settled = await geometry(page);
      add(name, 'last-option-stable-after-capture-and-anchor-expiry', settled.options?.at(-1)?.canHit ? 'PASS' : 'FAIL',
        { immediate, postCapture, settled, note: 'No injected DOM mutation in this scenario.' });
      await page.screenshot({ path: join(out, name + '-settled.png') });
      // Keyboard behavior is independent of selection's editor lifecycle.
      if (!await page.locator('details[data-pet-item-dropdown]').evaluate(e => e.open)) await summary.tap();
      await summary.focus();
      await page.keyboard.press('Escape');
      const escaped = await geometry(page);
      add(name, 'pet-item-escape-close', escaped.open ? 'FAIL' : 'PASS', { remainsOpen: escaped.open });
      if (escaped.open) {
        await page.keyboard.press('ArrowDown');
        const focus = await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          optionId: document.activeElement?.dataset?.petItemOption ?? null,
          inOptions: !!document.activeElement?.matches('[data-pet-item-option]'),
        }));
        add(name, 'declared-listbox-arrow-focus', focus.inOptions ? 'PASS' : 'FAIL', focus);
      }
      if (!await page.locator('details[data-pet-item-dropdown]').evaluate(e => e.open)) await summary.tap();
      await page.waitForTimeout(2100);
      const ready = await wheelToLast(page);
      const last = ready.options?.at(-1);
      if (last?.canHit) {
        await page.touchscreen.tap(last.x, last.y);
        await page.waitForTimeout(350);
        const selected = await page.evaluate(key => {
          const raw = JSON.parse(localStorage.getItem(key));
          return raw.profile?.setups?.list?.find(s => s.id === 'normal')?.slots?.petItem?.skyblockId ?? null;
        }, STORAGE_KEY);
        add(name, 'last-option-actual-touch-selection-after-recovery', selected === last.id ? 'PASS' : 'FAIL',
          { intended: last.id, persisted: selected, locatorAutoscroll: false });
      } else {
        add(name, 'last-option-actual-touch-selection-after-recovery', 'BLOCKED', { reason: 'No visible hit target after wheel recovery.', ready });
      }
      add(name, 'runtime-page-errors', errors.length ? 'FAIL' : 'PASS', errors);
      add(name, 'external-http-errors', httpErrors.length ? 'NOTE' : 'PASS', [...new Map(httpErrors.map(r => [r.status + r.path, r])).values()]);
    } catch (e) {
      const state = await page.evaluate(key => ({
        page: JSON.parse(localStorage.getItem(key) || '{}').page,
        navigationExpanded: document.querySelector('[data-nav-toggle]')?.getAttribute('aria-expanded'),
        editorCount: document.querySelectorAll('[data-item-editor]').length,
        dropdownCount: document.querySelectorAll('[data-pet-item-dropdown]').length,
      }), STORAGE_KEY).catch(() => null);
      add(name, 'probe-execution', 'BLOCKED', { message: String(e), errors, state });
      await page.screenshot({ path: join(out, name + '-blocked.png') }).catch(() => {});
    } finally {
      await context.close();
    }
    await writeFile(join(out, 'browser-followup.json'), JSON.stringify({ auditedSource: process.env.AUDITED_SHA, engine, cases }, null, 2));
  }
} finally { await browser.close(); }
const counts = Object.fromEntries(['PASS', 'FAIL', 'NOTE', 'BLOCKED'].map(s => [s, cases.filter(c => c.status === s).length]));
console.log(JSON.stringify({ engine, counts, cases }, null, 2));
process.exitCode = counts.FAIL || counts.BLOCKED ? 1 : 0;
