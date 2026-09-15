# Finding values in-game

Knowing what a number means is useless if a player cannot find it. This document
governs the "Where do I find this?" layer in `src/help-locations.js`.

## Why locations are treated like mechanics

An in-game menu path is a claim about the game. `AGENTS.md` rule 1 — never
invent a SkyBlock mechanic or interaction — applies to it exactly as it applies
to a formula.

A guessed path is **worse than no path**. A missing location makes a player open
the cited source; a wrong one makes them hunt through menus for something that
is not there, lose trust in every other number the app shows, and possibly enter
a value read from the wrong screen. So an unresearched entry stays
`NEEDS_RESEARCH` and the UI says plainly that the location is not documented yet.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `SYNCED` | A profile sync fills this. The player never looks it up. Derived from `MAPPABLE_ENTRY_IDS` in `src/snapshot-apply.js`, never written by hand, so it cannot drift from what the sync actually does. |
| `VERIFIED` | An in-game location confirmed against a cited source, with a `lastVerified` date. |
| `UNVERIFIED` | A location from a community source or an older capture, shown with a visible caveat. |
| `NEEDS_RESEARCH` | Nothing documented. The UI shows the entry's own source link instead. |

## Current state

- 20 of 77 entries are `SYNCED` — the whole tool NBT block, Farming level,
  Garden plots and crop upgrades.
- 57 entries are entered by hand.
- Of those, only the two direct Fortune inputs carry a location, and both are
  `UNVERIFIED`.

The gap is the in-game paths for the 57 manual entries. Filling them is a
research task, not a code change: `src/help-locations.js` is a data table and
the UI already renders whatever is added to it.

## How to add a location

1. Open the entry's existing `source` in `src/data.js` and any better source
   from the hierarchy in `docs/PROFILE_DATA_MATRIX.md`.
2. Confirm the path against a **current** source. Menus move between updates, so
   an old forum screenshot is `UNVERIFIED` at best.
3. Add a `CURATED` record with `where`, `status`, `source`, `lastVerified` and,
   for anything less than `VERIFIED`, a `note` saying what is uncertain.
4. Write `where` as an instruction a player can follow without already knowing
   the answer: name the menu, the tab and the item or tooltip to read.
5. Add a test row in `tests/help-locations.test.js` if the entry has behaviour
   worth pinning, such as a crop-scoped path.

## Why there are no screenshots

Screenshots would be the clearest form, and the app has no way to ship them
honestly:

- they cannot be produced from this repository or its toolchain
- game screenshots are Hypixel/Mojang assets, so redistributing them in a public
  repository is a licensing question, not a technical one
- a screenshot goes stale silently on the next UI update, while a text path that
  carries a `lastVerified` date shows its own age

If screenshots are wanted later, the maintainable form is a player-supplied
capture stored outside the repository and referenced by URL, with the same
`lastVerified` discipline.
