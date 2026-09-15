from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Patch target missing: {label}')
    return text.replace(old, new, 1)

# --- data.js: current 13-crop Garden + current farming tool levels ---
data_path = Path('src/data.js')
data = data_path.read_text()

data = replace_once(
    data,
    '''  {
    "id": "nether-wart",
    "name": "Nether Wart",
    "tool": "Newton Nether Warts Hoe",
    "color": "crimson",
    "icon": "N"
  }
];''',
    '''  {
    "id": "nether-wart",
    "name": "Nether Wart",
    "tool": "Newton Nether Wart Hoe",
    "color": "crimson",
    "icon": "N"
  },
  {
    "id": "sunflower",
    "name": "Sunflower",
    "tool": "Eclipse Hoe",
    "color": "gold",
    "icon": "Su"
  },
  {
    "id": "moonflower",
    "name": "Moonflower",
    "tool": "Eclipse Hoe",
    "color": "violet",
    "icon": "Mo"
  },
  {
    "id": "wild-rose",
    "name": "Wild Rose",
    "tool": "Wild Rose Hoe",
    "color": "rose",
    "icon": "WR"
  }
];''',
    '13 crop list',
)

data = replace_once(
    data,
    '''  {
    "id": "tool-tool-base-counter-fortune",
    "category": "Tool",
    "section": "tools",
    "name": "Tool base/counter fortune",
    "metric": "Crop Yield",
    "modeScope": "Any",
    "cropScope": "Any",
    "status": "ACTIVE",
    "max": 1,
    "stepGain": 0,
    "manualDefault": null,
    "rawMarginal": 0,
    "hypercharge": false,
    "notes": "Mathematical hoe/dicer/tool progression is nonlinear. Enter next-upgrade marginal Crop Fortune manually.",
    "source": "https://wiki.eliteskyblock.com/Farming_Fortune",
    "workbookRank": null
  },''',
    '''  {
    "id": "tool-tool-base-counter-fortune",
    "category": "Tool Level",
    "section": "tools",
    "name": "Farming Tool level",
    "metric": "Crop Yield",
    "modeScope": "Any",
    "cropScope": "Any",
    "status": "ACTIVE",
    "max": 50,
    "stepGain": 4,
    "manualDefault": null,
    "rawMarginal": 4,
    "hypercharge": false,
    "notes": "Current Greenhouse tool system: each tool level grants +4 Fortune for its crop(s), up to +200 at level 50. Mk. II/Mk. III and Overclocker 3000 gate later levels; levels 41-50 each require an Overclocker 3000.",
    "source": "https://hypixel-skyblock.fandom.com/wiki/Eclipse_Hoe",
    "workbookRank": 12
  },
  {
    "id": "tool-mk-ii",
    "category": "Tool Tier",
    "section": "tools",
    "name": "Tool Mk. II",
    "metric": "Progress Gate",
    "modeScope": "Any",
    "cropScope": "Any",
    "status": "ACTIVE",
    "max": 1,
    "stepGain": 0,
    "manualDefault": null,
    "rawMarginal": 0,
    "hypercharge": false,
    "notes": "Raises the tool tier/rarity and is required for later tool levels. It also changes reforge and gemstone scaling, so its exact marginal Fortune is setup-dependent.",
    "source": "https://hypixel-skyblock.fandom.com/wiki/Eclipse_Hoe",
    "workbookRank": null
  },
  {
    "id": "tool-mk-iii",
    "category": "Tool Tier",
    "section": "tools",
    "name": "Tool Mk. III",
    "metric": "Progress Gate",
    "modeScope": "Any",
    "cropScope": "Any",
    "status": "ACTIVE",
    "max": 1,
    "stepGain": 0,
    "manualDefault": null,
    "rawMarginal": 0,
    "hypercharge": false,
    "notes": "Final crafted tier for specialized farming tools. Required for the high-level portion of the level path; rarity also affects reforges and gemstone value.",
    "source": "https://hypixel-skyblock.fandom.com/wiki/Eclipse_Hoe",
    "workbookRank": null
  },
  {
    "id": "tool-overclocker-3000",
    "category": "Tool Level Gate",
    "section": "tools",
    "name": "Overclocker 3000",
    "metric": "Progress Gate",
    "modeScope": "Any",
    "cropScope": "Any",
    "status": "ACTIVE",
    "max": 10,
    "stepGain": 0,
    "manualDefault": null,
    "rawMarginal": 0,
    "hypercharge": false,
    "notes": "One is required for each Farming Tool level from 41 through 50. Ten are required to unlock level 50; the Fortune itself is counted by Farming Tool level to avoid double counting.",
    "source": "https://hypixel-skyblock.fandom.com/wiki/Eclipse_Hoe",
    "workbookRank": null
  },''',
    'current tool level model',
)

data_path.write_text(data)

# --- app.js: crop progress and physical tool progress are separate stores ---
app_path = Path('src/app.js')
app = app_path.read_text()
app = replace_once(
    app,
    "    cropProgress: {},\n    levels: {},",
    "    cropProgress: {},\n    toolProgress: {},\n    levels: {},",
    'toolProgress default',
)

old_helpers = '''function isCropScopedItem(item) {
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

migrateLegacyCropProgress();'''

new_helpers = '''function isCropScopedItem(item) {
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

migrateScopedProgress();'''

app = replace_once(app, old_helpers, new_helpers, 'tool scoped state model')
app_path.write_text(app)

print('Current crop list and physical tool-scoped model applied.')
