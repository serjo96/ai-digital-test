import 'reflect-metadata';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PipelineService, saveJson } from './app.js';
import { OllamaAdapter } from './ai/ollama.js';
import { ProviderRegistry, type AiCallRecord } from './ai/contracts.js';
import { canonicalJson } from './ai/runtime.js';
import { readAiConfig } from './ai/config.js';
import { matchingRequest, extractionRequest } from './ai/pipeline.js';
import { experimentMetrics, shadowPairs, strictGate, type ExperimentMetrics } from './ai/experiment-metrics.js';
import { hash } from './baseline.js';
import { productBaseline } from './products.js';
import { validateSemantic } from './semantic-quality.js';
import { codeVersion } from './reports.js';
import { exportBenchmark } from './benchmark.js';
import type { SourceRow, Labels } from './types.js';
import type { ProductResult } from './domain.js';
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const previous = process.argv[2], root = process.argv[3];
if (!previous || !root) throw new Error('Usage: ollama-shadow-recovery OLD_EXPERIMENT NEW_EXPERIMENT');
await mkdir(root);
const old = await json(join(previous, 'manifest.json'));
if (hash(canonicalJson(old)) !== (await json(join(previous, 'manifest-hash.json'))).hash) throw new Error('old manifest integrity');
for (const [path, expected] of Object.entries(old.hashes)) if (hash(await readFile(path, 'utf8')) !== expected) throw new Error('frozen input changed');
const rows = await json('supplier_feed.json') as SourceRow[], labels = await json('eval/labels.json') as Labels;
const suite = validateSemantic(await json('eval/stage3-checks.json'), labels, hash(await readFile('supplier_feed.json', 'utf8')));
const config = await readAiConfig(join(previous, 'config-qwen3-4b.json'));
const oldRequests = old.requests.find((r: { model: string }) => r.model === config.extraction.model);
for (const r of oldRequests.extraction) if (r.hash !== hash(canonicalJson(extractionRequest(rows.find(row => row.row_id === r.rowId)!, config.extraction)))) throw new Error('extraction changed');
const endpoint = 'http://127.0.0.1:11434';
const [version, tags] = await Promise.all(['/api/version', '/api/tags'].map(async path => { const r = await fetch(endpoint + path, { signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error('discovery failed'); return r.json(); })) as [{ version: string }, { models: { name: string; digest: string }[] }];
if (version.version !== config.extraction.identity!.serverVersion || !tags.models.some(m => m.name === config.extraction.model && m.digest === config.extraction.identity!.digest)) throw new Error('model identity changed');
const requests = shadowPairs.map(rowIds => matchingRequest(rowIds.map(id => rows.find(r => r.row_id === id)!), config.matching, { rowIds, status: 'shadow' }));
const manifest = { version: 'stage3-ollama-matching-v2', createdAt: new Date().toISOString(), previousExperiment: previous, previousManifestHash: hash(canonicalJson(old)),
  reason: 'Ollama 0.9.6 rejected tuple prefixItems/items:false. Matching schema v3 uses equivalent homogeneous array minItems=maxItems=2. No extraction rerun or prompt/parameter/label change.',
  code: await codeVersion(), endpoint, server: version, config, requests, requestHashes: requests.map(r => hash(canonicalJson(r))),
  promptHash: hash(requests[0]!.instructions), schemaHash: hash(canonicalJson(requests[0]!.schema)),
  parametersHash: hash(canonicalJson(requests[0]!.parameters)),
  gemma: 'not retried: all 12 development jobs exhausted server retries (model unable to load)', full: 'not permitted: extraction gate failed' };
await saveJson(join(root, 'manifest.json'), manifest);
await saveJson(join(root, 'manifest-hash.json'), { hash: hash(canonicalJson(manifest)) });
await saveJson(join(root, 'config-qwen3-4b.json'), config);
const runs: string[] = [];
for (const mode of ['live', 'replay'] as const) {
  const runId = `ollama-qwen3-4b-shadow-${mode}`;
  console.log(`${runId}: starting`);
  const adapter = mode === 'live' ? new OllamaAdapter() : new OllamaAdapter(async () => { throw new Error('network forbidden'); });
  const service = new PipelineService(new ProviderRegistry(new Map([['ollama', () => adapter]])));
  try { await service.run({ feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: root, runId,
    baseline: 'b2', aiTask: 'matching', aiCohort: 'development', aiRows: suite.cases.map(c => c.rowId), aiPairs: shadowPairs,
    aiMode: mode, aiCache: join(root, 'ollama-qwen3-4b-shadow-cache'), aiConfig: join(root, 'config-qwen3-4b.json') }); }
  catch (e) { if (!(await json(join(root, runId, 'report.json'))).status) throw e; }
  const records = (await json(join(root, runId, 'ai.json'))).records as AiCallRecord[];
  if (records.length !== 8) throw new Error('shadow boundary violated');
  const result = await json(join(root, runId, 'result.json')) as ProductResult;
  if (canonicalJson(result) !== canonicalJson(productBaseline(rows))) throw new Error('shadow changed deterministic output');
  await saveJson(join(root, runId, 'normalized.json'), records.map(r => ({ rowIds: r.rowIds, status: r.status, diagnostics: r.diagnostics, data: r.status === 'success' ? r.response?.data : null })));
  const metrics = experimentMetrics(records, result, suite, rows, labels);
  await saveJson(join(root, runId, 'experiment-metrics.json'), metrics);
  console.log(`${runId}: ${metrics.quality.successful}/8 valid; dangerous ${metrics.quality.dangerousMerges}, unconfirmed ${metrics.quality.unconfirmedMerges}`);
  runs.push(join(root, runId));
}
const [live, replay] = await Promise.all(runs.map(r => json(join(r, 'experiment-metrics.json')))) as [ExperimentMetrics, ExperimentMetrics];
const replayEqual = canonicalJson(live.quality) === canonicalJson(replay.quality);
if (!replayEqual) throw new Error('shadow replay mismatch');
await saveJson(join(root, 'replay-comparison.json'), { replayEqual, deterministicDecisionsUnchanged: true, live: live.quality, replay: replay.quality });
const qwen = await json(join(previous, 'ollama-qwen3-4b-development-live/experiment-metrics.json')) as ExperimentMetrics;
const gemma = await json(join(previous, 'ollama-gemma4-12b-development-live/experiment-metrics.json')) as ExperimentMetrics;
const comparison = { annotation: 'provisional', acceptedProductBaseline: 'B1-v2', architectureComplete: live.quality.successful > 0 && qwen.quality.successful > 0 && replayEqual,
  developmentQualityConfirmed: false, fullExecuted: false, sourceExtractionExperiment: previous, sourceMatchingExperiment: root,
  qwen: { extraction: qwen, matching: live, gate: strictGate(qwen, live, replayEqual, true) },
  gemma: { extraction: gemma, matching: null, gate: false, status: 'server unable to load model; quality N/A' } };
await saveJson(join(root, 'comparison.json'), comparison);
await writeFile(join(root, 'comparison.md'), `# Ollama: итог этапа 3\n\nЭкспериментальный development baseline, provisional. Принятый продуктовый baseline: B1-v2.\n\n| Модель | Extraction valid | Proposed correct/extra/missing | Accepted correct/extra/missing | Shadow valid | Dangerous/unconfirmed | Median/p95 extraction ms |\n|---|---:|---:|---:|---:|---:|---:|\n| qwen3:4b | ${qwen.quality.successful}/12 | ${qwen.quality.proposed.correct}/${qwen.quality.proposed.unexpected}/${qwen.quality.proposed.missing} | ${qwen.quality.accepted.correct}/${qwen.quality.accepted.unexpected}/${qwen.quality.accepted.missing} | ${live.quality.successful}/8 | ${live.quality.dangerousMerges}/${live.quality.unconfirmedMerges} | ${qwen.performance.medianMs?.toFixed(1)}/${qwen.performance.p95Ms?.toFixed(1)} |\n| gemma4:12b | 0/12 (server load error) | N/A | 0/0/11 | N/A | N/A | N/A (no generation) |\n\nArchitecture complete: ${comparison.architectureComplete}; development quality: not confirmed. Full run: not permitted. Replay matches.\n\nMatching schema v2 transport failures remain in the original experiment; v3 fixes tuple encoding only. No extraction or Gemma rerun. Costs/cache unknown: N/A; cold loads remain included. See comparison.json, manifests, normalized responses, raw cache and benchmark for exact diagnostics and timings.\n`, { flag: 'wx' });
await exportBenchmark([...runs, ...['qwen3-4b', 'gemma4-12b'].flatMap(model => ['live', 'replay'].map(mode => join(previous, `ollama-${model}-development-${mode}`)))], 'eval/labels.json', root, 'benchmark');
await writeFile(join(root, 'experiment-benchmark.jsonl'), [
  { provider: 'ollama', model: 'qwen3:4b', cohort: 'development', mode: 'live', origin: 'real', ...qwen },
  { provider: 'ollama', model: 'gemma4:12b', cohort: 'development', mode: 'live', origin: 'real', ...gemma },
  { provider: 'ollama', model: 'qwen3:4b', cohort: 'shadow-v3', mode: 'live', origin: 'real', ...live },
  { provider: 'ollama', model: 'qwen3:4b', cohort: 'shadow-v3', mode: 'replay', origin: 'real', ...replay },
].map(x => JSON.stringify(x)).join('\n') + '\n', { flag: 'wx' });
console.log(`Completed: ${root}/comparison.md`);
