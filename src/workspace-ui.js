import { deriveRarity, describeRarity } from './tool-rarity.js';
import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { FARMING_TOOL_REFORGES, cropReforgeRecommendations, reforgeById } from './farming-reforges.js';
import { TOOL_TIER_CHAIN, applyChainTier, highestChainTier } from './progression-chains.js';
import { loadItemCatalog, readCachedCatalog } from './item-catalog.js';
import { canRecombobulateItem } from './item-capabilities.js';
import {
  availableOfficialGemstoneSlots,
  catalogItemByExactId,
  farmingToolSkyblockId,
  officialGemstoneUnlockCoins,
  officialGemstoneUnlockItems,
} from './exact-farming-items.js';
import {
  GEMSTONE_QUALITIES,
  gemstoneUnlockCost,
  normalizeToolGemstoneSlots,
  toolGemstoneFortune,
  toolGemstoneSlotCount,
  withGemstone,
  withGemstoneSlotCost,
  withGemstoneSlotUnlocked,
} from './gemstone-slots.js';

const LEGACY_REFORGE_ENTRY_IDS = Object.freeze({ bountiful: 'tool-reforge-bountiful-reforge', blessed: 'tool-reforge-blessed-reforge' });
const TOOL_LEVEL_ID = 'tool-tool-base-counter-fortune';
const OVERCLOCKER_ID = 'tool-overclocker-3000';
const DUMMIES_ID = 'tool-farming-for-dummies';
const RECOMB_ID = 'tool-recombobulator-effect-on-tool-stats';
const TOOL_RARITIES = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);

