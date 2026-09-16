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
            archive.writestr('LICENSE', 'fixture license')
            # Filed in a folder, the way the real pack files everything. The
            # basename is the id the app looks the picture up with.
            archive.writestr(
                'assets/hypixel_skyblock/items/item/island/garden/test_item.json',
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

            # Keyed by the basename, not by the folder the pack files it in:
            # the app asks for TEST_ITEM, lower-cases it, and looks that up.
            self.assertIn('test_item', manifest['items'])
            self.assertNotIn('island/garden/test_item', manifest['items'])
            item = manifest['items']['test_item']
            self.assertEqual(item['texture'], 'textures/item/test_texture.png')
            self.assertEqual(item['source'], 'island/garden/test_item')
            self.assertEqual(manifest['license'], 'LICENSE')
            self.assertTrue((output / item['texture']).is_file())

            # Only the pictures are shipped. The definitions and models are read
            # out of the archive to resolve them and then left behind, because
            # nothing reads them afterwards and they were most of the tree.
            self.assertFalse((output / 'items/item/island/garden/test_item.json').exists())
            self.assertFalse((output / 'models/item/test_model.json').exists())

            self.assertEqual((output / 'LICENSE').read_text('utf-8'), 'fixture license')
            self.assertFalse((root / 'outside.txt').exists())
            self.assertFalse((output / 'minecraft/textures/item/ignored.png').exists())

    def test_two_items_sharing_a_basename_are_dropped_not_guessed(self):
        # Five ids collide in the real pack. Picking one would show a picture
        # that might belong to the other item, so the id is dropped and recorded.
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / 'fixture.zip'
            with zipfile.ZipFile(zip_path, 'w') as archive:
                archive.writestr('LICENSE', 'fixture license')
                for folder, texture in (('here', 'one'), ('there', 'two')):
                    archive.writestr(
                        f'assets/hypixel_skyblock/items/item/{folder}/clash.json',
                        json.dumps({'model': {'model': f'hypixel_skyblock:item/{texture}'}}),
                    )
                    archive.writestr(
                        f'assets/hypixel_skyblock/models/item/{texture}.json',
                        json.dumps({'textures': {'layer0': f'hypixel_skyblock:item/{texture}'}}),
                    )
                    archive.writestr(f'assets/hypixel_skyblock/textures/item/{texture}.png', b'PNG')
                # One that does not clash, to show the rest still comes through.
                archive.writestr(
                    'assets/hypixel_skyblock/items/item/here/unique.json',
                    json.dumps({'model': {'model': 'hypixel_skyblock:item/one'}}),
                )

            with zipfile.ZipFile(zip_path) as archive:
                manifest = pack_sync.build_manifest(archive, {'id': 'SkyBlock', 'hash': 'f'})

            self.assertNotIn('clash', manifest['items'])
            self.assertEqual(manifest['ambiguous']['clash'], ['here/clash', 'there/clash'])
            self.assertIn('unique', manifest['items'])

    def test_definitions_sharing_one_texture_are_not_ambiguous(self):
        # Same picture from both, so there is nothing to get wrong.
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / 'fixture.zip'
            with zipfile.ZipFile(zip_path, 'w') as archive:
                archive.writestr('LICENSE', 'fixture license')
                for folder in ('here', 'there'):
                    archive.writestr(
                        f'assets/hypixel_skyblock/items/item/{folder}/same.json',
                        json.dumps({'model': {'model': 'hypixel_skyblock:item/shared'}}),
                    )
                archive.writestr(
                    'assets/hypixel_skyblock/models/item/shared.json',
                    json.dumps({'textures': {'layer0': 'hypixel_skyblock:item/shared'}}),
                )
                archive.writestr('assets/hypixel_skyblock/textures/item/shared.png', b'PNG')

            with zipfile.ZipFile(zip_path) as archive:
                manifest = pack_sync.build_manifest(archive, {'id': 'SkyBlock', 'hash': 'f'})

            self.assertIn('same', manifest['items'])
            self.assertEqual(manifest['ambiguous'], {})

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
        self.assertEqual(str(pack_sync.local_pack_path('LICENSE')), 'LICENSE')
        self.assertIsNone(pack_sync.local_pack_path('assets/hypixel_skyblock/../outside.txt'))
        self.assertIsNone(pack_sync.local_pack_path('assets/minecraft/a.png'))


if __name__ == '__main__':
    unittest.main()
