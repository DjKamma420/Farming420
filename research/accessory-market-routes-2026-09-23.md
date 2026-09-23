# Accessory market routing — 2026-09-23

Purpose: record which farming-accessory effects can safely use direct market acquisition prices in the upgrade planner.

## Direct Auction House routes

These physical items have current Auction House trade evidence and may use the rolling 90-day AH average as an acquisition-price route:

| Upgrade entry | SkyBlock item ID | Route |
|---|---|---|
| Anita accessory crop bonus | `ANITA_ARTIFACT` | Auction House |
| Atmospheric Filter (Spring) | `ATMOSPHERIC_FILTER` | Auction House |
| Magic 8 Ball FF roll | `MAGIC_8_BALL` | Auction House |

Sources:
- https://sky.coflnet.com/item/ANITA_ARTIFACT
- https://sky.coflnet.com/item/ATMOSPHERIC_FILTER
- https://sky.coflnet.com/item/MAGIC_8_BALL

## Relic of Power boundary

`POWER_RELIC` is the current item ID for Relic of Power, but the physical item is not directly Auction House/Bazaar tradeable. The old `RELIC_OF_POWER` direct-market route was therefore invalid and must not be restored.

Relic of Power is obtained through a forge/progression path from Artifact of Power. A Perfect Peridot Gem is Bazaar-tradeable, but charging only that gemstone when the player does not already own the Relic would understate the cost of obtaining the farming effect.

Sources:
- https://skyblock.finance/items/POWER_RELIC
- https://hypixel-skyblock.fandom.com/wiki/Relic_of_Power
- https://www.skyblocktracker.com/item/PERFECT_PERIDOT_GEM

## Planner rule

Use direct AH/Bazaar prices only for assets that are actually tradeable through that market. Untradeable prerequisite chains stay unknown until their explicit recipe/progression costs are modeled. Never substitute a similarly named item ID or the cost of only one downstream component for the full acquisition path.
