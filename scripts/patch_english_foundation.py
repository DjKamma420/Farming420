from pathlib import Path

path = Path('src/app.js')
text = path.read_text()

text = text.replace(
    "import { CROPS, UPGRADES, HIDDEN_INTERACTIONS, COMING_SOON } from './data.js';\n\nconst STORAGE_KEY = 'skyblock-farming-maxer-v1';",
    "import { CROPS, UPGRADES, HIDDEN_INTERACTIONS, COMING_SOON } from './data.js';\nimport { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';"
)

text = text.replace(
    "const defaultState = {\n  page: 'dashboard',",
    "const defaultState = {\n  schemaVersion: DATA_SCHEMA_VERSION,\n  page: 'dashboard',"
)

text = text.replace("name: 'Mein Profil'", "name: 'My Profile'")

old_load = '''function loadState() {
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
}'''

new_load = '''function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const saved = JSON.parse(raw);
    const loaded = {
      ...structuredClone(defaultState),
      ...saved,
      profile: { ...structuredClone(defaultState.profile), ...(saved.profile || {}) }
    };
    loaded.schemaVersion = Number(saved.schemaVersion || DATA_SCHEMA_VERSION);
    return loaded;
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

function saveState() {
  if (Number(state.schemaVersion || DATA_SCHEMA_VERSION) > DATA_SCHEMA_VERSION) return;
  state.schemaVersion = DATA_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}'''

if old_load not in text:
    raise SystemExit('load/save state patch target missing')
text = text.replace(old_load, new_load, 1)

