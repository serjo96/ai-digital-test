import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { AiError, ProviderRegistry, type AiProvider, type AiRequest, type AiResponse } from '../src/ai/contracts.js';
import { OpenAiAdapter } from '../src/ai/openai.js';
import { AiRuntime } from '../src/ai/runtime.js';
import { readAiConfig, type AiConfig } from '../src/ai/config.js';
import { AdditionSchema, ExtractionSchema, additionFact, evidenceFor, jsonSchema } from '../src/ai/schemas.js';
import { aiBaseline, selectAiRows } from '../src/ai/pipeline.js';
import { hash } from '../src/baseline.js';
import { productBaseline, assertProductIntegrity } from '../src/products.js';
import { evaluate } from '../src/evaluation.js';
import { validateSemantic, evaluateSemantic } from '../src/semantic-quality.js';
import { PipelineService } from '../src/app.js';
import { exportBenchmark, readRun } from '../src/benchmark.js';
import { compareReports } from '../src/reports.js';
import type { SourceRow, Labels, RunReport } from '../src/types.js';

const feedText = readFileSync('supplier_feed.json', 'utf8');
const feed = JSON.parse(feedText) as SourceRow[];
const labels = JSON.parse(readFileSync('eval/labels.json', 'utf8')) as Labels;
const suite = validateSemantic(JSON.parse(readFileSync('eval/stage3-checks.json', 'utf8')), labels, hash(feedText));
const empty = (id: string) => ({ rowId: id, facts: [], type: null, category: null, unknowns: ['insufficient evidence'] });
const response = (data: unknown): AiResponse => ({ status: 'completed', data, model: 'fake', requestId: 'fixture', usage: { inputTokens: 100, outputTokens: 20, cachedInputTokens: 10, cacheWriteTokens: 30 } });
class FixtureProvider implements AiProvider {
  readonly kind = 'test' as const;
  calls = 0;
  constructor(readonly id = 'openai', readonly endpoint = 'fixture://offline', private readonly reply: (r: AiRequest, s: AbortSignal) => Promise<AiResponse> = async r => response(empty((r.input as { row: { rowId: string } }).row.rowId))) {}
  generate(r: AiRequest, s: AbortSignal) { this.calls++; return this.reply(r, s); }
}
const registry = (p: AiProvider) => new ProviderRegistry(new Map([[p.id, () => p]]));
const config = async (): Promise<AiConfig> => ({ ...await readAiConfig('config/ai.json'), timeoutMs: 100, maxRetries: 0 });
const request = (): AiRequest => ({ model: 'gpt-5.6-sol', schemaName: 'test', schema: { type: 'object' }, input: { row: { rowId: 'r' } }, instructions: 'fixture', parameters: { reasoning: 'low', maxOutputTokens: 512 } });
const temporary = async (fn: (dir: string) => Promise<void>) => { const dir = await mkdtemp(join(tmpdir(), 'shelf-ai-')); try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); } };
const fixtureTransport = (body: object, status = 200, inspect?: (body: Record<string, unknown>) => void): typeof fetch => async (_url, init) => {
  inspect?.(JSON.parse(String(init?.body)));
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};
const apiBody = (content: object[], status = 'completed') => ({ id: 'fixture-response', object: 'response', created_at: 0, model: 'gpt-5.6-sol', status,
  output: [{ type: 'message', id: 'message', status: 'completed', role: 'assistant', content }],
  usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120, input_tokens_details: { cached_tokens: 10, cache_write_tokens: 30 }, output_tokens_details: { reasoning_tokens: 2 } } });

test('OpenAI adapter uses structured Responses with injected transport and normalizes usage without network', async () => {
  let checked = false;
  const transport = fixtureTransport(apiBody([{ type: 'output_text', text: '{"answer":1}', annotations: [] }]), 200, body => {
    assert.equal(body.model, 'gpt-5.6-sol'); assert.equal(body.store, false); assert.equal(body.service_tier, 'default');
    assert.deepEqual(body.tools, []); assert.deepEqual(body.reasoning, { effort: 'low' });
    assert.equal((body.text as { format: { strict: boolean } }).format.strict, true); checked = true;
  });
  const adapter = new OpenAiAdapter(transport, 'fixture-key-not-real');
  const result = await adapter.generate(request(), new AbortController().signal);
  assert.ok(checked); assert.deepEqual(result.data, { answer: 1 }); assert.equal(result.usage?.cacheWriteTokens, 30);
});

