
/**
 * Visual audit: overlays that collide with page chrome, boxes that overflow
 * their parent, and text that is clipped.
 *
 * Everything here is a measurement against the rendered box, never a reading
 * of a CSS property -- a z-index tells you nothing once a stacking context is
 * involved, and a rule you just wrote tells you nothing about what paints.
 */
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE
  || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PLAYWRIGHT);
const BASE = process.env.SWEEP_URL || 'http://127.0.0.1:4173';

/** Run with `npm run audit:overlay` against a served build. */
const VIEWPORTS = [
  ['phone', { width: 390, height: 844 }],
  ['phone-l', { width: 412, height: 915 }],
  ['tablet', { width: 760, height: 1024 }],
  ['desktop', { width: 1280, height: 900 }],
];

const audit = () => {
  const findings = [];
  const box = el => el.getBoundingClientRect();
  const name = el => {
    const cls = (el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  };
  const painted = el => {
    const r = box(el);
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0';
  };

  // 1. Content painting on top of the sticky topbar or the fixed nav rail.
  for (const [chromeSel, label] of [['.topbar', 'topbar'], ['.sidebar.sb-rail', 'rail']]) {
    const chrome = document.querySelector(chromeSel);
    if (!chrome || !painted(chrome)) continue;
    const cr = box(chrome);
    for (const el of document.querySelectorAll('.content *')) {
      if (!painted(el)) continue;
      const r = box(el);
      const ox = Math.min(r.right, cr.right) - Math.max(r.left, cr.left);
      const oy = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
      if (ox < 4 || oy < 4) continue;
      const x = Math.round(Math.max(r.left, cr.left) + ox / 2);
      const y = Math.round(Math.max(r.top, cr.top) + oy / 2);
      const hit = document.elementFromPoint(x, y);
      if (hit && !hit.closest(chromeSel) && (hit === el || el.contains(hit))) {
        findings.push({ kind: `paints-over-${label}`, el: name(el), at: `${x},${y}` });
      }
    }
  }

  // 2. A child sticking out of a parent that clips or is meant to contain it.
  for (const el of document.querySelectorAll('.content *')) {
    if (!painted(el)) continue;
    const parent = el.parentElement;
    if (!parent || parent === document.body) continue;
    const ps = getComputedStyle(parent);
    if (ps.overflow !== 'visible' || ps.position === 'static') continue;
    const r = box(el), pr = box(parent);
    if (pr.width < 8 || pr.height < 8) continue;
    const out = Math.max(pr.left - r.left, r.right - pr.right, pr.top - r.top, r.bottom - pr.bottom);
    if (out > 10) findings.push({ kind: 'overflows-parent', el: name(el), parent: name(parent), by: Math.round(out) });
  }

  // 3. Text cut off by its own box. Screen-reader-only text is clipped on
  //    purpose -- that is how it stays out of sight -- so it is not a finding.
  for (const el of document.querySelectorAll('.content *')) {
    if (!painted(el) || el.children.length) continue;
    if (el.closest('.sr-only, [class*="visually-hidden"]')) continue;
    const s = getComputedStyle(el);
    if (s.overflow === 'visible' && s.textOverflow !== 'ellipsis') continue;
    if (el.scrollWidth - el.clientWidth > 3 && (el.textContent || '').trim().length > 2) {
      findings.push({ kind: 'text-clipped', el: name(el), text: el.textContent.trim().slice(0, 30), by: el.scrollWidth - el.clientWidth });
    }
  }

  // 4. The page itself scrolling sideways.
  if (document.documentElement.scrollWidth - window.innerWidth > 2) {
    let widest = null, widestRight = 0;
    for (const el of document.querySelectorAll('.content *, .topbar *')) {
      if (!painted(el)) continue;
      const r = box(el);
      if (r.right > widestRight) { widestRight = r.right; widest = el; }
    }
    findings.push({
      kind: 'page-scrolls-sideways',
      by: document.documentElement.scrollWidth - window.innerWidth,
      el: widest ? name(widest) : '?',
    });
  }

  return findings;
};

const browser = await chromium.launch();
const totals = {};
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/?t=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);
  const pages = await p.$$eval('.sidebar [data-page]', els => els.map(e => e.dataset.page));
  for (const page of pages) {
    await p.evaluate(id => document.querySelector(`.sidebar [data-page="${id}"]`)?.click(), page);
    await p.waitForTimeout(400);
    for (const scroll of [0, 300, 700]) {
      await p.evaluate(y => window.scrollTo(0, y), scroll);
      await p.waitForTimeout(150);
      const findings = await p.evaluate(audit);
      for (const f of findings) {
        const key = `${f.kind}|${f.el}|${f.parent || ''}`;
        totals[key] = totals[key] || { ...f, where: new Set() };
        totals[key].where.add(`${vpName}/${page}`);
      }
    }
  }
  await ctx.close();
}
await browser.close();

const rows = Object.values(totals).sort((a, b) => b.where.size - a.where.size);
const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log('=== summary ===');
for (const [kind, n] of Object.entries(byKind)) console.log(`${String(n).padStart(4)}  ${kind}`);
console.log(`\n=== ${rows.length} distinct findings ===`);
for (const r of rows.slice(0, 45)) {
  const extra = [r.parent ? `in ${r.parent}` : '', r.by ? `by ${r.by}px` : '', r.text ? `"${r.text}"` : '', r.at ? `at ${r.at}` : '']
    .filter(Boolean).join(' ');
  console.log(`${r.kind.padEnd(22)} ${r.el.padEnd(38)} ${extra}  [${r.where.size}x e.g. ${[...r.where][0]}]`);
}
