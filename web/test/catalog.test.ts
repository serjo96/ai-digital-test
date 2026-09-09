import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatalog, projectProductResult } from '../src/data/loadCatalog.ts';
import { productStatus } from '../src/data/catalog.ts';
import { demoCatalog } from '../src/data/fixtures.ts';

const result = JSON.parse(readFileSync('reports/B1-stage3-control-v2/result.json', 'utf8'));

test('real projection preserves evidence and never presents B1 facts as verified listings', () => {
  const catalog = projectProductResult(result);
  assert.equal(catalog.facts, result.facts);
  assert.equal(catalog.rows, result.rows);
  assert.equal(catalog.products.length, 156);
  assert.equal(catalog.products.filter(p => productStatus(p, catalog.listings[p.id]) === 'needs_review').length, 51);
  assert.equal(catalog.products.filter(p => productStatus(p, catalog.listings[p.id]) === 'ready').length, 0);
  assert.ok(Object.values(catalog.listings).every(listing => listing.draftText === null && listing.publishedText === null));
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