test('OpenAI refusal, truncation, malformed JSON and HTTP errors are safe provider-neutral results', async () => {
  for (const [content, status, expected] of [
    [[{ type: 'refusal', refusal: 'fixture' }], 'completed', 'refused'],
    [[{ type: 'output_text', text: '{', annotations: [] }], 'incomplete', 'incomplete'],
  ] as const) {
    const adapter = new OpenAiAdapter(fixtureTransport(apiBody([...content], status)), 'fixture');
    assert.equal((await adapter.generate(request(), new AbortController().signal)).status, expected);
  }
  const invalid = new OpenAiAdapter(fixtureTransport(apiBody([{ type: 'output_text', text: '{', annotations: [] }])), 'fixture');
  const invalidResult = await invalid.generate(request(), new AbortController().signal);
  assert.equal(invalidResult.status, 'invalid'); assert.equal(invalidResult.usage?.inputTokens, 100);
  for (const [status, kind, retryable] of [[401, 'auth', false], [429, 'rate_limit', true], [500, 'server', true], [400, 'configuration', false]] as const) {
    const adapter = new OpenAiAdapter(fixtureTransport({ error: { message: 'DO_NOT_LOG_SECRET', type: 'error' } }, status), 'fixture-secret');
    await assert.rejects(adapter.generate(request(), new AbortController().signal), (error: unknown) => {
      assert.ok(error instanceof AiError); assert.equal(error.kind, kind); assert.equal(error.retryable, retryable);
      assert.ok(!String(error).includes('SECRET')); return true;
    });
  }
});

test('shared runtime replays exact validated fixtures offline and invalidates input/model/prompt/schema/provider', async () => temporary(async dir => {
  const p = new FixtureProvider(); const conf = await config();
  const live = new AiRuntime(registry(p), conf, 'live', dir);
  assert.ok(await live.execute('openai', 'extraction', ['r'], request(), x => ExtractionSchema.parse(x)));
  assert.equal(p.calls, 1); assert.equal(live.summary().calls, 0); // Test adapter cannot claim API usage.
  const replay = new AiRuntime(registry(p), conf, 'replay', dir);
  assert.ok(await replay.execute('openai', 'extraction', ['r'], request(), x => ExtractionSchema.parse(x)));
  assert.equal(p.calls, 1);
  for (const modified of [
    { ...request(), model: 'different' }, { ...request(), instructions: 'changed' }, { ...request(), input: {} },
    { ...request(), schema: { type: 'array' } }, { ...request(), parameters: { ...request().parameters, maxOutputTokens: 1024 } },
  ]) assert.equal(await replay.execute('openai', 'extraction', ['r'], modified, x => x), null);
  const another = new FixtureProvider('other');
  assert.equal(await new AiRuntime(registry(another), conf, 'replay', dir).execute('other', 'extraction', ['r'], request(), x => x), null);
  const endpoint = new FixtureProvider('openai', 'fixture://other-endpoint');
  assert.equal(await new AiRuntime(registry(endpoint), conf, 'replay', dir).execute('openai', 'extraction', ['r'], request(), x => x), null);
  assert.equal(another.calls + endpoint.calls, 0);
  assert.equal(await live.execute('openai', 'extraction', ['r'], request(), x => x), null); assert.equal(p.calls, 1);
  const file = join(dir, (await readdir(dir))[0]!); const cache = JSON.parse(await readFile(file, 'utf8')); cache.response.data = { changed: true };
  await writeFile(file, JSON.stringify(cache));
  assert.equal(await replay.execute('openai', 'extraction', ['r'], request(), x => x), null); assert.equal(p.calls, 1);
}));

test('timeout and retry budgets are enforced independently of adapter and auth stops immediately', async () => temporary(async dir => {
  let attempts = 0;
  const transient = new FixtureProvider('openai', 'fixture://retry', async () => { if (attempts++ < 2) throw new AiError('rate_limit', true); return response(empty('r')); });
  const conf = { ...await config(), maxRetries: 2 };
  const runtime = new AiRuntime(registry(transient), conf, 'live', join(dir, 'retry'), async () => {});
  assert.ok(await runtime.execute('openai', 'extraction', ['r'], request(), x => x)); assert.equal(attempts, 3); assert.equal(runtime.records[0]!.errors, 2);
  let cancelled = 0;
  const hung = new FixtureProvider('openai', 'fixture://timeout', async (_r, s) => new Promise(() => { s.addEventListener('abort', () => cancelled++); }));
  const timeout = new AiRuntime(registry(hung), { ...conf, timeoutMs: 5 }, 'live', join(dir, 'timeout'), async () => {});
  assert.equal(await timeout.execute('openai', 'extraction', ['r'], request(), x => x), null); assert.equal(hung.calls, 3); assert.equal(cancelled, 3);
  const unauthorized = new FixtureProvider('openai', 'fixture://auth', async () => { throw new AiError('auth'); });
  const auth = new AiRuntime(registry(unauthorized), conf, 'live', join(dir, 'auth'), async () => {});
  const result = await aiBaseline(feed, auth); assert.equal(unauthorized.calls, 1); assert.equal(result.rows.length, 220);
  assert.ok(result.review.some(r => r.reason === 'ai_error:skipped_after_auth')); assertProductIntegrity(result);
}));

