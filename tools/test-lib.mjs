// delegate-flow — unit tests for the parallel-safety + brief-builder libraries.
// Run: node --test tools/test-lib.mjs   (also invoked by tools/check.sh)
import { test } from 'node:test';
import assert from 'node:assert';
import { checkDisjoint } from '../flows/lib/ownership.js';
import { executorBrief } from '../flows/lib/briefs.js';

const conflict = (a, b) => checkDisjoint([{ id: 'a', exclusive_write: a }, { id: 'b', exclusive_write: b }]).safe === false;

test('ownership: genuinely disjoint sets are safe', () => {
  assert.equal(conflict(['src/auth/login.ts'], ['src/billing/charge.ts']), false);
  assert.equal(conflict(['src/auth/**'], ['src/billing/**']), false);
  assert.equal(conflict(['a/b/c.js'], ['a/b/d.js']), false);
  assert.equal(conflict(['README.md'], ['README.md.bak']), false);
});

test('ownership: overlaps are flagged (the named rubric cases)', () => {
  assert.equal(conflict(['VERSION'], ['VERSION']), true); // identical
  assert.equal(conflict(['src/auth/login.ts'], ['src/auth/**']), true); // subtree vs file
  assert.equal(conflict(['src/auth/'], ['src/auth/x.ts']), true); // trailing slash dir
});

test('ownership: REGRESSION — whole-tree / bare-dir tokens must never be false-safe', () => {
  // These were all wrongly "safe" before the review-panel run (block recommendation).
  assert.equal(conflict(['src'], ['src/foo.js']), true);
  assert.equal(conflict(['*'], ['src/a.js']), true);
  assert.equal(conflict(['**'], ['a/b.js']), true);
  assert.equal(conflict(['.'], ['src/a.js']), true);
  assert.equal(conflict(['*.js'], ['src/a.js']), true); // leading wildcard matches anywhere
});

test('briefs: executorBrief rejects unverifiable / unbounded briefs', () => {
  const base = {
    task_id: 't', parent_task: 'p', objective: 'o',
    acceptance_criteria: ['c'],
    file_ownership: { exclusive_write: ['src/x.ts'] },
    validation_commands: ['npm test'],
  };
  assert.doesNotThrow(() => executorBrief(base));
  assert.throws(() => executorBrief({ ...base, file_ownership: { exclusive_write: [] } }), /exclusive_write/);
  assert.throws(() => executorBrief({ ...base, validation_commands: [] }), /validation_commands/);
  assert.throws(() => executorBrief({ ...base, validation_commands: undefined }), /validation_commands/);
});
