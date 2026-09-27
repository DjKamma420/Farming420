# Farming420 — Post-parallel TODO

Date: 2026-09-27

This backlog assumes the ten parallel workstreams started on 2026-09-27 are completed and merged successfully. It intentionally does **not** duplicate work assigned to those chats.

## Work already assigned to the ten parallel chats

Do not create a second implementation for these areas while their parallel work is active:

1. Farming / Spawning / Killing loadout model
2. Upgrade Planner and Cost Until Maxed
3. Pricing, Bazaar/AH routing and 90-day averages
4. Global search
5. Farming-relevant Shards and Accessories
6. Vacuum integration into the Tool system
7. Auto-Fill and item capability logic
8. Dashboard, Coins/hour and farming/pest events
9. Info tab and early-/midgame explanations
10. Repository-wide English/navigation/dead-code/UI consistency audit

---

# Remaining product work after the parallel batch

## P0 — Merge and integration pass

- [ ] Merge/reconcile all ten parallel workstreams without keeping duplicate models, duplicate state fields or duplicate UI.
- [ ] Resolve cross-chat ownership conflicts centrally. In particular, Pricing, Planner, Loadouts, Auto-Fill, Vacuum, Dashboard and Search must consume the same canonical data/model layers.
- [ ] Verify state migrations for every schema change introduced by the parallel work.
- [ ] Verify service-worker/cache completeness after files are added, renamed or removed.
- [ ] Run the complete regression gate on the integrated result:
  - npm test
  - npm run sweep
  - npm run audit:overlay
  - scripts/browser-startup-smoke.sh
- [ ] Re-run representative browser flows on desktop and phone widths after all branches are combined.
- [ ] Update architecture/docs only after the integrated import graph and final navigation are known.

## P1 — Prerequisite-aware recommendation engine / Focus on Next

The current ten chats improve planner costs and account modeling, but they do not fully implement the product-spec recommendation engine.

- [ ] Generate **actions**, not only item upgrades.
- [ ] Model prerequisite chains for purchase, grind, unlock, upgrade, wait, contest and craft actions.
- [ ] Calculate before/after profit for each action from complete legal setup states.
- [ ] Keep acquisition cost, recoverable resale value, recurring cost, active grind time and passive wait time separate.
- [ ] Calculate marginal Coins/hour and payback where the underlying profit model is complete.
- [ ] Support separate views for:
  - best immediate profit improvement
  - best payback
  - best zero/low-cost action
  - required unlock path
  - long-term maxing path
- [ ] Add progression/budget candidate paths instead of modeling only the final endgame state.
- [ ] Surface confidence, missing-data blockers and data freshness on recommendations.
- [ ] Make the Dashboard/Focus-on-Next area consume this engine instead of maintaining separate recommendation logic.

References: docs/PRODUCT_SPEC.md recommendation engine and planner sections.

## P1 — Complete automatic profit engine

Chat 8 adds Dashboard Coins/hour, but the repository still needs verified end-to-end economics before automatic profit claims are complete.

- [ ] Finish exact current drop/output models for all 13 Garden crops.
- [ ] Finish Rare Crop and RNG expected-value tables where current mechanics can be verified.
- [ ] Finish Pest spawn-rate/type-distribution models.
- [ ] Finish relevant Pest normal-drop and RNG-drop expected values.
- [ ] Model Pest handling downtime/opportunity cost instead of adding Pest revenue on top of uninterrupted crop farming.
- [ ] Model recurring consumable/spray/buff costs where applicable.
- [ ] Verify Farming Fortune, Crop Fortune, Pest Fortune, Overbloom and Pest Overbloom application order per stream.
- [ ] Model all relevant crop transformations and valid NPC/Bazaar/AH sale routes.
- [ ] Establish evidence-based sustained throughput assumptions by crop/farm design, separate from the mechanical cap.
- [ ] Keep every incomplete stream explicitly incomplete rather than coercing unknown data to zero.

Reference: docs/MATH_MODEL.md, especially "Remaining data backlog for complete automatic profit estimates".

## P1 — Garden, Greenhouse and Composter economics

No parallel chat owns the deeper Garden economy.

- [ ] Complete Greenhouse production inputs that are still intentionally unknown:
  - base harvest quantities
  - growth duration
  - watering requirements
  - mutation spread behavior
  - decay behavior/boundaries
  - maintenance/upkeep
  - slot/layout opportunity cost
  - mutation/base-crop value
- [ ] Build Greenhouse Coins/hour only after the required inputs above are verified.
- [ ] Model Sowdust/Greenhouse progression as actions with costs, gates and time.
- [ ] Add Composter economics/progression where current API/profile data supports it.
- [ ] Connect Garden progression gates to the recommendation engine rather than leaving them as isolated information.

Reference: docs/MATH_MODEL.md and docs/PROFILE_DATA_MATRIX.md.

## P1 — Effects, permanent bonuses, Garden Chips and Hypercharge

The desired navigation contains an Effects area, but the ten current chats do not own the complete effects model.

- [ ] Verify and model Garden Chips and their levels.
- [ ] Verify Hypercharge state/level and exactly which temporary sources it affects.
- [ ] Verify God Potion and relevant mixin state/durations/interactions.
- [ ] Verify current temporary Pesthunter Phillip buff handling.
- [ ] Verify permanent consumables/account bonuses that affect farming, including whether they are API-visible, safely derivable or manual-only.
- [ ] Verify Garden day/night state for conditional effects/shards.
- [ ] Verify Chocolate Factory farming bonuses if currently relevant.
- [ ] Keep mutually exclusive and temporary effects scoped to the correct setup/activity/time window.
- [ ] Expose only effects that have a verified mechanic and source.

