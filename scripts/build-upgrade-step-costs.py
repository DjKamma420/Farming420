#!/usr/bin/env python3
"""Build the level/count-aware acquisition table used by the upgrade planner.

The older entry-level table answers whether research is linked at all. This
module answers the question the ranking actually asks: what does the *next*
level/count cost from the player's current state?

Run:
  python3 scripts/build-upgrade-step-costs.py
  python3 scripts/build-upgrade-step-costs.py --check
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "research"
OUTPUT = ROOT / "src" / "upgrade-step-costs.js"
DOC = ROOT / "docs" / "STEP_COST_COVERAGE.md"
ENCHANT_FILE = "enchantment-costs-2026-09-17.json"
SPECIAL_FILE = "special-farming-item-costs-2026-09-17.json"


def load(name):
    return json.loads((RESEARCH / name).read_text(encoding="utf-8"))


def upgrade_ids():
    source = (ROOT / "src" / "data.js").read_text(encoding="utf-8")
    block = source[source.index("export const UPGRADES = ["):]
    block = block[: block.index("\n];") + 3]
    return set(re.findall(r'"id": "([\w-]+)"', block))


def coin_step(coins, item, sources, verified_at, **extra):
    row = {
        "coins": round(coins),
        "items": [item],
        "sources": list(sources),
        "unit": "coins",
        "verifiedAt": verified_at,
    }
    row.update(extra)
    return row


def repeated_steps(count, coins, item, sources, verified_at):
    return {
        str(level): coin_step(coins, item, sources, verified_at)
        for level in range(1, count + 1)
    }


def build():
    enchant_data = load(ENCHANT_FILE)
    enchants = {entry["name"]: entry for entry in enchant_data["enchantments"]}
    special = load(SPECIAL_FILE)
    source_url = (special.get("market_method") or {}).get("source_url")
    verified_at = (special.get("meta") or {}).get("as_of")
    special_rows = {}
    for section in ("tool_and_vacuum_modifiers", "permanent_profile_consumables"):
        for row in special.get(section, []):
            if row.get("item"):
                special_rows[row["item"]] = row

    table = {}

    cultivating = enchants["Cultivating"]
    c_sources = cultivating.get("marketSources") or []
    c_verified = cultivating.get("lastVerified")
    c_first = cultivating["marketSnapshots"]["1"]
    c_steps = {
        "1": coin_step(
            c_first["averageCoins"], "Cultivating I", c_sources, c_verified,
            priceStatus=c_first.get("priceStatus"),
        )
    }
    roman = {2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"}
    for level in range(2, 11):
        threshold = cultivating["cropThresholds"][str(level)]
        c_steps[str(level)] = {
            "coins": None,
            "progressTarget": threshold,
            "progressUnit": "crop_count",
            "reason": f"Cultivating {roman[level]} is earned automatically at {threshold:,} crops; no additional book is bought",
            "unit": "time",
            "verifiedAt": c_verified,
        }
    table["tool-enchant-cultivating-x"] = {
        "sourceFile": f"research/{ENCHANT_FILE}",
        "steps": c_steps,
    }

    dedication = enchants["Dedication"]
    d_sources = dedication.get("marketSources") or []
    d_verified = dedication.get("lastVerified")
    d_snap = dedication["marketSnapshots"]
    level1 = d_snap["1"]["averageCoins"]
    cheapest_level2_book = min(d_snap["2"]["averageCoins"], level1 * 2)
    table["tool-enchant-dedication"] = {
        "sourceFile": f"research/{ENCHANT_FILE}",
        "steps": {
            "1": coin_step(level1, "Dedication I", d_sources, d_verified),
            "2": coin_step(level1, "one additional Dedication I book", d_sources, d_verified),
            "3": coin_step(cheapest_level2_book, "one Dedication II book or two Dedication I books", d_sources, d_verified),
            "4": coin_step(d_snap["4"]["averageCoins"], "Dedication IV", d_sources, d_verified),
        },
    }

    permanent_links = {
        "chocolate-factory-refined-dark-cacao-permanent-bonus": "Refined Dark Cacao Truffle",
        "consumable-rosewater-flask-permanent-stacks": "Filled Rosewater Flask",
        "consumable-feast-burger-permanent-overbloom": "Feast Burger with a Side of Deepfries",
    }
    for entry_id, item in permanent_links.items():
        row = special_rows[item]
        table[entry_id] = {
            "sourceFile": f"research/{SPECIAL_FILE}",
            "steps": repeated_steps(
                int(row["required_quantity"]), row["midpoint_reference_coins"], item,
                [source_url] if source_url else [], verified_at,
            ),
        }

    modifier_links = {
        "tool-farming-for-dummies": "Farming for Dummies",
        "tool-overclocker-3000": "Overclocker 3000",
        "tool-recombobulator-effect-on-tool-stats": "Recombobulator 3000",
    }
    for entry_id, item in modifier_links.items():
        row = special_rows[item]
        table[entry_id] = {
            "sourceFile": f"research/{SPECIAL_FILE}",
            "steps": repeated_steps(
                int(row["required_quantity"]), row["midpoint_reference_coins"], item,
                [source_url] if source_url else [], verified_at,
            ),
        }

    unknown = sorted(set(table) - upgrade_ids())
    if unknown:
        raise SystemExit("step-cost table names unknown upgrade ids: " + ", ".join(unknown))
    return table


def js_text(table):
    payload = json.dumps(table, indent=2, ensure_ascii=False, sort_keys=True)
    return "\n".join([
        "/**",
        " * Next-step acquisition costs for multi-level Farming420 upgrade rows.",
        " * GENERATED from the shipped cost research by",
        " * `scripts/build-upgrade-step-costs.py`. Do not edit by hand.",
        " *",
        " * `steps` is keyed by target level/count. A row may deliberately change",
        " * acquisition route between steps. `coins: null` never means free.",
        " */",
        "export const UPGRADE_STEP_COSTS = Object.freeze(" + payload + ");",
        "",
        "export function stepCostModelForUpgrade(id) {",
        "  return UPGRADE_STEP_COSTS[String(id || '')] || null;",
        "}",
        "",
        "export function stepCostForUpgrade(id, targetLevel) {",
        "  const model = stepCostModelForUpgrade(id);",
        "  if (!model) return null;",
        "  const level = Number(targetLevel);",
        "  if (!Number.isInteger(level) || level < 1) return null;",
        "  return model.steps?.[String(level)] || null;",
        "}",
        "",
    ])


def doc_text(table):
    mixed = []
    coin_only = []
    for entry_id, model in sorted(table.items()):
        units = {step.get("unit") for step in model["steps"].values()}
        (mixed if len(units) > 1 else coin_only).append((entry_id, model))
    lines = [
        "# Next-step cost coverage",
        "",
        "GENERATED by `scripts/build-upgrade-step-costs.py`. Do not edit by hand.",
        "",
        "The entry-level price table says whether research is linked. This table fixes",
        "the second question: what the **next** level/count costs from current progress.",
        "A full-stack or end-level market value must not be charged for every marginal step.",
        "",
        f"Step-aware entries: **{len(table)}**.",
        "",
        "| Entry id | Targets | Route |",
        "|---|---:|---|",
    ]
    for entry_id, model in sorted(table.items()):
        units = sorted({step.get("unit") for step in model["steps"].values()})
        route = "/".join("EARNED" if unit == "time" else "BUYABLE" for unit in units)
        lines.append(f"| `{entry_id}` | {len(model['steps'])} | {route} |")
    lines += [
        "",
        "Cultivating is intentionally mixed: level I is a purchased book; levels II-X",
        "are crop-count progression and therefore remain EARNED until measured grind",
        "time is supplied. Dedication uses incremental legal-book cost rather than",
        "charging the level-IV book for levels I-III.",
        "",
    ]
    return "\n".join(lines)


def parsed_existing_table():
    source = OUTPUT.read_text(encoding="utf-8")
    marker = "export const UPGRADE_STEP_COSTS = Object.freeze("
    start = source.index(marker) + len(marker)
    end = source.index(");", start)
    return json.loads(source[start:end])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    table = build()
    expected_doc = doc_text(table)
    if args.check:
        if parsed_existing_table() != table:
            raise SystemExit("src/upgrade-step-costs.js is stale; run npm run build:costs")
        if not DOC.exists() or DOC.read_text(encoding="utf-8") != expected_doc:
            raise SystemExit("docs/STEP_COST_COVERAGE.md is stale; run npm run build:costs")
        print(f"step-cost snapshot is current: {len(table)} entries")
        return
    OUTPUT.write_text(js_text(table), encoding="utf-8")
    DOC.write_text(expected_doc, encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)} and {DOC.relative_to(ROOT)}: {len(table)} entries")


if __name__ == "__main__":
    main()
