import { STORAGE_KEY } from './config.js';
import { migrateState, ensureProgressBucket, toolKeyForCropId } from './migrations.js';
import { parseSkyBlockTooltip, recognizeSkyBlockTooltip } from './tooltip-scanner.js';
import { applyToolScanToProgress, CROP_TURBO_IDS } from './tool-scan-apply.js';
import { cropsForToolItem } from './snapshot-apply.js';
import { CROPS } from './data.js';

const TOOL_REFORGES = Object.freeze(['blessed', 'bountiful']);

function activeToolPage() {
  return document.querySelector('.sidebar .nav-link.active')?.dataset.page === 'tools';
}

function loadStoredState() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { raw = {}; }
  const migration = migrateState(raw);
  if (migration.isNewer) throw new Error('Stored data comes from a newer Farming420 version and cannot be changed by this build.');
  return migration.state;
}

function cropLabel(cropId) {
  return CROPS.find(crop => crop.id === cropId)?.name || cropId;
}

function groupByTool(cropIds, via) {
  const byKey = new Map();
  for (const cropId of cropIds) {
    const key = toolKeyForCropId(cropId);
    const list = byKey.get(key) || [];
    list.push(cropId);
    byKey.set(key, list);
  }
  const targets = [...byKey.entries()].map(([key, ids]) => ({ key, cropIds: ids }));
  targets.via = via;
  return targets;
}

/**
 * Works out which physical tool the scan belongs to.
 *
 * The item name is the direct answer, but OCR truncates a title line often
 * enough that it cannot be the only one: a photographed tooltip read back as
 * "Melon |" with every enchantment intact. The two fallbacks use evidence the
 * tooltip repeats, and the caller says which one was used so the player can
 * check it before applying anything.
 */
export function toolTarget(scan) {
  const named = cropsForToolItem({ displayName: scan?.displayName || '' });
  if (named.length) return groupByTool(named, 'name');

  // The tooltip names the tool again in its own description text.
  for (const line of scan?.lines || []) {
    const hit = cropsForToolItem({ displayName: line });
    if (hit.length) return groupByTool(hit, 'line');
  }

  // A Turbo enchantment names exactly one crop, so it identifies the tool even
  // when no line survived legibly.
  const turboId = Object.keys(scan?.enchantments || {}).find(id => id.startsWith('turbo_'));
  const cropId = turboId
    ? Object.entries(CROP_TURBO_IDS).find(([, id]) => id === turboId)?.[0]
    : null;
  if (cropId) return groupByTool([cropId], 'turbo');

  return null;
}

function cropIdForTurbo(scan, cropIds) {
  return cropIds.find(cropId => {
    const turboId = CROP_TURBO_IDS[cropId];
    return turboId && Number(scan?.enchantments?.[turboId] || 0) > 0;
  }) || cropIds[0];
}

function saveToolScan(scan) {
  const targets = toolTarget(scan);
  if (!targets?.length) throw new Error('The scanned item was not recognized as a known Farming420 crop tool.');

  const state = loadStoredState();
  state.profile ||= {};
  state.profile.toolProgress ||= {};
  const applied = [];
  const warnings = [];

  for (const target of targets) {
    const cropId = cropIdForTurbo(scan, target.cropIds);
    const bucket = ensureProgressBucket(state.profile.toolProgress, target.key);
    const result = applyToolScanToProgress(bucket, scan, cropId);
    state.profile.toolProgress[target.key] = result.bucket;
    applied.push(...result.applied);
    warnings.push(...result.warnings);
  }

  state.schemaVersion = migrateState(state).schemaVersion;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return { applied, warnings, targets };
}

