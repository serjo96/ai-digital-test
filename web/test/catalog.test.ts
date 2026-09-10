import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatalog, projectProductResult } from '../src/data/loadCatalog.ts';
import { productStatus } from '../src/data/catalog.ts';
import { demoCatalog } from '../src/data/fixtures.ts';
import {
  aiVerdictPhrase,
  formatReason,
  primaryReviewReason,
  uniqueReasons,
  verdictExplanation,
  verdictLabel,
} from '../src/data/labels.ts';

const result = JSON.parse(readFileSync('reports/B1-stage3-control-v2/result.json', 'utf8'));
const b3 = JSON.parse(readFileSync('reports/B3-openai-development-live-v4/result.json', 'utf8'));
const generated = JSON.parse(readFileSync('reports/B3-openai-development-live-v4/generated-review.json', 'utf8'));

test('real projection preserves evidence and never presents B1 facts as verified listings', () => {
  const catalog = projectProductResult(result);
  assert.equal(catalog.facts, result.facts);
  assert.equal(catalog.rows, result.rows);
  assert.equal(catalog.products.length, 156);
  assert.equal(catalog.products.filter(p => productStatus(p, catalog.listings[p.id]) === 'needs_review').length, 51);
  assert.equal(catalog.products.filter(p => productStatus(p, catalog.listings[p.id]) === 'ready').length, 0);
  assert.ok(Object.values(catalog.listings).every(listing => listing.draftText === null && listing.publishedText === null));
});

test('B3 projection exposes publication listings and claim review without changing products', () => {
  const catalog = projectProductResult(b3, null, { generated, controlled: [] });
  assert.equal(catalog.products.length, 156);
  assert.equal(catalog.claimReview?.generated.claims.length, 158);
  assert.equal(catalog.products.filter(product => productStatus(product, catalog.listings[product.id]) === 'ready').length, 37);
  assert.equal(catalog.products.filter(product => productStatus(product, catalog.listings[product.id]) === 'needs_review').length, 2);
  assert.equal(catalog.listings[catalog.claimReview!.generated.claims[0].productId]?.publication?.attempts.length, 1);
});

test('loader defaults to prepared snapshot and fails visibly instead of substituting demos', async context => {
  const urls: string[] = [];
  const fetch = context.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify(result));
  });
  assert.equal((await loadCatalog()).source, 'pipeline');
  assert.deepEqual(urls, ['/data/catalog.json']);
  await loadCatalog('/custom.json');
  assert.equal(urls[1], '/custom.json');
  fetch.mock.mockImplementation(async () => new Response('missing', { status: 404 }));
  await assert.rejects(loadCatalog('/missing'), /web:prepare/);
  fetch.mock.mockImplementation(async () => new Response('{"products":[null]}'));
  await assert.rejects(loadCatalog('/broken'), /Invalid catalog/);
  fetch.mock.mockImplementation(async () => new Response('not json'));
  await assert.rejects(loadCatalog('/invalid'), /Cannot load catalog/);
});

test('empty saved result stays empty and synthetic conflict stays explicitly demo-only', () => {
  const empty = projectProductResult({ ...result, products: [], offers: [], facts: [], rows: [], review: [] });
  assert.equal(empty.products.length, 0);
  assert.equal(empty.source, 'pipeline');
  assert.equal(demoCatalog.source, 'demo');
  const conflict = demoCatalog.products.find(product => product.facts.some(fact => fact.status === 'conflict'))!;
  assert.equal(productStatus(conflict, demoCatalog.listings[conflict.id]), 'needs_review');
  assert.ok(demoCatalog.demoNotice?.includes('not a pipeline'));
});

test('formatReason maps known codes and keeps unknown codes readable', () => {
  assert.equal(formatReason('missing_specs').label, 'Empty supplier specs');
  assert.equal(formatReason('missing_specs').known, true);
  assert.equal(formatReason('fact_conflict:battery_runtime').label, 'Conflicting product attribute: battery_runtime');
  assert.equal(formatReason('fact_incomparable:power').label, 'Incomparable product attribute: power');
  assert.equal(formatReason('identity:incomplete_type_or_variant').label, 'Identity check needs review: incomplete type or variant');
  assert.equal(formatReason('literal_type:headphones').label, 'Recognized type: headphones');
  assert.equal(formatReason('generation_not_run').label, 'Generation and claim verification have not run');
  const unknown = formatReason('brand_new_signal_xyz');
  assert.equal(unknown.known, false);
  assert.equal(unknown.code, 'brand_new_signal_xyz');
  assert.match(unknown.label, /brand new signal xyz/);
});

test('uniqueReasons and primaryReviewReason preserve first-seen order', () => {
  assert.deepEqual(uniqueReasons(['missing_specs', 'unparsed_specs', 'missing_specs']), [
    'missing_specs',
    'unparsed_specs',
  ]);
  const product = demoCatalog.products.find(p => p.id === 'demo_product_aerobuds')!;
  const primary = primaryReviewReason(product, demoCatalog.listings[product.id]);
  assert.equal(primary?.code, 'fact_conflict:battery_runtime');
  assert.match(primary?.label ?? '', /Conflicting product attribute/);
});

test('verdict helpers use plain language for review UI', () => {
  assert.equal(verdictLabel('supported'), 'Supported');
  assert.equal(verdictLabel('unsupported'), 'Not supported');
  assert.equal(verdictLabel('disputed'), 'Disputed');
  assert.equal(verdictExplanation('supported'), 'Sources confirm this statement.');
  assert.equal(verdictExplanation('unsupported'), 'Sources do not confirm this statement.');
  assert.equal(verdictExplanation('disputed'), 'Sources disagree about this statement.');
  assert.equal(aiVerdictPhrase('supported'), 'AI says: Supported by sources');
  assert.equal(aiVerdictPhrase('unsupported'), 'AI says: Not supported by sources');
  assert.equal(aiVerdictPhrase('disputed'), 'AI says: Sources dispute this');
});
