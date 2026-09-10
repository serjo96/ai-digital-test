import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OllamaAdapter } from '../src/ai/ollama.js';
import { AiRuntime, canonicalJson } from '../src/ai/runtime.js';
import { AiError, ProviderRegistry, type AiProvider, type AiRequest, type AiResponse } from '../src/ai/contracts.js';
import { readAiConfig } from '../src/ai/config.js';
import { aiBaseline, extractionRequest } from '../src/ai/pipeline.js';
import { productBaseline } from '../src/products.js';
import { hash } from '../src/baseline.js';
import { shadowPairs, pairLabel, experimentMetrics, technicallyStable, strictGate } from '../src/ai/experiment-metrics.js';
import { validateSemantic } from '../src/semantic-quality.js';
import type { SourceRow, Labels } from '../src/types.js';
const read = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const temporary = async (fn: (dir: string) => Promise<void>) => { const dir = await mkdtemp(join(tmpdir(), 'ollama-test-')); try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); } };
const registry = (p: AiProvider) => new ProviderRegistry(new Map([[p.id, () => p]]));
const conf = () => readAiConfig('config/ai.ollama-qwen3-4b.json');
const feed = await read('supplier_feed.json') as SourceRow[];
const labels = await read('eval/labels.json') as Labels;
const suite = validateSemantic(await read('eval/stage3-checks.json'), labels, hash(await readFile('supplier_feed.json', 'utf8')));
const row = feed.find(r => r.row_id === 'row_11462769c5')!;
const empty = (id: string) => ({ rowId: id, facts: [], type: null, category: null, unknowns: [] });
const body = (data: unknown) => ({ model: 'qwen3:4b', done: true, done_reason: 'stop', message: { content: JSON.stringify(data) }, prompt_eval_count: 30, eval_count: 20, total_duration: 6000000, load_duration: 1000000, eval_duration: 4000000, prompt_eval_duration: 1000000 });
const fake = (reply: (r: AiRequest) => AiResponse | Promise<AiResponse>): AiProvider => ({ id: 'ollama', endpoint: 'fixture://ollama', kind: 'test', generate: async r => reply(r) });
const response = (data: unknown): AiResponse => ({ status: 'completed', data, model: 'qwen3:4b', requestId: null, usage: null, raw: JSON.stringify(data) });

test('Ollama native request maps pinned options, schema and timing; Gemma omits think and unknown usage stays null', async () => {
  for (const model of ['qwen3-4b', 'gemma4-12b']) {
    const config = await readAiConfig(`config/ai.ollama-${model}.json`);
    const adapter = new OllamaAdapter(async (url, init) => {
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      const sent = JSON.parse(String(init?.body));
      assert.equal(sent.stream, false); assert.deepEqual(sent.format, extractionRequest(row, config.extraction).schema);
      assert.deepEqual(sent.options, { temperature: 0, seed: 42, num_ctx: 8192, num_predict: 2048, top_k: 20, top_p: 0.9, repeat_penalty: 1 });
      assert.equal(sent.keep_alive, '5m'); assert.equal('think' in sent, model.startsWith('qwen')); if ('think' in sent) assert.equal(sent.think, false);
      assert.equal(sent.messages.length, 2); return new Response(JSON.stringify(body(empty(row.row_id))));
    }, undefined, 'test');
    const value = await adapter.generate(extractionRequest(row, config.extraction), new AbortController().signal);
    assert.equal(value.status, 'completed'); assert.equal(value.usage?.cachedInputTokens, null); assert.equal(value.usage?.cacheWriteTokens, null);
    assert.equal(value.timings?.loadMs, 1); assert.equal(value.timings?.generationMs, 4); assert.ok(value.raw);
  }
});

test('Ollama malformed envelope/content and truncation preserve raw content; HTTP retry classification is bounded', async () => {
  const request = extractionRequest(row, (await conf()).extraction);
  for (const [raw, status] of [['{', 'invalid'], [JSON.stringify({ ...body({}), message: { content: '{' } }), 'invalid'], [JSON.stringify({ ...body({}), done_reason: 'length' }), 'incomplete']] as const) {
    const result = await new OllamaAdapter(async () => new Response(raw), undefined, 'test').generate(request, new AbortController().signal);
    assert.equal(result.status, status); assert.equal(result.raw, raw);
  }
  for (const [status, retryable] of [[400, false], [429, true], [500, true]] as const) {
    await assert.rejects(new OllamaAdapter(async () => new Response('error', { status }), undefined, 'test').generate(request, new AbortController().signal), e => e instanceof AiError && e.retryable === retryable);
  }
});

