# Farming gemstone capability audit — 2026-09-17

Purpose: machine-readable source of truth for which farming-facing physical items may expose gemstone sockets. This file describes capability only. The runtime must still read the current Hypixel item resource and treat its exact `gemstone_slots`, costs and requirements as authoritative.

## Source policy

1. Primary runtime source: `GET https://api.hypixel.net/v2/resources/skyblock/items`.
2. Auditable mirror: `https://hypixel-skyblock.fandom.com/wiki/Module%3AItem/ApiData` (the page states it is automatically refreshed from the Hypixel item resource).
3. Current item/wiki pages are supporting evidence for user-facing names and history.
4. Never infer a gemstone socket merely from item category, rarity, reforgeability or another member of the same set.
5. A missing/unknown item is `UNKNOWN`, not zero. A concrete official item with `gemstone_slots: []` is known zero.

## Farming armor and farming-relevant standalone armor

| Item family / item | Current Peridot sockets per piece | Runtime rule |
| --- | ---: | --- |
| Farmhand Armor (`FARMHAND_*`; legacy Farm Suit) | 0 | Explicitly removed in 0.26.1. |
| Haymaker Armor (`HAYMAKER_*`; legacy Farm Armor) | 0 | Explicitly removed in 0.26.1. |
| Sprout Armor (`SPROUT_*`; legacy Pumpkin Armor ids may remain in old data) | 0 in current item resource | Do not inherit later-set sockets. |
| Tater Armor (`TATER_*`; legacy Melon Armor ids may remain in old data) | 0 in current item resource | Do not inherit later-set sockets. |
| Cropie Armor | 1 each | Direct Peridot socket. Four-piece set = 4 sockets. |
| Squash Armor | 1 each | Direct Peridot socket. Four-piece set = 4 sockets. |
| Fermento Armor | 2 each | Direct Peridot sockets. Four-piece set = 8 sockets. |
| Helianthus Armor | 2 each | Direct Peridot sockets. Four-piece set = 8 sockets. |
| Farmer Boots (`FARMER_BOOTS`) | 1 | Direct Peridot socket. |
| Rancher's Boots (`RANCHERS_BOOTS`) | 2 | Direct Peridot sockets. |
| Lantern Helmet (`ENCHANTED_JACK_O_LANTERN`) | 2 | Direct Peridot sockets; farming-relevant because its Fortune ability works while holding an Axe. It must therefore be available in the farming armor picker. |
| Pufferfish Hat / Helmet exception | 0 unless the live item resource says otherwise | Never invent a socket from the fact that it is a farming/Pest option. |

### Armor sources

- Hypixel 0.26.1 RC: https://hypixel.net/threads/july-15-0-26-1-release-candidate.6114430/ — Farmhand and Haymaker gemstone slots explicitly removed.
- Cropie Armor: https://hypixel-skyblock.fandom.com/wiki/Cropie_Armor — one Farming/Peridot socket per piece.
- Squash Armor: https://hypixel-skyblock.fandom.com/wiki/Squash_Armor — one Farming/Peridot socket per piece.
- Fermento Armor: https://hypixel-skyblock.fandom.com/wiki/Fermento_Armor — two Farming/Peridot sockets per piece.
- Helianthus Armor: https://hypixel-skyblock.fandom.com/wiki/Helianthus_Armor — two Farming/Peridot sockets per piece.
- Rancher's Boots: https://hypixel-skyblock.fandom.com/wiki/Rancher%27s_Boots — two Farming/Peridot sockets.
- Farmer Boots item data: https://skyblock.finance/items/FARMER_BOOTS — one Peridot socket.
- Lantern Helmet: https://hypixel-skyblock.fandom.com/wiki/Lantern_Helmet and https://skyblock.finance/items/ENCHANTED_JACK_O_LANTERN — two Peridot sockets.

## Farming equipment

