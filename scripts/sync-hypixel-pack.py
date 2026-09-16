#!/usr/bin/env python3
"""Synchronize Hypixel's official SkyBlock resource pack into local web assets.

The script intentionally resolves the current pack from Hypixel's public API on
 every run. It never hard-codes a deploy id or download URL. If the generated
manifest already carries the same pack SHA-1, no download is performed.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

PACKS_ENDPOINT = "https://api.hypixel.net/v2/resources/packs"
PACK_ID = "SkyBlock"
PACK_HOST = "resourcepacks.hypixel.net"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "hypixel-pack"
MANIFEST = OUTPUT / "manifest.json"
NAMESPACE = "assets/hypixel_skyblock/"
COPY_PREFIXES = (
    f"{NAMESPACE}items/item/",
    f"{NAMESPACE}models/item/",
    f"{NAMESPACE}textures/item/",
)


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Farming420-pack-sync/1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def resolve_pack(payload: dict) -> dict:
    packs = payload.get("packs") if isinstance(payload, dict) else None
    if not isinstance(packs, list):
        raise RuntimeError("Hypixel pack payload has no packs list")
    pack = next((entry for entry in packs if isinstance(entry, dict) and entry.get("id") == PACK_ID), None)
    if not pack:
        raise RuntimeError("Hypixel returned no SkyBlock resource pack")

    versions = []
    for version in pack.get("versions") or []:
        if not isinstance(version, dict):
            continue
        url = version.get("url")
        parsed = urllib.parse.urlparse(url) if isinstance(url, str) else None
        if not parsed or parsed.scheme != "https" or parsed.hostname != PACK_HOST:
            continue
        try:
            pack_format = int(version.get("packFormat"))
        except (TypeError, ValueError):
            continue
        versions.append({"packFormat": pack_format, "hash": version.get("hash"), "url": url})

    if not versions:
        raise RuntimeError("Hypixel returned no usable SkyBlock pack version")
    versions.sort(key=lambda item: item["packFormat"], reverse=True)
    selected = versions[0]
    return {
        "id": PACK_ID,
        "deployId": pack.get("deployId"),
        "lastUpdated": pack.get("lastUpdated"),
        **selected,
    }


def existing_hash() -> str | None:
    try:
        data = json.loads(MANIFEST.read_text("utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    value = data.get("pack", {}).get("hash")
    return value if isinstance(value, str) else None


def download(url: str, target: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "Farming420-pack-sync/1"})
    with urllib.request.urlopen(request, timeout=120) as response, target.open("wb") as handle:
        shutil.copyfileobj(response, handle)


def verify_sha1(path: Path, expected: str | None) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    actual = digest.hexdigest()
    if expected and actual.lower() != expected.lower():
        raise RuntimeError(f"Resource pack SHA-1 mismatch: expected {expected}, got {actual}")
    return actual


def safe_member(name: str) -> PurePosixPath | None:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        return None
    return path


def wanted(name: str) -> bool:
    return any(name.startswith(prefix) for prefix in COPY_PREFIXES)


def collect_namespaced_strings(value, out: set[str]) -> None:
    if isinstance(value, dict):
        for nested in value.values():
            collect_namespaced_strings(nested, out)
    elif isinstance(value, list):
        for nested in value:
            collect_namespaced_strings(nested, out)
    elif isinstance(value, str) and value.startswith("hypixel_skyblock:"):
        out.add(value.split(":", 1)[1])


def read_json_from_zip(archive: zipfile.ZipFile, path: str) -> dict | None:
    try:
        return json.loads(archive.read(path).decode("utf-8"))
    except (KeyError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def texture_from_definition(archive: zipfile.ZipFile, definition: dict) -> str | None:
    refs: set[str] = set()
    collect_namespaced_strings(definition, refs)
    checked: set[str] = set()

    while refs:
        ref = refs.pop()
        if ref in checked:
            continue
        checked.add(ref)

        candidates = []
        if ref.startswith("textures/"):
            candidates.append(f"{NAMESPACE}{ref}.png")
        else:
            candidates.append(f"{NAMESPACE}textures/{ref}.png")
            candidates.append(f"{NAMESPACE}textures/item/{ref}.png")
        for candidate in candidates:
            if candidate in archive.namelist():
                return candidate[len(NAMESPACE):]

        model_candidates = [
            f"{NAMESPACE}models/{ref}.json",
            f"{NAMESPACE}models/item/{ref}.json",
        ]
        for model_path in model_candidates:
            model = read_json_from_zip(archive, model_path)
            if model:
                collect_namespaced_strings(model, refs)
    return None


def build_manifest(archive: zipfile.ZipFile, pack: dict) -> dict:
    items = {}
    prefix = f"{NAMESPACE}items/item/"
    for name in archive.namelist():
        if not name.startswith(prefix) or not name.endswith(".json"):
            continue
        definition = read_json_from_zip(archive, name)
        if definition is None:
            continue
        relative = name[len(prefix):-5]
        texture = texture_from_definition(archive, definition)
        items[relative] = {
            "definition": f"items/item/{relative}.json",
            "texture": texture,
        }
    return {
        "schemaVersion": 1,
        "generatedBy": "scripts/sync-hypixel-pack.py",
        "pack": pack,
        "items": dict(sorted(items.items())),
    }


def extract_selected(archive: zipfile.ZipFile, target: Path) -> None:
    for name in archive.namelist():
        if not wanted(name):
            continue
        member = safe_member(name)
        if member is None or name.endswith("/"):
            continue
        relative = PurePosixPath(*member.parts[1:])  # strip top-level assets/
        destination = target / Path(*relative.parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(name) as source, destination.open("wb") as output:
            shutil.copyfileobj(source, output)


def main() -> int:
    pack = resolve_pack(fetch_json(PACKS_ENDPOINT))
    if existing_hash() == pack.get("hash") and MANIFEST.exists():
        print(f"Official SkyBlock pack is already current: {pack.get('hash')}")
        return 0

    with tempfile.TemporaryDirectory(prefix="farming420-pack-") as temp_dir:
        temp = Path(temp_dir)
        zip_path = temp / "skyblock.zip"
        stage = temp / "stage"
        download(pack["url"], zip_path)
        verify_sha1(zip_path, pack.get("hash"))

        with zipfile.ZipFile(zip_path) as archive:
            manifest = build_manifest(archive, pack)
            extract_selected(archive, stage)

        stage.mkdir(parents=True, exist_ok=True)
        (stage / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", "utf-8")

        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(stage), str(OUTPUT))

    print(f"Synced {len(manifest['items'])} official SkyBlock item definitions from {pack.get('hash')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
