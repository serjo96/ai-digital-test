import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseline, hash } from '../src/baseline.js';
import { productBaseline, assertProductIntegrity } from '../src/products.js';
import { extract, reconcile } from '../src/facts.js';
import { evaluate, validateLabels } from '../src/evaluation.js';
import { evaluateQuality, validateQuality } from '../src/quality.js';
import type { SourceRow } from '../src/types.js';

const row = (id: string, title: string, specs = ''): SourceRow => ({ row_id: id, supplier: 'Supplier', supplier_sku: id, raw_title: title, raw_specs: specs, price: '$1', stock: 1 });
const feedText = readFileSync('supplier_feed.json', 'utf8');
const feed = JSON.parse(feedText) as SourceRow[];
const labels = validateLabels(JSON.parse(readFileSync('eval/labels.json', 'utf8')), feed);
const suite = validateQuality(JSON.parse(readFileSync('eval/stage2-checks.json', 'utf8')), labels, hash(feedText));
const result = productBaseline(feed);
const product = (id: string) => result.products.find(p => p.rowIds.includes(id))!;

test('B1 development improves known matching without scoring unknown AeroBuds relations', () => {
  const score = evaluate(result, labels);
  assert.deepEqual([score.tp, score.fp, score.fn, score.unknownPairs], [17, 0, 0, 2]);
  assert.equal(result.rows.length, 220);
  assert.deepEqual(productBaseline([...feed].reverse()), result);
  assert.equal(evaluateQuality(result, suite).errors.length, 0);
  assert.deepEqual(baseline(feed), JSON.parse(readFileSync('reports/B0/result.json', 'utf8')));
});

test('model, accessory and same-template negatives remain separate; empty specs remain products', () => {
  for (const [a, b] of [['row_f3873a8816', 'row_cdf75e46ea'], ['row_bdbc045131', 'row_fe3ff4b356'], ['row_6f66c4cb9e', 'row_654f1fb60f']]) assert.notEqual(product(a!).id, product(b!).id);
  assert.equal(product('row_6668f30f9e').id, product('row_4d609c9ff9').id);
  assert.equal(result.facts.filter(f => f.evidence.rowId === 'row_76b28cdc31').length, 0);
  assert.equal(product('row_76b28cdc31').category, 'tablets');
});

test('offer condition and warranty never become shared product facts; same supplier offers remain distinct', () => {
  assert.equal(product('row_05e5d126cb').id, product('row_1e60b0a9dc').id);
  const offer = result.offers.find(o => o.rowId === 'row_05e5d126cb')!;
  assert.equal(offer.condition, 'open_box');
  assert.equal(result.offers.find(o => o.rowId === 'row_1e60b0a9dc')!.condition, null);
  assert.ok(!product('row_fbe753d7cc').facts.some(f => f.attribute === 'warranty_duration'));
  assert.ok(!product('row_05e5d126cb').facts.some(f => f.attribute === 'condition'));
  const repeated = productBaseline([row('a', 'Demo speaker', '12W'), row('b', 'Demo speaker', '12W')]);
  assert.equal(repeated.products.length, 1); assert.equal(repeated.offers.length, 2);
  assert.deepEqual(repeated.offers.map(o => o.stock), [1, 1]);
});

test('unknown variants cannot bridge incompatible colors, capacity, generation or switches', () => {
  for (const titles of [
    ['Demo tablet black', 'Demo tablet', 'Demo tablet white'],
    ['Demo SSD 256GB', 'Demo SSD', 'Demo SSD 512GB'],
    ['Demo charger 65W', 'Demo charger', 'Demo charger 100W'],
    ['Demo 2 speaker', 'Demo speaker', 'Demo 3 speaker'],
  ]) {
    const r = productBaseline(titles.map((t, i) => row(String(i), t)));
    assert.equal(r.products.length, 3);
    assert.ok(r.candidates.every(c => c.status !== 'merge'));
  }
  const r = productBaseline([row('a', 'Demo mechanical keyboard', 'brown switch'), row('b', 'Demo mechanical keyboard')]);
  assert.equal(r.products.length, 2);
  assert.ok(r.review.some(r => r.reason.startsWith('identity:')));
});

test('internal identity contradictions prevent merging and propagate review', () => {
  const r = productBaseline([row('a', 'Demo SSD 256GB', '512GB SSD'), row('b', 'Demo SSD 256GB', '256GB SSD')]);
  assert.equal(r.products.length, 2);
  assert.ok(r.review.some(r => r.reason === 'internal_identity_conflict'));
  const color = productBaseline([row('a', 'Demo tablet black', 'colour: white'), row('b', 'Demo tablet black')]);
  assert.equal(color.products.length, 2);
  assert.equal(r.products.find(p => p.rowIds.includes('a'))!.facts.find(f => f.attribute === 'storage')!.status, 'conflict');
});

