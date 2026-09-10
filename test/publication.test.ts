import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AiProvider, AiRequest, AiResponse } from '../src/ai/contracts.js';
import { ProviderRegistry } from '../src/ai/contracts.js';
import { AiRuntime } from '../src/ai/runtime.js';
import { productBaseline } from '../src/products.js';
import { publicationPipeline, publicationSupports, validateClaims } from '../src/publication.js';
import { hash } from '../src/baseline.js';
import type { Stage4Config } from '../src/publication-config.js';
import type { SourceRow, Labels } from '../src/types.js';
import { evaluateControlled, evaluateGenerated, generatedReviewTemplate, validateClaimSuite } from '../src/publication-evaluation.js';
import { PipelineService } from '../src/app.js';
import { readRun } from '../src/benchmark.js';
import { compareReports } from '../src/reports.js';
import { prepareWeb } from '../src/prepare-web.js';

const row: SourceRow = { row_id: 'r1', supplier: 'Supplier', supplier_sku: 'S-1', raw_title: 'Demo wired earbuds', raw_specs: '3.5mm; in-line mic', price: '$10', stock: 2 };
const b1 = () => productBaseline([row]);
const config: Stage4Config = {
  version: 'B3-config-v1', generation: { provider: 'fixture', model: 'generator', maxOutputTokens: 1024 }, verifier: { provider: 'fixture', model: 'verifier', maxOutputTokens: 4096 },
  timeoutMs: 100, maxRetries: 0, prices: [],
};
const response = (data: unknown): AiResponse => ({ status: 'completed', data, model: 'fixture', requestId: 'fixture', usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0, cacheWriteTokens: 0 } });
const citation = (e: { rowId: string; field: string; quote: string }) => ({ rowId: e.rowId, field: e.field, quote: e.quote });

class PublicationProvider implements AiProvider {
  readonly id = 'fixture'; readonly endpoint = 'fixture://publication'; readonly kind = 'test' as const; calls = 0; verificationCalls = 0;
  constructor(private readonly blockCount = 0) {}
  async generate(request: AiRequest): Promise<AiResponse> {
    this.calls++;
    if (request.schemaName.startsWith('publication_generation')) return response({ text: 'Demo wired earbuds' });
    if (request.schemaName.startsWith('publication_repair')) return response({ text: 'Demo earbuds' });
    const input = request.input as { text: string; textHash: string; allowedSupports: { id: string; evidence: { rowId: string; field: string; quote: string }[] }[] };
    const blocked = this.verificationCalls++ < this.blockCount;
    const support = input.allowedSupports[0]!;
    return response({ textHash: input.textHash, claims: [{ text: input.text, start: 0, end: input.text.length,
      verdict: blocked ? 'unsupported' : 'supported', supportIds: blocked ? [] : [support.id], decisionIds: [], evidence: blocked ? [] : [citation(support.evidence[0]!)], reason: blocked ? 'fixture block' : 'fixture support' }] });
  }
}

const registry = (provider: AiProvider) => new ProviderRegistry(new Map([[provider.id, () => provider]]));
const temporary = async (fn: (dir: string) => Promise<void>) => { const dir = await mkdtemp(join(tmpdir(), 'shelf-publication-')); try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); } };

test('publication supports contain only conflict-free identity and agreed product facts', () => {
  const result = b1(); const product = result.products[0]!;
  const supports = publicationSupports(result, product);
  assert.ok(supports.some(s => s.kind === 'identity' && s.label === 'model'));
  assert.ok(supports.some(s => s.kind === 'fact' && s.label === 'connector'));
  assert.ok(supports.every(s => s.kind === 'identity' || result.facts.find(f => `fact:${f.id}` === s.id)?.scope === 'product'));
  product.facts[0]!.status = 'incomparable'; product.facts[0]!.acceptedFactId = null;
  assert.ok(!publicationSupports(result, product).some(s => s.label === product.facts[0]!.attribute && s.kind === 'fact'));
});

test('claim validation enforces exact spans, complete coverage, allowed evidence and fail-closed dispute links', () => {
  const result = b1(); const product = result.products[0]!; const supports = publicationSupports(result, product); const support = supports[0]!; const text = 'Demo wired earbuds';
  const valid = { textHash: hash(text), claims: [{ text, start: 0, end: text.length, verdict: 'supported', supportIds: [support.id], decisionIds: [], evidence: [citation(support.evidence[0]!)], reason: 'supported' }] };
  assert.equal(validateClaims(valid, text, supports, [row], new Set()).length, 1);
  assert.throws(() => validateClaims({ ...valid, textHash: hash('other') }, text, supports, [row], new Set()), /hash/);
  assert.throws(() => validateClaims({ ...valid, claims: [{ ...valid.claims[0], end: 4, text: 'Demo' }] }, text, supports, [row], new Set()), /coverage/);
  assert.throws(() => validateClaims({ ...valid, claims: [{ ...valid.claims[0], supportIds: ['unknown'] }] }, text, supports, [row], new Set()), /support/);
  assert.throws(() => validateClaims({ ...valid, claims: [{ ...valid.claims[0], verdict: 'disputed', supportIds: [], evidence: [] }] }, text, supports, [row], new Set()), /conflict/);
});

