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
  goals.innerHTML=recommendationRows(crop.id).map(row=>`<span class="workspace-goal ${row.reforge===active?'active':''}"><b>${esc(row.label)}</b>${esc(reforgeById(row.reforge)?.name || row.reforge)}${row.note?`<small>${esc(row.note)}</small>`:''}</span>`).join('');
}
function renderTier(root,crop,state) {
  const editor=root.querySelector('[data-tool-editor="1"]'); if(!editor)return;
  const tier=selectedToolTier(state,crop.id), label=toolTierLabel(tier), asset=toolAssetForTier(crop.id,tier);
  const portrait=editor.querySelector('.item-portrait');
  if(portrait){ if(asset)portrait.dataset.packAsset=asset; else delete portrait.dataset.packAsset; let badge=portrait.querySelector('.workspace-tier-badge'); if(!badge){badge=document.createElement('span');badge.className='workspace-tier-badge';portrait.append(badge);} badge.textContent=label; }
  const status=editor.querySelector('.item-rarity'); if(status && !status.textContent.includes(label)) status.textContent=`${label} · ${status.textContent}`;
}
export function applyToolPresentation(root=document,state=readState()) {
  if(!root?.querySelector || !state)return;
  if(root.querySelector('.sidebar .nav-link.active')?.dataset.page !== 'tools')return;
  const crop=cropForState(state); renderTier(root,crop,state); renderRecommendations(root,crop,state);
}
if(typeof document!=='undefined'){
  applyToolPresentation(document);
  const app=document.getElementById('app'); if(app&&typeof MutationObserver!=='undefined')new MutationObserver(()=>applyToolPresentation(document)).observe(app,{childList:true,subtree:true});
  if(typeof window!=='undefined')window.addEventListener('farming420:state-changed',()=>applyToolPresentation(document));
}
