import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateProductResult, parseCatalogPayload } from '../src/catalog-snapshot.js';
import { prepareWeb } from '../src/prepare-web.js';

const saved = JSON.parse(await readFile('reports/B1-stage3-control-v2/result.json', 'utf8'));

test('saved catalog validates all B1 source links without changing the result', () => {
  assert.equal(validateProductResult(saved), saved);
  assert.equal(parseCatalogPayload(saved).provenance, null);
  assert.equal(saved.rows.length, 220);
  assert.equal(saved.products.length, 156);
});

test('catalog rejects malformed arrays, nested data, duplicate IDs and corrupt evidence or links', () => {
  for (const mutate of [
    (v: any) => { v.products = [null]; },
    (v: any) => { v.products[0].categoryConfidence = null; },
    (v: any) => { v.rows.push(v.rows[0]); },
    (v: any) => { v.products[0].offerIds.push('missing'); },
    (v: any) => { v.products[0].facts[0].observations.push('missing'); },
    (v: any) => { v.facts[0].evidence.quote = 'invented'; },
    (v: any) => { v.review[0].rowIds.push('missing'); },
  ]) {
    const copy = structuredClone(saved);
    mutate(copy);
    assert.throws(() => validateProductResult(copy), /Invalid catalog/);
  }
});

test('web preparation pairs report with exact decisions, omits private config, and keeps prior snapshot on failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shelf-catalog-'));
  try {
    const output = join(directory, 'public');
    const file = await prepareWeb('reports/B1-stage3-control-v2', output);
    const text = await readFile(file, 'utf8');
    const payload = JSON.parse(text);
    const parsed = parseCatalogPayload(JSON.parse(text));
    assert.deepEqual(parsed.result, saved);
    assert.equal(parsed.provenance?.mode, 'code-only');
    assert.equal(parsed.provenance?.qualityStatus, 'provisional');
    assert.equal(payload.labels.cases.length, 20);
    assert.equal('config' in payload.provenance, false);
    await writeFile(join(directory, 'result.json'), JSON.stringify(saved));
    const report = JSON.parse(await readFile('reports/B1-stage3-control-v2/report.json', 'utf8'));
    await writeFile(join(directory, 'report.json'), JSON.stringify({ ...report, decisionsHash: 'wrong' }));
    await assert.rejects(prepareWeb(directory, output), /does not match/);
    await writeFile(join(directory, 'report.json'), JSON.stringify({ ...report, mode: 'test' }));
    await assert.rejects(prepareWeb(directory, output));
    await writeFile(join(directory, 'report.json'), JSON.stringify({ ...report, generation: {} }));
    await assert.rejects(prepareWeb(directory, output), /pre-generation/);
    assert.equal(await readFile(file, 'utf8'), text);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