## P1 — Remaining profile/API automation

Auto-Fill improves current equipment import, but several account fields remain only AUTO_CANDIDATE in the profile data matrix.

- [ ] Verify the current API path/semantics for Anita Extra Farming Fortune.
- [ ] Verify Garden Bestiary Farming Fortune beyond the Brown Bandana-specific Pest tier sum.
- [ ] Verify Greenhouse Mutation Analysis rewards.
- [ ] Verify exportable crop items/permanent crop bonuses.
- [ ] Verify tool counters/levels whose current NBT representation is still uncertain.
- [ ] Define safe handling for account/world inventory that Hypixel does not expose.
- [ ] For every remaining field, explicitly classify it as AUTO, DERIVED, MANUAL, HIDDEN or UNKNOWN.
- [ ] Never infer consumed permanent effects from historical item ownership alone.

Reference: docs/PROFILE_DATA_MATRIX.md.

## P1 — Jacob's Contest completion

A score model exists, but the complete contest decision/economics path is still separate work.

- [ ] Add a current contest schedule source/adapter if a reliable source is available.
- [ ] Add personal-best/history input through an authoritative source, external adapter or explicit manual entry; do not invent an API field.
- [ ] Project crop-specific contest score from the verified farming-output model.
- [ ] Model contest-only setup swaps and buffs.
- [ ] Model medal/ticket/reward value when the required bracket/context data is available.
- [ ] Model opportunity cost versus normal farming.
- [ ] Model progression unlocks that require contest participation/rewards.
- [ ] Keep percentile/medal prediction unknown when the live participant distribution is unavailable.

Reference: docs/PRODUCT_SPEC.md contest modeling section and docs/PROFILE_DATA_MATRIX.md.

## P2 — Farming setup value / net worth

Chat 3 owns central prices; a complete account/setup valuation layer is a separate consumer of those prices.

- [ ] Calculate current farming setup **replacement value**.
- [ ] Calculate **liquidation value** only for assets that can actually be sold/recovered.
- [ ] Keep consumed upgrades and account-bound progression out of fabricated resale value.
- [ ] De-duplicate the same physical item when it is reused by multiple setup presets.
- [ ] Include priced installed upgrades without treating them all as recoverable.
- [ ] Surface incomplete valuation when ownership or a required market route is unknown.
- [ ] Document API blind spots such as items stored only in non-exposed Garden/island world containers.

Reference: docs/MATH_MODEL.md setup value section.

## P2 — Research/data completeness and freshness

- [ ] Re-run the farming model audit after the ten parallel chats modify research/data files.
- [ ] Ensure every newly active non-trivial mechanic has sources and a meaningful lastVerified date.
- [ ] Compare verification dates against docs/FARMING_HISTORY.md; data older than the newest relevant game change must be treated as stale.
- [ ] Remove/replace retired or invalid source URLs rather than preserving false confidence.
- [ ] Ensure announced/Alpha-only content never affects live recommendations or Coins/hour.
- [ ] Keep research inputs and runtime data synchronized; do not copy constants into UI components.

## P2 — Numeric correctness and DOM idempotence audit

These are already recorded in the existing overnight queue and remain outside the ten feature chats.

- [ ] Audit the remaining Number(null) === 0 / empty-string-to-zero coercion family across calculation and strategy code.
- [ ] Preserve explicit numeric zero while keeping absent/unknown values as unknown.
- [ ] Perform the observer idempotence sweep required by docs/RENDER_FREEZE_SAFETY.md.
- [ ] Verify in a real browser that applying the same UI state twice converges to a no-op.
- [ ] Add regression tests for every defect found by these sweeps.

## P3 — Measured performance cleanup

Do not optimize without profiling.

- [ ] Replace repeated number-format construction with shared cached Intl.NumberFormat instances while preserving byte-identical output.
- [ ] Re-measure boot/render CPU after the formatter change; revert it if the measured win is not real.
- [ ] Re-profile the Tools page after the parallel Tool/Vacuum work has landed.
- [ ] Restructure Tools rendering only if the post-merge profile identifies a concrete hotspot; the current cost is diffuse and should not be chased blindly.
- [ ] Remove stale/superseded performance TODO entries once their replacement implementation is confirmed on main.

Reference: the "Overnight run — measured bug and performance work" section in tasks/todo.md.

## P3 — Optional backup quality-of-life

This is explicitly optional in the product specification.

- [ ] Add optional automatic/local backup support through the File System Access API where the browser supports it.
- [ ] Keep normal JSON export/import as the universal fallback.
- [ ] Never allow backup convenience features to include the user's Hypixel API key or bypass schema validation.

---

# Completion rule

A checkbox is closed only when the implementation, tests and current repository state prove it is closed. A parallel chat completing a related feature incidentally may close one of these items, but the item must be re-checked against the integrated main branch rather than assumed complete from a branch summary.

When all ten parallel chats are merged, this file should be triaged once against the actual integrated state. Delete items that were genuinely closed by those changes, split oversized items into implementation-sized tasks, and keep only evidence-backed remaining work.
