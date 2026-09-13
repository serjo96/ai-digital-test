import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateProductResult, parseCatalogPayload } from '../src/catalog-snapshot.js';
import { prepareWeb } from '../src/prepare-web.js';
import { evaluateMatchingAudit, validateMatchingAudit } from '../src/matching-audit.js';

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
    assert.equal(payload.matchingAudit.items.length, 20);
    assert.equal(payload.matchingAudit.items.every((item: { state: string }) => item.state === 'pending'), true);
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

test('compact matching audit validates stable rows, verdict state, and labels hash', async () => {
  const audit = JSON.parse(await readFile('eval/matching-audit.json', 'utf8'));
  const source = saved.rows.map((row: any) => row.source);
  assert.equal(validateMatchingAudit(audit, source, audit.labelsHash).items.length, 20);
  assert.throws(() => validateMatchingAudit({ ...audit, labelsHash: 'wrong' }, source, audit.labelsHash), /envelope/);
  const invalid = structuredClone(audit);
  invalid.items[0].humanVerdict = 'same_product';
  assert.throws(() => validateMatchingAudit(invalid, source, audit.labelsHash), /pending.*verdict/);
});

test('human matching audit records exact post-holdout agreement and coverage denominators', async () => {
  const auditText = await readFile('eval/matching-audit-human-verified.json', 'utf8');
  const auditInput = JSON.parse(auditText);
  const metrics = JSON.parse(await readFile('eval/matching-audit-metrics.json', 'utf8'));
  const baselineReport = JSON.parse(await readFile('reports/B1-v2/report.json', 'utf8'));
  const source = saved.rows.map((row: any) => row.source);
  const audit = validateMatchingAudit(auditInput, source, auditInput.labelsHash);
  const evaluated = evaluateMatchingAudit(audit, saved);
  assert.equal(createHash('sha256').update(auditText).digest('hex'), metrics.auditFileSha256);
  assert.equal(createHash('sha256').update(JSON.stringify(auditInput)).digest('hex'), metrics.auditCanonicalSha256);
  assert.equal(metrics.labelsHash, baselineReport.hashes.labels);
  assert.equal(metrics.decisionsHash, baselineReport.decisionsHash);
  assert.equal(metrics.rulesVersion, baselineReport.rulesVersion);
  assert.deepEqual(evaluated, metrics.evaluation);
  assert.deepEqual(evaluated.agreement, { numerator: 18, denominator: 18, value: 1 });
  assert.deepEqual(evaluated.scoredCoverage, { numerator: 18, denominator: 20, value: 0.9 });
  assert.deepEqual(evaluated.splits, {
    development: { reviewed: 14, scored: 12, agreements: 12, disagreements: 0, unknown: 2 },
    holdout: { reviewed: 6, scored: 6, agreements: 6, disagreements: 0, unknown: 0 },
  });
  assert.throws(() => evaluateMatchingAudit({ ...audit, status: 'provisional' }, saved), /human verification/);
});