test('mass conversion uses all rounding intervals, without averaging or a universal percentage', () => {
  for (const id of ['row_f3873a8816', 'row_92da044aa3']) assert.equal(product(id).facts.find(f => f.attribute === 'mass')!.status, 'agreed');
  const facts = [row('a', 'Demo speaker', 'weight 1.0kg'), row('b', 'Demo speaker', 'weight 2.0kg')].flatMap(r => extract(r).facts);
  assert.equal(reconcile(facts)[0]!.status, 'conflict'); assert.equal(reconcile(facts)[0]!.acceptedFactId, null);
  const chain = [row('a', 'Demo speaker', '1000g'), row('b', 'Demo speaker', '1kg'), row('c', 'Demo speaker', '1200g')].flatMap(r => extract(r).facts);
  assert.equal(reconcile(chain)[0]!.status, 'conflict');
  const rounding = result.facts.find(f => f.evidence.rowId === 'row_c2467f5304' && f.attribute === 'mass')!;
  assert.equal(rounding.value, 1190.67997125); assert.equal(rounding.evidence.quote, '42 oz');
});

test('conditions, upper limits and offer scope prevent unsupported reconciliation', () => {
  const r = productBaseline([row('a', 'Demo earbuds black', '20h total playback with case'), row('b', 'Demo earbuds black', 'Akku 18h')]);
  const fact = r.products[0]!.facts.find(f => f.attribute === 'battery_runtime')!;
  assert.equal(fact.status, 'incomparable'); assert.equal(fact.acceptedFactId, null);
  assert.ok(r.review.some(r => r.reason === 'fact_incomparable:battery_runtime'));
  const speed = extract(row('s', 'Demo SSD 2TB', 'up to 1050MB/s read')).facts.find(f => f.attribute === 'transfer_speed')!;
  assert.deepEqual(speed.conditions, ['read', 'up_to']); assert.equal(speed.evidence.quote, 'up to 1050MB/s read');
  const unknownSpeed = extract(row('t', 'Demo SSD 2TB', '1050MB/s')).facts.find(f => f.attribute === 'transfer_speed')!;
  assert.equal(reconcile([speed, unknownSpeed])[0]!.status, 'incomparable');
  const connector = result.facts.find(f => f.evidence.rowId === 'row_e0afb74574' && f.attribute === 'connector')!;
  assert.deepEqual(connector.conditions, ['charging_case']);
  assert.equal(connector.evidence.quote, 'USB-C Ladecase');
});

test('unrecognized and negated text stays unparsed; evidence corruption is rejected', () => {
  const e = extract(row('a', 'Demo speaker', 'AMAZING SOUND!!!; no ANC; unicorn mode'));
  assert.equal(e.facts.length, 0); assert.equal(e.unparsed.length, 3);
  const unsupported = extract(row('b', 'Demo tablet case', 'compatible with 512GB SSD; up to 1.2kg'));
  assert.equal(unsupported.facts.length, 0); assert.equal(unsupported.unparsed.length, 2);
  const limited = extract(row('c', 'Demo headphones', 'up to 30h battery')).facts[0]!;
  assert.ok(limited.conditions.includes('up_to')); assert.equal(limited.evidence.quote, 'up to 30h battery');
  const corrupted = structuredClone(result);
  corrupted.facts[0]!.evidence.quote = 'invented';
  assert.throws(() => assertProductIntegrity(corrupted), /evidence/);
  const misplaced = structuredClone(result);
  const p = misplaced.products.find(p => p.facts.length)!;
  p.facts[0]!.observations = ['absent'];
  assert.throws(() => assertProductIntegrity(misplaced), /observation/);
});

test('category precedence honors accessories, ordinary mice and gaming evidence', () => {
  const cases = [['Demo tablet case', 'other'], ['Demo laptop sleeve', 'other'], ['Demo replacement ear tips', 'other'], ['Demo USB-C hub', 'chargers_cables'], ['Demo wireless mouse', 'other'], ['Demo gaming mouse', 'gaming_accessories'], ['Unclear object', 'other']];
  for (const [title, category] of cases) assert.equal(productBaseline([row('a', title!) ]).products[0]!.category, category);
});

test('quality evaluation catches wrong category, absent extraction and erroneous reconciliation', () => {
  const changed = structuredClone(result);
  changed.products.find(p => p.rowIds.includes('row_76b28cdc31'))!.category = 'other';
  changed.facts = changed.facts.filter(f => !(f.evidence.rowId === 'row_f3873a8816' && f.attribute === 'mass'));
  changed.products.find(p => p.rowIds.includes('row_92da044aa3'))!.facts.find(f => f.attribute === 'mass')!.status = 'conflict';
  const score = evaluateQuality(changed, suite);
  assert.ok(score.errors.some(e => e.kind === 'category'));
  assert.ok(score.errors.some(e => e.kind === 'fact'));
  assert.ok(score.errors.some(e => e.kind === 'reconciliation'));
  const invalid = structuredClone(suite); invalid.checks[0]!.rowId = 'not-development';
  assert.throws(() => validateQuality(invalid, labels, hash(feedText)), /non-development/);
  assert.throws(() => validateQuality(suite, labels, 'different-feed'), /hash/);
});
