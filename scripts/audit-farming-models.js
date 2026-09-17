#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { reduceItemResource } from '../src/item-catalog.js';
import { auditFarmingItemModelCoverage, ITEM_MODEL_SOURCE } from '../src/item-model-coverage.js';

export const ITEM_RESOURCE_URL = 'https://api.hypixel.net/v2/resources/skyblock/items';
export const DEFAULT_MANIFEST_PATH = 'assets/hypixel-pack/manifest.json';
export const DEFAULT_AUDIT_PATH = 'assets/hypixel-pack/farming-model-audit.json';

function sourceCounts(audit) {
  return Object.fromEntries(Object.values(ITEM_MODEL_SOURCE).map(source => [source, Number(audit?.bySource?.[source] || 0)]));
}

export function buildFarmingModelAudit(catalog, manifest, { generatedAt = new Date().toISOString() } = {}) {
  const coverage = auditFarmingItemModelCoverage(catalog, manifest);
  const bySource = sourceCounts(coverage);
  const directModelCount = bySource[ITEM_MODEL_SOURCE.OFFICIAL_SKIN]
    + bySource[ITEM_MODEL_SOURCE.RESOURCE_PACK_ITEM];
  const fallbackModelCount = bySource[ITEM_MODEL_SOURCE.RESOURCE_PACK_SET]
    + bySource[ITEM_MODEL_SOURCE.VANILLA_MATERIAL];
  const nonPackItems = coverage.records
    .filter(record => record.source !== ITEM_MODEL_SOURCE.RESOURCE_PACK_ITEM)
    .map(record => ({ id: record.id, name: record.name, source: record.source }));

  return Object.freeze({
    schemaVersion: 1,
    generatedAt,
    catalogSource: ITEM_RESOURCE_URL,
    pack: manifest?.pack || null,
    totalFarmingPhysicalItems: coverage.total,
    resolved: coverage.resolved,
    unresolvedCount: coverage.unresolvedCount,
    directModelCount,
    fallbackModelCount,
    bySource,
    unresolved: coverage.unresolved,
    nonPackItems,
    records: coverage.records,
  });
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fetchCatalog(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation is available.');
  const response = await fetchImpl(ITEM_RESOURCE_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Hypixel item resource returned HTTP ${response.status}`);
  const catalog = reduceItemResource(await response.json());
  if (!catalog.length) throw new Error('Hypixel item resource returned no recognisable items.');
  return catalog;
}

function parseArgs(argv) {
  const args = { manifest: DEFAULT_MANIFEST_PATH, output: DEFAULT_AUDIT_PATH, catalog: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--manifest') args.manifest = argv[++index];
    else if (value === '--output') args.output = argv[++index];
    else if (value === '--catalog') args.catalog = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

export async function runAudit({ manifestPath = DEFAULT_MANIFEST_PATH, outputPath = DEFAULT_AUDIT_PATH, catalogPath = null, fetchImpl = globalThis.fetch } = {}) {
  const manifest = await loadJson(manifestPath);
  const catalog = catalogPath
    ? reduceItemResource(await loadJson(catalogPath))
    : await fetchCatalog(fetchImpl);
  const audit = buildFarmingModelAudit(catalog, manifest);
  await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (audit.unresolvedCount > 0) {
    const ids = audit.unresolved.slice(0, 10).map(item => item.id).join(', ');
    throw new Error(`${audit.unresolvedCount} farming items have no usable model source: ${ids}`);
  }
  return audit;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const audit = await runAudit({ manifestPath: args.manifest, outputPath: args.output, catalogPath: args.catalog });
  console.log(`Farming model audit: ${audit.resolved}/${audit.totalFarmingPhysicalItems} resolved; ${audit.directModelCount} direct, ${audit.fallbackModelCount} fallback.`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