let catalogRequested = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}
function readState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
function writeState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function reload() { window.location.reload(); }
function cropForState(state) { return CROPS.find(crop => crop.id === state?.selectedCrop) || CROPS[0]; }
function toolBucket(state, cropId) {
  state.profile ||= {};
  state.profile.toolProgress ||= {};
  const bucket = state.profile.toolProgress[toolKeyForCropId(cropId)] ||= {};
  bucket.levels ||= {}; bucket.owned ||= {}; bucket.costs ||= {}; bucket.manualGain ||= {};
  // Preserve dormant future slots. Whether they are active is determined by the
  // exact item socket requirements (or the verified offline fallback).
  bucket.gemSlots = Array.isArray(bucket.gemSlots) ? bucket.gemSlots : [];
  return bucket;
}
function entryLevel(bucket, id) { return Math.max(0, Number(bucket?.levels?.[id] || 0)); }
function toolCatalogItem(crop, bucket) {
  const tier = highestChainTier(bucket, TOOL_TIER_CHAIN);
  const id = farmingToolSkyblockId(crop?.tool, tier);
  return catalogItemByExactId(readCachedCatalog()?.items || [], id);
}
function activeOfficialSlots(bucket, catalogItem) {
  if (!catalogItem) return null;
  return availableOfficialGemstoneSlots(catalogItem, { toolLevel: entryLevel(bucket, TOOL_LEVEL_ID) });
}
function toolGemSlotCount(bucket, catalogItem = null) {
  const exact = activeOfficialSlots(bucket, catalogItem);
  if (exact) return exact.length;
  return toolGemstoneSlotCount(
    entryLevel(bucket, TOOL_LEVEL_ID),
    highestChainTier(bucket, TOOL_TIER_CHAIN),
  );
}
function setEntryLevel(bucket, id, value, max) {
  const level = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
  if (level) { bucket.levels[id] = level; bucket.owned[id] = true; }
  else { delete bucket.levels[id]; delete bucket.owned[id]; }
}
function selectedReforge(state, cropId) {
  const bucket = toolBucket(state, cropId);
  if (reforgeById(bucket.reforge)) return bucket.reforge;
  if (bucket.owned[LEGACY_REFORGE_ENTRY_IDS.bountiful]) return 'bountiful';
  if (bucket.owned[LEGACY_REFORGE_ENTRY_IDS.blessed]) return 'blessed';
  return null;
}
function setSelectedReforge(state, cropId, id) {
  const bucket = toolBucket(state, cropId);
  const next = reforgeById(id)?.id || null;
  bucket.reforge = next;
  for (const legacy of Object.values(LEGACY_REFORGE_ENTRY_IDS)) { delete bucket.levels[legacy]; delete bucket.owned[legacy]; }
  const legacy = LEGACY_REFORGE_ENTRY_IDS[next];
  if (legacy) { bucket.levels[legacy] = 1; bucket.owned[legacy] = true; }
}
function uniqueTools() {
  const map = new Map();
  for (const crop of CROPS) {
    const existing = map.get(crop.tool);
    if (existing) existing.crops.push(crop);
    else map.set(crop.tool, { tool: crop.tool, cropId: crop.id, crops: [crop] });
  }
  return [...map.values()];
}
function toolSelector(state) {
  const crop = cropForState(state); const key = toolKeyForCropId(crop.id);
  return `<label class="workspace-tool-picker"><span>Physical tool</span><select id="workspaceToolSelect">${uniqueTools().map(item => `<option value="${esc(item.cropId)}" ${toolKeyForCropId(item.cropId) === key ? 'selected' : ''}>${esc(item.tool)}${item.crops.length > 1 ? ` — ${esc(item.crops.map(c => c.name).join(' / '))}` : ''}</option>`).join('')}</select></label>`;
}
function reforgeRows(active) {
  return FARMING_TOOL_REFORGES.map(item => `<label class="workspace-choice ${item.id === active ? 'selected' : ''}"><input type="radio" name="workspace-reforge" value="${esc(item.id)}" ${item.id === active ? 'checked' : ''}><span class="workspace-radio"></span><span class="workspace-choice-copy"><strong>${esc(item.name)}</strong><small>${esc(item.stone)}</small><em>${esc(item.summary)}</em></span></label>`).join('');
}
function recommendationBox(crop, active) {
  const rec = cropReforgeRecommendations(crop.id);
  const rows = [
    ['Normal crop coins', rec.normalCoins], ['Feast RARE-CROP coins', rec.feastRareCropCoins],
    ['Collection', rec.collection], ['Farming XP', rec.xp], ['RARE CROPS / Overbloom', rec.rareCrops],
    ['Feast Seasoning', rec.feastSeasoning], ['Sowdust', rec.sowdust],
  ];
  return `<section class="workspace-recommendations"><div class="workspace-section-head"><div><h3>Recommended for ${esc(crop.name)}</h3><p>Normal crop profit and Feast RARE-CROP profit are separate contexts.</p></div></div><div class="workspace-goals">${rows.map(([label,id]) => `<span class="workspace-goal ${id === active ? 'active' : ''}"><b>${esc(label)}</b>${esc(reforgeById(id)?.name || id)}${label.startsWith('Feast RARE') ? '<small>only while this crop is in season</small>' : ''}</span>`).join('')}</div></section>`;
}
function levelRow(label, note, id, value, max) {
  return `<div class="workspace-level-row"><div><strong>${esc(label)}</strong><small>${esc(note)}</small></div><div class="workspace-stepper"><button type="button" data-tool-step="-1" data-tool-entry="${id}">−</button><select data-tool-number="${id}">${Array.from({length:max+1},(_,i)=>`<option value="${i}" ${i===value?'selected':''}>${i}</option>`).join('')}</select><button type="button" data-tool-step="1" data-tool-entry="${id}">+</button><span>/ ${max}</span></div></div>`;
}
function tierRow(bucket) {
  const tier = highestChainTier(bucket, TOOL_TIER_CHAIN);
  return `<div class="workspace-level-row"><div><strong>Tool tier</strong><small>Mk. III includes Mk. II automatically.</small></div><select data-tool-tier>${TOOL_TIER_CHAIN.options.map(o => `<option value="${o.value}" ${o.value===tier?'selected':''}>${o.label}</option>`).join('')}</select></div>`;
}
/**
 * Item rarity, derived rather than asked for.
 *
 * The official item resource states the item's own rarity and a Recombobulator
 * raises it one step, so both facts are already here and the dropdown that
 * started at "Unknown" was asking for an answer the app had.
 *
 * The dropdown survives for exactly one case: the official data has no rarity
 * for this item, usually because the catalogue has not loaded. Then there is
 * nothing to derive from, a guess would silently change rarity-scaled Peridot
 * Fortune, and the row says so instead of pretending.
 */
