import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { compareReports } from '../src/reports.js';
import type { BaselineResult, RunReport } from '../src/types.js';

const cli = (...args: string[]) => spawnSync(process.execPath, ['dist/src/cli.js', ...args], {
  encoding: 'utf8', env: { ...process.env, FEED_PATH: 'supplier_feed.json', TAXONOMY_PATH: 'taxonomy.json', LABELS_PATH: 'eval/labels.json' },
});

test('Nest CLI writes reproducible artifacts, preserves baseline and saves comparison', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shelf-ready-test-'));
  try {
    for (const id of ['first', 'second']) {
      const p = cli(id === 'first' ? 'pipeline' : 'eval', '--out', dir, '--run-id', id);
      assert.equal(p.status, 0, p.stderr);
    }
    const first = JSON.parse(await readFile(join(dir, 'first/report.json'), 'utf8')) as RunReport;
    const second = JSON.parse(await readFile(join(dir, 'second/report.json'), 'utf8')) as RunReport;
    const result = JSON.parse(await readFile(join(dir, 'first/result.json'), 'utf8')) as BaselineResult;
    assert.equal(first.audit.accountedRows, 220);
    assert.equal(first.decisionsHash, second.decisionsHash);
    assert.deepEqual(first.evaluation, second.evaluation);
    assert.equal(first.evaluation.status, 'provisional');
    assert.equal(first.verifier, null); assert.equal(first.generation, null);
    assert.equal(cli('pipeline', '--out', dir, '--run-id', 'first').status, 1);
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'first/report.json'), 'utf8')), first);
    const p = cli('compare', '--before', join(dir, 'first'), '--after', join(dir, 'second'), '--out', dir, '--run-id', 'diff');
    assert.equal(p.status, 0, p.stderr);
    const diff = JSON.parse(await readFile(join(dir, 'diff/comparison.json'), 'utf8'));
    assert.equal(diff.decisionsEqual, true); assert.deepEqual(diff.changedRowIds, []);
    assert.ok(Object.values(diff.deltas).every(x => x === 0));
    const changed = structuredClone(second); changed.hashes.labels = 'changed';
    const incompatible = compareReports(first, changed, result, result);
    assert.equal(incompatible.comparable, false); assert.equal(incompatible.deltas.tp, null);
    const regression = structuredClone(second); regression.evaluation.fp++;
    assert.equal(compareReports(first, regression, result, result).violations.length, 1);
    const initial = compareReports(null, first, null, result);
    assert.equal(initial.beforeMetrics, null); assert.equal(initial.deltas.precision, null);
    await writeFile(join(dir, 'second/report.json'), JSON.stringify(changed));
    assert.equal(cli('compare', '--before', join(dir, 'first'), '--after', join(dir, 'second'), '--out', dir, '--run-id', 'bad-diff').status, 1);
    assert.match(await readFile(join(dir, 'bad-diff/comparison.md'), 'utf8'), /labels hash changed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('invalid JSON, schema and missing input persist failure diagnostics without success artifacts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shelf-ready-invalid-'));
  try {
    const feed = join(dir, 'bad.json');
    for (const [id, text] of [['syntax', '{'], ['schema', '[{"row_id":"x"}]']]) {
      await writeFile(feed, text!);
      const p = cli('pipeline', '--feed', feed, '--out', dir, '--run-id', id!);
      assert.equal(p.status, 1);
      assert.deepEqual(await readdir(join(dir, id!)), ['failure.json']);
      const error = JSON.parse(await readFile(join(dir, id!, 'failure.json'), 'utf8'));
      assert.equal(error.status, 'failed'); assert.ok(error.errors.length);
    }
    assert.equal(cli('pipeline', '--feed', join(dir, 'absent.json'), '--out', dir, '--run-id', 'absent').status, 1);
    assert.deepEqual(await readdir(join(dir, 'absent')), ['failure.json']);
    assert.equal(cli('pipeline', '--out', dir, '--run-id', '../escape').status, 1);
    assert.equal(cli('eval', '--split', 'holdout', '--out', dir).status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
