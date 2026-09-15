import { CROPS, UPGRADES, HIDDEN_INTERACTIONS, COMING_SOON } from './data.js';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { ensureProgressBucket, migrateState, toolKeyForCropId } from './migrations.js';
import { isAutoApplied } from './snapshot-apply.js';
import {
  backupFilename,
  createBackupPayload,
  downloadJson,
  readJsonFile,
  validateBackupPayload,
} from './backup.js';

const NAV = [
  ['dashboard', 'Dashboard'],
  ['account', 'Account'],
  ['crops', 'Crops'],
  ['tools', 'Tools'],
  ['gear', 'Gear'],
  ['pets', 'Pets'],
  ['chips', 'Garden Chips'],
  ['shards', 'Shards'],
  ['buffs', 'Buffs'],
  ['pests', 'Pests'],
  ['planner', 'Upgrade Planner'],
  ['research', 'Mechanics'],
  ['coming', 'Coming Soon'],
];

const defaultState = {
  schemaVersion: DATA_SCHEMA_VERSION,
  page: 'dashboard',
  selectedCrop: 'melon',
  search: '',
  drawer: null,
  profile: {
    name: 'My Profile',
    globalFortune: 0,
    cropFortune: {},
    cropProgress: {},
    toolProgress: {},
    levels: {},
    owned: {},
    costs: {},
    manualGain: {},
  }
};

function loadState() {
  let saved;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    saved = JSON.parse(raw);
  } catch {
    return structuredClone(defaultState);
  }

  const migration = migrateState(saved);
  const loaded = {
    ...structuredClone(defaultState),
    ...migration.state,
    profile: { ...structuredClone(defaultState.profile), ...(migration.state.profile || {}) }
  };
  loaded.schemaVersion = migration.schemaVersion;

  // Data written by a newer app version is kept readable but never saved over.
  readOnlyState = migration.isNewer;
  if (readOnlyState) {
    console.warn(`Farming420: stored data uses schema ${migration.schemaVersion}, this build understands ${DATA_SCHEMA_VERSION}. Local changes are not saved.`);
  } else if (migration.applied.length) {
    migrationApplied = true;
  }
  for (const warning of migration.warnings) console.warn(`Farming420 migration: ${warning}`);

  return loaded;
}

let readOnlyState = false;
let migrationApplied = false;
let state = loadState();

