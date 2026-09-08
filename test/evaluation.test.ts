import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { baseline } from '../src/baseline.js';
import { evaluate, validateLabels } from '../src/evaluation.js';
import type { EvalCase, Labels, SourceRow } from '../src/types.js';

const row = (id: string, title: string): SourceRow => ({ row_id: id, raw_title: title, raw_specs: '', supplier: 'S', supplier_sku: id, stock: 1, price: '$1' });
const item = (id: string, groups: string[][], extra: Partial<EvalCase> = {}): EvalCase => ({
  id, family: id, split: 'development', status: 'provisional', reviewedBy: null, reviewedAt: null,
  rowIds: groups.flat(), expectedGroups: groups, nonProductRowIds: [], unknownPairs: [], explanation: 'Control fixture', ...extra,
});
const labels = (...cases: EvalCase[]): Labels => ({ version: 'control-v1', cases });

test('eval detects a false merge, missed pair and cross-case contamination', () => {
  const rows = [row('a', 'same'), row('b', 'different'), row('c', 'same')];
  const l = labels(item('one', [['a', 'b']]), item('two', [['c']]));
  const score = evaluate(baseline(rows), validateLabels(l, rows));
  assert.deepEqual([score.tp, score.fp, score.fn], [0, 1, 1]);
  assert.deepEqual(score.errors, [{ kind: 'missed_pair', pair: ['a', 'b'] }, { kind: 'false_merge', pair: ['a', 'c'] }]);
  assert.equal(score.precision.value, 0); assert.equal(score.recall.value, 0);
});

test('positive control yields exact pair denominators', () => {
  const rows = [row('a', 'same'), row('b', 'same'), row('c', 'same')];
  const score = evaluate(baseline(rows), labels(item('one', [['a', 'b', 'c']])));
  assert.deepEqual([score.tp, score.fp, score.fn], [3, 0, 0]);
  assert.deepEqual(score.precision, { numerator: 3, denominator: 3, value: 1 });
  assert.equal(score.recall.value, 1);
});

test('unknown links and attached unlabelled rows never become known negatives or successes', () => {
  const rows = [row('a', 'same'), row('b', 'same'), row('c', 'same')];
  const l = labels(item('one', [['a'], ['b']], { unknownPairs: [['a', 'b']] }));
  const score = evaluate(baseline(rows), validateLabels(l, rows));
  assert.deepEqual([score.tp, score.fp, score.fn], [0, 0, 0]);
  assert.equal(score.unknownPairs, 1);
  assert.equal(score.precision.value, null); assert.equal(score.recall.value, null);
  assert.deepEqual(score.unevaluatedPairs, [['a', 'c'], ['b', 'c']]);
});

test('holdout is excluded even when a holdout row attaches to development', () => {
  const rows = [row('a', 'same'), row('b', 'same'), row('c', 'same')];
  const l = labels(item('dev', [['a']]), item('hold', [['b', 'c']], { split: 'holdout' }));
  const score = evaluate(baseline(rows), validateLabels(l, rows));
  assert.equal(score.caseCount, 1); assert.equal(score.tp, 0); assert.equal(score.fp, 0);
  assert.equal(score.unevaluatedPairs.length, 2);
  assert.equal(evaluate(baseline(rows), labels()).status, 'not_evaluated');
});

test('labels reject leakage, duplicate/dangling rows, contradictory unknowns and fake verification', () => {
  const rows = [row('a', 'A'), row('b', 'B')];
  assert.throws(() => validateLabels(labels(item('x', [['a']]), item('y', [['b']], { family: 'x', split: 'holdout' })), rows), /leakage/);
  assert.throws(() => validateLabels(labels(item('x', [['a']]), item('y', [['a']])), rows), /duplicate/);
  assert.throws(() => validateLabels(labels(item('x', [['missing']])), rows), /unknown/);
  assert.throws(() => validateLabels(labels(item('x', [['a', 'b']], { unknownPairs: [['a', 'b']] })), rows), /contradicts/);
  assert.throws(() => validateLabels(labels(item('x', [['a']], { status: 'human_verified' })), rows), /metadata/);
  assert.throws(() => validateLabels(labels(item('x', [['a']], { rowIds: ['a', 'b'] })), rows), /partition/);
  assert.throws(() => validateLabels({ version: 'x', cases: [{ id: 'bad' }] }, rows), /schema/);
});

test('non-product accuracy includes false rejection of a real product', () => {
  const rows = [row('a', 'TEST ROW DO NOT IMPORT'), row('b', 'Widget')];
  const score = evaluate(baseline(rows), labels(item('x', [['a']], { rowIds: ['a', 'b'], nonProductRowIds: ['b'] })));
  assert.deepEqual(score.nonProducts, { checked: 2, correct: 0, errors: ['a', 'b'] });
});

test('saved annotation covers 20 whole cases with 14/6 split and no human verification claims', async () => {
  const rows = JSON.parse(await readFile('supplier_feed.json', 'utf8')) as SourceRow[];
  const l = validateLabels(JSON.parse(await readFile('eval/labels.json', 'utf8')), rows);
  assert.equal(l.cases.length, 20);
  assert.equal(l.cases.filter(c => c.split === 'development').length, 14);
  assert.equal(l.cases.filter(c => c.split === 'holdout').length, 6);
  assert.ok(l.cases.every(c => c.status === 'provisional'));
  for (const c of l.cases.filter(c => c.family !== 'non-products')) {
    assert.deepEqual(rows.filter(r => r.raw_title.toLowerCase().startsWith(`${c.family} `)).map(r => r.row_id).sort(), [...c.rowIds].sort());
  }
});