test('schema and contextual evidence reject invented values, foreign subjects, qualifiers and offer scope', () => {
  const row: SourceRow = { row_id: 'r', supplier: 's', supplier_sku: 'r', raw_title: 'Demo mouse', raw_specs: '2.4GHz + BT', price: '$1', stock: 1 };
  const data = { attribute: 'wireless_frequency' as const, value: 2.4, unit: 'GHz', scope: 'product' as const, conditions: ['radio_link'], evidence: { rowId: 'r', field: 'raw_specs' as const, quote: '2.4GHz' } };
  assert.equal(additionFact(data, row).value, 2.4);
  assert.throws(() => additionFact({ ...data, value: 4, evidence: { ...data.evidence, quote: '2.4GHz' } }, row));
  const accessory = { ...row, raw_specs: 'Silicone, compatible with AeroBuds Pro' };
  assert.throws(() => additionFact({ attribute: 'compatible_model', value: 'AeroBuds', unit: null, scope: 'product', conditions: ['compatible_device'], evidence: { rowId: 'r', field: 'raw_specs', quote: 'compatible with AeroBuds' } }, accessory));
  for (const change of [{ value: 5 }, { evidence: { ...data.evidence, rowId: 'other' } }, { evidence: { ...data.evidence, quote: '5GHz' } }, { scope: 'offer' as const }, { conditions: [] }]) assert.throws(() => additionFact({ ...data, ...change }, row));
  for (const raw_specs of ['not 2.4GHz', 'up to 2.4GHz', 'compatible with 2.4GHz device', '2.4GHz with charging case']) assert.throws(() => additionFact(data, { ...row, raw_specs }));
  assert.throws(() => evidenceFor({ rowId: 'r', field: 'raw_specs', quote: 'BT' }, { ...row, raw_specs: 'BT and BT' }));
  assert.equal(AdditionSchema.safeParse({ ...data, attribute: 'sound_quality' }).success, false);
  assert.equal(ExtractionSchema.safeParse({ ...empty('r'), instruction: 'override' }).success, false);
  const schema = jsonSchema(ExtractionSchema); assert.equal(schema.additionalProperties, false);
});

const suiteReply = async (r: AiRequest): Promise<AiResponse> => {
  const input = r.input as { row: { rowId: string; raw_specs: string } }; const id = input.row.rowId;
  const expected = suite.cases.find(c => c.rowId === id);
  const facts = (expected?.expectedAdditions ?? []).map(f => ({ ...f, evidence: { rowId: id, field: 'raw_specs', quote:
    f.attribute === 'bluetooth_supported' ? 'BT' : f.attribute === 'wireless_frequency' ? '2.4GHz' :
    f.attribute === 'colour_temperature_count' ? '5 colour temps' : f.attribute === 'size_count' ? '3 sizes' : 'compatible with AeroBuds Pro' } }));
  return response({ ...empty(id), facts });
};

test('B2 fixture pipeline preserves B1 safety and demonstrates semantic eval with complete accounting and deterministic replay', async () => temporary(async dir => {
  const before = productBaseline(feed); const targets = selectAiRows(before); assert.equal(targets.length, 41);
  assert.equal(targets.filter(id => suite.cases.some(c => c.rowId === id)).length, 12);
  const p = new FixtureProvider('openai', 'fixture://suite', suiteReply); const conf = await config();
  const runtime = new AiRuntime(registry(p), conf, 'live', dir);
  const after = await aiBaseline(feed, runtime); assertProductIntegrity(after);
  assert.deepEqual(evaluate(after, labels), evaluate(before, labels));
  const score = evaluateSemantic(after, suite); assert.equal(score.errors.length, 0); assert.equal(score.correct, 11); assert.equal(score.precision.value, 1);
  const control = evaluateSemantic(before, suite); assert.equal(control.missing, 11); assert.equal(control.precision.value, null);
  const replay = await aiBaseline([...feed].reverse(), new AiRuntime(registry(p), conf, 'replay', dir));
  assert.deepEqual(after, replay); assert.equal(p.calls, 41);
  assert.equal(after.facts.filter(f => f.rule.startsWith('B2:')).length, 11);
  const corrupted = structuredClone(after); corrupted.products[0]!.identities[0]!.evidence[0]!.quote = 'absent'; assert.throws(() => assertProductIntegrity(corrupted));
}));