The audited current farming equipment families (Peony/Lotus, Blossom, Pesthunter, Pest Vest, Zorro's Cape) do not receive generic gemstone sockets merely because they are equipment. The setup editor must expose sockets only when the exact item returned by the Hypixel resource contains `gemstone_slots`.

This is intentionally data-driven: if Hypixel later adds a socket to one specific equipment piece, that exact item should gain the control after the official catalog refresh without granting sockets to the rest of the family.

## Specialised Farming Tools

Current Mk farming tools are socketed per exact item and tool data. The app already stores each physical socket separately in `toolProgress[toolKey].gemSlots`; the old single `Perfect Peridot = +30` abstraction is not a valid calculator model.

Current official item-resource pattern (examples: Cactus Knife and Cocoa Chopper):

| Tool tier | Physical Peridot sockets in item data | `levelable_lvl` requirements present |
| --- | ---: | --- |
| Mk. I | 2 | 5, 15 |
| Mk. II | 3 | 5, 15, 25 |
| Mk. III | 4 | 5, 15, 25, 50 |

The runtime exact item resource is authoritative. Offline fallback uses the same 5/15/25/50 requirement values and 2/3/4 physical Mk limits.

Unlock-cost pattern in current item data:

- socket 1: 20 Fine Peridot + 50,000 Coins;
- socket 2: 40 Fine Peridot + 100,000 Coins;
- socket 3: 1 Flawless Peridot + 250,000 Coins;
- socket 4: 2 Flawless Peridot + 1,000,000 Coins.

Source: https://hypixel-skyblock.fandom.com/wiki/Module%3AItem/ApiData (mirror of Hypixel item resource; examples include `CACTUS_KNIFE*` and `COCO_CHOPPER*`).

### Peridot value

Peridot gives Farming Fortune and scales by host item rarity and gemstone quality. The calculator must sum the actual configured sockets, not a fixed reference number. Current values are modeled in `src/gemstone-slots.js`; Perfect Peridot is +3/+4/+5/+6/+8/+10 Farming Fortune from COMMON through MYTHIC. A max Mk. III farming tool with four Perfect Peridots at LEGENDARY therefore contributes +32 Farming Fortune.

Sources:
- https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/
- https://hypixel-skyblock.fandom.com/wiki/Farming_Fortune

## Vacuums

The physical Vacuum model remains separate from farming crop tools:

| Vacuum | Peridot sockets |
| --- | ---: |
| SkyMart Vacuum | 0 |
| SkyMart Turbo Vacuum | 0 |
| SkyMart Hyper Vacuum | 0 |
| InfiniVacuum | 1 |
| InfiniVacuum Hooverius | 2 |

The runtime should prefer exact official item data and use `src/exact-farming-items.js` only as the verified offline fallback.

Supporting source: https://hypixel-skyblock.fandom.com/wiki/InfiniVacuum%E2%84%A2 (one socket on InfiniVacuum; exact item resource covers the full chain).

## Accessories / non-loadout gemstone hosts

Power accessories can have gemstone slots, including Peridot on the Relic of Power. They are not armor/equipment/tool/vacuum setup slots and must not be silently folded into those editors. Their Farming Fortune belongs to the account/accessory layer and needs its own exact model.

Source: https://hypixel-skyblock.fandom.com/wiki/Gemstone_Slot.

## Grouped gemstone slot correction

Current grouped socket legality used by the generic exact-item editor:

- `COMBAT`: Ruby, Amethyst, Sapphire, Jasper, Onyx, Opal.
- `DEFENSIVE`: Ruby, Amethyst, Opal.
- `MINING`: Jade, Amber, Topaz.
- `UNIVERSAL`: all current gemstone types.
- direct `PERIDOT`: Peridot only.

Peridot is not inferred into Combat/Defensive/Mining groups.

## Implementation invariants

- Exact Hypixel item ID beats display-name matching.
- Live official `gemstone_slots` beats every fallback.
- Requirements are evaluated per socket.
- Locked/future sockets do not contribute Fortune.
- Recombobulation changes host rarity before rarity-scaled Peridot value is calculated.
- Farmhand/Haymaker remain zero after 0.26.1; no legacy cached slot may reappear.
- Tool `gemSlots` are the calculator input. The legacy `tool-gem-perfect-peridot-on-farming-tool` one-shot flag must not add a second fixed Fortune contribution.
- Pest mode counts Vacuum Peridot, not crop-tool Peridot. Farm mode counts the selected crop tool's configured Peridot slots.

lastVerified: 2026-09-17
