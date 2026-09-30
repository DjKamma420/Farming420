import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseUrl = process.env.FARMING420_BASE_URL || 'http://127.0.0.1:4173/';
const debugPort = Number(process.env.FARMING420_CDP_PORT || 9223);
const profileDir = mkdtempSync(join(tmpdir(), 'farming420-cdp-'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--metrics-recording-only',
  '--no-first-run',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  'about:blank',
], { stdio: 'ignore' });

let socket;
let nextId = 1;
const pending = new Map();

function fail(message) {
  throw new Error(message);
}

async function devtoolsPage() {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const pages = await response.json();
      const page = pages.find(entry => entry.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await wait(50);
  }
  fail('Chrome DevTools endpoint did not become ready');
}

async function connect() {
  const page = await devtoolsPage();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP WebSocket open timed out')), 5000);
    socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('CDP WebSocket failed')); }, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message || JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });
}

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) fail(response.exceptionDetails.text || 'Runtime.evaluate failed');
  return response.result?.value;
}

async function waitFor(expression, label, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    if (await evaluate(expression)) return;
    await wait(50);
  }
  fail(`Timed out waiting for ${label}`);
}

try {
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 840,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 412,
    screenHeight: 840,
  });

  await send('Page.navigate', { url: baseUrl });
  await waitFor('document.readyState === "complete"', 'initial page load');

  await evaluate(`(async () => {
    const { DATA_SCHEMA_VERSION, STORAGE_KEY } = await import('./src/config.js');
    const { CATALOG_STORAGE_KEY } = await import('./src/item-catalog.js');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: DATA_SCHEMA_VERSION,
      page: 'tools',
      selectedCrop: 'melon',
      search: '',
      drawer: null,
      profile: {
        name: 'Trusted tool scroll smoke',
        globalFortune: 0,
        cropFortune: {},
        cropProgress: {},
        toolProgress: {
          'melon-dicer': { levels: {}, owned: {}, costs: {}, manualGain: {} },
          'fungi-cutter': { levels: {}, owned: {}, costs: {}, manualGain: {} }
        },
        levels: {},
        owned: {},
        costs: {},
        manualGain: {}
      }
    }));
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      items: []
    }));
    return true;
  })()`);

  await send('Page.reload', { ignoreCache: true });
  await waitFor('document.readyState === "complete"', 'tool page reload');
  await waitFor(
    'Boolean(document.querySelector(\'.sb-tool-card.selected[data-sb-tool-crop="melon"]\') && document.querySelector(\'.sb-tool-card[data-sb-tool-crop="mushroom"]\') && document.querySelector(\'.sb-tool-grid > .sb-docked-editor:not(.sb-tool-editor-collapsed)\'))',
    'expanded Melon accordion',
  );
  await wait(250);

  const cropIds = await evaluate(`[...document.querySelectorAll('.sb-tool-card[data-sb-tool-crop]')].map(card => card.dataset.sbToolCrop)`);
  const sequence = [...cropIds.filter(id => id !== 'melon'), 'melon'];
  let maxDrift = 0;
  const rows = [];

  for (const cropId of sequence) {
    const selector = `.sb-tool-card[data-sb-tool-crop="${cropId}"]`;
    const selectedSelector = `.sb-tool-card.selected[data-sb-tool-crop="${cropId}"]`;

    await evaluate(`(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      target.scrollIntoView({ block: 'center' });
      return true;
    })()`);
    await wait(100);

    const before = await evaluate(`(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      const main = document.querySelector('.main');
      const rect = target.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        top: rect.top,
        scrollTop: main.scrollTop,
        maxScroll: Math.max(0, main.scrollHeight - main.clientHeight)
      };
    })()`);

    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: before.x, y: before.y, radiusX: 2, radiusY: 2, force: 1 }],
    });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await waitFor(
      `Boolean(document.querySelector(${JSON.stringify(selectedSelector)})?.nextElementSibling?.matches('.sb-docked-editor:not(.sb-tool-editor-collapsed)'))`,
      `${cropId} accordion`,
    );
    await wait(180);

    const after = await evaluate(`(() => {
      const target = document.querySelector(${JSON.stringify(selectedSelector)});
      const main = document.querySelector('.main');
      const rect = target.getBoundingClientRect();
      return {
        top: rect.top,
        scrollTop: main.scrollTop,
        maxScroll: Math.max(0, main.scrollHeight - main.clientHeight)
      };
    })()`);

    const drift = Math.abs(after.top - before.top);
    maxDrift = Math.max(maxDrift, drift);
    const wasNearBottom = before.maxScroll > 0 && before.maxScroll - before.scrollTop <= 4;
    const isAtBottom = after.maxScroll > 0 && after.maxScroll - after.scrollTop <= 4;
    rows.push(`${cropId}:drift=${drift.toFixed(2)},y=${before.scrollTop.toFixed(0)}->${after.scrollTop.toFixed(0)},max=${after.maxScroll.toFixed(0)}`);
    if (drift > 4 || (!wasNearBottom && isAtBottom)) {
      fail(`trusted tool switch drifted for ${cropId}: drift=${drift.toFixed(2)} beforeY=${before.scrollTop.toFixed(2)} afterY=${after.scrollTop.toFixed(2)} beforeMax=${before.maxScroll.toFixed(2)} afterMax=${after.maxScroll.toFixed(2)}`);
    }
  }

  // Also cover a delayed full value render after the click anchor has expired.
  await wait(2100);
  const lateBefore = await evaluate(`(() => {
    const card = document.querySelector('.sb-tool-card.selected[data-sb-tool-crop="melon"]');
    const main = document.querySelector('.main');
    return { top: card.getBoundingClientRect().top, y: main.scrollTop };
  })()`);
  await evaluate(`window.dispatchEvent(new Event('farming420:item-value-updated')); true`);
  await wait(500);
  const lateAfter = await evaluate(`(() => {
    const card = document.querySelector('.sb-tool-card.selected[data-sb-tool-crop="melon"]');
    const main = document.querySelector('.main');
    return { top: card.getBoundingClientRect().top, y: main.scrollTop };
  })()`);
  const lateDrift = Math.abs(lateAfter.top - lateBefore.top);
  const lateScrollDelta = Math.abs(lateAfter.y - lateBefore.y);
  if (lateDrift > 4 || lateScrollDelta > 4) {
    fail(`delayed tool render drifted: top=${lateDrift.toFixed(2)} scroll=${lateScrollDelta.toFixed(2)}`);
  }

  console.log(`TRUSTED_TOOL_SCROLL_OK transitions=${sequence.length} maxDrift=${maxDrift.toFixed(2)} lateDrift=${lateDrift.toFixed(2)} lateScroll=${lateScrollDelta.toFixed(2)} ${rows.join(' | ')}`);
} finally {
  try { socket?.close(); } catch {}
  chrome.kill('SIGTERM');
  await wait(100);
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
