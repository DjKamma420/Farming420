#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BUILD_ID_PATTERN = /^[0-9a-f]{7,64}$/i;

export function assertBuildId(buildId) {
  if (!BUILD_ID_PATTERN.test(String(buildId || ''))) {
    throw new Error('BUILD_ID must be a Git commit SHA.');
  }
  return String(buildId);
}

export function addBuildParam(url, buildId) {
  const value = String(url || '');
  if (!/^(?:src\/|assets\/|manifest\.webmanifest(?:[?#]|$))/.test(value)) return value;

  const hashIndex = value.indexOf('#');
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(query);
  params.set('build', assertBuildId(buildId));
  return `${path}?${params.toString()}${hash}`;
}

export function addModuleBuildParam(specifier, buildId) {
  const value = String(specifier || '');
  if (!/^\.{1,2}\/[^?#]+\.js(?:[?#]|$)/.test(value)) return value;

  const hashIndex = value.indexOf('#');
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(query);
  params.set('build', assertBuildId(buildId));
  return `${path}?${params.toString()}${hash}`;
}

export function stampModuleImports(source, buildId) {
  const build = assertBuildId(buildId);
  let output = String(source);

  output = output.replace(
    /(\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"])(\.{1,2}\/[^'"]+\.js(?:\?[^'"]*)?)(['"])/g,
    (match, prefix, specifier, suffix) => `${prefix}${addModuleBuildParam(specifier, build)}${suffix}`,
  );

  output = output.replace(
    /(\bimport\(\s*['"])(\.{1,2}\/[^'"]+\.js(?:\?[^'"]*)?)(['"]\s*\))/g,
    (match, prefix, specifier, suffix) => `${prefix}${addModuleBuildParam(specifier, build)}${suffix}`,
  );

  return output;
}

export function stampIndexHtml(html, buildId) {
  const build = assertBuildId(buildId);
  const meta = `  <meta name="app-build" content="${build}" />`;
  let output = String(html);

  if (/<meta\s+name="app-build"\s+content="[^"]*"\s*\/>/.test(output)) {
    output = output.replace(/^[ \t]*<meta\s+name="app-build"\s+content="[^"]*"\s*\/>/m, meta);
  } else {
    output = output.replace(/(<meta charset="[^"]+" \/>\r?\n)/, `$1${meta}\n`);
  }

  output = output.replace(
    /(<script\b[^>]*\bsrc=")([^"]+)(")/g,
    (match, prefix, url, suffix) => `${prefix}${addBuildParam(url, build)}${suffix}`,
  );
  output = output.replace(
    /(<link\b[^>]*\bhref=")([^"]+)(")/g,
    (match, prefix, url, suffix) => `${prefix}${addBuildParam(url, build)}${suffix}`,
  );

  return output;
}

export function buildVersionDocument(buildId) {
  return `${JSON.stringify({ format: 1, build: assertBuildId(buildId) }, null, 2)}\n`;
}

export function preparePagesDeploy(buildId = process.env.BUILD_ID || process.env.GITHUB_SHA) {
  const build = assertBuildId(buildId);
  const indexUrl = new URL('../index.html', import.meta.url);
  const versionUrl = new URL('../deploy-version.json', import.meta.url);
  const srcUrl = new URL('../src/', import.meta.url);
  const source = readFileSync(indexUrl, 'utf8');

  writeFileSync(indexUrl, stampIndexHtml(source, build));
  for (const name of readdirSync(srcUrl).filter(entry => entry.endsWith('.js'))) {
    const moduleUrl = new URL(name, srcUrl);
    const moduleSource = readFileSync(moduleUrl, 'utf8');
    writeFileSync(moduleUrl, stampModuleImports(moduleSource, build));
  }
  writeFileSync(versionUrl, buildVersionDocument(build));
  console.log(`Prepared GitHub Pages deployment for build ${build}.`);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  preparePagesDeploy();
}