test('raw invalid responses persist before validation and replay reproduces precise failure without transport', async () => temporary(async dir => {
  const config = await conf();
  const cases = [
    { data: { ...empty(row.row_id), extra: true }, stage: 'schema' },
    { data: { ...empty(row.row_id), facts: [{ attribute: 'colour_temperature_count', value: 5, unit: null, scope: 'product', conditions: [], evidence: { rowId: row.row_id, field: 'raw_specs', quote: 'invented' } }] }, stage: 'citations' },
    { data: { ...empty(row.row_id), facts: [{ attribute: 'colour_temperature_count', value: 5, unit: null, scope: 'offer', conditions: [], evidence: { rowId: row.row_id, field: 'raw_specs', quote: '5 colour temps' } }] }, stage: 'semantic' },
  ];
  for (const [i, item] of cases.entries()) {
    let calls = 0;
    const p = fake(() => { calls++; return response(item.data); });
    const live = new AiRuntime(registry(p), config, 'live', join(dir, String(i)));
    const result = await aiBaseline(feed, live, 'extraction', new Set([row.row_id]));
    assert.equal(calls, 1); assert.equal(live.records[0]!.diagnostics![item.stage]!.passed, false);
    assert.ok(live.records[0]!.diagnostics![item.stage]!.reason);
    const saved = await read(join(dir, String(i), `${live.records[0]!.key}.json`)); assert.ok(saved.response.raw); assert.equal(saved.attempts.length, 1);
    const replay = new AiRuntime(registry(fake(() => { throw new Error('network forbidden'); })), config, 'replay', join(dir, String(i)));
    assert.deepEqual(await aiBaseline(feed, replay, 'extraction', new Set([row.row_id])), result);
    assert.deepEqual(replay.records[0]!.diagnostics, live.records[0]!.diagnostics);
    assert.equal(replay.records[0]!.error, 'invalid_response'); assert.equal(replay.records[0]!.attempts, 0);
  }
}));

test('cache v2 isolates model digest/server and reads historical cache v1 without network', async () => temporary(async dir => {
  const config = await conf(); const request = extractionRequest(row, config.extraction);
  const p = fake(() => response(empty(row.row_id)));
  const live = new AiRuntime(registry(p), config, 'live', dir);
  await live.execute('ollama', 'extraction', [row.row_id], request, x => x);
  const replay = new AiRuntime(registry(fake(() => { throw new Error('offline'); })), config, 'replay', dir);
  for (const identity of [{ digest: 'a'.repeat(64), serverVersion: '0.9.6' }, { ...request.identity!, serverVersion: 'changed' }]) {
    assert.equal(await replay.execute('ollama', 'extraction', [row.row_id], { ...request, identity }, x => x), null);
  }
  const oldRequest = { ...request, model: 'legacy' }; delete oldRequest.identity;
  const key = hash(canonicalJson({ version: 'ai-cache-v1', provider: p.id, endpoint: p.endpoint, request: oldRequest }));
  const value = response(empty(row.row_id));
  await writeFile(join(dir, `${key}.json`), JSON.stringify({ version: 'ai-cache-v1', key, origin: 'test', responseHash: hash(canonicalJson(value)), response: value }));
  assert.ok(await replay.execute('ollama', 'extraction', [row.row_id], oldRequest, x => x));
}));

test('one transport retry, timeout, terminal error replay, and no schema regeneration', async () => temporary(async dir => {
  for (const kind of ['network', 'timeout'] as const) {
    let calls = 0;
    const p = fake(() => { calls++; throw new AiError(kind, true); });
    const config = await conf(); const request = extractionRequest(row, config.extraction);
    const runtime = new AiRuntime(registry(p), config, 'live', join(dir, kind), async () => {});
    assert.equal(await runtime.execute('ollama', 'extraction', [row.row_id], request, x => x), null); assert.equal(calls, 2);
    const replay = new AiRuntime(registry(fake(() => { throw new Error('offline'); })), config, 'replay', join(dir, kind));
    assert.equal(await replay.execute('ollama', 'extraction', [row.row_id], request, x => x), null);
    assert.equal(replay.records[0]!.error, kind); assert.equal(technicallyStable(runtime.records, 1), false);
  }
}));

