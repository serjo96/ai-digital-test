import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
import { evaluateControlled, evaluateGenerated, generatedReviewGatePassed, generatedReviewTemplate, migrateGeneratedReview, rebaseGeneratedReview, validateClaimSuite } from '../src/publication-evaluation.js';
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
  const quill = 'The Quill 3 is a USB-C hub';
  const split = (claimText: string, start: number) => ({ ...valid.claims[0], text: claimText, start, end: start + claimText.length });
  assert.throws(() => validateClaims({ textHash: hash(quill), claims: [split('The Quill 3 is a', 0), split('USB-C hub', 17)] }, quill, supports, [row], new Set()), /semantically atomic/);
  const display = '1.1 in display';
  assert.throws(() => validateClaims({ textHash: hash(display), claims: [split('1.1 in', 0), split('display', 7)] }, display, supports, [row], new Set()), /semantically atomic/);
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

test('verifier-only publication freezes prior text and makes no generation request', async () => temporary(async dir => {
  const sourceProvider = new PublicationProvider();
  const source = await publicationPipeline(b1(), new AiRuntime(registry(sourceProvider), config, 'live', join(dir, 'source')), config);
  const verifier = new PublicationProvider();
  const frozen = await publicationPipeline(b1(), new AiRuntime(registry(verifier), config, 'live', join(dir, 'frozen')), config, undefined, null, source.result);
  assert.equal(verifier.calls, 1);
  assert.equal(verifier.verificationCalls, 1);
  assert.equal(frozen.result.listings[0]!.publishedText, source.result.listings[0]!.publishedText);
  assert.equal(frozen.result.listings[0]!.status, 'ready');
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

test('generated review v2 migrates legacy claims without treating model verdicts as human decisions', async () => {
  const legacy = JSON.parse(await readFile('reports/B3-openai-development-live-v4/generated-review.json', 'utf8'));
  const migrated = migrateGeneratedReview(legacy);
  assert.equal(migrated.version, 'stage4-generated-review-v2');
  assert.equal(migrated.claims.length, 158);
  assert.ok(migrated.claims.every(claim => claim.state === 'pending' && claim.humanVerdict === null && claim.issueTypes.length === 0));
});

test('canonical generated review preserves the completed sample and reports exact claim, product and issue denominators', async () => {
  const publication = JSON.parse(await readFile('reports/B3-openai-development-live-v4/result.json', 'utf8'));
  const report = JSON.parse(await readFile('reports/B3-openai-development-live-v4/report.json', 'utf8'));
  const review = JSON.parse(await readFile('eval/generated-review-e478435a3d39.json', 'utf8'));
  const evaluation = evaluateGenerated(review, publication, report.publicationHash);
  assert.deepEqual({ checked: evaluation.checkedPublishedClaims, total: evaluation.totalPublishedClaims }, { checked: 120, total: 158 });
  assert.deepEqual({ checked: evaluation.fullyCheckedProducts, total: evaluation.totalPublishedProducts }, { checked: 28, total: 37 });
  assert.deepEqual({ completed: evaluation.completedSampleProducts, required: evaluation.requiredSampleProducts }, { completed: 20, required: 20 });
  assert.equal(evaluation.publishedClaimErrors, 0);
  assert.equal(evaluation.nonAtomicIssueClaims, 4);
  assert.equal(evaluation.unclearCopyIssueClaims, 2);
  assert.equal(new Set(review.claims.map((claim: { productId: string; attempt: number; claimId: string }) => `${claim.productId}:${claim.attempt}:${claim.claimId}`)).size, 158);
});

test('atomic-v2 canonical review passes the full-input development gate with exact denominators', async () => {
  const publication = JSON.parse(await readFile('reports/B3-openai-development-verifier-only-v2-live/result.json', 'utf8'));
  const report = JSON.parse(await readFile('reports/B3-openai-development-verifier-only-v2-live/report.json', 'utf8'));
  const review = JSON.parse(await readFile('eval/generated-review-fdca0138d88f.json', 'utf8'));
  const evaluation = evaluateGenerated(review, publication, report.publicationHash);
  assert.deepEqual({ checked: evaluation.checkedPublishedClaims, total: evaluation.totalPublishedClaims }, { checked: 76, total: 99 });
  assert.deepEqual({ checked: evaluation.fullyCheckedProducts, total: evaluation.totalPublishedProducts }, { checked: 28, total: 37 });
  assert.deepEqual({ completed: evaluation.completedSampleProducts, required: evaluation.requiredSampleProducts }, { completed: 20, required: 20 });
  assert.equal(evaluation.publishedClaimErrors, 0);
  assert.equal(evaluation.nonAtomicIssueClaims, 0);
  assert.equal(evaluation.unclearCopyIssueClaims, 2);
  assert.equal(generatedReviewGatePassed(evaluation), true);
});

test('generated review rebases only stable reviewed keys onto a changed publication', async () => {
  const publication = JSON.parse(await readFile('reports/B3-openai-development-live-v4/result.json', 'utf8'));
  const source = JSON.parse(await readFile('eval/generated-review-e478435a3d39.json', 'utf8'));
  const changed = structuredClone(publication);
  const listing = changed.listings.find((item: { selectedAttempt: number | null }) => item.selectedAttempt !== null);
  const attempt = listing.attempts.find((item: { attempt: number }) => item.attempt === listing.selectedAttempt);
  const reviewedClaim = attempt.claims.find((claim: { id: string }) => source.claims.some((item: { claimId: string; state: string }) => item.claimId === claim.id && item.state === 'reviewed'));
  const oldId = reviewedClaim.id; reviewedClaim.id = `claim_${'f'.repeat(64)}`;
  const publicationHash = hash(JSON.stringify(changed.listings));
  const rebased = rebaseGeneratedReview(source, changed, publicationHash);
  assert.equal(rebased.status, 'provisional');
  assert.equal(rebased.publicationHash, publicationHash);
  assert.equal(rebased.sampleProductIds.length, 20);
  assert.equal(rebased.claims.find((claim: { claimId: string }) => claim.claimId === reviewedClaim.id)!.state, 'pending');
  assert.equal(rebased.claims.some((claim: { claimId: string }) => claim.claimId === oldId), false);
  assert.equal(rebased.claims.filter((claim: { state: string }) => claim.state === 'reviewed').length, 119);
  assert.equal(evaluateGenerated(rebased, changed, publicationHash).checkedPublishedClaims, 119);
});

test('generated review safely merges reviewed spans when frozen publication text is unchanged', async () => {
  const publication = JSON.parse(await readFile('reports/B3-openai-development-live-v4/result.json', 'utf8'));
  const source = JSON.parse(await readFile('eval/generated-review-e478435a3d39.json', 'utf8'));
  const changed = structuredClone(publication);
  const listing = changed.listings.find((item: { productId: string; selectedAttempt: number | null }) => source.sampleProductIds.includes(item.productId) && item.selectedAttempt !== null);
  const attempt = listing.attempts.find((item: { attempt: number }) => item.attempt === listing.selectedAttempt);
  const pairIndex = attempt.claims.findIndex((claim: { id: string }, index: number, claims: { id: string }[]) => {
    const pair = claims[index + 1];
    if (!pair) return false;
    return [claim, pair].every(item => source.claims.some((review: { claimId: string; state: string; issueTypes: string[] }) => review.claimId === item.id && review.state === 'reviewed' && !review.issueTypes.includes('non_atomic_claim')));
  });
  assert.ok(pairIndex >= 0);
  const first = attempt.claims[pairIndex]; const second = attempt.claims[pairIndex + 1];
  const merged = {
    ...first,
    id: `claim_${'e'.repeat(64)}`,
    text: attempt.text.slice(first.start, second.end),
    end: second.end,
    supportIds: [...new Set([...first.supportIds, ...second.supportIds])],
    decisionIds: [...new Set([...first.decisionIds, ...second.decisionIds])],
    evidence: [...first.evidence, ...second.evidence],
    reason: `${first.reason} ${second.reason}`,
  };
  attempt.claims.splice(pairIndex, 2, merged);
  const publicationHash = hash(JSON.stringify(changed.listings));
  const rebased = rebaseGeneratedReview(source, changed, publicationHash, publication);
  const migrated = rebased.claims.find((claim: { claimId: string }) => claim.claimId === merged.id)!;
  assert.equal(migrated.state, 'reviewed');
  assert.equal(migrated.humanVerdict, 'supported');
  assert.ok(migrated.rationale.includes(' | '));
  assert.equal(evaluateGenerated(rebased, changed, publicationHash).checkedPublishedClaims, 119);
});

test('generated review resolves a prior non-atomic flag only when the new frozen-text span covers its reviewed facts', async () => {
  const oldPublication = JSON.parse(await readFile('reports/B3-openai-development-human-gate-v2/result.json', 'utf8'));
  const newPublication = JSON.parse(await readFile('reports/B3-openai-development-verifier-only-v2-live/result.json', 'utf8'));
  const source = JSON.parse(await readFile('eval/generated-review-e478435a3d39.json', 'utf8'));
  const publicationHash = hash(JSON.stringify(newPublication.listings));
  const rebased = rebaseGeneratedReview(source, newPublication, publicationHash, oldPublication);
  const sampleClaims = rebased.claims.filter(claim => rebased.sampleProductIds.includes(claim.productId));
  assert.ok(sampleClaims.every(claim => claim.state === 'reviewed'));
  assert.ok(rebased.claims.every(claim => !claim.issueTypes.includes('non_atomic_claim')));
  assert.ok(rebased.claims.some(claim => claim.rationale.startsWith('Atomic-v2 span resolves the prior structural issue.')));
  const evaluation = evaluateGenerated({ ...rebased, status: 'human_verified', reviewedBy: 'Reviewer', reviewedAt: '2026-09-12T00:00:00.000Z' }, newPublication, publicationHash);
  assert.equal(evaluation.completedSampleProducts, 20);
  assert.equal(generatedReviewGatePassed(evaluation), true);
});

test('generated review v2 requires explicit valid reviewed claims and a complete 20-product human sample', async () => {
  const publication = JSON.parse(await readFile('reports/B3-openai-development-live-v4/result.json', 'utf8'));
  const report = JSON.parse(await readFile('reports/B3-openai-development-live-v4/report.json', 'utf8'));
  const source = JSON.parse(await readFile('eval/generated-review-e478435a3d39.json', 'utf8'));
  const invalidClaim = structuredClone(source);
  invalidClaim.claims[0].humanVerdict = null;
  assert.throws(() => evaluateGenerated(invalidClaim, publication, report.publicationHash), /human verdict and rationale/);
  const incomplete = structuredClone(source);
  incomplete.status = 'human_verified'; incomplete.reviewedBy = 'Reviewer'; incomplete.reviewedAt = '2026-09-11T00:00:00.000Z';
  const sampledClaim = incomplete.claims.find((claim: { productId: string }) => incomplete.sampleProductIds.includes(claim.productId));
  sampledClaim.state = 'pending'; sampledClaim.humanVerdict = null; sampledClaim.rationale = ''; sampledClaim.issueTypes = [];
  assert.throws(() => evaluateGenerated(incomplete, publication, report.publicationHash), /complete sample/);
  const complete = structuredClone(incomplete);
  for (const claim of complete.claims) if (complete.sampleProductIds.includes(claim.productId)) {
    claim.state = 'reviewed'; claim.humanVerdict ??= 'supported'; claim.rationale ||= 'Reviewed against supplied evidence.';
  }
  const factualMismatch = complete.claims.find((claim: { state: string }) => claim.state === 'reviewed');
  factualMismatch.humanVerdict = 'unsupported';
  const withErrors = evaluateGenerated(complete, publication, report.publicationHash);
  assert.equal(withErrors.completedSampleProducts, 20);
  assert.equal(generatedReviewGatePassed(withErrors), false);
  for (const claim of complete.claims) if (claim.state === 'reviewed') { claim.humanVerdict = 'supported'; claim.issueTypes = []; }
  complete.claims.find((claim: { state: string }) => claim.state === 'reviewed').issueTypes = ['unclear_copy'];
  assert.equal(generatedReviewGatePassed(evaluateGenerated(complete, publication, report.publicationHash)), true);
  complete.claims.find((claim: { state: string }) => claim.state === 'reviewed').issueTypes = ['non_atomic_claim'];
  assert.equal(generatedReviewGatePassed(evaluateGenerated(complete, publication, report.publicationHash)), false);
  const duplicate = structuredClone(source); duplicate.claims[1] = structuredClone(duplicate.claims[0]);
  assert.throws(() => evaluateGenerated(duplicate, publication, report.publicationHash), /duplicate claim/);
});

test('B3 service writes schema-v4 artifacts, preserves B1 decisions and keeps test-origin out of review', async () => temporary(async dir => {
  const provider = new PublicationProvider();
  const localConfig = { ...config, generation: { ...config.generation, provider: 'fixture' }, verifier: { ...config.verifier, provider: 'fixture' } };
  const configPath = join(dir, 'stage4.json'); await writeFile(configPath, JSON.stringify(localConfig));
  const claimChecks = JSON.parse(await readFile('eval/stage4-claims.json', 'utf8'));
  claimChecks.status = 'provisional'; claimChecks.reviewedBy = null; claimChecks.reviewedAt = null;
  const claimChecksPath = join(dir, 'stage4-claims.json'); await writeFile(claimChecksPath, JSON.stringify(claimChecks));
  const service = new PipelineService(registry(provider));
  const runDir = await service.run({ feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: dir, runId: 'b3-fixture', baseline: 'b3', aiMode: 'live', aiCache: join(dir, 'cache'), aiConfig: configPath, aiCohort: 'development', claimChecks: claimChecksPath });
  const [report, result] = await readRun(runDir);
  assert.equal(report.schemaVersion, '4'); assert.equal(report.rulesVersion, 'B3-v1'); assert.ok(report.publicationHash); assert.ok(report.generation?.products);
  assert.equal(report.verifier?.controlled.status, 'provisional'); assert.equal(report.verifier?.generated.status, 'not_evaluated');
  const [before, beforeResult] = await readRun('reports/B1-v2'); const comparison = compareReports(before, report, beforeResult, result);
  assert.equal(comparison.comparable, false); // Test-origin B3 cannot be represented as real quality.
  assert.equal(comparison.decisionsEqual, true); assert.deepEqual(comparison.changedMatchingRowIds, []);
  await assert.rejects(prepareWeb(runDir, join(dir, 'fixture-web')));
  await assert.rejects(prepareWeb('reports/B3-openai-development-live-v4', join(dir, 'historical-web')), /claim suite does not match/);
  const humanGateRun = 'reports/B3-openai-development-human-gate-v2';
  const prepared = await prepareWeb(humanGateRun, join(dir, 'web'), 'eval/stage4-claims.json', 'eval/generated-review-e478435a3d39.json');
  const [realReport] = await readRun(humanGateRun);
  const payload = JSON.parse(await readFile(prepared, 'utf8'));
  assert.equal(payload.result.listings.length, 156);
  assert.equal(payload.review.generated.publicationHash, realReport.publicationHash);
  assert.equal(payload.review.controlled.length, 12);
  const reviewedPrepared = await prepareWeb(humanGateRun, join(dir, 'reviewed-web'), 'eval/stage4-claims.json', 'eval/generated-review-e478435a3d39.json');
  const reviewedPayload = JSON.parse(await readFile(reviewedPrepared, 'utf8'));
  assert.equal(reviewedPayload.review.generated.version, 'stage4-generated-review-v2');
  assert.equal(reviewedPayload.review.generated.claims.filter((claim: { state: string }) => claim.state === 'reviewed').length, 120);
  assert.equal(reviewedPayload.review.generated.sampleProductIds.length, 20);
}));
