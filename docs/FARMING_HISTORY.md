# How farming has changed

Why this file exists: a `lastVerified` date is only meaningful **relative to the
last time the game moved**. Two dates are needed per value —

- when this repository last checked it, and
- when Hypixel last changed the thing being checked.

If the second is newer than the first, the value is stale no matter how
confidently it was recorded. Nothing in this repo tracked the second date, which
is exactly how the specialised tool rename sat here undetected and silently
broke tool detection for seven of thirteen crops (see
`docs/VERIFIED_MECHANICS.md`).

Compiled 2026-09-16 from the community wiki's page histories and changelog
index.

## Timeline

| Date | Version | Change |
| --- | --- | --- |
| 2021-01-15 | 0.11 | **Farming Fortune added.** |
| 2022-10-27 | Alpha | Garden added on the Alpha network. |
| 2023-02-14 | 0.18 | **The Garden released.** |
| 2023-03-28 | 0.18.2 | Various changes to The Garden. |
| 2023-04-18 | 0.18.3 | Each Garden level grants +10% Crop Growth speed. |
| 2023-05-22 | — | **Farming Fortune removed from Private Islands.** |
| 2023-06-20 | 0.19 | The Rift. |
| 2023-10-24 | 0.19.6 | Expired Pumpkin added. |
| 2023-11-08 | — | Pest bestiary max reduced from 400 to 250; each tier awards 0.4 Farming Fortune. |
| 2023-11-14 | 0.19.7 | **Pests introduced**, with broad Garden and farming changes. Crop-specific Fortune became a *displayed* stat — it had been hidden and had to be calculated by hand. Tools relabelled "[Crop] Fortune" instead of "Farming Fortune for [Crop]". |
| 2024-02-06 | 0.19.11 | Melon slices, Pumpkin blocks and enchanted crops can paste plots, with the difference refunded. |
| 2025-12-05 | Alpha | Garden Chips added on the Alpha network. |
| 2025-12-15 | 0.24 | **Greenhouse, Sowdust and Jeff added**; Garden Chips released. |
| 2026-03-31 / 2026-04-28 | 0.24.4 | Taylor added as a visitor. |
| 2026-04-30 / 2026-05-06 | 0.24.5 | Tal Ker added as a visitor. |
| 2026-07-08 | 0.26 | Farming Fortune icon updated. |
| 2026-08 | — | **Greenhouse mutation multiplier changed** — at least the second Greenhouse rebalance. |

## The four eras

1. **Before the Garden (2021 – early 2023).** Farming Fortune existed but
   farming happened on the Private Island. Any guide or number from this era is
   about a different game.
2. **Garden, no pests (2023-02 – 2023-11).** Crop Fortune existed but was
   *hidden*, so community numbers from this window were reverse-engineered by
   hand and are the least trustworthy.
3. **Pests era (2023-11 – 2025-12).** Pests, the Fortune penalty and Bonus Pest
   Chance arrive. This is where most surviving community guidance comes from.
4. **Greenhouse and Chips era (2025-12 – now).** Sowdust, Garden Chips, the
   Greenhouse, and repeated Greenhouse rebalances including August 2026. Profit
   maths from era 3 does not carry over.

## What this means for the planner

- **Anything dated before 2023-11-14 is suspect for Crop Fortune**, because the
  stat was not displayed before then and had to be derived.
- **Greenhouse profit figures go stale fastest.** Two rebalances are known, the
  latest August 2026. Never hard-code one.
- **Private Island farming is a different regime** — Farming Fortune does
  nothing there, since 2023-05-22.
- **The specialised tool rename has no date here yet.** Pinning it is the single
  most valuable missing entry, because it is the change that proved this whole
  file was needed.

## A caveat on the source, recorded honestly

The community wiki's **Farming Fortune page carries the wiki's own
`Outdated pages` and `Confirmations needed` category markers**, even though it
was last edited 2026-09-14. So the values taken from it in
`docs/VERIFIED_MECHANICS.md` are *consistent with the best available public
source*, not confirmed against the live game. That is very likely the cause of
the armour-Fortune discrepancy recorded there.

The stronger check for anything the API exposes is the API itself, which is
authoritative and needs no wiki at all.

## Licensing and etiquette

Content on `hypixelskyblock.minecraft.wiki` is licensed **CC BY-NC-SA 3.0**, and
the operator (Weird Gloop) ships an explicit anti-AI-scraper signal in the page.
Consequences for this repository:

- **Attribution is required.** Every entry derived from it already carries its
  source URL; keep that.
- **Non-commercial and share-alike** apply to reused content, which is fine for
  this project but must stay true of it.
- **Keep extraction minimal.** Prefer the official Hypixel API for anything it
  exposes, cite a page rather than mirroring it, and do not bulk-copy.

Nothing here reproduces wiki prose; what is recorded is the mechanic plus a link.
