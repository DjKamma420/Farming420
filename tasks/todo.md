# Farming420 — Foundation gap closure

`README.md` development order step 1 and `AGENTS.md` still list the persistence
foundation as unfinished. This is the concrete gap list found in the repository
and what is being done about it.

## Findings

| # | Gap | Evidence |
|---|-----|----------|
| 1 | No tests exist anywhere in the repository | `AGENTS.md` rule 9 requires migrations **and tests**; `docs/PRODUCT_SPEC.md` "Definition of done" requires tested boundary cases; `README.md` requires migration tests before raising the schema version |
| 2 | No migration layer | `DATA_SCHEMA_VERSION` is written but never used to migrate. `migrateScopedProgress()` lives inside `src/app.js`, runs unconditionally on every load and cannot be imported or tested |
| 3 | Restoring an old backup does not migrate it | `src/foundation.js` writes the backup state verbatim, so pre-migration data stays in old shape |
| 4 | The sidebar Export/Import bypasses the backup contract | `src/app.js` writes an unversioned profile-only file and imports it with no validation, contradicting "backups contain format and schema versions" and "restore validates the backup" |
| 5 | Settings is unreachable on mobile | `src/styles.css` hides `.sidebar` below 780px and `src/foundation.js` only mounts the Settings entry inside the sidebar |
| 6 | Hypixel adapters are untestable | `src/hypixel-import.js` mixes payload parsing with `localStorage` writes |
| 7 | CI validates only 3 of 6 JS modules and runs no tests | `.github/workflows/validate.yml` |
| 8 | Metadata drift | `package.json` is still named `skyblock-farming-maxer` at version `0.1.0` while `APP_VERSION` is `0.3.0`, has no `type: module` and no `test` script; the app shell still renders "Farming Maxer / SkyBlock 2026" |

## Tasks

- [x] Add `src/migrations.js`: pure, versioned migration registry plus the shared
      crop/tool-scope helpers, with schema v1 -> v2 carrying the existing
      crop/tool re-scoping logic
- [x] Add `src/backup.js`: pure `createBackupPayload` / `validateBackupPayload`,
      migrating restored state before it is written
- [x] Wire `src/app.js`, `src/foundation.js` and `src/hypixel-import.js` to the
      shared migration and backup layers
- [x] Split `src/hypixel-import.js` into pure extractors and storage wrappers
- [x] Make Settings reachable on mobile
- [x] Add a zero-dependency `node --test` suite for migrations, backup, Hypixel
      adapters and data integrity
- [x] Extend `.github/workflows/validate.yml` to check every module and run tests
- [x] Align `package.json`, `APP_VERSION`, the service-worker cache version and
      the app shell branding
- [x] Update `README.md` to describe the state that now actually exists

## Review

Recorded below.

---

## Review

### What changed

**New modules**

- `src/migrations.js` — ordered, idempotent migration registry plus the shared
  `toolKeyForCropId` / `ensureProgressBucket` helpers. Schema v1 -> v2 carries
  the crop/tool re-scoping logic that previously lived inline in `src/app.js`
  and ran unconditionally on every page load. A destination value always wins
  over a moved one, so no user value is ever overwritten.
- `src/backup.js` — the single backup contract: `createBackupPayload`,
  `validateBackupPayload` (which migrates what it validates), `backupFilename`
  and the shared download/read helpers.
- `scripts/check-sw-manifest.js` — fails CI when a file in `src/` or `assets/`
  ships without being listed in the service worker's `APP_FILES`, which would
  otherwise let an update mix old and new application files.

**Behaviour fixes**

- Restoring an older backup now migrates it to the current schema instead of
  writing the old shape back verbatim.
- The sidebar Export/Import pair used an unversioned, unvalidated profile-only
  file. Both now use the same validated backup envelope as Settings.
- Settings moved from the sidebar to the top bar. Below 780px the sidebar is
  `display:none`, which had made backup, restore, import, install and update
  controls unreachable on the mobile-first layout the product targets.
- Settings no longer stamps an unmigrated state with the current schema version
  when the UUID field is saved.
- Hypixel import writes into the migrated shape rather than whatever was stored.

**Two live bugs found while verifying in a real browser**

`index.html` ships `script-src 'self'; style-src 'self'`, and the browser drops
inline styles and inline handlers silently:

1. `style="width:X%"` on every progress bar was dropped, so *every* card showed
   a full progress bar regardless of the real level. Widths are now applied
   through the CSSOM in `bind()`, which the policy does not block. Verified: an
   item at level 30/60 renders 141px of 282px.
2. `onclick="event.stopPropagation()"` on the drawer was dropped, so any click
   inside the drawer bubbled to the backdrop and closed it — including clicks
   into the cost and manual-value inputs. The backdrop handler now checks the
   event target.

`tests/csp.test.js` guards both classes of markup, and `frame-ancestors` was
removed from the `<meta>` CSP because a meta tag cannot apply it.

### Verification

- `npm test` — 53 tests, all passing (migrations, backup contract, Hypixel
  adapters, data-layer invariants, CSP-safe markup).
- Browser run against a served build: a seeded schema-1 state migrates on load
  (crop level lands in the crop bucket, tool level in `eclipse-hoe`, account
  scope emptied, profile name and Fortune preserved), Settings is visible and
  opens at 1440px and 390px, navigation and the planner still render, export
  produces `farming420-backup-<date>.json`, and the console is clean.
- Backup restore paths in the browser: a foreign JSON file and a
  newer-schema backup are both refused with explanatory messages and leave
  local data intact; a schema-1 backup restores and is migrated to schema 2
  with its crop level moved into the right bucket.

### Deliberately not done

`AGENTS.md` rule 2 requires a `lastVerified` date next to every non-trivial
mechanic. No entry in `src/data.js` has one. Filling those in would mean
inventing dates, which rule 1 forbids, so this needs a real verification pass
against the sources each entry already cites. It is the largest remaining
foundation gap and is not something a code change can close honestly.