function saveState() {
  if (readOnlyState) return;
  state.schemaVersion = DATA_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Persist the migrated shape once, so the next load starts from the new schema.
if (migrationApplied) saveState();

function esc(s='') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function crop() {
  return CROPS.find(c => c.id === state.selectedCrop) || CROPS[0];
}

function isCropScopedItem(item) {
  return item.section === 'crops' || item.section === 'tools';
}

/** The autoApplied scope key an entry is recorded under, matching itemStore. */
function autoScopeKey(item) {
  if (item.section === 'crops') return `crop:${state.selectedCrop}`;
  if (item.section === 'tools') return `tool:${toolKeyForCropId(state.selectedCrop)}`;
  return 'account';
}

function isSynced(item) {
  return isAutoApplied(state, autoScopeKey(item), item.id);
}

function itemStore(item) {
  if (item.section === 'crops') {
    state.profile.cropProgress ||= {};
    return ensureProgressBucket(state.profile.cropProgress, state.selectedCrop);
  }
  if (item.section === 'tools') {
    state.profile.toolProgress ||= {};
    return ensureProgressBucket(state.profile.toolProgress, toolKeyForCropId(state.selectedCrop));
  }
  return state.profile;
}

function currentLevel(item) {
  const store = itemStore(item);
  return Math.max(0, Math.min(Number(item.max || 1), Number(store.levels[item.id] || 0)));
}

function isOwned(item) {
  const store = itemStore(item);
  return Boolean(store.owned[item.id]) || currentLevel(item) > 0;
}

function isMaxed(item) {
  return currentLevel(item) >= Number(item.max || 1);
}

function appliesToCrop(item) {
  return item.cropScope === 'Any' || item.cropScope === crop().name;
}

function visibleUpgrades(section) {
  const term = state.search.trim().toLowerCase();
  return UPGRADES.filter(item => {
    const inSection = section ? item.section === section : true;
    const matches = !term || `${item.name} ${item.category} ${item.notes}`.toLowerCase().includes(term);
    return inSection && matches;
  });
}

function gainFor(item) {
  const manual = itemStore(item).manualGain[item.id];
  if (manual !== undefined && manual !== '' && !Number.isNaN(Number(manual))) return Number(manual);
  if (item.name === 'Switch to best farming pet') return item.rawMarginal || 0;
  return Number(item.stepGain || item.rawMarginal || 0);
}

function effectiveFortune() {
  return Number(state.profile.globalFortune || 0) + Number(state.profile.cropFortune[state.selectedCrop] || 0);
}

function relativeGainPct(item) {
  const g = gainFor(item);
  if (!g) return 0;
  if (item.metric === 'Crop Yield') {
    const denom = 100 + effectiveFortune();
    return denom > 0 ? (g / denom) * 100 : 0;
  }
  return g;
}

function plannerCandidates() {
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(appliesToCrop)
    .filter(item => !isMaxed(item))
    .map(item => {
      const gain = gainFor(item);
      const cost = Number(itemStore(item).costs[item.id] || 0);
      const rel = relativeGainPct(item);
      const efficiency = cost > 0 ? rel / (cost / 1_000_000) : null;
      return { item, gain, rel, cost, efficiency };
    })
    .filter(x => x.gain > 0)
    .sort((a,b) => {
      const ae = a.efficiency ?? -1;
      const be = b.efficiency ?? -1;
      if (ae !== be) return be - ae;
      return b.rel - a.rel;
    });
}

function badge(text, cls='') {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function statusClass(item) {
  if (item.status === 'VERIFY') return 'verify';
  if (isMaxed(item)) return 'maxed';
  if (isOwned(item)) return 'owned';
  return 'missing';
}

function card(item, compact=false) {
  const level = currentLevel(item);
  const max = Number(item.max || 1);
  const status = statusClass(item);
  const gain = gainFor(item);
  const cropLimited = item.cropScope !== 'Any';
  return `
    <button class="item-card ${status} ${compact ? 'compact' : ''}" data-open="${esc(item.id)}">
      <div class="card-layer"></div>
      <div class="card-head">
        <div>
          <div class="eyebrow">${esc(item.category)}</div>
          <div class="item-title">${esc(item.name)}</div>
        </div>
        ${badge(item.status === 'VERIFY' ? 'verify' : (isMaxed(item) ? 'max' : isOwned(item) ? 'owned' : 'missing'), status)}
        ${isSynced(item) ? badge('synced', 'synced') : ''}
      </div>
      <div class="card-meta">
        ${max > 1 ? `<span>Level ${level}/${max}</span>` : `<span>${isOwned(item) ? 'Owned' : 'Not set'}</span>`}
        ${gain ? `<span>+${Number(gain).toLocaleString('en-US')} ${esc(item.metric === 'Crop Yield' ? 'Fortune/step' : item.metric)}</span>` : '<span>dynamic</span>'}
      </div>
      <div class="progress"><i data-progress="${Math.min(100,(level/max)*100)}"></i></div>
      <div class="chips">
        ${isCropScopedItem(item) ? badge(crop().name, 'soft') : (cropLimited ? badge(item.cropScope, 'soft') : '')}
        ${item.hypercharge ? badge('Hypercharge', 'soft') : ''}
        ${item.modeScope !== 'Any' ? badge(item.modeScope, 'soft') : ''}
      </div>
    </button>`;
}

function shell(content) {
  const currentCrop = crop();
  return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">F4</div>
        <div><strong>Farming420</strong><span>SkyBlock Farming Planner</span></div>
      </div>
      <nav>
        ${NAV.map(([id,label]) => `<button class="nav-link ${state.page===id?'active':''}" data-page="${id}">${esc(label)}</button>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="mini-label">Profile</div>
        <input id="profileName" value="${esc(state.profile.name)}" />
        <button class="ghost small" id="exportBtn">Export backup</button>
        <label class="ghost small file-label">Restore backup<input id="importInput" type="file" accept="application/json,.json" hidden></label>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="mobile-title">Farming420</div>
        <div class="crop-switch">
          <span>Crop</span>
          <select id="cropSelect">
            ${CROPS.map(c => `<option value="${c.id}" ${c.id===state.selectedCrop?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="search-wrap"><input id="search" placeholder="Search item, upgrade or effect…" value="${esc(state.search)}" /></div>
        <div class="fortune-pill"><span>Effective</span><strong>${effectiveFortune().toLocaleString('en-US')} FF</strong></div>
      </header>
      <section class="content">${content}</section>
    </main>
    ${drawer()}
  </div>`;
}

function pageHeader(kicker, title, text='') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1>${text?`<p>${esc(text)}</p>`:''}</div></div>`;
}

function dashboard() {
  const candidate = plannerCandidates()[0];
  const maxed = UPGRADES.filter(isMaxed).length;
  const active = UPGRADES.filter(x => x.status === 'ACTIVE').length;
  const cropItems = UPGRADES.filter(appliesToCrop);
  const cropMaxed = cropItems.filter(isMaxed).length;
  return `
    ${pageHeader('Dashboard', 'Your Farming Progress', 'Only the important decisions are shown here. Open a layer for details.')}
    <div class="hero-grid">
      <div class="hero-card primary">
        <div class="eyebrow">Next upgrade</div>
        ${candidate ? `
          <h2>${esc(candidate.item.name)}</h2>
          <p>+${candidate.gain.toLocaleString('en-US')} marginal stat · about ${candidate.rel.toFixed(2)}% relative gain in the current ${esc(crop().name)}-Setup.</p>
          <button class="primary-btn" data-open="${candidate.item.id}">Open details</button>
        ` : `<h2>No calculated upgrade</h2><p>No active upgrade with a calculated marginal gain is available for the current profile state.</p>`}
      </div>
      <div class="stat-card"><span>Total</span><strong>${maxed}/${active}</strong><small>active entries maxed</small></div>
      <div class="stat-card"><span>${esc(crop().name)}</span><strong>${cropMaxed}/${cropItems.length}</strong><small>relevant entries maxed</small></div>
      <div class="stat-card"><span>Effective Fortune</span><strong>${effectiveFortune()}</strong><small>global + ${esc(crop().name)}</small></div>
    </div>

    <div class="section-row"><div><h2>Account layer</h2><p>Global progression that affects multiple crops.</p></div><button class="ghost" data-page="account">View all</button></div>
    <div class="card-grid">${visibleUpgrades('account').slice(0,6).map(x=>card(x,true)).join('')}</div>

    <div class="section-row"><div><h2>${esc(crop().name)} layer</h2><p>Crop-specific progression and its physical farming tool.</p></div><button class="ghost" data-page="crops">Open crop</button></div>
    ${cropFocusCard()}
  `;
}

function accountPage() {
  const groups = [
    ['Account & Skill',['Account/Skill','Account Upgrade','Anita']],
    ['Garden',['Garden','Greenhouse']],
    ['Accessories & permanent items',['Accessory','Consumable','Jacob Accessory','Chocolate Factory']]
  ];
  return `${pageHeader('Account', 'Global Account Progression', 'Progress that is not bound to one crop or one physical farming tool.')}
    <div class="input-strip">
      <label>Global Farming Fortune<input type="number" id="globalFortune" value="${Number(state.profile.globalFortune||0)}"></label>
      <div class="hint">Used only for relative upgrade evaluation. Ownership remains a separate state.</div>
    </div>
    ${groups.map(([title,cats]) => `<div class="group"><div class="section-row"><div><h2>${title}</h2></div></div><div class="card-grid">${visibleUpgrades('account').filter(x=>cats.includes(x.category)).map(x=>card(x)).join('')}</div></div>`).join('')}`;
}

function cropFocusCard() {
  const c = crop();
  const specific = UPGRADES.filter(x => x.section === 'crops' && appliesToCrop(x));
  const toolSpecific = UPGRADES.filter(x=>x.section==='tools');
  const complete = specific.filter(isMaxed).length + toolSpecific.filter(isMaxed).length;
  const total = specific.length + toolSpecific.length;
  return `<button class="crop-feature" data-page="crops">
    <div class="crop-icon">${esc(c.icon)}</div>
    <div><div class="eyebrow">${esc(c.name)}</div><h3>${esc(c.tool)}</h3><p>${complete}/${total} related layers completed</p></div>
    <div class="crop-arrow">→</div>
  </button>`;
}

function cropsPage() {
  return `${pageHeader('Crops', 'One crop, one workspace', 'Each crop combines its progression, crop-specific Fortune and physical farming tool.')}
    <div class="crop-grid">
      ${CROPS.map(c => {
        const selected = c.id===state.selectedCrop;
        const cf = Number(state.profile.cropFortune[c.id]||0);
        return `<button class="crop-card ${selected?'selected':''}" data-crop="${c.id}">
          <div class="crop-icon large">${esc(c.icon)}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.tool)}</p><span>${cf} Crop Fortune</span></div>
        </button>`;
      }).join('')}
    </div>
    <div class="crop-detail-panel">
      <div class="section-row"><div><div class="eyebrow">Active crop</div><h2>${esc(crop().name)}</h2><p>${esc(crop().tool)}</p></div>
      <label class="inline-input">Crop Fortune<input type="number" id="cropFortune" value="${Number(state.profile.cropFortune[state.selectedCrop]||0)}"></label></div>
      <div class="layer-tabs"><span>Crop progression</span><span>Tool</span><span>Account effects are inherited automatically</span></div>
      <div class="card-grid">${visibleUpgrades('crops').filter(appliesToCrop).map(x=>card(x)).join('')}</div>
      <div class="section-row"><div><h2>${esc(crop().tool)}</h2><p>Tool upgrades belong to the physical tool layer and are not mixed with account progression.</p></div><button class="ghost" data-page="tools">Open tool layer</button></div>
      <div class="card-grid">${visibleUpgrades('tools').slice(0,8).map(x=>card(x,true)).join('')}</div>
    </div>`;
}

function genericSectionPage(section, kicker, title, text) {
  const items = visibleUpgrades(section);
  return `${pageHeader(kicker,title,text)}
    <div class="filter-line">${badge(`${items.length} entries`,'soft')} ${section==='tools'?badge(crop().tool,'soft'):''}</div>
    <div class="card-grid">${items.map(x=>card(x)).join('') || '<div class="empty">No matches.</div>'}</div>`;
}

function plannerPage() {
  const candidates = plannerCandidates().slice(0,20);
  return `${pageHeader('Planner', 'What should you do next?', 'The current prototype ranks marginal gain at your present Fortune level. The target system will rank profit, payback and unlock paths.')}
    <div class="planner-context">
      <div><span>Crop</span><strong>${esc(crop().name)}</strong></div>
      <div><span>Global FF</span><strong>${Number(state.profile.globalFortune||0)}</strong></div>
      <div><span>Crop FF</span><strong>${Number(state.profile.cropFortune[state.selectedCrop]||0)}</strong></div>
      <div><span>Effective</span><strong>${effectiveFortune()}</strong></div>
    </div>
    <div class="planner-list">
      ${candidates.map((x,i)=>`<button class="planner-row" data-open="${x.item.id}">
        <div class="rank">${i+1}</div>
        <div class="planner-main"><strong>${esc(x.item.name)}</strong><span>${esc(x.item.category)} · ${esc(x.item.metric)}</span></div>
        <div class="planner-number"><strong>+${x.gain.toLocaleString('en-US')}</strong><span>marginal</span></div>
        <div class="planner-number"><strong>${x.rel.toFixed(2)}%</strong><span>relative</span></div>
        <div class="planner-number"><strong>${x.cost?`${Math.round(x.cost).toLocaleString('en-US')} Coins`:'—'}</strong><span>${x.efficiency!==null?`${x.efficiency.toFixed(3)} / 1M`:'Cost missing'}</span></div>
      </button>`).join('') || '<div class="empty">No calculated upgrades for the current state.</div>'}
    </div>`;
}

function researchPage() {
  return `${pageHeader('Mechanics', 'Hidden and nonlinear effects', 'These rules are intentionally modeled separately instead of being treated as simple additive Fortune.')}
    <div class="research-list">${HIDDEN_INTERACTIONS.map(x=>`<article class="research-card">
      <div class="research-head"><div><div class="eyebrow">${esc(x.status)}</div><h3>${esc(x.name)}</h3></div>${badge(x.status, x.status==='VERIFY'?'verify':'soft')}</div>
      <p><strong>Effect:</strong> ${esc(x.effect)}</p><p><strong>Why separate:</strong> ${esc(x.why)}</p><p><strong>App logic:</strong> ${esc(x.handling)}</p>
      <a href="${esc(x.source)}" target="_blank" rel="noreferrer">Open source</a>
    </article>`).join('')}</div>`;
}

function comingPage() {
  return `${pageHeader('Coming Soon', 'Announced but not included', 'These entries intentionally have zero planner weight until they are live and verified.')}
    <div class="research-list">${COMING_SOON.map(x=>`<article class="research-card coming"><div class="research-head"><div><div class="eyebrow">${esc(x.status)}</div><h3>${esc(x.name)}</h3></div>${badge('0 weight','coming')}</div><p>${esc(x.effect)}</p><p>${esc(x.notes)}</p><a href="${esc(x.source)}" target="_blank" rel="noreferrer">Open source</a></article>`).join('')}</div>`;
}

function drawer() {
  if (!state.drawer) return '';
  const item = UPGRADES.find(x=>x.id===state.drawer);
  if (!item) return '';
  const level = currentLevel(item);
  const max = Number(item.max||1);
  const store = itemStore(item);
  const cost = store.costs[item.id] ?? '';
  const manual = store.manualGain[item.id] ?? '';
  return `<div class="drawer-backdrop" data-close-drawer><aside class="drawer">
    <div class="drawer-top"><div><div class="eyebrow">${esc(item.category)}</div><h2>${esc(item.name)}</h2></div><button class="close" data-close-drawer>×</button></div>
    <div class="drawer-badges">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${isCropScopedItem(item)?badge(crop().name,'soft'):(item.cropScope!=='Any'?badge(item.cropScope,'soft'):'')} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>
    ${isSynced(item) ? '<div class="drawer-synced">This value came from your last Hypixel sync. Editing it here overrides it until the next sync.</div>' : ''}
    <div class="drawer-section"><h3>Ownership & Level</h3>
      ${max>1 ? `<div class="stepper"><button data-step="-1" data-id="${item.id}">−</button><strong>${level}/${max}</strong><button data-step="1" data-id="${item.id}">+</button><button class="ghost small" data-max="${item.id}">Max</button></div>` : `<label class="switch-row"><span>Owned</span><input type="checkbox" data-owned="${item.id}" ${isOwned(item)?'checked':''}></label>`}
    </div>
    <div class="drawer-section"><h3>Evaluation</h3><div class="detail-grid"><div><span>Next step</span><strong>+${gainFor(item).toLocaleString('en-US')}</strong></div><div><span>Relative effect</span><strong>${relativeGainPct(item).toFixed(2)}%</strong></div></div>
      <label>Next cost (Coins)<input type="number" data-cost="${item.id}" value="${esc(cost)}" placeholder="optional"></label>
      <label>Manual marginal value<input type="number" step="0.01" data-manual="${item.id}" value="${esc(manual)}" placeholder="only for dynamic values"></label>
    </div>
    <div class="drawer-section"><h3>Rule</h3><p>${esc(item.notes || 'No additional note.')}</p></div>
    <div class="drawer-section"><h3>Scope</h3><div class="detail-grid"><div><span>Metric</span><strong>${esc(item.metric)}</strong></div><div><span>Mode</span><strong>${esc(item.modeScope)}</strong></div><div><span>Crop</span><strong>${esc(item.cropScope)}</strong></div><div><span>Hypercharge</span><strong>${item.hypercharge?'Yes':'No'}</strong></div></div></div>
    ${item.source?`<a class="source-btn" href="${esc(item.source)}" target="_blank" rel="noreferrer">Open source</a>`:''}
  </aside></div>`;
}

function render() {
  let content = '';
  switch(state.page) {
    case 'dashboard': content = dashboard(); break;
    case 'account': content = accountPage(); break;
    case 'crops': content = cropsPage(); break;
    case 'tools': content = genericSectionPage('tools','Tools',`${crop().tool} & Tool Upgrades`,'Physical tool progression: enchantments, reforge, gemstone, Farming for Dummies, counters and tool levels.'); break;
    case 'gear': content = genericSectionPage('gear','Gear','Armor & Equipment','Armor, equipment, reforges, gemstones and enchantments remain a separate setup layer.'); break;
    case 'pets': content = genericSectionPage('pets','Pets','Pets & Pet Items','Pets are mutually exclusive setup choices and are never added together.'); break;
    case 'chips': content = genericSectionPage('chips','Garden Chips','Garden Chips','Each chip has its own level path and activation conditions.'); break;
    case 'shards': content = genericSectionPage('shards','Attribute Shards','Shards','Track day/night, pest-conditional and general Farming Fortune shards separately.'); break;
    case 'buffs': content = genericSectionPage('buffs','Buffs','Temporary Buffs & Mixins','God Potion, mixins, cakes and seasonal effects are kept separate from permanent progression.'); break;
    case 'pests': content = genericSectionPage('pests','Pests','Pest Setup','Pest-specific stats, spawn mechanics and loot logic stay separate from normal crop farming.'); break;
    case 'planner': content = plannerPage(); break;
    case 'research': content = researchPage(); break;
    case 'coming': content = comingPage(); break;
    default: content = dashboard();
  }
  document.getElementById('app').innerHTML = shell(content);
  bind();
}

function bind() {
  document.querySelectorAll('[data-progress]').forEach(el => { el.style.width = `${el.dataset.progress}%`; });
  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => { state.page=el.dataset.page; state.drawer=null; saveState(); render(); }));
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => { state.drawer=el.dataset.open; saveState(); render(); }));
  // The backdrop closes the drawer, but a click on the drawer itself must not:
  // it bubbles up to the backdrop, so the target is checked explicitly.
  document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', event => {
    if (el.classList.contains('drawer-backdrop') && event.target !== el) return;
    state.drawer=null; saveState(); render();
  }));
  document.querySelectorAll('[data-crop]').forEach(el => el.addEventListener('click', () => { state.selectedCrop=el.dataset.crop; saveState(); render(); }));

  const cropSel = document.getElementById('cropSelect');
  if (cropSel) cropSel.addEventListener('change', e => { state.selectedCrop=e.target.value; saveState(); render(); });
  const search = document.getElementById('search');
  if (search) search.addEventListener('input', e => { state.search=e.target.value; saveState(); render(); });
  const profileName = document.getElementById('profileName');
  if (profileName) profileName.addEventListener('change', e => { state.profile.name=e.target.value; saveState(); });
  const gf = document.getElementById('globalFortune');
  if (gf) gf.addEventListener('change', e => { state.profile.globalFortune=Number(e.target.value||0); saveState(); render(); });
  const cf = document.getElementById('cropFortune');
  if (cf) cf.addEventListener('change', e => { state.profile.cropFortune[state.selectedCrop]=Number(e.target.value||0); saveState(); render(); });

  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.id); if (!item) return;
    const store = itemStore(item);
    store.levels[item.id] = Math.max(0, Math.min(Number(item.max||1), currentLevel(item)+Number(el.dataset.step)));
    store.owned[item.id] = store.levels[item.id] > 0;
    saveState(); render();
  }));
  document.querySelectorAll('[data-max]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.max); if (!item) return;
    const store = itemStore(item);
    store.levels[item.id]=Number(item.max||1); store.owned[item.id]=true; saveState(); render();
  }));
  document.querySelectorAll('[data-owned]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.owned); if (!item) return;
    const store = itemStore(item);
    store.owned[item.id]=e.target.checked;
    store.levels[item.id]=e.target.checked?1:0; saveState(); render();
  }));
  document.querySelectorAll('[data-cost]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.cost); if (!item) return;
    itemStore(item).costs[item.id]=Number(e.target.value||0); saveState(); render();
  }));
  document.querySelectorAll('[data-manual]').forEach(el => el.addEventListener('change', e => {
    const item = UPGRADES.find(x=>x.id===e.target.dataset.manual); if (!item) return;
    const store = itemStore(item);
    const v=e.target.value; if(v==='') delete store.manualGain[item.id]; else store.manualGain[item.id]=Number(v); saveState(); render();
  }));

  // Export/import share the versioned, validated backup format used by Settings,
  // so there is exactly one on-disk contract for user data.
  const exportBtn=document.getElementById('exportBtn');
  if(exportBtn) exportBtn.addEventListener('click',()=>{
    downloadJson(backupFilename(), createBackupPayload(state));
  });
  const importInput=document.getElementById('importInput');
  if(importInput) importInput.addEventListener('change', async e=>{
    try {
      const restored = validateBackupPayload(await readJsonFile(e.target.files?.[0]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored.state));
      location.reload();
    } catch (error) {
      alert(error.message);
      e.target.value='';
    }
  });
}

render();

// Settings writes synced values straight to storage; re-read and repaint so the
// cards show them without a manual reload.
window.addEventListener('farming420:state-changed', () => {
  state = loadState();
  render();
});
