from pathlib import Path

path = Path('src/app.js')
text = path.read_text()


def replace_once(old: str, new: str, label: str):
    global text
    if old not in text:
        raise SystemExit(f'Patch target missing: {label}')
    text = text.replace(old, new, 1)


replace_once(
    "    cropFortune: {},\n    levels: {},",
    "    cropFortune: {},\n    cropProgress: {},\n    levels: {},",
    'default cropProgress',
)

replace_once(
    "function currentLevel(item) {\n  return Math.max(0, Math.min(Number(item.max || 1), Number(state.profile.levels[item.id] || 0)));\n}\n\nfunction isOwned(item) {\n  return Boolean(state.profile.owned[item.id]) || currentLevel(item) > 0;\n}",
    """function isCropScopedItem(item) {
  return item.section === 'crops' || item.section === 'tools';
}

function itemStore(item) {
  if (!isCropScopedItem(item)) return state.profile;
  state.profile.cropProgress ||= {};
  const cropId = state.selectedCrop;
  const bucket = state.profile.cropProgress[cropId] ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function migrateLegacyCropProgress() {
  state.profile.cropProgress ||= {};
  const scopedItems = UPGRADES.filter(isCropScopedItem);
  const fields = ['levels', 'owned', 'costs', 'manualGain'];
  const hasLegacy = scopedItems.some(item => fields.some(field => state.profile[field]?.[item.id] !== undefined));
  if (!hasLegacy) return;

  const cropId = state.selectedCrop || 'melon';
  const bucket = state.profile.cropProgress[cropId] ||= {};
  fields.forEach(field => bucket[field] ||= {});

  for (const item of scopedItems) {
    for (const field of fields) {
      if (state.profile[field]?.[item.id] === undefined) continue;
      if (bucket[field][item.id] === undefined) bucket[field][item.id] = state.profile[field][item.id];
      delete state.profile[field][item.id];
    }
  }
  saveState();
}

migrateLegacyCropProgress();

function currentLevel(item) {
  const store = itemStore(item);
  return Math.max(0, Math.min(Number(item.max || 1), Number(store.levels[item.id] || 0)));
}

function isOwned(item) {
  const store = itemStore(item);
  return Boolean(store.owned[item.id]) || currentLevel(item) > 0;
}""",
    'scoped state helpers',
)

replace_once(
    "function gainFor(item) {\n  const manual = state.profile.manualGain[item.id];",
    "function gainFor(item) {\n  const manual = itemStore(item).manualGain[item.id];",
    'manual gain scope',
)

replace_once(
    "      const cost = Number(state.profile.costs[item.id] || 0);",
    "      const cost = Number(itemStore(item).costs[item.id] || 0);",
    'planner cost scope',
)

replace_once(
    "        ${cropLimited ? badge(item.cropScope, 'soft') : ''}",
    "        ${isCropScopedItem(item) ? badge(crop().name, 'soft') : (cropLimited ? badge(item.cropScope, 'soft') : '')}",
    'card crop badge',
)

replace_once(
    "  const cost = state.profile.costs[item.id] ?? '';\n  const manual = state.profile.manualGain[item.id] ?? '';",
    "  const store = itemStore(item);\n  const cost = store.costs[item.id] ?? '';\n  const manual = store.manualGain[item.id] ?? '';",
    'drawer scoped values',
)

replace_once(
    "    <div class=\"drawer-badges\">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${item.cropScope!=='Any'?badge(item.cropScope,'soft'):''} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>",
    "    <div class=\"drawer-badges\">${badge(item.status,item.status==='VERIFY'?'verify':'soft')} ${isCropScopedItem(item)?badge(crop().name,'soft'):(item.cropScope!=='Any'?badge(item.cropScope,'soft'):'')} ${item.modeScope!=='Any'?badge(item.modeScope,'soft'):''}</div>",
    'drawer crop badge',
)

replace_once(
    """  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.id); if (!item) return;
    state.profile.levels[item.id] = Math.max(0, Math.min(Number(item.max||1), currentLevel(item)+Number(el.dataset.step)));
    state.profile.owned[item.id] = state.profile.levels[item.id] > 0;
    saveState(); render();
  }));
  document.querySelectorAll('[data-max]').forEach(el => el.addEventListener('click', () => {
    const item = UPGRADES.find(x=>x.id===el.dataset.max); if (!item) return;
    state.profile.levels[item.id]=Number(item.max||1); state.profile.owned[item.id]=true; saveState(); render();
  }));
  document.querySelectorAll('[data-owned]').forEach(el => el.addEventListener('change', e => {
    state.profile.owned[e.target.dataset.owned]=e.target.checked;
    state.profile.levels[e.target.dataset.owned]=e.target.checked?1:0; saveState(); render();
  }));
  document.querySelectorAll('[data-cost]').forEach(el => el.addEventListener('change', e => { state.profile.costs[e.target.dataset.cost]=Number(e.target.value||0); saveState(); render(); }));
  document.querySelectorAll('[data-manual]').forEach(el => el.addEventListener('change', e => {
    const v=e.target.value; if(v==='') delete state.profile.manualGain[e.target.dataset.manual]; else state.profile.manualGain[e.target.dataset.manual]=Number(v); saveState(); render();
  }));""",
    """  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => {
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
  }));""",
    'scoped editor bindings',
)

path.write_text(text)
print('Scoped crop/tool progress patch applied.')
