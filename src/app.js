import { CROPS, UPGRADES, HIDDEN_INTERACTIONS, COMING_SOON } from './data.js';

const STORAGE_KEY = 'skyblock-farming-maxer-v1';

const NAV = [
  ['dashboard', 'Übersicht'],
  ['account', 'Account'],
  ['crops', 'Crops'],
  ['tools', 'Tools'],
  ['gear', 'Gear'],
  ['pets', 'Pets'],
  ['chips', 'Garden Chips'],
  ['shards', 'Shards'],
  ['buffs', 'Buffs'],
  ['pests', 'Pests'],
  ['planner', 'Upgrade-Planer'],
  ['research', 'Mechaniken'],
  ['coming', 'Coming Soon'],
];

const defaultState = {
  page: 'dashboard',
  selectedCrop: 'melon',
  search: '',
  drawer: null,
  profile: {
    name: 'Mein Profil',
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const saved = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...saved,
      profile: { ...structuredClone(defaultState.profile), ...(saved.profile || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(s='') {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function crop() {
  return CROPS.find(c => c.id === state.selectedCrop) || CROPS[0];
}

function isCropScopedItem(item) {
  return item.section === 'crops' || item.section === 'tools';
}

function toolKeyForCrop(cropId = state.selectedCrop) {
  const info = CROPS.find(c => c.id === cropId) || crop();
  return info.tool.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ensureBucket(container, key) {
  const bucket = container[key] ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function itemStore(item) {
  if (item.section === 'crops') {
    state.profile.cropProgress ||= {};
    return ensureBucket(state.profile.cropProgress, state.selectedCrop);
  }
  if (item.section === 'tools') {
    state.profile.toolProgress ||= {};
    return ensureBucket(state.profile.toolProgress, toolKeyForCrop());
  }
  return state.profile;
}

function migrateScopedProgress() {
  const profile = state.profile;
  profile.cropProgress ||= {};
  profile.toolProgress ||= {};
  const fields = ['levels', 'owned', 'costs', 'manualGain'];
  let changed = false;

  // Very early builds stored crop/tool entries at account scope. Preserve them on the selected setup.
  for (const item of UPGRADES.filter(isCropScopedItem)) {
    const destination = item.section === 'tools'
      ? ensureBucket(profile.toolProgress, toolKeyForCrop())
      : ensureBucket(profile.cropProgress, state.selectedCrop || 'melon');
    for (const field of fields) {
      if (profile[field]?.[item.id] === undefined) continue;
      if (destination[field][item.id] === undefined) destination[field][item.id] = profile[field][item.id];
      delete profile[field][item.id];
      changed = true;
    }
  }

  // v0.2 stored tool data inside each crop bucket. Move it to the physical tool bucket.
  const toolItems = UPGRADES.filter(item => item.section === 'tools');
  for (const [cropId, cropBucket] of Object.entries(profile.cropProgress)) {
    const destination = ensureBucket(profile.toolProgress, toolKeyForCrop(cropId));
    for (const field of fields) {
      cropBucket[field] ||= {};
      for (const item of toolItems) {
        if (cropBucket[field][item.id] === undefined) continue;
        if (destination[field][item.id] === undefined) destination[field][item.id] = cropBucket[field][item.id];
        delete cropBucket[field][item.id];
        changed = true;
      }
    }
  }

  if (changed) saveState();
}

migrateScopedProgress();

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
        ${badge(item.status === 'VERIFY' ? 'prüfen' : (isMaxed(item) ? 'max' : isOwned(item) ? 'vorhanden' : 'fehlt'), status)}
      </div>
      <div class="card-meta">
        ${max > 1 ? `<span>Level ${level}/${max}</span>` : `<span>${isOwned(item) ? 'Besitzt' : 'Nicht gesetzt'}</span>`}
        ${gain ? `<span>+${Number(gain).toLocaleString('de-DE')} ${esc(item.metric === 'Crop Yield' ? 'Fortune/Schritt' : item.metric)}</span>` : '<span>dynamisch</span>'}
      </div>
      <div class="progress"><i style="width:${Math.min(100,(level/max)*100)}%"></i></div>
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
        <div class="brand-mark">SF</div>
        <div><strong>Farming Maxer</strong><span>SkyBlock 2026</span></div>
      </div>
      <nav>
        ${NAV.map(([id,label]) => `<button class="nav-link ${state.page===id?'active':''}" data-page="${id}">${esc(label)}</button>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="mini-label">Profil</div>
        <input id="profileName" value="${esc(state.profile.name)}" />
        <button class="ghost small" id="exportBtn">Profil exportieren</button>
        <label class="ghost small file-label">Profil importieren<input id="importInput" type="file" accept="application/json" hidden></label>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="mobile-title">Farming Maxer</div>
        <div class="crop-switch">
          <span>Crop</span>
          <select id="cropSelect">
            ${CROPS.map(c => `<option value="${c.id}" ${c.id===state.selectedCrop?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="search-wrap"><input id="search" placeholder="Item, Upgrade, Effekt suchen…" value="${esc(state.search)}" /></div>
        <div class="fortune-pill"><span>Effektiv</span><strong>${effectiveFortune().toLocaleString('de-DE')} FF</strong></div>
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
    ${pageHeader('Übersicht', 'Dein Farming-Fortschritt', 'Nur das Wesentliche. Details öffnen sich erst bei Klick.')}
    <div class="hero-grid">
      <div class="hero-card primary">
        <div class="eyebrow">Nächstes Upgrade</div>
        ${candidate ? `
          <h2>${esc(candidate.item.name)}</h2>
          <p>+${candidate.gain.toLocaleString('de-DE')} marginaler Stat · ca. ${candidate.rel.toFixed(2)}% relativer Zugewinn im aktuellen ${esc(crop().name)}-Setup.</p>
          <button class="primary-btn" data-open="${candidate.item.id}">Details öffnen</button>
        ` : `<h2>Profil vollständig</h2><p>Für die aktuellen Eingaben gibt es kein aktives Upgrade mit berechenbarem Zugewinn.</p>`}
      </div>
      <div class="stat-card"><span>Gesamt</span><strong>${maxed}/${active}</strong><small>aktive Einträge maxed</small></div>
      <div class="stat-card"><span>${esc(crop().name)}</span><strong>${cropMaxed}/${cropItems.length}</strong><small>relevante Einträge maxed</small></div>
      <div class="stat-card"><span>Effektive Fortune</span><strong>${effectiveFortune()}</strong><small>global + ${esc(crop().name)}</small></div>
    </div>

    <div class="section-row"><div><h2>Account-Layer</h2><p>Globale Fortschritte, die mehrere Crops gleichzeitig beeinflussen.</p></div><button class="ghost" data-page="account">Alle anzeigen</button></div>
    <div class="card-grid">${visibleUpgrades('account').slice(0,6).map(x=>card(x,true)).join('')}</div>

    <div class="section-row"><div><h2>${esc(crop().name)}-Layer</h2><p>Crop-spezifische Progression und das zugehörige Tool.</p></div><button class="ghost" data-page="crops">Crop öffnen</button></div>
    ${cropFocusCard()}
  `;
}

function accountPage() {
  const groups = [
    ['Account & Skill',['Account/Skill','Account Upgrade','Anita']],
    ['Garden',['Garden','Greenhouse']],
    ['Accessoires & permanente Items',['Accessory','Consumable','Jacob Accessory','Chocolate Factory']]
  ];
  return `${pageHeader('Account', 'Globale Account-Progression', 'Alles, was nicht an einen einzelnen Crop oder ein einzelnes Tool gebunden ist.')}
    <div class="input-strip">
      <label>Globale Farming Fortune<input type="number" id="globalFortune" value="${Number(state.profile.globalFortune||0)}"></label>
      <div class="hint">Wird nur für die relative Upgrade-Bewertung benutzt. Besitzstatus bleibt davon getrennt.</div>
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
    <div><div class="eyebrow">${esc(c.name)}</div><h3>${esc(c.tool)}</h3><p>${complete}/${total} zugehörige Layer abgeschlossen</p></div>
    <div class="crop-arrow">→</div>
  </button>`;
}

function cropsPage() {
  return `${pageHeader('Crops', 'Ein Crop = eine eigene Arbeitsfläche', 'Jeder Crop bündelt sein Tool, crop-spezifische Fortune und seine Progression.')}
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
      <div class="section-row"><div><div class="eyebrow">Aktiver Crop</div><h2>${esc(crop().name)}</h2><p>${esc(crop().tool)}</p></div>
      <label class="inline-input">Crop Fortune<input type="number" id="cropFortune" value="${Number(state.profile.cropFortune[state.selectedCrop]||0)}"></label></div>
      <div class="layer-tabs"><span>Crop-Progression</span><span>Tool</span><span>Account-Effekte werden automatisch geerbt</span></div>
      <div class="card-grid">${visibleUpgrades('crops').filter(appliesToCrop).map(x=>card(x)).join('')}</div>
      <div class="section-row"><div><h2>${esc(crop().tool)}</h2><p>Alle Tool-Upgrades gehören nur in diesen Layer und werden nicht mit Account-Upgrades vermischt.</p></div><button class="ghost" data-page="tools">Tool-Layer öffnen</button></div>
      <div class="card-grid">${visibleUpgrades('tools').slice(0,8).map(x=>card(x,true)).join('')}</div>
    </div>`;
}

function genericSectionPage(section, kicker, title, text) {
  const items = visibleUpgrades(section);
  return `${pageHeader(kicker,title,text)}
    <div class="filter-line">${badge(`${items.length} Einträge`,'soft')} ${section==='tools'?badge(crop().tool,'soft'):''}</div>
    <div class="card-grid">${items.map(x=>card(x)).join('') || '<div class="empty">Keine Treffer.</div>'}</div>`;
}

function plannerPage() {
  const candidates = plannerCandidates().slice(0,20);
  return `${pageHeader('Planer', 'Was lohnt sich als Nächstes?', 'Die App bewertet den marginalen Zugewinn auf deinem aktuellen Fortune-Niveau. Kosten kannst du pro Upgrade im Detail-Layer hinterlegen.')}
    <div class="planner-context">
      <div><span>Crop</span><strong>${esc(crop().name)}</strong></div>
      <div><span>Global FF</span><strong>${Number(state.profile.globalFortune||0)}</strong></div>
      <div><span>Crop FF</span><strong>${Number(state.profile.cropFortune[state.selectedCrop]||0)}</strong></div>
      <div><span>Effektiv</span><strong>${effectiveFortune()}</strong></div>
    </div>
    <div class="planner-list">
      ${candidates.map((x,i)=>`<button class="planner-row" data-open="${x.item.id}">
        <div class="rank">${i+1}</div>
        <div class="planner-main"><strong>${esc(x.item.name)}</strong><span>${esc(x.item.category)} · ${esc(x.item.metric)}</span></div>
        <div class="planner-number"><strong>+${x.gain.toLocaleString('de-DE')}</strong><span>marginal</span></div>
        <div class="planner-number"><strong>${x.rel.toFixed(2)}%</strong><span>relativ</span></div>
        <div class="planner-number"><strong>${x.cost?`${Math.round(x.cost).toLocaleString('de-DE')} Coins`:'—'}</strong><span>${x.efficiency!==null?`${x.efficiency.toFixed(3)} / 1M`:'Kosten fehlen'}</span></div>
      </button>`).join('') || '<div class="empty">Keine berechenbaren Upgrades für den aktuellen Zustand.</div>'}
    </div>`;
}

function researchPage() {
  return `${pageHeader('Mechaniken', 'Versteckte und nichtlineare Effekte', 'Diese Regeln werden nicht als simple +Fortune-Zeilen behandelt.')}
    <div class="research-list">${HIDDEN_INTERACTIONS.map(x=>`<article class="research-card">
      <div class="research-head"><div><div class="eyebrow">${esc(x.status)}</div><h3>${esc(x.name)}</h3></div>${badge(x.status, x.status==='VERIFY'?'verify':'soft')}</div>
      <p><strong>Effekt:</strong> ${esc(x.effect)}</p><p><strong>Warum separat:</strong> ${esc(x.why)}</p><p><strong>App-Logik:</strong> ${esc(x.handling)}</p>
      <a href="${esc(x.source)}" target="_blank" rel="noreferrer">Quelle öffnen</a>
    </article>`).join('')}</div>`;
}

function comingPage() {
  return `${pageHeader('Coming Soon', 'Angekündigt, aber nicht eingerechnet', 'Diese Inhalte erhalten im Planer absichtlich Gewicht 0, bis sie live sind.')}
    <div class="research-list">${COMING_SOON.map(x=>`<article class="research-card coming"><div class="research-head"><div><div class="eyebrow">${esc(x.status)}</div><h3>${esc(x.name)}</h3></div>${badge('0 Gewicht','coming')}</div><p>${esc(x.effect)}</p><p>${esc(x.notes)}</p><a href="${esc(x.source)}" target="_blank" rel="noreferrer">Quelle öffnen</a></article>`).join('')}</div>`;
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
  return `<div class="drawer-backdrop" data-close-drawer><aside class="drawer" onclick="event.stopPropagation()">
    <div class="drawer-top"><div><div class="eyebrow">${esc(item.category)}</div><h2>${esc(item.name)}</h2></div><button class="close" data-close-drawer>×</button></div>
    <div class="drawer-badges">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${isCropScopedItem(item)?badge(crop().name,'soft'):(item.cropScope!=='Any'?badge(item.cropScope,'soft'):'')} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>
    <div class="drawer-section"><h3>Besitz & Level</h3>
      ${max>1 ? `<div class="stepper"><button data-step="-1" data-id="${item.id}">−</button><strong>${level}/${max}</strong><button data-step="1" data-id="${item.id}">+</button><button class="ghost small" data-max="${item.id}">Max</button></div>` : `<label class="switch-row"><span>Vorhanden</span><input type="checkbox" data-owned="${item.id}" ${isOwned(item)?'checked':''}></label>`}
    </div>
    <div class="drawer-section"><h3>Bewertung</h3><div class="detail-grid"><div><span>Nächster Schritt</span><strong>+${gainFor(item).toLocaleString('de-DE')}</strong></div><div><span>Relativer Effekt</span><strong>${relativeGainPct(item).toFixed(2)}%</strong></div></div>
      <label>Nächste Kosten (Coins)<input type="number" data-cost="${item.id}" value="${esc(cost)}" placeholder="optional"></label>
      <label>Manueller marginaler Wert<input type="number" step="0.01" data-manual="${item.id}" value="${esc(manual)}" placeholder="nur bei dynamischen Werten"></label>
    </div>
    <div class="drawer-section"><h3>Regel</h3><p>${esc(item.notes || 'Keine Zusatznotiz.')}</p></div>
    <div class="drawer-section"><h3>Scope</h3><div class="detail-grid"><div><span>Metric</span><strong>${esc(item.metric)}</strong></div><div><span>Mode</span><strong>${esc(item.modeScope)}</strong></div><div><span>Crop</span><strong>${esc(item.cropScope)}</strong></div><div><span>Hypercharge</span><strong>${item.hypercharge?'Ja':'Nein'}</strong></div></div></div>
    ${item.source?`<a class="source-btn" href="${esc(item.source)}" target="_blank" rel="noreferrer">Quelle öffnen</a>`:''}
  </aside></div>`;
}

function render() {
  let content = '';
  switch(state.page) {
    case 'dashboard': content = dashboard(); break;
    case 'account': content = accountPage(); break;
    case 'crops': content = cropsPage(); break;
    case 'tools': content = genericSectionPage('tools','Tools',`${crop().tool} & Tool-Upgrades`,'Nur Tool-spezifische Progression: Enchants, Reforge, Gemstone, Dummies und Counter.'); break;
    case 'gear': content = genericSectionPage('gear','Gear','Armor & Equipment','Armor, Equipment, Reforges, Gems und Enchants bleiben ein eigener Layer.'); break;
    case 'pets': content = genericSectionPage('pets','Pets','Pets & Pet Items','Pets werden als gegenseitig ausschließende Setups behandelt, nicht additiv gestapelt.'); break;
    case 'chips': content = genericSectionPage('chips','Garden Chips','Garden Chips','Jeder Chip hat seinen eigenen Levelpfad und seine eigene Bedingung.'); break;
    case 'shards': content = genericSectionPage('shards','Attribute Shards','Shards','Day/Night-, Pest- und allgemeine Fortune-Shards getrennt verwalten.'); break;
    case 'buffs': content = genericSectionPage('buffs','Buffs','Temporäre Buffs & Mixins','God Pot, Mixins, Cake und saisonale Effekte werden nicht mit permanenten Upgrades vermischt.'); break;
    case 'pests': content = genericSectionPage('pests','Pests','Pest-Setup','Pest-spezifische Werte und Spawn-Mechaniken bleiben getrennt von normalem Crop Farming.'); break;
    case 'planner': content = plannerPage(); break;
    case 'research': content = researchPage(); break;
    case 'coming': content = comingPage(); break;
    default: content = dashboard();
  }
  document.getElementById('app').innerHTML = shell(content);
  bind();
}

function bind() {
  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => { state.page=el.dataset.page; state.drawer=null; saveState(); render(); }));
  document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => { state.drawer=el.dataset.open; saveState(); render(); }));
  document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', () => { state.drawer=null; saveState(); render(); }));
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

  const exportBtn=document.getElementById('exportBtn');
  if(exportBtn) exportBtn.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(state.profile,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='skyblock-farming-profile.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  const importInput=document.getElementById('importInput');
  if(importInput) importInput.addEventListener('change', async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    try { const profile=JSON.parse(await file.text()); state.profile={...structuredClone(defaultState.profile),...profile}; saveState(); render(); }
    catch { alert('Ungültige Profil-Datei.'); }
  });
}

render();
