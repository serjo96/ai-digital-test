import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { metricsFor } from '../src/metrics.js';
import { exportBenchmark } from '../src/benchmark.js';
import { baseline } from '../src/baseline.js';
import { evaluate } from '../src/evaluation.js';
import type { BaselineResult, Labels, RunReport, SourceRow } from '../src/types.js';

const original = JSON.parse(readFileSync('reports/B0/report.json', 'utf8')) as RunReport;
const saved = JSON.parse(readFileSync('reports/B0/result.json', 'utf8')) as BaselineResult;
const labels = JSON.parse(readFileSync('eval/labels.json', 'utf8')) as Labels;
const cli = (...args: string[]) => spawnSync(process.execPath, ['dist/src/cli.js', ...args], { encoding: 'utf8' });

test('historical metrics expose exact denominators and leave unavailable review null', () => {
  const metrics = metricsFor(original, saved, labels);
  const m = (name: string) => metrics.find(m => m.name === name)!;
  assert.deepEqual([m('matching.recall').numerator, m('matching.recall').denominator], [7, 17]);
  assert.deepEqual([m('matching.hard_negative_specificity').numerator, m('matching.hard_negative_specificity').denominator], [170, 170]);
  assert.deepEqual([m('non_product.precision').numerator, m('non_product.precision').denominator], [4, 4]);
  assert.deepEqual([m('non_product.valid_product_retention').numerator, m('non_product.valid_product_retention').denominator], [55, 55]);
  assert.equal(m('review.items').value, null); assert.equal(m('review.row_rate').availability, 'not_implemented');
  assert.equal(m('generation.quality').value, null);
});

test('bad selection metrics count false rejection and missed trash, and zero denominators stay null', () => {
  const row = (id: string, title: string): SourceRow => ({ row_id: id, supplier: 'S', supplier_sku: id, raw_title: title, raw_specs: '', price: '$1', stock: 1 });
  const r = baseline([row('a', 'TEST ROW DO NOT IMPORT'), row('b', 'Widget')]);
  const l: Labels = { version: 'control', cases: [{ id: 'one', family: 'one', split: 'development', status: 'provisional', reviewedBy: null, reviewedAt: null,
    rowIds: ['a', 'b'], expectedGroups: [['a']], nonProductRowIds: ['b'], unknownPairs: [], explanation: 'Intentionally inverted trash labels' }] };
  const metrics = metricsFor({ ...original, evaluation: evaluate(r, l) }, r, l);
  assert.equal(metrics.find(m => m.name === 'non_product.false_rejection')!.value, 1);
  assert.equal(metrics.find(m => m.name === 'non_product.missed_trash')!.value, 1);
  assert.equal(metrics.find(m => m.name === 'non_product.precision')!.value, 0);
  const recall = metrics.find(m => m.name === 'matching.recall')!;
  assert.equal(recall.value, null); assert.equal(recall.denominator, 0); assert.equal(recall.availability, 'no_denominator');
});

test('benchmark preserves history, exports B0/B1 and failed attempts, and refuses incompatible labels', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shelf-benchmark-'));
  try {
    const p = cli('pipeline', '--out', dir, '--run-id', 'b1'); assert.equal(p.status, 0, p.stderr);
    const failed = cli('pipeline', '--feed', join(dir, 'absent'), '--out', dir, '--run-id', 'bad-input'); assert.equal(failed.status, 1);
    const path = await exportBenchmark(['reports/B0', join(dir, 'b1'), join(dir, 'bad-input')], 'eval/labels.json', dir, 'history');
    const observations = (await readFile(join(path, 'observations.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const m = (id: string, name: string) => observations.find(m => m.runId === id && m.name === name);
    assert.equal(m('B0', 'matching.recall').denominator, 17); assert.equal(m('b1', 'matching.recall').numerator, 17);
    assert.equal(m('B0', 'matching.recall').metricCohort, m('b1', 'matching.recall').metricCohort);
    assert.equal(m('B0', 'review.items').value, null); assert.ok(m('b1', 'review.items').value > 0);
    assert.equal(m('bad-input', 'errors.execution').value, 1); assert.equal(m('bad-input', 'matching.recall'), undefined);
    assert.equal(new Set(observations.map(m => `${m.runId}:${m.name}`)).size, observations.length);
    assert.ok(observations.every(m => m.benchmarkSchema === 'metrics-v1'));
    await assert.rejects(exportBenchmark(['reports/B0'], 'eval/labels.json', dir, 'history'), /EEXIST/);
    await assert.rejects(exportBenchmark(['reports/B0', 'reports/B0'], 'eval/labels.json', dir, 'duplicate'), /duplicate/);
    const wrong = join(dir, 'labels.json'); await writeFile(wrong, JSON.stringify(labels));
    await assert.rejects(exportBenchmark(['reports/B0'], wrong, dir, 'wrong'), /labels hash changed/);
    const frozen = await exportBenchmark([join(dir, 'b1')], wrong, dir, 'frozen-history');
    const frozenPoints = (await readFile(join(frozen, 'observations.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(frozenPoints.find(m => m.name === 'matching.recall').metricCohort, m('b1', 'matching.recall').metricCohort);
    const c = cli('compare', '--before', 'reports/B0', '--after', join(dir, 'b1'), '--out', dir, '--run-id', 'comparison');
    assert.equal(c.status, 0, c.stderr);
    const comparison = JSON.parse(await readFile(join(dir, 'comparison/comparison.json'), 'utf8'));
    assert.equal(comparison.comparable, true); assert.equal(comparison.beforeMetrics.reviewRows, null);
    assert.equal(comparison.deltas.tp, 10); assert.ok(comparison.changedMatchingRowIds.length < comparison.changedRowIds.length);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('explicit B0 still reproduces the frozen decisions and exports new metrics', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shelf-b0-'));
  try {
    const p = cli('pipeline', '--baseline', 'b0', '--out', dir, '--run-id', 'b0'); assert.equal(p.status, 0, p.stderr);
    const report = JSON.parse(await readFile(join(dir, 'b0/report.json'), 'utf8'));
    assert.equal(report.decisionsHash, original.decisionsHash);
    assert.equal(report.rulesVersion, 'B0-v1'); assert.equal(report.schemaVersion, '2');
    assert.ok(report.metrics.length > 20);
    assert.equal(cli('pipeline', '--baseline', 'unknown', '--out', dir, '--run-id', 'no').status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