test('publication publishes supported text and replay reproduces it without another provider call', async () => temporary(async dir => {
  const provider = new PublicationProvider(); const input = b1(); const decisionsHash = hash(JSON.stringify(input));
  const live = await publicationPipeline(input, new AiRuntime(registry(provider), config, 'live', dir), config);
  assert.equal(live.result.listings[0]!.status, 'ready'); assert.equal(live.result.listings[0]!.publishedText, 'Demo wired earbuds');
  const { listings: _listings, ...catalog } = live.result;
  assert.equal(live.result.listings[0]!.attempts.length, 1); assert.equal(hash(JSON.stringify(catalog)), decisionsHash);
  const calls = provider.calls;
  const replay = await publicationPipeline(input, new AiRuntime(registry(provider), config, 'replay', dir), config);
  assert.deepEqual(replay.result, live.result); assert.equal(provider.calls, calls);
}));

test('one blocked verification gets one repair, and a second block withholds without a third attempt', async () => temporary(async dir => {
  const repairedProvider = new PublicationProvider(1);
  const repaired = await publicationPipeline(b1(), new AiRuntime(registry(repairedProvider), config, 'live', join(dir, 'repair')), config);
  assert.equal(repaired.result.listings[0]!.status, 'ready'); assert.equal(repaired.result.listings[0]!.selectedAttempt, 2); assert.equal(repaired.result.listings[0]!.attempts.length, 2);
  const blockedProvider = new PublicationProvider(2);
  const blocked = await publicationPipeline(b1(), new AiRuntime(registry(blockedProvider), config, 'live', join(dir, 'blocked')), config);
  assert.equal(blocked.result.listings[0]!.status, 'withheld'); assert.equal(blocked.result.listings[0]!.publishedText, null); assert.equal(blocked.result.listings[0]!.attempts.length, 2);
  assert.equal(blockedProvider.calls, 4);
}));

test('claim suites reject holdout and fake verification metadata, and generated review is hash-bound', () => {
  const result = b1(); const decisionsHash = hash(JSON.stringify(result));
  const labels: Labels = { version: 'x', cases: [{ id: 'dev', family: 'demo', split: 'development', status: 'provisional', reviewedBy: null, reviewedAt: null, rowIds: ['r1'], expectedGroups: [['r1']], nonProductRowIds: [], unknownPairs: [], explanation: 'demo' }] };
  const suite = { version: 'stage4-claims-v1', status: 'provisional', feedHash: 'a'.repeat(64), b1DecisionsHash: decisionsHash, reviewedBy: null, reviewedAt: null,
    cases: [{ id: 'one', rowId: 'r1', text: 'Demo wired earbuds', expectedVerdict: 'supported', kind: 'supported', rationale: 'fixture' }] };
  assert.equal(validateClaimSuite(suite, labels, result, 'a'.repeat(64), decisionsHash).cases.length, 1);
  assert.throws(() => validateClaimSuite({ ...suite, status: 'human_verified' }, labels, result, 'a'.repeat(64), decisionsHash), /metadata/);
  const holdout = structuredClone(labels); holdout.cases[0]!.split = 'holdout';
  assert.throws(() => validateClaimSuite(suite, holdout, result, 'a'.repeat(64), decisionsHash), /not development/);
  const actual = new Map([['one', [{ id: 'c', text: 'Demo', start: 0, end: 4, verdict: 'supported' as const, supportIds: [], decisionIds: [], evidence: [], reason: 'fixture' }]]]);
  assert.equal(evaluateControlled(validateClaimSuite(suite, labels, result, 'a'.repeat(64), decisionsHash), actual).supported.allowed, 1);
  const publication = { ...result, listings: [] }; const template = generatedReviewTemplate(publication, 'b'.repeat(64));
  assert.equal(evaluateGenerated(template, publication, 'b'.repeat(64)).checkedPublishedClaims, 0);
  assert.throws(() => evaluateGenerated({ ...template, publicationHash: 'c'.repeat(64) }, publication, 'b'.repeat(64)), /hash/);
});

test('B3 service writes schema-v4 artifacts, preserves B1 decisions and remains rejected by stage-5 preparation', async () => temporary(async dir => {
  const provider = new PublicationProvider();
  const localConfig = { ...config, generation: { ...config.generation, provider: 'fixture' }, verifier: { ...config.verifier, provider: 'fixture' } };
  const configPath = join(dir, 'stage4.json'); await writeFile(configPath, JSON.stringify(localConfig));
  const service = new PipelineService(registry(provider));
  const runDir = await service.run({ feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: dir, runId: 'b3-fixture', baseline: 'b3', aiMode: 'live', aiCache: join(dir, 'cache'), aiConfig: configPath, aiCohort: 'development', claimChecks: 'eval/stage4-claims.json' });
  const [report, result] = await readRun(runDir);
  assert.equal(report.schemaVersion, '4'); assert.equal(report.rulesVersion, 'B3-v1'); assert.ok(report.publicationHash); assert.ok(report.generation?.products);
  assert.equal(report.verifier?.controlled.status, 'provisional'); assert.equal(report.verifier?.generated.status, 'not_evaluated');
  const [before, beforeResult] = await readRun('reports/B1-v2'); const comparison = compareReports(before, report, beforeResult, result);
  assert.equal(comparison.comparable, false); // Test-origin B3 cannot be represented as real quality.
  assert.equal(comparison.decisionsEqual, true); assert.deepEqual(comparison.changedMatchingRowIds, []);
  await assert.rejects(prepareWeb(runDir, join(dir, 'web')), /pre-generation results only/);
}));
