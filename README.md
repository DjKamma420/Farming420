# SkyBlock Farming Maxer

Eine lokale Web-App für Hypixel SkyBlock Farming-Progression. Ziel: keine riesige Tabelle, sondern klare Ebenen für **Account → Crop → Tool → Item/Upgrade**.

## Was die App bereits kann

- Account-Fortschritt separat von Crop- und Tool-Fortschritt
- eigener Bereich für jeden klassischen Garden-Crop
- Tool-Layer mit Enchants, Reforge, Gemstone, Farming for Dummies usw.
- getrennte Bereiche für Armor/Equipment, Pets, Garden Chips, Attribute Shards, Buffs und Pests
- Status-Layer: `fehlt`, `vorhanden`, `max`, `prüfen`
- Detail-Sidepanel für jedes Upgrade
- lokale Speicherung im Browser (`localStorage`)
- Profil-Import/-Export als JSON
- einfacher Upgrade-Planer mit marginalem Zugewinn statt reinem `+X Fortune`
- Coming-Soon-Inhalte getrennt und mit Gewicht 0
- 74 Upgrade-Einträge aus dem bisherigen Research-Stand
- 19 dokumentierte nichtlineare/versteckte Mechaniken

## Starten

Es gibt keine Build-Abhängigkeiten.

```bash
python3 -m http.server 4173
```

Danach `http://localhost:4173` im Browser öffnen.

Alternativ kann das Verzeichnis direkt auf GitHub Pages, Cloudflare Pages, Netlify oder einen anderen Static Host gelegt werden.

## Datenmodell

`src/data.js` enthält aktuell:

- `CROPS`
- `UPGRADES`
- `HIDDEN_INTERACTIONS`
- `COMING_SOON`

Die UI- und Profil-Logik liegt in `src/app.js`.

## Nächste technische Ausbaustufe

Für eine vollautomatische Version sollte als nächstes ein Profil-Importer ergänzt werden, der Hypixel-SkyBlock-Profildaten einliest und Besitz/Level soweit möglich automatisch setzt. Danach können Bazaar/Auction-Preise für echte Coins-pro-Prozent-Rankings ergänzt werden. Dynamische Werte, die nicht zuverlässig aus einer API ableitbar sind, bleiben manuell überschreibbar.
