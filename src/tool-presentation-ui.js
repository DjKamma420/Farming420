import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { cropReforgeRecommendations, reforgeById } from './farming-reforges.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';

export const TOOL_PRESENTATION_VERIFIED = '2026-09-16';
export const TOOL_PACK_MODEL_SOURCE = 'assets/hypixel-pack/manifest.json';

export const TOOL_TIER_ASSETS = Object.freeze({
  wheat: Object.freeze(['theoretical_hoe_wheat_1','theoretical_hoe_wheat_2','theoretical_hoe_wheat_3']),
  carrot: Object.freeze(['theoretical_hoe_carrot_1','theoretical_hoe_carrot_2','theoretical_hoe_carrot_3']),
  potato: Object.freeze(['theoretical_hoe_potato_1','theoretical_hoe_potato_2','theoretical_hoe_potato_3']),
  'sugar-cane': Object.freeze(['theoretical_hoe_cane_1','theoretical_hoe_cane_2','theoretical_hoe_cane_3']),
  'nether-wart': Object.freeze(['theoretical_hoe_warts_1','theoretical_hoe_warts_2','theoretical_hoe_warts_3']),
  cactus: Object.freeze(['cactus_knife','cactus_knife_2','cactus_knife_3']),
  'cocoa-beans': Object.freeze(['coco_chopper','coco_chopper_2','coco_chopper_3']),
  mushroom: Object.freeze(['fungi_cutter','fungi_cutter_2','fungi_cutter_3']),
  melon: Object.freeze(['melon_dicer','melon_dicer','melon_dicer']),
  pumpkin: Object.freeze(['pumpkin_dicer','pumpkin_dicer','pumpkin_dicer']),
});

function readState(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  try { return JSON.parse(storage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function cropForState(state) { return CROPS.find(crop => crop.id === state?.selectedCrop) || CROPS[0]; }
function bucketFor(state, cropId) { return state?.profile?.toolProgress?.[toolKeyForCropId(cropId)] || {}; }
export function selectedToolTier(state, cropId) { return highestChainTier(bucketFor(state,cropId), TOOL_TIER_CHAIN); }
export function toolTierLabel(tier) { return TOOL_TIER_CHAIN.options.find(o=>o.value===Number(tier))?.label || TOOL_TIER_CHAIN.options[0].label; }
export function toolAssetForTier(cropId, tier) {
  const assets = TOOL_TIER_ASSETS[String(cropId || '')];
  if (!assets) return null;
  return assets[Math.max(1,Math.min(3,Number(tier)||1))-1] || assets[0];
}
export function recommendationRows(cropId) {
  const rec=cropReforgeRecommendations(cropId);
  return [
    {label:'Normal crop coins',reforge:rec.normalCoins},
    {label:'Feast RARE-CROP coins',reforge:rec.feastRareCropCoins,note:'only while this crop is in season'},
    {label:'Collection',reforge:rec.collection}, {label:'Farming XP',reforge:rec.xp},
    {label:'RARE CROPS / Overbloom',reforge:rec.rareCrops}, {label:'Feast Seasoning',reforge:rec.feastSeasoning}, {label:'Sowdust',reforge:rec.sowdust},
  ];
}
function selectedReforge(state,cropId) {
  const bucket=bucketFor(state,cropId);
  if (reforgeById(bucket.reforge)) return bucket.reforge;
  if (bucket.owned?.['tool-reforge-bountiful-reforge']) return 'bountiful';
  if (bucket.owned?.['tool-reforge-blessed-reforge']) return 'blessed';
  return null;
}
function esc(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function renderRecommendations(root,crop,state) {
  const goals=root.querySelector('.workspace-recommendations .workspace-goals'); if(!goals)return;
  const active=selectedReforge(state,crop.id);
  const markup=recommendationRows(crop.id).map(row=>`<span class="workspace-goal ${row.reforge===active?'active':''}"><b>${esc(row.label)}</b>${esc(reforgeById(row.reforge)?.name || row.reforge)}${row.note?`<small>${esc(row.note)}</small>`:''}</span>`).join('');
  // Only write when the markup actually changed. Assigning identical innerHTML
  // still replaces the children, and a MutationObserver cannot tell the
  // difference: it reports a mutation either way and calls this again.
  if (goals.innerHTML !== markup) goals.innerHTML = markup;
}
function renderTier(root,crop,state) {
  const card=root.querySelector('.sb-tool-card.selected[data-sb-tool-crop]'); if(!card)return;
  const tier=selectedToolTier(state,crop.id), label=toolTierLabel(tier), asset=toolAssetForTier(crop.id,tier);
  const portrait=card.querySelector('.sb-tool-art');
  if(portrait){
    if(asset){ if(portrait.dataset.packAsset!==asset) portrait.dataset.packAsset=asset; }
    else if('packAsset' in portrait.dataset) delete portrait.dataset.packAsset;
  }
  const badge=card.querySelector('.sb-tool-tier');
  if(badge){
    if(badge.textContent!==label) badge.textContent=label;
  }
}
/**
 * Every write below lands in the subtree the observer watches, so the writes
 * are paused while they happen. The idempotence checks in the two render
 * functions are the first line of defence; this is the structural one, so a
 * future unconditional write cannot wedge the page again.
 */
let observer = null;
let observedRoot = null;

function withObserverPaused(run) {
  if (!observer) { run(); return; }
  observer.disconnect();
  try {
    run();
  } finally {
    // Drops anything queued while we were writing, so our own mutations do not
    // come back as a fresh callback the moment we reconnect.
    observer.takeRecords();
    if (observedRoot) observer.observe(observedRoot, { childList: true, subtree: true });
  }
}

export function applyToolPresentation(root=document,state=readState()) {
  if(!root?.querySelector || !state)return;
  if(root.querySelector('.sidebar .nav-link.active')?.dataset.page !== 'tools')return;
  const crop=cropForState(state);
  withObserverPaused(() => { renderTier(root,crop,state); renderRecommendations(root,crop,state); });
}

if(typeof document!=='undefined'){
  const app=document.getElementById('app');
  if(app&&typeof MutationObserver!=='undefined'){
    observedRoot = app;
    observer = new MutationObserver(()=>applyToolPresentation(document));
    observer.observe(app,{childList:true,subtree:true});
  }
  applyToolPresentation(document);
  if(typeof window!=='undefined')window.addEventListener('farming420:state-changed',()=>applyToolPresentation(document));
}