function resultRows(scan) {
  const enchants = Object.entries(scan.enchantments || {})
    .map(([id, level]) => `${id.replaceAll('_', ' ')} ${level}`)
    .join(', ') || 'None recognized';
  const gems = (scan.gems || []).join(', ') || 'None recognized';
  const targets = toolTarget(scan);
  const targetText = targets?.length
    ? targets.flatMap(target => target.cropIds.map(cropLabel)).join(', ')
    : 'Not recognized';
  const VIA_LABEL = {
    name: 'from the item name',
    line: 'from a line in the tooltip, because the name was not readable',
    turbo: 'from the Turbo enchantment, because the name was not readable',
  };
  return [
    ['Item', scan.displayName || 'Not recognized'],
    ['Tool target', targets?.length ? `${targetText} (${VIA_LABEL[targets.via] || 'recognized'})` : targetText],
    ['Rarity', scan.rarity || 'Not recognized'],
    ['Reforge', scan.reforge || 'Not recognized'],
    ['Enchantments', enchants],
    ['Farming for Dummies', scan.farmingForDummies ?? 'Not recognized'],
    ['Gemstones', gems],
  ].map(([label, value]) => `<div class="scanner-result-line-addon"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderScan(panel, rawText) {
  const textarea = panel.querySelector('[data-tool-scan-text]');
  textarea.value = rawText;
  const scan = parseSkyBlockTooltip(rawText, { reforgeCandidates: TOOL_REFORGES });
  panel._toolScan = scan;
  const targets = toolTarget(scan);
  const result = panel.querySelector('[data-tool-scan-result]');
  result.innerHTML = resultRows(scan);
  const warnings = [...scan.warnings];
  if (!targets?.length && scan.displayName) warnings.push('This item name does not match a known farming tool, so nothing will be applied.');
  if (targets?.via && targets.via !== 'name') {
    warnings.push(`The item name was not read clearly, so the tool was identified ${targets.via === 'turbo' ? 'from the Turbo enchantment' : 'from another line of the tooltip'}. Check the tool target above before applying.`);
  }
  panel.querySelector('[data-tool-scan-warnings]').innerHTML = warnings.map(message => `<li>${message}</li>`).join('');
  panel.querySelector('[data-tool-scan-apply]').disabled = !scan.displayName || !targets?.length;
}

async function scanFile(panel, file) {
  if (!file?.type?.startsWith('image/')) return;
  // A second scan started on top of the first leaves two workers writing to the
  // same status line, so the panel looks stuck on whichever finishes last.
  if (panel._toolScanBusy) return;
  panel._toolScanBusy = true;
  const progress = panel.querySelector('[data-tool-scan-progress]');
  const status = panel.querySelector('[data-tool-scan-status]');
  progress.hidden = false;
  progress.value = 0;
  status.textContent = 'Preparing screenshot…';
  try {
    const text = await recognizeSkyBlockTooltip(file, {
      onProgress(update) {
        progress.value = Math.max(0, Math.min(1, Number(update.progress) || 0));
        status.textContent = update.status || 'Recognizing tooltip…';
      },
    });
    renderScan(panel, text);
    status.textContent = text ? 'OCR finished. Review the result before applying.' : 'OCR finished, but no text was recognized.';
  } catch (error) {
    status.textContent = error?.message || String(error);
  } finally {
    progress.hidden = true;
    panel._toolScanBusy = false;
  }
}

function buildPanel() {
  const panel = document.createElement('section');
  panel.className = 'scanner-panel-addon tool-scanner-addon compact-scanner-addon';
  panel.tabIndex = 0;
  panel.innerHTML = `
    <div class="scanner-head-addon">
      <div><div class="eyebrow">Screenshot scanner</div><h3>Scan farming tool</h3></div>
      <span class="badge soft">local OCR</span>
    </div>
    <p class="scanner-copy-addon">Choose, drop or paste the tooltip. Farming420 detects the physical tool automatically; no crop selection is required.</p>
    <div class="scanner-actions-addon">
      <label class="ghost small scanner-file-addon">Choose screenshot<input data-tool-scan-file type="file" accept="image/*" hidden></label>
      <button class="ghost small" type="button" data-tool-scan-parse>Parse pasted text</button>
    </div>
    <progress class="scanner-progress-addon" data-tool-scan-progress max="1" value="0" hidden></progress>
    <div class="hint" data-tool-scan-status>Paste a screenshot here, or choose one from your device.</div>
    <details class="scanner-text-addon"><summary>Recognized tooltip text</summary><textarea data-tool-scan-text rows="6" placeholder="OCR text appears here. You can also paste tooltip text manually."></textarea></details>
    <div class="scanner-result-addon" data-tool-scan-result></div>
    <ul class="scanner-warnings-addon" data-tool-scan-warnings></ul>
    <button class="primary-btn scanner-apply-addon" type="button" data-tool-scan-apply disabled>Apply recognized tool values</button>
  `;

  panel.querySelector('[data-tool-scan-file]').addEventListener('change', async event => {
    const input = event.target;
    const file = input.files?.[0];
    // Clearing the input is what lets the same screenshot be picked again after
    // a failed run; otherwise the second pick fires no change event at all.
    await scanFile(panel, file);
    input.value = '';
  });
  panel.querySelector('[data-tool-scan-parse]').addEventListener('click', () => renderScan(panel, panel.querySelector('[data-tool-scan-text]').value));
  panel.addEventListener('paste', event => {
    const image = [...(event.clipboardData?.files || [])].find(file => file.type.startsWith('image/'));
    if (image) { event.preventDefault(); scanFile(panel, image); }
  });
  for (const name of ['dragenter', 'dragover']) panel.addEventListener(name, event => {
    event.preventDefault(); panel.classList.add('dragging');
  });
  for (const name of ['dragleave', 'drop']) panel.addEventListener(name, event => {
    event.preventDefault(); panel.classList.remove('dragging');
  });
  panel.addEventListener('drop', event => scanFile(panel, [...(event.dataTransfer?.files || [])].find(file => file.type.startsWith('image/'))));
  panel.querySelector('[data-tool-scan-apply]').addEventListener('click', () => {
    const scan = panel._toolScan;
    if (!scan) return;
    try {
      const result = saveToolScan(scan);
      const status = panel.querySelector('[data-tool-scan-status]');
      const count = result.applied.length;
      status.textContent = `${count} recognized tool value${count === 1 ? '' : 's'} applied to the detected tool. Reloading…`;
      if (result.warnings.length) status.textContent += ` ${result.warnings.join(' ')}`;
      window.location.reload();
    } catch (error) {
      panel.querySelector('[data-tool-scan-status]').textContent = error?.message || String(error);
    }
  });
  return panel;
}

function enhanceToolScanner() {
  if (!activeToolPage()) return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.tool-scanner-addon')) return;
  const filter = content.querySelector('.filter-line');
  const panel = buildPanel();
  if (filter) filter.insertAdjacentElement('afterend', panel);
  else content.querySelector('.page-head')?.insertAdjacentElement('afterend', panel);
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; enhanceToolScanner(); });
});

observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
enhanceToolScanner();