test('Astra matching is opt-in advisory and cannot authorize unknown variants or incompatible groups', async () => temporary(async dir => {
  const rows: SourceRow[] = ['Demo mouse black', 'Demo mouse', 'Demo mouse white'].map((raw_title, i) => ({ row_id: String(i), raw_title, raw_specs: '2.4GHz + BT', supplier: 's', supplier_sku: String(i), stock: 1, price: '$1' }));
  const models: string[] = [];
  const p = new FixtureProvider('openai', 'fixture://matching', async r => {
    if (r.schemaName === 'semantic_extraction_v1') return response(empty((r.input as { row: { rowId: string } }).row.rowId));
    models.push(r.model); const data = r.input as { rows: { rowId: string; raw_title: string }[] };
    return response({ rowIds: data.rows.map(x => x.rowId), decision: 'merge', evidence: data.rows.map(x => ({ rowId: x.rowId, field: 'raw_title', quote: x.raw_title })) });
  });
  const conf = await config(); conf.matching.enabled = true;
  const result = await aiBaseline(rows, new AiRuntime(registry(p), conf, 'live', dir), 'matching');
  assert.equal(result.groups.length, 3); assert.equal(models.length, 2); assert.ok(models.every(m => m === 'gpt-6-astra'));
  assert.ok(result.review.some(r => r.reason === 'identity:ai_advisory_merge'));
}));

test('new semantic cohort excludes holdout and reports unexpected/absent additions and identity errors', () => {
  const wrong = structuredClone(suite); wrong.cases[0]!.rowId = labels.cases.find(c => c.split === 'holdout')!.rowIds[0]!;
  assert.throws(() => validateSemantic(wrong, labels, hash(feedText)));
  const result = productBaseline(feed); const c = suite.cases.find(c => c.expectedAdditions.length)!;
  const row = feed.find(r => r.row_id === c.rowId)!;
  const fact = additionFact({ ...c.expectedAdditions[0]!, attribute: 'colour_temperature_count', value: 5, evidence: { rowId: c.rowId, field: 'raw_specs', quote: '5 colour temps' } }, row);
  result.facts.push({ ...fact, value: 99 });
  result.products.find(p => p.rowIds.includes(c.rowId))!.category = 'other';
  const score = evaluateSemantic(result, suite); assert.equal(score.unexpected, 1); assert.ok(score.errors.some(e => e.kind === 'category'));
});

test('B2 CLI requires explicit mode/cache, default code never calls API even with an environment key', async () => temporary(async dir => {
  const run = (...args: string[]) => spawnSync(process.execPath, ['dist/src/cli.js', ...args], { encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: 'fixture-do-not-use', FEED_PATH: 'supplier_feed.json', TAXONOMY_PATH: 'taxonomy.json', LABELS_PATH: 'eval/labels.json' } });
  const invalid = run('pipeline', '--baseline', 'b2', '--out', dir, '--run-id', 'no-mode'); assert.equal(invalid.status, 1); assert.match(invalid.stderr, /explicit/);
  const code = run('pipeline', '--out', dir, '--run-id', 'code'); assert.equal(code.status, 0, code.stderr);
  const saved = JSON.parse(await readFile(join(dir, 'code/report.json'), 'utf8')); assert.equal(saved.mode, 'code-only'); assert.equal(saved.api.calls, 0);
  assert.equal(run('pipeline', '--baseline', 'b1', '--ai-mode', 'live', '--out', dir, '--run-id', 'wrong-options').status, 1);
  const missing = run('pipeline', '--baseline', 'b2', '--ai-mode', 'replay', '--ai-cache', join(dir, 'empty-cache'), '--out', dir, '--run-id', 'replay-missing');
  assert.equal(missing.status, 1); const [partial] = await readRun(join(dir, 'replay-missing')); assert.equal(partial.status, 'partial'); assert.equal(partial.api.calls, 0); assert.equal(partial.audit.accountedRows, 220);
  await exportBenchmark([join(dir, 'replay-missing')], 'eval/labels.json', dir, 'partial-history');
  const history = await readFile(join(dir, 'partial-history/observations.jsonl'), 'utf8'); assert.match(history, /"status":"partial"/); assert.match(history, /"mode":"replay"/);
}));

