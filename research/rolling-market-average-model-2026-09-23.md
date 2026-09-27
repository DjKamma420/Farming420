# Rolling 90-day market price model

**Status:** ACTIVE  
**Last verified:** 2026-09-27

## Product rule

Player-entered coin prices are not an input to Farming420. Market-dependent coin
values are read-only rolling averages over the previous 90 days.

Legacy price fields may remain in old profile backups for data preservation, but
runtime calculations must ignore them.

## Sources

Primary history provider: [SkyCofl API](https://sky.coflnet.com/wiki/api). Public
projects using SkyCofl data must keep the provider attribution visible; the UI
links to [SkyCofl data attribution](https://sky.coflnet.com/data).

### Bazaar

Endpoint:

`GET https://sky.coflnet.com/api/bazaar/{itemTag}/history?start={ISO}&end={ISO}`

The history exposes separate `buy` and `sell` series.

- **Acquisition cost:** use the `sell` series, because a player acquiring an
  item crosses the sell-offer side.
- **Liquidation / crop sell value:** use the `buy` series, because an instant
  sale crosses the buy-order side.
- Reduce the requested 90-day interval to a time-weighted average. This avoids
  giving an irregularly sampled period the same weight as a long interval.

### Auction House

Endpoint:

`GET https://sky.coflnet.com/api/item/price/{itemTag}/history/full`

The response model exposes `avg`, `volume`, and `time`. Runtime filters rows
to the previous 90 days and computes:

`sum(avg * volume) / sum(volume)`

Rows without a positive price or positive sale volume do not become zero-price
data points.

### Physical item build routing

A replacement/build value must not compare AH and Bazaar quotes and silently pick
the cheaper market. The component's role determines the primary market:

- physical base gear, tools, vacuums and pets: **Auction House first**;
- tradeable applied components such as Recombobulators, reforge stones,
  gemstones, enchantment books and counted upgrade consumables: **Bazaar first**;
- held pet items use Bazaar first because they are upgrade components rather
  than the physical pet base.

The other market may be used only when the preferred market has no usable
90-day history for that exact item tag. This is a data-availability fallback,
not an arbitrage rule. A missing component remains visibly incomplete; it is
never assigned zero or a snapshot-derived fantasy price.

## Cache

The browser cache is refreshed at most once per 24 hours. Each cached quote
keeps:

- market (Bazaar or Auction House);
- acquisition/liquidation side;
- SkyBlock item tag;
- rolling-window start/end;
- sample count;
- computed timestamp;
- source/attribution.

A stale or missing cache entry is **unknown**, not zero and not a fallback to a
24-hour/7-day research snapshot.

## Upgrade route IDs verified for this integration

Bazaar product IDs used directly include:

- `PESTHUNTING_GUIDE`
- `ENCHANTMENT_SUNSET_5`
- `REFINED_DARK_CACOA_TRUFFLE`
- `FEAST_BURGER`
- `FILLED_ROSEWATER_FLASK`
- `ENCHANTMENT_GREEN_THUMB_5`
- `ENCHANTMENT_CULTIVATING_1`
- `ENCHANTMENT_DEDICATION_1`, `ENCHANTMENT_DEDICATION_2`, `ENCHANTMENT_DEDICATION_4`
- `ENCHANTMENT_HARVESTING_6`
- `FARMING_FOR_DUMMIES`
- `OVERCLOCKER_3000`
- `RECOMBOBULATOR_3000`

Auction House item IDs use the exact item IDs already present in Farming420
research: the four Helianthus pieces, the four Blossom pieces, and
`ZORROS_CAPE`.

## Safety rules

- No arithmetic mean across Bazaar buy and sell sides.
- No current lowest BIN used as a 90-day average.
- No 24-hour/7-day snapshot substituted when 90-day history is missing.
- No display-name-to-item-ID guessing.
- No unknown value represented as zero.