function rarityRow(bucket, catalogItem = null, recombobulated = false, canRecombobulate = true) {
  const described = describeRarity({ base: catalogItem?.tier, recombobulated, canRecombobulate });
  if (described) {
    return `<div class="workspace-level-row"><div><strong>Item rarity</strong><small>Used for rarity-scaled Peridot values.</small></div><div class="workspace-derived"><strong data-tool-rarity-derived="${esc(described.rarity)}">${esc(described.rarity)}</strong><small>${esc(described.note)}</small></div></div>`;
  }
  const rarity = String(bucket.toolRarity || '').toUpperCase();
  return `<div class="workspace-level-row"><div><strong>Item rarity</strong><small>Official item data has no rarity for this item yet, so it cannot be derived.</small></div><select data-tool-rarity><option value="">Unknown</option>${TOOL_RARITIES.map(r => `<option value="${r}" ${r===rarity?'selected':''}>${r}</option>`).join('')}</select></div>`;
}
function gemOptions(value, slotType = 'PERIDOT') {
  const selected = String(value || '').toUpperCase();
  if (slotType !== 'PERIDOT') return '<option value="">Unsupported official socket type</option>';
  return `<option value="">Empty</option>${GEMSTONE_QUALITIES.map(q => { const v=`${q} PERIDOT`; return `<option value="${v}" ${v===selected?'selected':''}>${q[0]}${q.slice(1).toLowerCase()} Peridot</option>`; }).join('')}`;
}
function costDescription(meta) {
  if (!meta) return '';
  const parts = officialGemstoneUnlockItems(meta).map(cost => `${cost.amount}× ${cost.itemId}`);
  const coins = officialGemstoneUnlockCoins(meta);
  if (coins) parts.push(`${coins.toLocaleString('en-US')} Coins`);
  return parts.join(' + ');
}
function gemstoneSection(bucket, catalogItem) {
  const level = entryLevel(bucket, TOOL_LEVEL_ID);
  const tier = highestChainTier(bucket, TOOL_TIER_CHAIN);
  const officialSlots = activeOfficialSlots(bucket, catalogItem);
  const count = officialSlots ? officialSlots.length : toolGemSlotCount(bucket);
  const slots = normalizeToolGemstoneSlots(bucket.gemSlots, count);
  // The derived rarity is the one the item actually has; the recorded value is
  // only a fallback for when the official data has no rarity to derive from.
  const effectiveRarity = deriveRarity({
    base: catalogItem?.tier,
    recombobulated: entryLevel(bucket, RECOMB_ID) > 0,
    canRecombobulate: canRecombobulateItem('tool', catalogItem),
  }) || bucket.toolRarity;
  const fortune = toolGemstoneFortune(bucket.gemSlots, effectiveRarity, count);
  const physical = Array.isArray(catalogItem?.gemstoneSlots) ? catalogItem.gemstoneSlots.length : null;
  const availability = catalogItem
    ? `${count} of ${physical} official socket${physical === 1 ? '' : 's'} currently meet this item's requirements.`
    : (count
      ? `${count} active Peridot slot${count === 1 ? '' : 's'}. Offline fallback uses level 5 / 15 / 25 / 50 and Mk. I / II / III limits.`
      : 'No Peridot socket is active yet. Offline fallback unlocks the first at Farming Tool level 5.');
  return `<section class="workspace-gemstones"><div class="workspace-section-head"><div><h3>Gemstone slots</h3><p>${catalogItem ? `${esc(catalogItem.name)} · ` : ''}Tool level ${level} · Mk. ${tier}. ${availability}</p></div></div><div class="workspace-gem-summary"><strong>${fortune == null ? 'Select item rarity to calculate Peridot Fortune.' : `${fortune} Farming Fortune from active Peridot slots`}</strong><span>${gemstoneUnlockCost(bucket.gemSlots, count).toLocaleString('en-US')} Coins in recorded unlock costs</span></div><div class="workspace-gem-list">${slots.map((slot,i)=>{ const meta=officialSlots?.[i]; const officialCost=costDescription(meta); const coinCost=officialGemstoneUnlockCoins(meta); return `<div class="workspace-gem-slot ${slot.unlocked?'unlocked':'locked'}"><label class="workspace-slot-toggle"><input type="checkbox" data-gem-unlocked="${i}" ${slot.unlocked?'checked':''}><span>${esc(meta?.slotType || 'Peridot')} Slot ${i+1}</span><small>${slot.unlocked?'Unlocked':'Locked'}${officialCost ? ` · official: ${esc(officialCost)}` : ''}</small></label><label><span>Unlock coin cost</span><input type="number" min="0" data-gem-cost="${i}" value="${slot.unlockCostCoins ?? ''}" placeholder="${coinCost || ''}" ${slot.unlocked?'':'disabled'}></label><label><span>Gemstone</span><select data-gem-value="${i}" ${slot.unlocked?'':'disabled'}>${gemOptions(slot.gem, meta?.slotType || 'PERIDOT')}</select></label></div>`; }).join('') || '<p class="hint">This exact item has no currently available gemstone socket.</p>'}</div></section>`;
}
function writeTool(mutator) {
  const state = readState(); if (!state) return;
  const crop = cropForState(state); const bucket = toolBucket(state, crop.id);
  mutator(bucket, state, crop); writeState(state); reload();
}
function enhanceTools(root) {
  const editor = root.querySelector('[data-tool-editor="1"]');
  if (!editor || editor.dataset.workspaceEnhanced === '1') return;
  const state = readState(); if (!state) return;
  const crop = cropForState(state); const bucket = toolBucket(state, crop.id); const active = selectedReforge(state, crop.id);
  const catalogItem = toolCatalogItem(crop, bucket);
  editor.dataset.workspaceEnhanced = '1';
  const content = root.querySelector('.content');
  const head = content?.querySelector('.page-head');
  if (head && !content.querySelector('.workspace-context')) head.insertAdjacentHTML('afterend', `<div class="workspace-context">${toolSelector(state)}</div>`);
  const sections = [...editor.querySelectorAll('.item-editor-section')];
  const reforge = sections.find(s => s.querySelector('h3')?.textContent.trim() === 'Reforge');
  if (reforge) {
    reforge.innerHTML = catalogItem?.cannotReforge === true
      ? `<div class="workspace-section-head"><div><h3>Reforge</h3><p>${esc(catalogItem.name)} is explicitly marked cannot_reforge by Hypixel.</p></div></div>`
      : `<div class="workspace-section-head"><div><h3>Reforge</h3><p>Exactly one farming-tool reforge can be active${catalogItem ? ` on ${esc(catalogItem.name)}` : ''}.</p></div></div><div class="workspace-choice-list">${reforgeRows(active)}</div>${recommendationBox(crop, active)}`;
  }
  const upgrades = sections.find(s => s.querySelector('h3')?.textContent.trim() === 'Tool upgrades');
  const canRecomb = !catalogItem || canRecombobulateItem('tool', catalogItem);
  if (upgrades) upgrades.innerHTML = `<div class="workspace-section-head"><div><h3>Tool progression</h3><p>${catalogItem ? `Exact item: ${esc(catalogItem.name)} (${esc(catalogItem.id)}).` : 'Official item data is loading; verified offline rules are used temporarily.'}</p></div></div><div class="workspace-level-list">${tierRow(bucket)}${levelRow('Farming Tool level','Tool counter level.',TOOL_LEVEL_ID,entryLevel(bucket,TOOL_LEVEL_ID),50)}${levelRow('Overclocker 3000','Applications extending the tool-level cap.',OVERCLOCKER_ID,entryLevel(bucket,OVERCLOCKER_ID),10)}${levelRow('Farming for Dummies','Book applications on this tool.',DUMMIES_ID,entryLevel(bucket,DUMMIES_ID),5)}${rarityRow(bucket, catalogItem, entryLevel(bucket, RECOMB_ID) > 0, canRecomb)}${canRecomb ? `<label class="workspace-level-row workspace-toggle-row"><div><strong>Recombobulator 3000</strong><small>Current item state.</small></div><input type="checkbox" data-tool-recomb ${entryLevel(bucket,RECOMB_ID)>0?'checked':''}></label>` : ''}</div>`;
  const finish = sections.find(s => /Gemstone|rarity/i.test(s.querySelector('h3')?.textContent || ''));
  if (finish) finish.innerHTML = gemstoneSection(bucket, catalogItem);
  content?.querySelectorAll('.workspace-secondary-analysis').forEach(node => node.remove());
  const scored = [...(content?.querySelectorAll('.section-row') || [])].find(row => row.querySelector('h2')?.textContent.includes('Every scored tool entry'));
  if (scored) { scored.nextElementSibling?.remove(); scored.remove(); }

  root.querySelector('#workspaceToolSelect')?.addEventListener('change', e => { const select=root.querySelector('#cropSelect'); if (select) { select.value=e.target.value; select.dispatchEvent(new Event('change',{bubbles:true})); } });
  root.querySelectorAll('input[name="workspace-reforge"]').forEach(input => input.addEventListener('change', e => writeTool((_,s,c)=>setSelectedReforge(s,c.id,e.target.value))));
  root.querySelector('[data-tool-tier]')?.addEventListener('change', e => writeTool(bucket => applyChainTier(bucket, TOOL_TIER_CHAIN, e.target.value)));
  root.querySelectorAll('[data-tool-number]').forEach(select => select.addEventListener('change', e => { const max={ [TOOL_LEVEL_ID]:50,[OVERCLOCKER_ID]:10,[DUMMIES_ID]:5 }[e.target.dataset.toolNumber]; writeTool(bucket=>setEntryLevel(bucket,e.target.dataset.toolNumber,e.target.value,max)); }));
  root.querySelectorAll('[data-tool-step]').forEach(button => button.addEventListener('click', () => { const id=button.dataset.toolEntry; const max={ [TOOL_LEVEL_ID]:50,[OVERCLOCKER_ID]:10,[DUMMIES_ID]:5 }[id]; writeTool(bucket=>setEntryLevel(bucket,id,entryLevel(bucket,id)+Number(button.dataset.toolStep),max)); }));
  root.querySelector('[data-tool-rarity]')?.addEventListener('change', e => writeTool(bucket => { bucket.toolRarity=e.target.value || null; }));
  root.querySelector('[data-tool-recomb]')?.addEventListener('change', e => writeTool(bucket => setEntryLevel(bucket,RECOMB_ID,e.target.checked?1:0,1)));
  root.querySelectorAll('[data-gem-unlocked]').forEach(el => el.addEventListener('change', e => writeTool((bucket, state, crop) => { const count=toolGemSlotCount(bucket,toolCatalogItem(crop,bucket)); bucket.gemSlots=withGemstoneSlotUnlocked(bucket.gemSlots,Number(e.target.dataset.gemUnlocked),e.target.checked,count); })));
  root.querySelectorAll('[data-gem-cost]').forEach(el => el.addEventListener('change', e => writeTool((bucket, state, crop) => { const count=toolGemSlotCount(bucket,toolCatalogItem(crop,bucket)); bucket.gemSlots=withGemstoneSlotCost(bucket.gemSlots,Number(e.target.dataset.gemCost),e.target.value,count); })));
  root.querySelectorAll('[data-gem-value]').forEach(el => el.addEventListener('change', e => writeTool((bucket, state, crop) => { const count=toolGemSlotCount(bucket,toolCatalogItem(crop,bucket)); bucket.gemSlots=withGemstone(bucket.gemSlots,Number(e.target.dataset.gemValue),e.target.value,count); })));
}

export function applyWorkspaceUI(root = document) {
  root.querySelector('.topbar .crop-switch')?.classList.add('workspace-hidden-crop-switch');
  enhanceTools(root);
}

async function ensureOfficialCatalog() {
  if (catalogRequested) return;
  catalogRequested = true;
  const before = readCachedCatalog()?.fetchedAt || null;
  const result = await loadItemCatalog();
  if (result?.items?.length && (!before || result.fetchedAt !== before)) {
    window.dispatchEvent(new Event('farming420:state-changed'));
  }
}

if (typeof document !== 'undefined') {
  applyWorkspaceUI(document);
  ensureOfficialCatalog();
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') new MutationObserver(() => applyWorkspaceUI(document)).observe(app,{childList:true,subtree:true});
}