test('DI fixture run is labeled test and cannot enter real benchmark history; legacy reports remain readable', async () => temporary(async dir => {
  const service = new PipelineService(registry(new FixtureProvider('openai', 'fixture://di', suiteReply)));
  await service.run({ feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: dir, runId: 'fixture', baseline: 'b2', aiMode: 'live', aiCache: join(dir, 'cache') });
  const [report, result] = await readRun(join(dir, 'fixture')); assert.equal(report.mode, 'test'); assert.equal(report.api.calls, 0);
  await assert.rejects(exportBenchmark([join(dir, 'fixture')], 'eval/labels.json', dir, 'rejected'), /test fixtures/);
  for (const path of ['reports/B0', 'reports/B1-v2']) {
    const [old, oldResult] = await readRun(path);
    assert.equal(compareReports(old, report, oldResult, result).comparable, false);
  }
  const control = JSON.parse(readFileSync('reports/B1-v2/report.json', 'utf8')) as RunReport;
  const after = structuredClone(control); after.schemaVersion = '3'; after.hashes.semanticChecks = 'new-suite'; after.metrics = [{ name: 'semantic.recall', value: 1, numerator: 11, denominator: 11, unit: 'ratio', scope: 'development', qualityStatus: 'provisional', availability: 'measured' }];
  control.hashes.semanticChecks = 'old-suite'; control.metrics = [{ ...after.metrics[0]!, value: 0 }];
  assert.equal(compareReports(control, after, result, result).metricDeltas.find(x => x.name === 'semantic.recall')!.delta, null);
}));

test('cost includes cache writes, unknown billing stays null, and local preflight is not counted as a request', async () => temporary(async dir => {
  const conf = await config();
  const p: AiProvider = { id: 'openai', endpoint: 'fixture://billing', kind: 'real', generate: async () => response(empty('r')) };
  // Pure in-memory billing fixture: never exported or represented as a live benchmark.
  const runtime = new AiRuntime(registry(p), conf, 'live', join(dir, 'billing'));
  assert.ok(await runtime.execute('openai', 'extraction', ['r'], request(), x => x));
  const summary = runtime.summary(); assert.equal(summary.calls, 1); assert.equal(summary.tokens, 120);
  assert.equal(summary.cost, (60 * 4 + 10 * 0.4 + 30 * 5 + 20 * 20) / 1_000_000);
  runtime.records[0]!.attemptUsage[0]!.cacheWriteTokens = null; assert.equal(runtime.summary().cost, null);
  runtime.records[0]!.attemptUsage[0] = null; assert.equal(runtime.summary().tokens, null);
  const localFailure: AiProvider = { ...p, validateConfiguration: () => { throw new AiError('auth'); }, generate: async () => { throw new Error('must never execute'); } };
  const preflight = new AiRuntime(registry(localFailure), conf, 'live', join(dir, 'preflight'));
  assert.equal(await preflight.execute('openai', 'extraction', ['r'], request(), x => x), null);
  assert.equal(preflight.summary().calls, 0); assert.equal(preflight.records[0]!.error, 'auth');
  assert.equal(preflight.summary().errors, 0);
}));

test('development selection excludes other rows from requests, and failed schema keeps B1 observations', async () => temporary(async dir => {
  const dev = new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds));
  const p = new FixtureProvider('openai', 'fixture://dev', async r => {
    const id = (r.input as { row: { rowId: string } }).row.rowId; assert.ok(dev.has(id));
    return response({ ...empty(id), facts: [{ attribute: 'sound_quality', value: 'best' }] });
  });
  const runtime = new AiRuntime(registry(p), await config(), 'live', dir);
  const result = await aiBaseline(feed, runtime, 'extraction', dev);
  assert.equal(p.calls, 12); assert.deepEqual(result.facts, productBaseline(feed).facts);
  assert.equal(runtime.records.filter(r => r.status === 'error').length, 12);
  assert.equal(result.rows.length, 220); assertProductIntegrity(result);
  await assert.rejects(aiBaseline(feed, new AiRuntime(registry(p), await config(), 'live', dir), 'matching'), /disabled/);
}));
