import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'sync-hypixel-pack.py'
spec = importlib.util.spec_from_file_location('pack_sync', SCRIPT)
pack_sync = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(pack_sync)


class ResourcePackSyncTests(unittest.TestCase):
    def make_zip(self, path):
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr(
                'assets/hypixel_skyblock/items/item/test_item.json',
                json.dumps({'model': {'model': 'hypixel_skyblock:item/test_model'}}),
            )
            archive.writestr(
                'assets/hypixel_skyblock/models/item/test_model.json',
                json.dumps({'textures': {'layer0': 'hypixel_skyblock:item/test_texture'}}),
            )
            archive.writestr('assets/hypixel_skyblock/textures/item/test_texture.png', b'PNG')
            archive.writestr('assets/minecraft/textures/item/ignored.png', b'NO')
            archive.writestr('../outside.txt', b'NO')

    def test_resolve_pack_uses_highest_valid_hypixel_format(self):
        payload = {
            'packs': [{
                'id': 'SkyBlock',
                'deployId': 'deploy',
                'lastUpdated': 123,
                'versions': [
                    {'packFormat': 75, 'hash': 'a', 'url': 'https://resourcepacks.hypixel.net/old.zip'},
                    {'packFormat': 88, 'hash': 'b', 'url': 'https://resourcepacks.hypixel.net/new.zip'},
                    {'packFormat': 999, 'hash': 'x', 'url': 'https://example.com/not-hypixel.zip'},
                ],
            }],
        }
        selected = pack_sync.resolve_pack(payload)
        self.assertEqual(selected['packFormat'], 88)
        self.assertEqual(selected['hash'], 'b')
        self.assertEqual(selected['url'], 'https://resourcepacks.hypixel.net/new.zip')

    def test_resolve_pack_rejects_only_third_party_versions(self):
        with self.assertRaises(RuntimeError):
            pack_sync.resolve_pack({
                'packs': [{'id': 'SkyBlock', 'versions': [
                    {'packFormat': 88, 'hash': 'x', 'url': 'https://example.com/pack.zip'},
                ]}],
            })

    def test_manifest_and_extracted_paths_use_same_local_root(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            zip_path = root / 'fixture.zip'
            output = root / 'out'
            self.make_zip(zip_path)
            pack = {'id': 'SkyBlock', 'hash': 'fixture', 'packFormat': 88}

            with zipfile.ZipFile(zip_path) as archive:
                manifest = pack_sync.build_manifest(archive, pack)
                pack_sync.extract_selected(archive, output)

            item = manifest['items']['test_item']
            self.assertEqual(item['definition'], 'items/item/test_item.json')
            self.assertEqual(item['texture'], 'textures/item/test_texture.png')
            self.assertTrue((output / item['definition']).is_file())
            self.assertTrue((output / item['texture']).is_file())
            self.assertTrue((output / 'models/item/test_model.json').is_file())
            self.assertFalse((root / 'outside.txt').exists())
            self.assertFalse((output / 'minecraft/textures/item/ignored.png').exists())

    def test_sha1_verification_rejects_mismatch(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'pack.zip'
            path.write_bytes(b'pack')
            actual = pack_sync.verify_sha1(path, None)
            self.assertEqual(len(actual), 40)
            with self.assertRaises(RuntimeError):
                pack_sync.verify_sha1(path, '0' * 40)

    def test_local_pack_path_rejects_escape_and_non_namespace(self):
        self.assertEqual(
            str(pack_sync.local_pack_path('assets/hypixel_skyblock/textures/item/a.png')),
            'textures/item/a.png',
        )
        self.assertIsNone(pack_sync.local_pack_path('assets/hypixel_skyblock/../outside.txt'))
        self.assertIsNone(pack_sync.local_pack_path('assets/minecraft/a.png'))


if __name__ == '__main__':
    unittest.main()
