/**
 * Next-step acquisition costs for multi-level Farming420 upgrade rows.
 * GENERATED from the shipped 2026-09-17 cost research by
 * `scripts/build-upgrade-step-costs.py`. Do not edit by hand.
 *
 * `steps` is keyed by the target level/count. A row may deliberately change
 * acquisition route between steps: Cultivating I is bought, while II-X are
 * earned from crop-count progression. `coins: null` never means free.
 */
export const UPGRADE_STEP_COSTS = Object.freeze({
  "chocolate-factory-refined-dark-cacao-permanent-bonus": {
    "sourceFile": "research/special-farming-item-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 314153, "items": ["Refined Dark Cacao Truffle"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": 314153, "items": ["Refined Dark Cacao Truffle"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "3": {"coins": 314153, "items": ["Refined Dark Cacao Truffle"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "4": {"coins": 314153, "items": ["Refined Dark Cacao Truffle"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "5": {"coins": 314153, "items": ["Refined Dark Cacao Truffle"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  },
  "consumable-feast-burger-permanent-overbloom": {
    "sourceFile": "research/special-farming-item-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 8758628, "items": ["Feast Burger with a Side of Deepfries"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": 8758628, "items": ["Feast Burger with a Side of Deepfries"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "3": {"coins": 8758628, "items": ["Feast Burger with a Side of Deepfries"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "4": {"coins": 8758628, "items": ["Feast Burger with a Side of Deepfries"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "5": {"coins": 8758628, "items": ["Feast Burger with a Side of Deepfries"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  },
  "consumable-rosewater-flask-permanent-stacks": {
    "sourceFile": "research/special-farming-item-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 9505942, "items": ["Filled Rosewater Flask"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": 9505942, "items": ["Filled Rosewater Flask"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "3": {"coins": 9505942, "items": ["Filled Rosewater Flask"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "4": {"coins": 9505942, "items": ["Filled Rosewater Flask"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "5": {"coins": 9505942, "items": ["Filled Rosewater Flask"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  },
  "tool-enchant-cultivating-x": {
    "sourceFile": "research/enchantment-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 4469104, "items": ["Cultivating I"], "priceStatus": "STALE_FALLBACK_SNAPSHOT", "sources": ["https://sky.coflnet.com"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": null, "progressTarget": 1000, "progressUnit": "crop_count", "reason": "Cultivating II is earned automatically at 1,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "3": {"coins": null, "progressTarget": 5000, "progressUnit": "crop_count", "reason": "Cultivating III is earned automatically at 5,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "4": {"coins": null, "progressTarget": 25000, "progressUnit": "crop_count", "reason": "Cultivating IV is earned automatically at 25,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "5": {"coins": null, "progressTarget": 100000, "progressUnit": "crop_count", "reason": "Cultivating V is earned automatically at 100,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "6": {"coins": null, "progressTarget": 250000, "progressUnit": "crop_count", "reason": "Cultivating VI is earned automatically at 250,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "7": {"coins": null, "progressTarget": 1000000, "progressUnit": "crop_count", "reason": "Cultivating VII is earned automatically at 1,000,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "8": {"coins": null, "progressTarget": 2500000, "progressUnit": "crop_count", "reason": "Cultivating VIII is earned automatically at 2,500,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "9": {"coins": null, "progressTarget": 10000000, "progressUnit": "crop_count", "reason": "Cultivating IX is earned automatically at 10,000,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"},
      "10": {"coins": null, "progressTarget": 25000000, "progressUnit": "crop_count", "reason": "Cultivating X is earned automatically at 25,000,000 crops; no additional book is bought", "unit": "time", "verifiedAt": "2026-09-17"}
    }
  },
  "tool-enchant-dedication": {
    "sourceFile": "research/enchantment-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 400699, "items": ["Dedication I"], "sources": ["https://sky.coflnet.com"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": 400699, "items": ["one additional Dedication I book"], "sources": ["https://sky.coflnet.com"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "3": {"coins": 801398, "items": ["one Dedication II book or two Dedication I books"], "sources": ["https://sky.coflnet.com"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "4": {"coins": 52832483, "items": ["Dedication IV"], "sources": ["https://sky.coflnet.com"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  },
  "tool-farming-for-dummies": {
    "sourceFile": "research/special-farming-item-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 291201, "items": ["Farming for Dummies"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": 291201, "items": ["Farming for Dummies"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "3": {"coins": 291201, "items": ["Farming for Dummies"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "4": {"coins": 291201, "items": ["Farming for Dummies"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "5": {"coins": 291201, "items": ["Farming for Dummies"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  },
  "tool-overclocker-3000": {
    "sourceFile": "research/special-farming-item-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "2": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "3": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "4": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "5": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "6": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "7": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "8": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "9": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"},
      "10": {"coins": 244434, "items": ["Overclocker 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  },
  "tool-recombobulator-effect-on-tool-stats": {
    "sourceFile": "research/special-farming-item-costs-2026-09-17.json",
    "steps": {
      "1": {"coins": 10084157, "items": ["Recombobulator 3000"], "sources": ["https://sbstats.live/skyblock-bazaar"], "unit": "coins", "verifiedAt": "2026-09-17"}
    }
  }
});

export function stepCostModelForUpgrade(id) {
  return UPGRADE_STEP_COSTS[String(id || '')] || null;
}

export function stepCostForUpgrade(id, targetLevel) {
  const model = stepCostModelForUpgrade(id);
  if (!model) return null;
  const level = Number(targetLevel);
  if (!Number.isInteger(level) || level < 1) return null;
  return model.steps?.[String(level)] || null;
}