test('explicit smoke/development boundaries are 1/12 in suite order and all shadow decisions preserve exact B1', async () => temporary(async dir => {
  const config = await conf();
  for (const ids of [[row.row_id], suite.cases.map(c => c.rowId)]) {
    const seen: string[] = [];
    const p = fake(request => { const id = (request.input as { row: { rowId: string } }).row.rowId; seen.push(id); return response(empty(id)); });
    await aiBaseline(feed, new AiRuntime(registry(p), config, 'live', join(dir, `extraction-${ids.length}`)), 'extraction', new Set(ids));
    assert.deepEqual(seen, ids);
  }
  for (const decision of ['merge', 'reject', 'unknown']) {
    const p = fake(request => { const members = (request.input as { rows: { rowId: string; raw_title: string }[] }).rows;
      return response({ rowIds: members.map(r => r.rowId), decision, confidence: 'high', reason: 'synthetic', evidence: members.map(r => ({ rowId: r.rowId, field: 'raw_title', quote: r.raw_title })) }); });
    const runtime = new AiRuntime(registry(p), config, 'live', join(dir, decision));
    const result = await aiBaseline(feed, runtime, 'matching', new Set(suite.cases.map(c => c.rowId)), shadowPairs);
    assert.deepEqual(result, productBaseline(feed)); assert.equal(runtime.records.length, 8); assert.equal(runtime.records.every(r => r.status === 'success'), true);
    assert.throws(() => experimentMetrics(runtime.records, result, suite, feed, labels), /test fixtures/);
  }
  assert.deepEqual(shadowPairs.map(p => pairLabel(p, labels)), ['unknown', 'unknown', 'positive', 'positive', 'negative', 'negative', 'negative', 'negative']);
}));

test('matching schema avoids tuple encoding and still requires exactly two strings plus confidence/reason', async () => {
  const { MatchingSchema, jsonSchema } = await import('../src/ai/schemas.js');
  const schema = jsonSchema(MatchingSchema);
  const array = (schema.properties as Record<string, Record<string, unknown>>).rowIds!;
  assert.equal(array.minItems, 2); assert.equal(array.maxItems, 2); assert.deepEqual(array.items, { type: 'string' }); assert.equal(array.prefixItems, undefined);
  const valid = { rowIds: ['a', 'b'], decision: 'unknown', confidence: 'low', reason: 'missing information', evidence: [] };
  assert.equal(MatchingSchema.safeParse(valid).success, true);
  for (const rowIds of [['a'], ['a', 'b', 'c'], ['a', 2]]) assert.equal(MatchingSchema.safeParse({ ...valid, rowIds }).success, false);
});

test('Ollama replay re-decodes raw JSON, preserves invalid JSON rejection and uses no server', async () => temporary(async dir => {
  const config = await conf(); const request = extractionRequest(row, config.extraction);
  let calls = 0;
  const adapter = new OllamaAdapter(async () => { calls++; return new Response(JSON.stringify({ ...body({}), message: { content: '{' } })); }, undefined, 'test');
  const live = new AiRuntime(registry(adapter), config, 'live', dir);
  assert.equal(await live.execute('ollama', 'extraction', [row.row_id], request, x => x), null);
  const offline = new OllamaAdapter(async () => { throw new Error('network forbidden'); }, undefined, 'test');
  const replay = new AiRuntime(registry(offline), config, 'replay', dir);
  assert.equal(await replay.execute('ollama', 'extraction', [row.row_id], request, x => x), null);
  assert.deepEqual(live.records[0]!.diagnostics, replay.records[0]!.diagnostics); assert.equal(calls, 1);
  const decoded = offline.replayResponse({ ...response({ synthetic: 'not raw' }), raw: JSON.stringify(body(empty(row.row_id))) });
  assert.deepEqual(decoded.data, empty(row.row_id));
}));

test('strict full gate rejects partial validation, missing/extra facts, dangerous shadow and mismatched replay', () => {
  // Synthetic gate unit data, never passed to experimentMetrics or benchmark export.
  const make = (jobs: number): import('../src/ai/experiment-metrics.js').ExperimentMetrics => ({ quality: {
    jobs, successful: jobs, accepted: { correct: 11, unexpected: 0, missing: 0, errors: [] },
    proposed: { correct: 11, unexpected: 0, malformed: 0, duplicate: 0 }, falseCitations: 0, dangerousMerges: 0,
  } }) as unknown as import('../src/ai/experiment-metrics.js').ExperimentMetrics;
  const e = make(12), m = make(8);
  assert.equal(strictGate(e, m, true, true), true);
  assert.equal(strictGate(e, m, false, true), false); assert.equal(strictGate(e, m, true, false), false);
  for (const field of ['correct', 'unexpected', 'missing'] as const) {
    const bad = structuredClone(e); bad.quality.accepted[field] = field === 'correct' ? 10 : 1;
    assert.equal(strictGate(bad, m, true, true), false);
  }
  const bad = structuredClone(m); bad.quality.dangerousMerges = 1; assert.equal(strictGate(e, bad, true, true), false);
  bad.quality.dangerousMerges = 0; bad.quality.successful = 7; assert.equal(strictGate(e, bad, true, true), false);
});
