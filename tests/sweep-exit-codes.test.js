import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('sweep aggregation propagates injected worker failure and budget instead of printing green', () => {
  const folder=mkdtempSync(join(tmpdir(),'farming420-gate-'));
  try {
    const worker=join(folder,'worker.mjs');
    for(const code of [1,2,7]) {
      writeFileSync(worker,`console.error('AUDIT_INJECTED_WORKER_FAILURE'); process.exit(${code});\n`);
      const result=spawnSync('bash',['scripts/sweep-all.sh'],{cwd:new URL('../',import.meta.url),env:{...process.env,SWEEP_WORKER:worker,SWEEP_OUT:join(folder,'logs'),SWEEP_JOBS:'2'},encoding:'utf8',timeout:15000});
      assert.notEqual(result.status,0,`worker exit ${code} was swallowed`);
      assert.equal(result.error,undefined);
      assert.match(result.stdout,code===2?/BUDGET/:/FAIL/);
      assert.doesNotMatch(result.stdout,/PASS/);
    }
    writeFileSync(worker,'process.exit(0);\n');
    const success=spawnSync('bash',['scripts/sweep-all.sh'],{cwd:new URL('../',import.meta.url),env:{...process.env,SWEEP_WORKER:worker,SWEEP_OUT:join(folder,'logs')},encoding:'utf8',timeout:15000});
    assert.equal(success.status,0);
    assert.match(success.stdout,/PASS/);
  } finally { rmSync(folder,{recursive:true,force:true}); }
});
