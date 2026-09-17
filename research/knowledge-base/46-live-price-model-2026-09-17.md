# Live price model — 2026-09-17

Status: ACTIVE implementation research
Scope: calculator price plumbing, not a static price table
Last verified: 2026-09-17

## Core rule

A price is not a property of an item. It is a quote with a source, direction, timestamp, market side, and transaction assumptions.

The calculator must never use a stale research price as if it were a current market price. Missing official market coverage stays unresolved.

## Official sources

### Hypixel Bazaar

Endpoint: `GET https://api.hypixel.net/v2/skyblock/bazaar`
Official API reference: https://api.hypixel.net/

The endpoint returns:

- `lastUpdated`
- one record per `product_id`
- `sell_summary`: current sell offers
- `buy_summary`: current buy orders
- `quick_status`

The official API defines `quick_status.sellPrice` and `quick_status.buyPrice` as weighted averages of the top 2% of orders by volume. Therefore:

- immediate acquisition baseline -> `quick_status.sellPrice` (sell-offer side)
- immediate liquidation baseline -> `quick_status.buyPrice` (buy-order side)

Do not swap these because of the player's action wording. The field names describe the market-side order type.

The runtime keeps the raw top-30 summaries separately. It does not silently replace the documented weighted quote with the first orderbook row.

### Official SkyBlock item resource

Endpoint: `GET https://api.hypixel.net/v2/resources/skyblock/items`
Official API reference: https://api.hypixel.net/

Items may contain `npc_sell_price`. This is a verified NPC liquidation quote, not a purchase price.

Rules:

- `npc_sell_price` may be used only for liquidation.
- absence of `npc_sell_price` means unknown/not available, never zero.
- NPC daily/account limits are not encoded by the per-unit field, so the runtime labels this constraint instead of assuming unlimited NPC liquidation.

## Freshness

`src/live-prices.js` checks both:

1. local receipt/cache age, and
2. Hypixel's source `lastUpdated` age.

Default runtime boundaries:

- local Bazaar cache: 60 seconds
- maximum accepted source age for a live quote: 5 minutes

This prevents a newly fetched but server-stale payload from being labeled current.

The Hypixel API policy asks applications to cache data and avoid unnecessary repeated requests. The short cache is therefore intentional.

Policy source: https://developer.hypixel.net/policies/

## Price selection contract

`resolveUnitPrice(...)` uses a conservative default:

### ACQUIRE

1. fresh Hypixel Bazaar sell-offer weighted quote
2. otherwise unresolved

An NPC sell value is never repurposed as a buy/acquisition cost.

### LIQUIDATE

1. fresh Hypixel Bazaar buy-order weighted quote
2. official NPC sell value only if there is no usable Bazaar quote
3. otherwise unresolved

`priceCandidates(...)` exposes both Bazaar and NPC rows where both exist. This allows a later strategy layer to compare routes without destroying provenance.

The default resolver deliberately does not automatically choose a higher NPC quote over Bazaar because account/daily NPC limits are outside the unit quote.

## Gross versus net

The current runtime quotes are **gross per-unit market prices**.

Bazaar transaction taxes, listing/order setup costs, Mayor/perk modifiers, and any account-specific fee reductions must be applied in the economics layer only after they are independently current-source verified. The live-price module does not hard-code an old Bazaar tax rate from a stale community page.

Until those fee rules are source-verified, a gross Bazaar liquidation quote must not be described as exact net coins received.

## Auction House / BIN

The official Hypixel API exposes auctions, but it does not expose one authoritative normalized item price equivalent to Bazaar `quick_status`.

This implementation therefore does **not**:

- average arbitrary active BIN listings,
- scan all auction pages on every planner render,
- treat lowest BIN as intrinsic value,
- derive prices from item display names,
- import a static community-site number as live.

For an item that is neither Bazaar-priced nor NPC-sellable, the official-source resolver returns:

```text
complete: false
source: unresolved
coinsPerUnit: null
reason: AH/BIN requires a separate source
```

A later market-source integration may add AH/BIN quotes as a new source with its own freshness, item-variant normalization, liquidity, and manipulation safeguards.

## Runtime files

- `src/live-prices.js`
  - Bazaar normalization
  - NPC sell normalization
  - freshness checks
  - price candidates
  - conservative resolver
  - short Bazaar cache
- `src/hypixel-client.js`
  - keyless `fetchBazaar()`
  - keyless `fetchItemResources()`
- `tests/live-prices.test.js`
  - market-side correctness
  - NPC directionality
  - cache/source freshness
  - unresolved behavior

## Calculator integration rule

`profit-engine.js` consumes explicit `unitValueCoins`. A caller may populate that field from this live-price layer only when the quote is valid for the intended transaction direction and sufficiently fresh.

Do not write `0` when no quote exists. Incomplete price coverage must propagate into an incomplete profit state.

## Remaining price work after this step

- source-verify current Bazaar taxes/fees and account-specific reductions before calculating exact net sale proceeds;
- add a robust AH/BIN source if required for non-Bazaar upgrade acquisition costs;
- wire the visible Revenue Planner to request these source-aware quotes instead of relying on manually entered blanket Coins/hour baselines.
