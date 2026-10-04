import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWorkspaceUI } from '../src/workspace-ui.js';

test('workspace reapply never rewrites an already-hidden crop switch', () => {
  const tokens = new Set(['crop-switch']);
  let writes = 0;
  const cropSwitch = { classList: {
    contains: token => tokens.has(token),
    add: token => { writes++; tokens.add(token); },
  } };
  const root = { querySelector: selector => selector === '.topbar .crop-switch' ? cropSwitch : null };

  applyWorkspaceUI(root);
  assert.equal(writes, 1);
  assert.ok(tokens.has('workspace-hidden-crop-switch'));
  for (let pass = 0; pass < 3; pass++) applyWorkspaceUI(root);
  assert.equal(writes, 1, 'a child-list observer wake must not create another class mutation');

  tokens.delete('workspace-hidden-crop-switch');
  applyWorkspaceUI(root);
  assert.equal(writes, 2, 'a genuinely missing class must still be restored');
  applyWorkspaceUI(root);
  assert.equal(writes, 2);
});
