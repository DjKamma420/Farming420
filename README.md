# Farming420

Web-App für **Hypixel SkyBlock Farming-Progression**. Die Oberfläche ist bewusst nicht als große Tabelle aufgebaut, sondern in Ebenen:

**Account → Crop → Tool → Item/Setup → Upgrade-Planer**

Die komplexe Fortune- und Effizienzlogik bleibt im Hintergrund. Auf der Startseite werden nur Fortschritt, aktueller Crop und der nächste sinnvolle Schritt gezeigt.

## Aktueller Stand

- eigene Account-Ebene für Farming Skill, Garden, Anita, Account-Upgrades und globale Quellen
- eigener Bereich für jeden klassischen Garden-Crop
- separates Tool-Setup je Crop
- getrennte Bereiche für Armor/Equipment, Pets, Garden Chips, Attribute Shards, Buffs und Pests
- Status-Layer: `fehlt`, `vorhanden`, `max`, `prüfen`
- Detail-Sidepanel pro Upgrade
- lokale Profilspeicherung im Browser über `localStorage`
- Profil-Import/-Export als JSON
- Upgrade-Planer mit **marginalem Zugewinn** statt einfachem `+X Fortune`
- Coming-Soon-Inhalte getrennt und ohne Einfluss auf aktuelle Empfehlungen
- 74 Upgrade-Einträge aus dem bisherigen Research-Stand
- 19 dokumentierte versteckte bzw. nichtlineare Mechaniken
- vereinfachte Vier-Layer-Startseite
- gruppierte Desktop-Navigation
- mobile Bereichsauswahl
- automatisches Deployment über GitHub Pages

## Projektstruktur

```text
Farming420/
├─ index.html
├─ manifest.webmanifest
├─ assets/
│  └─ icon.svg
├─ src/
│  ├─ app.js            # Profilzustand, Seiten und Rechnerlogik
│  ├─ data.js           # Crops, Upgrades, Mechaniken, Coming Soon
│  ├─ styles.css        # Basis-UI
│  ├─ enhancements.js   # vereinfachte Navigation / Layer-Ansicht
│  └─ enhancements.css
└─ .github/workflows/
   └─ pages.yml
```

## Lokal starten

Keine Build-Abhängigkeiten notwendig.

```bash
python3 -m http.server 4173
```

Danach `http://localhost:4173` öffnen.

## Rechenprinzip

Der Planer bewertet nicht einfach `Fortune / Preis`. Er arbeitet mit dem **marginalen Effekt auf dem aktuellen Profil**. Bereits vorhandene Level werden berücksichtigt; Crop Fortune wird nur beim passenden Crop berücksichtigt; mutually-exclusive Setups wie Pets sollen nicht additiv gestapelt werden; Coming-Soon-Inhalte erhalten kein Gewicht.

## Nächste Ausbaustufen

1. Hypixel-Profilimport, um Besitz und Level soweit möglich automatisch zu erkennen.
2. Bazaar-/Auction-Preise für echte Coins-pro-Prozent- und Payback-Rankings.
3. Exaktere Setup-Simulation für Pets, God Pot, Mixins, Hypercharge und bedingte Shards.
4. Direkte Crop-Seiten mit eigenem Tool, Gear, Buffs und Fortschrittsbaum.
5. Datenvalidierung gegen aktuelle Patch Notes und Community-/Elite-Farming-Quellen.
