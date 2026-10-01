import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from '../../src/config.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const BASE = process.env.SWEEP_URL || 'http://127.0.0.1:4173';
const OUT = process.env.AUDIT_OUT;
if (!OUT) throw new Error('AUDIT_OUT is required.');
await mkdir(OUT, { recursive: true });
const cases = [];
const add = (viewport, check, status, evidence) => cases.push({ viewport, check, status, evidence });
const variants = [
  ['320-portrait', 320, 568], ['360-portrait', 360, 800],
  ['390-portrait', 390, 844], ['412-portrait', 412, 915],
  ['568-landscape', 568, 320], ['800-landscape', 800, 360],
  ['844-landscape', 844, 390], ['915-landscape', 915, 412],
];
const baseline = {
  schemaVersion: DATA_SCHEMA_VERSION, page: 'dashboard', selectedCrop: 'melon',
  search: '', drawer: null,
  profile: { name: 'Disposable audit fixture', globalFortune: 0, cropFortune: {},
    levels: {}, owned: {}, costs: {}, manualGain: {}, toolProgress: {}, cropProgress: {} },
};
const browser = await chromium.launch();
const header = async page => page.evaluate(() => {
  const bar = document.querySelector('.topbar');
  const r = bar.getBoundingClientRect();
  const controls = [...bar.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width);
  return {
    innerWidth, innerHeight, bar: { left: r.left, right: r.right, width: r.width, height: r.height },
    pageSideways: document.documentElement.scrollWidth - innerWidth,
    buttons: controls.map(e => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent.trim(), width: r.width, height: r.height,
        left: r.left, right: r.right, clippedText: e.scrollWidth - e.clientWidth,
        insideHeader: r.left >= bar.getBoundingClientRect().left - 1 && r.right <= bar.getBoundingClientRect().right + 1 };
    }),
  };
});
const navigate = async (page, id) => {
  const toggle = page.locator('[data-nav-toggle]');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.tap();
  await page.locator('.sidebar [data-page="' + id + '"]').tap();
  await page.waitForTimeout(200);
  const landed = await page.evaluate(key => JSON.parse(localStorage.getItem(key))?.page, STORAGE_KEY);
  if (landed !== id) throw new Error('Navigation landed on ' + landed + ' instead of ' + id);
};
const menuGeometry = async page => page.evaluate(() => {
  const menu = document.querySelector('.sb-pet-dropdown[open] .sb-pet-dropdown-menu');
  const r = menu.getBoundingClientRect();
  const main = document.querySelector('main');
  return { top: r.top, bottom: r.bottom, height: r.height, client: menu.clientHeight,
    scroll: menu.scrollHeight, mainTop: main.scrollTop, mainMax: main.scrollHeight - main.clientHeight,
    options: [...menu.querySelectorAll('button')].map(e => {
      const b = e.getBoundingClientRect();
      const x = Math.min(innerWidth - 1, Math.max(1, b.left + b.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(1, b.top + b.height / 2));
      const hit = document.elementFromPoint(x, y);
      return { text: e.textContent.trim(), top: b.top, bottom: b.bottom,
        canHit: b.top >= 0 && b.bottom <= innerHeight + 1 && !!hit && (hit === e || e.contains(hit)) };
    }) };
});
try {
  for (const [name, width, height] of variants) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(([key, seed]) => localStorage.setItem(key, JSON.stringify(seed)), [STORAGE_KEY, baseline]);
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.locator('[data-activity-mode="farm"]').waitFor({ state: 'visible', timeout: 12000 });
      await page.waitForTimeout(300);
      const initial = await header(page);
      add(name, 'dashboard-header', initial.pageSideways > 2 || initial.buttons.some(e => !e.insideHeader) ? 'FAIL' : 'PASS', initial);
      await page.screenshot({ path: join(OUT, name + '-dashboard.png') });

      await navigate(page, 'setups');
      await page.locator('.slot-card[data-slot="petItem"]').waitFor({ state: 'visible' });
      const two = await header(page);
      add(name, 'two-set-header', two.pageSideways > 2 || two.buttons.some(e => !e.insideHeader) ? 'FAIL' : 'PASS', two);

      await page.locator('[data-add-physical-set]').tap();
      await page.locator('dialog[open]').waitFor({ state: 'visible' });
      const dialogColors = await page.locator('.physical-set-dialog-actions button').evaluateAll(nodes => nodes.map(e => {
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        return { text: e.textContent, background: s.backgroundColor, color: s.color,
          top: r.top, bottom: r.bottom, right: r.right, left: r.left };
      }));
      add(name, 'dialog-button-geometry', dialogColors.some(e => e.top < 0 || e.bottom > height || e.left < 0 || e.right > width) ? 'FAIL' : 'PASS', dialogColors);
      await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
      await page.waitForTimeout(100);
      const cancelOpen = await page.locator('dialog[open]').count();
      add(name, 'empty-add-set-cancel', cancelOpen ? 'FAIL' : 'PASS', { remainsOpen: !!cancelOpen });
      if (cancelOpen) await page.keyboard.press('Escape');
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });

      await page.locator('[data-add-physical-set]').tap();
      await page.locator('[data-new-set-name]').fill('Mushroom Set '.repeat(4).slice(0, 48));
      await page.locator('dialog .primary-btn').tap();
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      const setCount = await page.locator('[data-physical-setup]').count();
      const three = await header(page);
      add(name, 'three-set-header', setCount !== 3 || three.pageSideways > 2 || three.buttons.some(e => !e.insideHeader) ? 'FAIL' : 'PASS',
        { setCount, ...three });
      await page.screenshot({ path: join(OUT, name + '-three-sets.png') });
      await page.locator('[data-physical-setup="normal"]').tap();

      await page.locator('.slot-card[data-slot="petItem"]').tap();
      await page.locator('.sb-pet-item-editor').waitFor({ state: 'visible' });
      const editor = await page.evaluate(() => {
        const e = document.querySelector('.sb-pet-item-editor');
        const grid = e.querySelector('.item-editor-grid');
        const s = getComputedStyle(e), r = e.getBoundingClientRect(), g = grid.getBoundingClientRect();
        const budget = e.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
        return { viewport: innerWidth, editorWidth: r.width, gridWidth: g.width, innerBudget: budget,
          excess: g.width - budget, mainClient: document.querySelector('main').clientWidth,
          mainScrollWidth: document.querySelector('main').scrollWidth };
      });
      add(name, 'pet-item-grid-fits-editor', editor.excess > 1 ? 'FAIL' : 'PASS', editor);
      await page.screenshot({ path: join(OUT, name + '-pet-item-editor.png') });

      const summary = page.locator('details[data-pet-item-dropdown] > summary');
      await summary.tap();
      await page.waitForTimeout(150);
      const opened = await menuGeometry(page);
      add(name, 'pet-item-menu-opening-placement', opened.bottom > height + 1 ? 'NOTE' : 'PASS', opened);
      await page.mouse.move(Math.max(50, width - 18), Math.max(80, height - 30));
      for (let i = 0; i < 3; i++) {
        const g = await menuGeometry(page);
        if (g.options.at(-1)?.canHit) break;
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(150);
      }
      const reached = await menuGeometry(page);
      add(name, 'pet-item-last-option-reachable-after-scroll', reached.options.at(-1)?.canHit ? 'PASS' : 'FAIL', reached);
      await page.screenshot({ path: join(OUT, name + '-pet-item-menu.png') });
      await summary.focus();
      await page.keyboard.press('Escape');
      const escapeOpen = await page.locator('details[data-pet-item-dropdown]').getAttribute('open');
      add(name, 'pet-item-menu-escape', escapeOpen !== null ? 'FAIL' : 'PASS', { remainsOpen: escapeOpen !== null });
      if (escapeOpen !== null) await summary.tap();

      await navigate(page, 'tools');
      const crops = await page.locator('[data-sb-tool-crop]').evaluateAll(nodes => nodes.map(e => e.dataset.sbToolCrop));
      add(name, 'tool-card-coverage', crops.length === 13 ? 'PASS' : 'FAIL', { count: crops.length, crops });
      const toolResults = [];
      for (const crop of crops) {
        const card = page.locator('[data-sb-tool-crop="' + crop + '"]');
        await card.scrollIntoViewIfNeeded();
        const before = await card.boundingBox();
        await card.tap();
        await page.waitForTimeout(220);
        const after = await page.locator('[data-sb-tool-crop="' + crop + '"]').boundingBox();
        const pane = await page.locator('main').evaluate(e => ({ top: e.scrollTop, max: e.scrollHeight - e.clientHeight }));
        const drift = after.y - before.y;
        const required = pane.top + drift;
        const clamped = required < 0 || required > pane.max;
        toolResults.push({ crop, drift, mainTop: pane.top, mainMax: pane.max, clamped,
          status: Math.abs(drift) <= 3 || clamped ? 'PASS' : 'FAIL' });
      }
      add(name, 'all-tool-card-relative-scroll', toolResults.some(e => e.status === 'FAIL') ? 'FAIL' : 'PASS', toolResults);
      add(name, 'runtime-page-errors', errors.length ? 'FAIL' : 'PASS', errors);
    } catch (error) {
      add(name, 'probe-execution', 'BLOCKED', { message: String(error), errors });
      await page.screenshot({ path: join(OUT, name + '-blocked.png') }).catch(() => {});
    } finally {
      await context.close();
    }
    await writeFile(join(OUT, 'mobile-probes.json'), JSON.stringify({ auditedSource: process.env.AUDITED_SHA, cases }, null, 2));
  }
} finally {
  await browser.close();
}
const counts = Object.fromEntries(['PASS', 'FAIL', 'NOTE', 'BLOCKED'].map(status => [status, cases.filter(c => c.status === status).length]));
console.log(JSON.stringify({ counts, cases }, null, 2));
process.exitCode = counts.FAIL || counts.BLOCKED ? 1 : 0;
