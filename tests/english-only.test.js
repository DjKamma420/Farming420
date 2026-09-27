import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const roots = ['src', 'scripts', 'tests', 'docs', 'tasks', 'research', '.github'];
const rootFiles = ['AGENTS.md', 'README.md', 'index.html', 'manifest.webmanifest'];
const extensions = new Set(['.js', '.mjs', '.py', '.sh', '.html', '.css', '.md', '.yml', '.yaml', '.webmanifest']);

const forbidden = [
  [119,105,114,100],                       // wird
  [98,101,97,114,98,101,105,116,101,116], // bearbeitet
  [110,105,99,104,116],                    // nicht
  [102,252,114],                            // für
  [117,110,100],                            // und
  [111,100,101,114],                        // oder
  [101,105,110,115,116,101,108,108,117,110,103,101,110],
  [119,101,114,107,122,101,117,103],
  [119,101,114,107,122,101,117,103,101],
  [97,117,115,114,252,115,116,117,110,103],
  [114,252,115,116,117,110,103],
  [115,99,104,228,100,108,105,110,103],
  [115,99,104,228,100,108,105,110,103,101],
  [118,101,114,98,101,115,115,101,114,117,110,103],
  [118,101,114,98,101,115,115,101,114,117,110,103,101,110],
  [104,105,110,122,117,102,252,103,101,110],
  [108,246,115,99,104,101,110],
  [110,228,99,104,115,116,101],
].map(codes => String.fromCharCode(...codes));

function filesUnder(path) {
  const absolute = join(root, path);
  if (!statSync(absolute).isDirectory()) return [absolute];
  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const next = join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(relative(root, next)));
    else if (entry.isFile() && extensions.has(extname(entry.name))) files.push(next);
  }
  return files;
}

test('repository source and documentation stay English-only', () => {
  const files = [
    ...roots.flatMap(filesUnder),
    ...rootFiles.map(path => join(root, path)),
  ].filter(path => !path.endsWith('tests/english-only.test.js'));

  const findings = [];
  for (const path of files) {
    const words = readFileSync(path, 'utf8').toLocaleLowerCase('en-US').match(/[\p{L}]+/gu) || [];
    const present = forbidden.filter(word => words.includes(word));
    if (present.length) findings.push(`${relative(root, path)}: ${present.join(', ')}`);
  }

  assert.deepEqual(findings, [], `German wording found in repository text:\n${findings.join('\n')}`);
});
