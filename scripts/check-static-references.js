#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function stripQueryAndHash(value) {
  return String(value || '').split('#', 1)[0].split('?', 1)[0];
}

function isLocalReference(value) {
  const ref = String(value || '').trim();
  return Boolean(ref)
    && !ref.startsWith('#')
    && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref);
}

function walkFiles(directory, predicate) {
  const files = [];
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function htmlReferences(source) {
  return [...String(source).matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
}

function moduleReferences(source) {
  const text = String(source);
  const refs = [];

  for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    refs.push(match[1]);
  }
  for (const match of text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    refs.push(match[1]);
  }
  for (const match of text.matchAll(/\bnew\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) {
    refs.push(match[1]);
  }

  return refs;
}

function cssReferences(source) {
  const text = String(source);
  const refs = [...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(match => match[1]);
  for (const match of text.matchAll(/@import\s+['"]([^'"]+)['"]/g)) refs.push(match[1]);
  return refs;
}

function manifestReferences(source) {
  const payload = JSON.parse(source);
  const refs = [];

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'src' && typeof child === 'string') refs.push(child);
      else visit(child);
    }
  }

  visit(payload);
  return refs;
}

function resolveReference(root, sourcePath, reference) {
  const clean = stripQueryAndHash(reference);
  if (clean.startsWith('/')) return resolve(root, `.${clean}`);
  return resolve(dirname(sourcePath), clean);
}

function isInsideRoot(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..');
}

export function auditStaticReferences(root = DEFAULT_ROOT) {
  const repositoryRoot = resolve(root);
  const checks = [];
  const missing = [];

  function check(sourcePath, reference) {
    if (!isLocalReference(reference)) return;
    const target = resolveReference(repositoryRoot, sourcePath, reference);
    const record = {
      source: relative(repositoryRoot, sourcePath) || '.',
      reference,
      target: relative(repositoryRoot, target) || '.',
    };
    checks.push(record);
    if (!isInsideRoot(repositoryRoot, target) || !existsSync(target)) missing.push(record);
  }

  const htmlFiles = [
    resolve(repositoryRoot, 'index.html'),
    ...walkFiles(resolve(repositoryRoot, 'scripts'), file => file.endsWith('.html')),
  ].filter(existsSync);
  for (const file of htmlFiles) {
    for (const ref of htmlReferences(readFileSync(file, 'utf8'))) check(file, ref);
  }

  const manifestPath = resolve(repositoryRoot, 'manifest.webmanifest');
  if (existsSync(manifestPath)) {
    for (const ref of manifestReferences(readFileSync(manifestPath, 'utf8'))) check(manifestPath, ref);
  }

  for (const file of walkFiles(resolve(repositoryRoot, 'src'), entry => entry.endsWith('.js'))) {
    for (const ref of moduleReferences(readFileSync(file, 'utf8'))) check(file, ref);
  }

  for (const file of walkFiles(resolve(repositoryRoot, 'src'), entry => entry.endsWith('.css'))) {
    for (const ref of cssReferences(readFileSync(file, 'utf8'))) check(file, ref);
  }

  return { checked: checks.length, missing };
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const result = auditStaticReferences();
  if (result.missing.length) {
    console.error('Missing local static references:');
    for (const item of result.missing) {
      console.error(`- ${item.source}: ${item.reference} -> ${item.target}`);
    }
    process.exit(1);
  }
  console.log(`Static reference audit passed: ${result.checked} local references resolve.`);
}