replacements = {
    "['dashboard', 'Übersicht']": "['dashboard', 'Dashboard']",
    "['planner', 'Upgrade-Planer']": "['planner', 'Upgrade Planner']",
    "['research', 'Mechaniken']": "['research', 'Mechanics']",
    "'prüfen'": "'verify'",
    "'vorhanden'": "'owned'",
    "'fehlt'": "'missing'",
    "'Besitzt'": "'Owned'",
    "'Nicht gesetzt'": "'Not set'",
    "'Fortune/Schritt'": "'Fortune/step'",
    "'<span>dynamisch</span>'": "'<span>dynamic</span>'",
    "<div class=\"mini-label\">Profil</div>": "<div class=\"mini-label\">Profile</div>",
    ">Profil exportieren</button>": ">Export profile</button>",
    ">Profil importieren<input": ">Import profile<input",
    "placeholder=\"Item, Upgrade, Effekt suchen…\"": "placeholder=\"Search item, upgrade or effect…\"",
    "<div class=\"fortune-pill\"><span>Effektiv</span>": "<div class=\"fortune-pill\"><span>Effective</span>",
    "pageHeader('Übersicht', 'Dein Farming-Fortschritt', 'Nur das Wesentliche. Details öffnen sich erst bei Klick.')": "pageHeader('Dashboard', 'Your Farming Progress', 'Only the important decisions are shown here. Open a layer for details.')",
    "<div class=\"eyebrow\">Nächstes Upgrade</div>": "<div class=\"eyebrow\">Next upgrade</div>",
    "marginaler Stat · ca.": "marginal stat · about",
    "relativer Zugewinn im aktuellen": "relative gain in the current",
    ">Details öffnen</button>": ">Open details</button>",
    "<h2>Profil vollständig</h2><p>Für die aktuellen Eingaben gibt es kein aktives Upgrade mit berechenbarem Zugewinn.</p>": "<h2>No calculated upgrade</h2><p>No active upgrade with a calculated marginal gain is available for the current profile state.</p>",
    "<span>Gesamt</span>": "<span>Total</span>",
    "<small>aktive Einträge maxed</small>": "<small>active entries maxed</small>",
    "<small>relevante Einträge maxed</small>": "<small>relevant entries maxed</small>",
    "<span>Effektive Fortune</span>": "<span>Effective Fortune</span>",
    "<h2>Account-Layer</h2><p>Globale Fortschritte, die mehrere Crops gleichzeitig beeinflussen.</p>": "<h2>Account layer</h2><p>Global progression that affects multiple crops.</p>",
    ">Alle anzeigen</button>": ">View all</button>",
    "-Layer</h2><p>Crop-spezifische Progression und das zugehörige Tool.</p>": " layer</h2><p>Crop-specific progression and its physical farming tool.</p>",
    ">Crop öffnen</button>": ">Open crop</button>",
    "['Accessoires & permanente Items'": "['Accessories & permanent items'",
    "pageHeader('Account', 'Globale Account-Progression', 'Alles, was nicht an einen einzelnen Crop oder ein einzelnes Tool gebunden ist.')": "pageHeader('Account', 'Global Account Progression', 'Progress that is not bound to one crop or one physical farming tool.')",
    ">Globale Farming Fortune<input": ">Global Farming Fortune<input",
    "Wird nur für die relative Upgrade-Bewertung benutzt. Besitzstatus bleibt davon getrennt.": "Used only for relative upgrade evaluation. Ownership remains a separate state.",
    "zugehörige Layer abgeschlossen": "related layers completed",
    "pageHeader('Crops', 'Ein Crop = eine eigene Arbeitsfläche', 'Jeder Crop bündelt sein Tool, crop-spezifische Fortune und seine Progression.')": "pageHeader('Crops', 'One crop, one workspace', 'Each crop combines its progression, crop-specific Fortune and physical farming tool.')",
    "<div class=\"eyebrow\">Aktiver Crop</div>": "<div class=\"eyebrow\">Active crop</div>",
    "<span>Crop-Progression</span>": "<span>Crop progression</span>",
    "<span>Account-Effekte werden automatisch geerbt</span>": "<span>Account effects are inherited automatically</span>",
    "Alle Tool-Upgrades gehören nur in diesen Layer und werden nicht mit Account-Upgrades vermischt.": "Tool upgrades belong to the physical tool layer and are not mixed with account progression.",
    ">Tool-Layer öffnen</button>": ">Open tool layer</button>",
    "Einträge": "entries",
    "<div class=\"empty\">Keine Treffer.</div>": "<div class=\"empty\">No matches.</div>",
    "pageHeader('Planer', 'Was lohnt sich als Nächstes?', 'Die App bewertet den marginalen Zugewinn auf deinem aktuellen Fortune-Niveau. Kosten kannst du pro Upgrade im Detail-Layer hinterlegen.')": "pageHeader('Planner', 'What should you do next?', 'The current prototype ranks marginal gain at your present Fortune level. The target system will rank profit, payback and unlock paths.')",
    "<div><span>Effektiv</span>": "<div><span>Effective</span>",
    "<span>relativ</span>": "<span>relative</span>",
    "'Kosten fehlen'": "'Cost missing'",
    "<div class=\"empty\">Keine berechenbaren Upgrades für den aktuellen Zustand.</div>": "<div class=\"empty\">No calculated upgrades for the current state.</div>",
    "pageHeader('Mechaniken', 'Versteckte und nichtlineare Effekte', 'Diese Regeln werden nicht als simple +Fortune-Zeilen behandelt.')": "pageHeader('Mechanics', 'Hidden and nonlinear effects', 'These rules are intentionally modeled separately instead of being treated as simple additive Fortune.')",
    "<strong>Effekt:</strong>": "<strong>Effect:</strong>",
    "<strong>Warum separat:</strong>": "<strong>Why separate:</strong>",
    "<strong>App-Logik:</strong>": "<strong>App logic:</strong>",
    ">Quelle öffnen</a>": ">Open source</a>",
    "pageHeader('Coming Soon', 'Angekündigt, aber nicht eingerechnet', 'Diese Inhalte erhalten im Planer absichtlich Gewicht 0, bis sie live sind.')": "pageHeader('Coming Soon', 'Announced but not included', 'These entries intentionally have zero planner weight until they are live and verified.')",
    "badge('0 Gewicht','coming')": "badge('0 weight','coming')",
    "<h3>Besitz & Level</h3>": "<h3>Ownership & Level</h3>",
    "<span>Vorhanden</span>": "<span>Owned</span>",
    "<h3>Bewertung</h3>": "<h3>Evaluation</h3>",
    "<span>Nächster Schritt</span>": "<span>Next step</span>",
    "<span>Relativer Effekt</span>": "<span>Relative effect</span>",
    ">Nächste Kosten (Coins)<input": ">Next cost (Coins)<input",
    ">Manueller marginaler Wert<input": ">Manual marginal value<input",
    "placeholder=\"nur bei dynamischen Werten\"": "placeholder=\"only for dynamic values\"",
    "<h3>Regel</h3>": "<h3>Rule</h3>",
    "'Keine Zusatznotiz.'": "'No additional note.'",
    "item.hypercharge?'Ja':'Nein'": "item.hypercharge?'Yes':'No'",
    "genericSectionPage('tools','Tools',`${crop().tool} & Tool-Upgrades`,'Nur Tool-spezifische Progression: Enchants, Reforge, Gemstone, Dummies und Counter.')": "genericSectionPage('tools','Tools',`${crop().tool} & Tool Upgrades`,'Physical tool progression: enchantments, reforge, gemstone, Farming for Dummies, counters and tool levels.')",
    "genericSectionPage('gear','Gear','Armor & Equipment','Armor, Equipment, Reforges, Gems und Enchants bleiben ein eigener Layer.')": "genericSectionPage('gear','Gear','Armor & Equipment','Armor, equipment, reforges, gemstones and enchantments remain a separate setup layer.')",
    "genericSectionPage('pets','Pets','Pets & Pet Items','Pets werden als gegenseitig ausschließende Setups behandelt, nicht additiv gestapelt.')": "genericSectionPage('pets','Pets','Pets & Pet Items','Pets are mutually exclusive setup choices and are never added together.')",
    "genericSectionPage('chips','Garden Chips','Garden Chips','Jeder Chip hat seinen eigenen Levelpfad und seine eigene Bedingung.')": "genericSectionPage('chips','Garden Chips','Garden Chips','Each chip has its own level path and activation conditions.')",
    "genericSectionPage('shards','Attribute Shards','Shards','Day/Night-, Pest- und allgemeine Fortune-Shards getrennt verwalten.')": "genericSectionPage('shards','Attribute Shards','Shards','Track day/night, pest-conditional and general Farming Fortune shards separately.')",
    "genericSectionPage('buffs','Buffs','Temporäre Buffs & Mixins','God Pot, Mixins, Cake und saisonale Effekte werden nicht mit permanenten Upgrades vermischt.')": "genericSectionPage('buffs','Buffs','Temporary Buffs & Mixins','God Potion, mixins, cakes and seasonal effects are kept separate from permanent progression.')",
    "genericSectionPage('pests','Pests','Pest-Setup','Pest-spezifische Werte und Spawn-Mechaniken bleiben getrennt von normalem Crop Farming.')": "genericSectionPage('pests','Pests','Pest Setup','Pest-specific stats, spawn mechanics and loot logic stay separate from normal crop farming.')",
    "alert('Ungültige Profil-Datei.')": "alert('Invalid profile file.')",
    "toLocaleString('de-DE')": "toLocaleString('en-US')",
}

for old, new in replacements.items():
    text = text.replace(old, new)

path.write_text(text)

# Data notes are already predominantly English. Fail on known German UI fragments so
# future commits do not accidentally leave the old UI language behind.
remaining = [
    'Übersicht', 'Nächstes Upgrade', 'Globale Account', 'Arbeitsfläche',
    'Aktiver Crop', 'Keine Treffer', 'Was lohnt sich', 'Versteckte und',
    'Angekündigt', 'Besitz & Level', 'Bewertung', 'Quelle öffnen',
    'Ungültige Profil', 'Bereich auswählen',
]
for token in remaining:
    if token in text:
        raise SystemExit(f'German UI token remains in app.js: {token}')

print('English UI and versioned-state foundation applied.')
