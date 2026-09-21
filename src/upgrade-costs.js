/**
 * Acquisition cost per ranked upgrade entry. GENERATED -- do not edit by hand.
 *
 * Regenerate with `npm run build:costs` after changing the price research or
 * the link table in `scripts/build-upgrade-costs.py`.
 *
 * Two rules hold throughout:
 *
 * - `unknown != 0`. An entry without a sourced price has `coins: null` and a
 *   `reason`. Zero would make an unpriced upgrade look free and win every
 *   ranking it appears in.
 * - Nothing is counted twice. Where several entries describe effects of one
 *   purchase, one carries the cost and the others carry `includedIn`.
 *
 * `unit` is 'coins' for things bought, 'time' for things earned, and null when
 * even that is not established.
 *
 * Every coin figure here is a research snapshot, not a live price. The cost
 * research states the policy itself: refresh live Bazaar prices before
 * producing a player-facing next-upgrade recommendation.
 */

/** 12 entries carry a sourced price; 2 more are covered by another entry. */
export const UPGRADE_COSTS = Object.freeze({
  "accessory-fermento-artifact": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "accessory-helianthus-relic": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "accessory-relic-of-power-perfect-peridot-effect": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "account-skill-farming-skill-level": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "account-upgrade-elizabeth-garden-farming-fortune": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "anita-extra-farming-fortune-perk": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "armor-enchant-pesterminator-vi-on-full-armor": {
    "coins": 16656228,
    "items": [
      "Pesterminator 6EndcapGuide",
      "Pesterminator 6EndcapGuide",
      "Pesterminator 6EndcapGuide",
      "Pesterminator 6EndcapGuide"
    ],
    "priceStatus": null,
    "sources": [
      "https://sky.coflnet.com"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "armor-enchant-sunset-v-day-overbloom": {
    "coins": 91091580,
    "items": [
      "Sunset 5",
      "Sunset 5",
      "Sunset 5",
      "Sunset 5"
    ],
    "priceStatus": null,
    "sources": [
      "https://sky.coflnet.com"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "armor-gem-perfect-peridot-on-full-armor": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "armor-helianthus-armor-base-stats": {
    "coins": 283439000,
    "confidence": "HIGH",
    "items": [
      "HELIANTHUS_HELMET",
      "HELIANTHUS_CHESTPLATE",
      "HELIANTHUS_LEGGINGS",
      "HELIANTHUS_BOOTS"
    ],
    "sources": [
      "https://skyah.net/item/HELIANTHUS_BOOTS",
      "https://skyah.net/item/HELIANTHUS_CHESTPLATE",
      "https://skyah.net/item/HELIANTHUS_HELMET",
      "https://skyah.net/item/HELIANTHUS_LEGGINGS"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "armor-helianthus-armor-bpc": {
    "coins": 0,
    "includedIn": "armor-helianthus-armor-base-stats",
    "reason": "the same purchase is already costed on the entry named in includedIn",
    "unit": "coins"
  },
  "armor-helianthus-feast-set-bonus": {
    "coins": 0,
    "includedIn": "armor-helianthus-armor-base-stats",
    "reason": "the same purchase is already costed on the entry named in includedIn",
    "unit": "coins"
  },
  "armor-reforge-mossy-on-full-armor": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-cricket-pest-fortune": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-dragonfly-garden-wisdom": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-earthworm-shard-formerly-termite": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-field-mouse-shard-pest-overbloom": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-firefly-or-lunar-moth-shard": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-galaxy-fish-shard": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-invisibug-fancy-visit": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-keeled-slug-bonus-pest-chance": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-mosquito-enchanted-farmer": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-moth-pest-cooldown": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-mudworm-visitor-bait": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "attribute-shard-rat-sprayonator-serendipity": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "buff-booster-cookie-farming-wisdom-contribution": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "chocolate-factory-chocolate-factory-cocoa-perk": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "chocolate-factory-refined-dark-cacao-permanent-bonus": {
    "coins": 1570763,
    "items": [
      "Refined Dark Cacao Truffle",
      "Refined Dark Cacao Truffle",
      "Refined Dark Cacao Truffle",
      "Refined Dark Cacao Truffle",
      "Refined Dark Cacao Truffle"
    ],
    "sources": [
      "https://sbstats.live/skyblock-bazaar"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "consumable-feast-burger-permanent-overbloom": {
    "coins": 43793138,
    "items": [
      "Feast Burger with a Side of Deepfries",
      "Feast Burger with a Side of Deepfries",
      "Feast Burger with a Side of Deepfries",
      "Feast Burger with a Side of Deepfries",
      "Feast Burger with a Side of Deepfries"
    ],
    "sources": [
      "https://sbstats.live/skyblock-bazaar"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "consumable-rosewater-flask-permanent-stacks": {
    "coins": 47529711,
    "items": [
      "Filled Rosewater Flask",
      "Filled Rosewater Flask",
      "Filled Rosewater Flask",
      "Filled Rosewater Flask",
      "Filled Rosewater Flask"
    ],
    "sources": [
      "https://sbstats.live/skyblock-bazaar"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "crop-progression-crop-upgrade-selected-crop": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "equipment-blossom-set-visitor-bonus": {
    "coins": 51046656,
    "confidence": "HIGH",
    "items": [
      "BLOSSOM_NECKLACE",
      "BLOSSOM_CLOAK",
      "BLOSSOM_BELT",
      "BLOSSOM_BRACELET"
    ],
    "sources": [
      "https://sky.coflnet.com/item/BLOSSOM_BRACELET",
      "https://skyah.net/item/BLOSSOM_BELT",
      "https://skyah.net/item/BLOSSOM_CLOAK",
      "https://skyah.net/item/BLOSSOM_NECKLACE"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "equipment-enchant-green-thumb-v-on-equipment": {
    "coins": 121556172,
    "items": [
      "Green Thumb 5",
      "Green Thumb 5",
      "Green Thumb 5",
      "Green Thumb 5"
    ],
    "priceStatus": null,
    "sources": [
      "https://sky.coflnet.com"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "equipment-reforge-rooted-on-full-equipment": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "equipment-reforge-thorny-on-full-mythic-equipment-ff": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "equipment-reforge-thorny-on-full-mythic-equipment-overbloom": {
    "coins": null,
    "reason": "shares one purchase with equipment-reforge-thorny-on-full-mythic-equipment-ff, which has no researched price either, so neither can be costed yet",
    "unit": null
  },
  "equipment-zorro-s-cape-contest-swap": {
    "coins": 2400000,
    "confidence": "HIGH",
    "items": [
      "ZORROS_CAPE"
    ],
    "sources": [
      "https://skyah.net/item/ZORROS_CAPE"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "garden-chip-cropshot-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-evergreen-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-hypercharge-chip-next-level": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-mechamind-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-overdrive-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-quickdraw-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-rarefinder-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-sowledge-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-synthesis-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-chip-vermin-vaporizer-chip": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "garden-garden-plots-unlocked": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "garden-pest-garden-bestiary-ff": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "greenhouse-mutation-analysis-rewards": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "harvest-feast-feast-crashers-iii": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "harvest-feast-fortunate-feasting-v": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "harvest-feast-grand-feast-rare-crop-bonus": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "jacob-accessory-anita-accessory-crop-bonus": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "jacob-personal-best-perk-selected-crop": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "mixin-celestial-mason-jar": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "mixin-celestial-mason-jar-wisdom": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "mixin-melon-juice-mixin": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "permanent-crop-item-exportable-item-selected-crop": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "pest-pesthunter-accessory-bpc-setup": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "pet-item-green-bandana": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "pet-item-lucky-clover-poignant-lucky-clover": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "pet-orchid-mantis-intelligent-specimen": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "pet-rabbit-xp-pet-switch": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "pet-switch-to-best-farming-pet": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "temporary-atmospheric-filter-spring": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "temporary-buff-pesthunter-phillip-buff": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "temporary-buff-refined-dark-cacao-truffle-temporary-stack": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "temporary-chocolate-century-cake": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "temporary-harvest-harbinger-v": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "temporary-magic-8-ball-ff-roll": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-enchant-cultivating-x": {
    "coins": 4469104,
    "items": [
      "Cultivating 1"
    ],
    "priceStatus": "STALE_FALLBACK_SNAPSHOT",
    "sources": [
      "https://sky.coflnet.com"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "tool-enchant-dedication": {
    "coins": 52832483,
    "items": [
      "Dedication 4"
    ],
    "priceStatus": null,
    "sources": [
      "https://sky.coflnet.com"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "tool-enchant-harvesting-vi": {
    "coins": 2055320,
    "items": [
      "Harvesting 6"
    ],
    "priceStatus": "STALE_FALLBACK_SNAPSHOT",
    "sources": [
      "https://sky.coflnet.com"
    ],
    "unit": "coins",
    "verifiedAt": "2026-09-17"
  },
  "tool-enchant-turbo-crop": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-farming-for-dummies": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-gem-perfect-peridot-on-farming-tool": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-mk-ii": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-mk-iii": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-overclocker-3000": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-recombobulator-effect-on-tool-stats": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-reforge-blessed-reforge": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-reforge-bountiful-reforge": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  },
  "tool-tool-base-counter-fortune": {
    "coins": null,
    "reason": "earned rather than bought; no time or progression figure is researched yet",
    "unit": "time"
  },
  "vacuum-reforge-beady-pest-only-farming-fortune": {
    "coins": null,
    "reason": "no price research is linked to this entry yet",
    "unit": null
  }
});

/** The recorded cost for an entry, or null when none is researched. */
export function costForUpgrade(id) {
  const record = UPGRADE_COSTS[String(id || '')];
  return record && typeof record.coins === 'number' ? record : null;
}

/** Why an entry has no usable price. Null when it has one. */
export function missingCostReason(id) {
  const record = UPGRADE_COSTS[String(id || '')];
  if (!record) return 'this entry is not in the generated cost table';
  return typeof record.coins === 'number' ? null : (record.reason || 'no reason recorded');
}
