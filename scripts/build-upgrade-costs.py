#!/usr/bin/env python3
"""Generate `src/upgrade-costs.js` from the shipped price research.

The planner ranks entries from `src/data.js`. Those entries carry no cost
field, and the price research is keyed by SkyBlock item id, so nothing could
get from a ranked entry to a price without a human reading a document. This
script is that link, expressed as data.

Two rules it follows, both from the repository's own research contract:

* `unknown != 0`. An entry with no sourced price is emitted with `coins: null`
  and a reason. It is never emitted as zero, because zero would make an
  unpriced upgrade look free and win every ranking it appears in.
* Never count one purchase twice. Several entries describe effects of the same
  buy -- the Helianthus set's base stats, its Feast set bonus and its BPC value
  are the same four pieces -- so exactly one entry carries the cost and the
  others point at it. `special-farming-item-costs-2026-09-17.json` warns about
  this directly under `optimizer_integration.do_not_double_count`.

Run: python3 scripts/build-upgrade-costs.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "research"
OUTPUT = ROOT / "src" / "upgrade-costs.js"

ARMOR_FILE = "armor-equipment-average-costs-2026-09-17.json"
EQUIPMENT_FILE = "equipment-average-costs-2026-09-17.json"
ENCHANT_FILE = "enchantment-costs-2026-09-17.json"
SPECIAL_FILE = "special-farming-item-costs-2026-09-17.json"

CONFIDENCE_ORDER = ["LOW", "MEDIUM_LOW", "MEDIUM", "HIGH"]


def first_of(source, *names):
    """The first of these keys that carries a value, whatever its casing."""
    for name in names:
        value = source.get(name)
        if value:
            return value
    lowered = {str(key).lower().replace("_", ""): value for key, value in source.items()}
    for name in names:
        value = lowered.get(name.lower().replace("_", ""))
        if value:
            return value
    return None


def load(name):
    return json.loads((RESEARCH / name).read_text(encoding="utf-8"))


def item_records():
    """Every priced item, by SkyBlock id.

    The equipment block appears in two research files with identical values,
    one of them without a confidence rating. The record carrying a confidence
    wins, so the output never depends on which file is read first.
    """
    data = load(ARMOR_FILE)
    pieces = [piece for group in data["armorProgression"] for piece in group["pieces"]]
    pieces += data.get("standaloneFarmingArmor", [])
    pieces += data.get("equipment", [])
    pieces += load(EQUIPMENT_FILE).get("equipment", [])
    out = {}
    for piece in pieces:
        key = piece.get("skyblockId")
        if not key:
            continue
        if key in out and not piece.get("confidence"):
            continue
        out[key] = piece
    return out


def enchant_records():
    return {entry["name"]: entry for entry in load(ENCHANT_FILE)["enchantments"]}


def consumable_records():
    """Permanent consumables, plus the file-level provenance they rely on.

    These records carry no per-item source or date; the market method and the
    as-of date are stated once for the whole file, so they are attached here
    rather than left off the output.
    """
    data = load(SPECIAL_FILE)
    return {
        "items": {
            entry["item"]: entry
            for entry in data.get("permanent_profile_consumables", [])
            if entry.get("item")
        },
        "source": (data.get("market_method") or {}).get("source_url"),
        # The research files are not consistent about casing: this one says
        # `as_of`, the armour file says `lastVerified`. Reading one spelling
        # silently drops the date, which is how three priced entries shipped
        # without provenance until a test asked for it.
        "asOf": first_of(data.get("meta") or {}, "as_of", "asOf", "lastVerified", "last_verified"),
    }


# --- the link itself -------------------------------------------------------
#
# Each line is a claim that this ranked entry costs those items. Where the
# shipped research supports no such claim there is no line, and the generated
# module records the entry as unpriced with a reason rather than guessing.

ITEM_LINKS = {
    "armor-helianthus-armor-base-stats": [
        "HELIANTHUS_HELMET",
        "HELIANTHUS_CHESTPLATE",
        "HELIANTHUS_LEGGINGS",
        "HELIANTHUS_BOOTS",
    ],
    "equipment-blossom-set-visitor-bonus": [
        "BLOSSOM_NECKLACE",
        "BLOSSOM_CLOAK",
        "BLOSSOM_BELT",
        "BLOSSOM_BRACELET",
    ],
    "equipment-zorro-s-cape-contest-swap": ["ZORROS_CAPE"],
}

# The same purchase, a different effect. The cost lives on the entry named.
INCLUDED_IN = {
    "armor-helianthus-feast-set-bonus": "armor-helianthus-armor-base-stats",
    "armor-helianthus-armor-bpc": "armor-helianthus-armor-base-stats",
    "equipment-reforge-thorny-on-full-mythic-equipment-overbloom":
        "equipment-reforge-thorny-on-full-mythic-equipment-ff",
}

# (enchantment name, level key, copies this entry needs)
ENCHANT_LINKS = {
    "tool-enchant-harvesting-vi": ("Harvesting", "6", 1),
    "tool-enchant-cultivating-x": ("Cultivating", "1", 1),
    "tool-enchant-dedication": ("Dedication", "4", 1),
    "armor-enchant-pesterminator-vi-on-full-armor": ("Pesterminator", "6EndcapGuide", 4),
    "armor-enchant-sunset-v-day-overbloom": ("Sunset", "5", 4),
    "equipment-enchant-green-thumb-v-on-equipment": ("Green Thumb", "5", 4),
}

CONSUMABLE_LINKS = {
    "chocolate-factory-refined-dark-cacao-permanent-bonus": "Refined Dark Cacao Truffle",
    "consumable-rosewater-flask-permanent-stacks": "Filled Rosewater Flask",
    "consumable-feast-burger-permanent-overbloom": "Feast Burger with a Side of Deepfries",
}

# Earned rather than bought. A coin figure here would be invented; the useful
# number is time or progression, which the research does not carry yet. Listed
# so they stay distinguishable from an oversight.
TIME_UNIT_IDS = frozenset({
    "account-skill-farming-skill-level",
    "account-upgrade-elizabeth-garden-farming-fortune",
    "anita-extra-farming-fortune-perk",
    "garden-garden-plots-unlocked",
    "garden-pest-garden-bestiary-ff",
    "greenhouse-mutation-analysis-rewards",
    "jacob-personal-best-perk-selected-crop",
    "crop-progression-crop-upgrade-selected-crop",
    "chocolate-factory-chocolate-factory-cocoa-perk",
    "tool-tool-base-counter-fortune",
})


def upgrade_entries():
    source = (ROOT / "src" / "data.js").read_text(encoding="utf-8")
    block = source[source.index("export const UPGRADES = ["):]
    block = block[: block.index("\n];") + 3]
    ids = re.findall(r'"id": "([\w-]+)"', block)
    names = re.findall(r'"name": "([^"]+)"', block)
    sections = re.findall(r'"section": "([\w-]+)"', block)
    if not (len(ids) == len(names) == len(sections)):
        raise SystemExit("UPGRADES entries do not have one id, name and section each")
    return [{"id": i, "name": n, "section": s} for i, n, s in zip(ids, names, sections)]


def weakest_confidence(values):
    known = [value for value in values if value in CONFIDENCE_ORDER]
    if not known:
        return None
    return min(known, key=CONFIDENCE_ORDER.index)


def sum_items(keys, items):
    total = 0
    sources, confidences, verified = [], [], []
    for key in keys:
        record = items.get(key)
        if record is None:
            return {"coins": None, "reason": "no research record for " + key}
        coins = record.get("averageCostCoins")
        if not isinstance(coins, (int, float)):
            status = record.get("status") or "no average price recorded"
            return {"coins": None, "reason": key + ": " + status}
        total += coins
        if record.get("source"):
            sources.append(record["source"])
        if record.get("confidence"):
            confidences.append(record["confidence"])
        if record.get("lastVerified"):
            verified.append(record["lastVerified"])
    return {
        "coins": round(total),
        "items": list(keys),
        "sources": sorted(set(sources)),
        "confidence": weakest_confidence(confidences),
        "verifiedAt": min(verified) if verified else None,
    }


def enchant_cost(name, level, copies, records):
    record = records.get(name)
    if record is None:
        return {"coins": None, "reason": "no research record for the " + name + " enchantment"}
    snapshot = (record.get("marketSnapshots") or {}).get(str(level))
    if not snapshot or not isinstance(snapshot.get("averageCoins"), (int, float)):
        return {"coins": None, "reason": name + " level " + str(level) + " has no recorded market snapshot"}
    return {
        "coins": round(snapshot["averageCoins"] * copies),
        "items": [name + " " + str(level)] * copies,
        "sources": sorted(set(record.get("marketSources") or [])),
        "priceStatus": snapshot.get("priceStatus"),
        "verifiedAt": record.get("lastVerified"),
    }


def consumable_cost(item, bundle):
    record = bundle["items"].get(item)
    if record is None:
        return {"coins": None, "reason": "no research record for " + item}
    # The total for the quantity the effect needs, not one unit: several of
    # these are stacked consumables where a single unit buys nothing.
    coins = record.get("midpoint_total_coins")
    if not isinstance(coins, (int, float)):
        coins = record.get("midpoint_reference_coins")
    if not isinstance(coins, (int, float)):
        return {"coins": None, "reason": item + " has no midpoint price recorded"}
    quantity = record.get("required_quantity")
    return {
        "coins": round(coins),
        "items": [item] * (quantity if isinstance(quantity, int) and quantity > 0 else 1),
        "sources": [bundle["source"]] if bundle["source"] else [],
        "verifiedAt": bundle["asOf"],
    }


def build():
    items = item_records()
    enchants = enchant_records()
    consumables = consumable_records()
    known = {entry["id"] for entry in upgrade_entries()}
    for group in (ITEM_LINKS, INCLUDED_IN, ENCHANT_LINKS, CONSUMABLE_LINKS):
        unknown = sorted(set(group) - known)
        if unknown:
            raise SystemExit("link table names ids that src/data.js does not have: " + ", ".join(unknown))
    unknown_time = sorted(TIME_UNIT_IDS - known)
    if unknown_time:
        raise SystemExit("time-unit list names unknown ids: " + ", ".join(unknown_time))
    for target in sorted(set(INCLUDED_IN.values())):
        if target not in ITEM_LINKS and target not in known:
            raise SystemExit("includedIn points at an unknown entry: " + target)

    table = {}
    for entry in upgrade_entries():
        eid = entry["id"]
        if eid in INCLUDED_IN:
            # Resolved below: deferring to an entry that turns out to be
            # unpriced would lose the cost entirely rather than share it.
            table[eid] = {"unit": "coins", "coins": 0, "includedIn": INCLUDED_IN[eid],
                          "reason": "the same purchase is already costed on the entry named in includedIn"}
        elif eid in ITEM_LINKS:
            table[eid] = dict({"unit": "coins"}, **sum_items(ITEM_LINKS[eid], items))
        elif eid in ENCHANT_LINKS:
            name, level, copies = ENCHANT_LINKS[eid]
            table[eid] = dict({"unit": "coins"}, **enchant_cost(name, level, copies, enchants))
        elif eid in CONSUMABLE_LINKS:
            table[eid] = dict({"unit": "coins"}, **consumable_cost(CONSUMABLE_LINKS[eid], consumables))
        elif eid in TIME_UNIT_IDS:
            table[eid] = {
                "unit": "time",
                "coins": None,
                "reason": "earned rather than bought; no time or progression figure is researched yet",
            }
        else:
            table[eid] = {
                "unit": None,
                "coins": None,
                "reason": "no price research is linked to this entry yet",
            }

    # A deferral is only meaningful when the target carries a real cost.
    for eid, target in INCLUDED_IN.items():
        if isinstance(table.get(target, {}).get("coins"), (int, float)) and table[target]["coins"] > 0:
            continue
        table[eid] = {
            "unit": None,
            "coins": None,
            "reason": "shares one purchase with " + target
            + ", which has no researched price either, so neither can be costed yet",
        }
    return table


HEADER_LINES = [
    "/**",
    " * Acquisition cost per ranked upgrade entry. GENERATED -- do not edit by hand.",
    " *",
    " * Regenerate with `npm run build:costs` after changing the price research or",
    " * the link table in `scripts/build-upgrade-costs.py`.",
    " *",
    " * Two rules hold throughout:",
    " *",
    " * - `unknown != 0`. An entry without a sourced price has `coins: null` and a",
    " *   `reason`. Zero would make an unpriced upgrade look free and win every",
    " *   ranking it appears in.",
    " * - Nothing is counted twice. Where several entries describe effects of one",
    " *   purchase, one carries the cost and the others carry `includedIn`.",
    " *",
    " * `unit` is 'coins' for things bought, 'time' for things earned, and null when",
    " * even that is not established.",
    " *",
    " * Every coin figure here is a research snapshot, not a live price. The cost",
    " * research states the policy itself: refresh live Bazaar prices before",
    " * producing a player-facing next-upgrade recommendation.",
    " */",
]

TAIL_LINES = [
    "",
    "/** The recorded cost for an entry, or null when none is researched. */",
    "export function costForUpgrade(id) {",
    "  const record = UPGRADE_COSTS[String(id || '')];",
    "  return record && typeof record.coins === 'number' ? record : null;",
    "}",
    "",
    "/** Why an entry has no usable price. Null when it has one. */",
    "export function missingCostReason(id) {",
    "  const record = UPGRADE_COSTS[String(id || '')];",
    "  if (!record) return 'this entry is not in the generated cost table';",
    "  return typeof record.coins === 'number' ? null : (record.reason || 'no reason recorded');",
    "}",
]


SECTION_TITLES = {
    "account": "Account layer",
    "crops": "Crop layer",
    "tools": "Tool layer",
    "chips": "Garden Chips",
    "gear": "Armor & Equipment",
    "pets": "Pets",
    "shards": "Attribute Shards",
    "buffs": "Buffs & Consumables",
    "pests": "Pests",
}

DOC = ROOT / "docs" / "ITEM_PRICE_COVERAGE.md"


def write_document(table):
    """The readable half of the same data.

    Generated from the cost table rather than from name matching, so a line
    here is a statement about the link that actually exists, not a guess from
    comparing two strings.
    """
    entries = upgrade_entries()
    priced, included, timed, unlinked = [], [], [], []
    for entry in entries:
        record = table[entry["id"]]
        if record.get("includedIn"):
            included.append((entry, record))
        elif isinstance(record.get("coins"), (int, float)):
            priced.append((entry, record))
        elif record.get("unit") == "time":
            timed.append((entry, record))
        else:
            unlinked.append((entry, record))

    lines = ["# Item price coverage", ""]
    lines.append("GENERATED by `scripts/build-upgrade-costs.py`. Do not edit by hand.")
    lines.append("")
    lines.append("Every entry the upgrade planner can rank, and whether a price can be")
    lines.append("reached from it by code. Generated from `src/upgrade-costs.js`, which is")
    lines.append("generated from the shipped research, so a line here describes the link that")
    lines.append("exists rather than a guess from comparing two names.")
    lines.append("")
    lines.append("| | Entries |")
    lines.append("|---|---|")
    lines.append("| Priced from research | " + str(len(priced)) + " |")
    lines.append("| Covered by another entry | " + str(len(included)) + " |")
    lines.append("| Earned, not bought (needs a time figure) | " + str(len(timed)) + " |")
    lines.append("| No price research linked yet | " + str(len(unlinked)) + " |")
    lines.append("| **Total** | **" + str(len(entries)) + "** |")
    lines.append("")
    lines.append("`unknown != 0` holds: an unpriced entry carries `coins: null` and a reason,")
    lines.append("never zero, because zero would make it look free and win every ranking.")
    lines.append("")

    lines.append("## Priced")
    lines.append("")
    lines.append("| Entry | Coins | Confidence | Note |")
    lines.append("|---|---:|---|---|")
    for entry, record in sorted(priced, key=lambda row: -row[1]["coins"]):
        note = record.get("priceStatus") or ""
        lines.append(
            "| " + entry["name"] + " | " + format(record["coins"], ",")
            + " | " + (record.get("confidence") or "-") + " | " + note + " |"
        )
    lines.append("")

    if included:
        lines.append("## Covered by another entry")
        lines.append("")
        lines.append("One purchase, several effects. Costing each of these separately would")
        lines.append("count the same coins more than once.")
        lines.append("")
        lines.append("| Entry | Cost lives on |")
        lines.append("|---|---|")
        for entry, record in included:
            lines.append("| " + entry["name"] + " | `" + record["includedIn"] + "` |")
        lines.append("")

    if timed:
        lines.append("## Earned rather than bought")
        lines.append("")
        lines.append("A coin figure would be invented here. The useful number is time or")
        lines.append("progression, and the research does not carry one yet.")
        lines.append("")
        lines.append("| Entry | id |")
        lines.append("|---|---|")
        for entry, _ in timed:
            lines.append("| " + entry["name"] + " | `" + entry["id"] + "` |")
        lines.append("")

    lines.append("## No price research linked yet")
    lines.append("")
    lines.append("This is the work list. A line means no link exists, which is not the same")
    lines.append("as no research existing: a cost documented under a set name, a reforge")
    lines.append("stone or a gemstone tier needs a line in the link table in")
    lines.append("`scripts/build-upgrade-costs.py` before code can reach it.")
    lines.append("")
    by_section = {}
    for entry, _ in unlinked:
        by_section.setdefault(entry["section"], []).append(entry)
    for section, title in SECTION_TITLES.items():
        rows = by_section.get(section)
        if not rows:
            continue
        lines.append("### " + title + " (" + str(len(rows)) + ")")
        lines.append("")
        lines.append("| Entry | id |")
        lines.append("|---|---|")
        for entry in rows:
            lines.append("| " + entry["name"] + " | `" + entry["id"] + "` |")
        lines.append("")

    DOC.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(priced), len(included), len(timed), len(unlinked)


def main():
    table = build()
    priced = sum(
        1 for value in table.values()
        if isinstance(value.get("coins"), (int, float)) and value["coins"] > 0
    )
    included = sum(1 for value in table.values() if value.get("includedIn"))
    body = json.dumps(table, indent=2, ensure_ascii=False, sort_keys=True)
    lines = list(HEADER_LINES)
    lines.append("")
    lines.append(
        "/** " + str(priced) + " entries carry a sourced price; "
        + str(included) + " more are covered by another entry. */"
    )
    lines.append("export const UPGRADE_COSTS = Object.freeze(" + body + ");")
    lines += TAIL_LINES
    OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    counts = write_document(table)
    print(
        "wrote " + str(OUTPUT.relative_to(ROOT)) + ": " + str(len(table))
        + " entries, " + str(priced) + " priced, " + str(included) + " included elsewhere"
    )
    print(
        "wrote " + str(DOC.relative_to(ROOT)) + ": "
        + str(counts[0]) + " priced, " + str(counts[1]) + " covered, "
        + str(counts[2]) + " earned, " + str(counts[3]) + " unlinked"
    )


if __name__ == "__main__":
    main()
