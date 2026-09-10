import 'reflect-metadata';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PipelineService, saveJson } from './app.js';
import { hash, validateInputs } from './baseline.js';
import { validateLabels, evaluate } from './evaluation.js';
import { productBaseline, assertProductIntegrity } from './products.js';
import { readAiConfig } from './ai/config.js';
import { OllamaAdapter } from './ai/ollama.js';
import { ProviderRegistry, type AiCallRecord } from './ai/contracts.js';
import { canonicalJson } from './ai/runtime.js';
import { extractionRequest, matchingRequest, selectAiRows } from './ai/pipeline.js';
import { validateSemantic } from './semantic-quality.js';
import { experimentMetrics, shadowPairs, pairLabel, strictGate, technicallyStable, type ExperimentMetrics } from './ai/experiment-metrics.js';
import { codeVersion } from './reports.js';
import { exportBenchmark } from './benchmark.js';
import type { ProductResult } from './domain.js';
import type { RunReport } from './types.js';

const endpoint = 'http://127.0.0.1:11434';
/**
 * Defaults preserve the original two-model experiment.  A new server build
 * needs a new immutable profile identity, so a retry may select one model and
 * a profile suffix without rewriting the historical manifest/configuration.
 */
const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const models = (argument('--models')?.split(',').filter(Boolean) ?? ['qwen3-4b', 'gemma4-12b']);
const profileSuffix = argument('--profile-suffix') ?? '';
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const equal = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);

/** Read-only discovery. Never installs models; pins both the exact tag digest and server. */
async function discovery() {
  const responses = await Promise.all(['/api/version', '/api/tags'].map(path => fetch(endpoint + path, { signal: AbortSignal.timeout(10000) })));
  if (responses.some(r => !r.ok)) throw new Error('Ollama discovery failed');
  const [server, tags] = await Promise.all(responses.map(r => r.json())) as [{ version: string }, { models: { name: string; digest: string }[] }];
  return { server, tags };
}
export async function runExperiment(root: string, resumeSmoke = false): Promise<void> {
  if (!resumeSmoke) await mkdir(root); // Immutable experiment namespace; continuation uses saved artifacts, never overwrites.
  const feedText = await readFile('supplier_feed.json', 'utf8');
  const rows = validateInputs(JSON.parse(feedText), await json('taxonomy.json'));
  const labels = validateLabels(await json('eval/labels.json'), rows);
  const suite = validateSemantic(await json('eval/stage3-checks.json'), labels, hash(feedText));
  const ids = suite.cases.map(c => c.rowId);
  if (ids.length !== 12 || suite.cases.reduce((n, c) => n + c.expectedAdditions.length, 0) !== 11) throw new Error('frozen development cohort changed');
  const b1 = productBaseline(rows); assertProductIntegrity(b1);
  if (hash(JSON.stringify(b1)) !== (await json('reports/B1-v2/report.json')).decisionsHash || rows.length !== 220 || selectAiRows(b1).length !== 41) throw new Error('B1 control changed');
  if (!equal(shadowPairs.map(p => pairLabel(p, labels)), ['unknown', 'unknown', 'positive', 'positive', 'negative', 'negative', 'negative', 'negative'])) throw new Error('matching labels changed');
  const configs = await Promise.all(models.map(model => readAiConfig(`config/ai.ollama-${model}${profileSuffix}.json`)));
  const discovered = await discovery();
  function checkDiscovery(value: Awaited<ReturnType<typeof discovery>>) {
    for (const config of configs) if (config.extraction.identity?.serverVersion !== value.server.version ||
      !value.tags.models.some(m => m.name === config.extraction.model && m.digest === config.extraction.identity?.digest)) throw new Error('Ollama model/server identity differs from pinned profile');
  }
  checkDiscovery(discovered);
  const base = { feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: root, semanticChecks: 'eval/stage3-checks.json' };
  const live = new PipelineService(new ProviderRegistry(new Map([['ollama', () => new OllamaAdapter()]])));
  const offline = new PipelineService(new ProviderRegistry(new Map([['ollama', () => new OllamaAdapter(async () => { throw new Error('network forbidden in replay'); })]])));
  const manifest = { version: 'stage3-ollama-experiment-v1', createdAt: new Date().toISOString(), endpoint, discovered,
    code: await codeVersion(), annotationStatus: 'provisional', extractionRows: ids, smokeRow: 'row_11462769c5', matchingPairs: shadowPairs,
    hashes: Object.fromEntries(await Promise.all(['supplier_feed.json', 'taxonomy.json', 'eval/labels.json', 'eval/stage2-checks.json', 'eval/stage3-checks.json'].map(async path => [path, hash(await readFile(path, 'utf8'))]))),
    profiles: configs, smokeConfig: { ...configs[0], maxRetries: 0 },
    requests: configs.map(config => ({ model: config.extraction.model,
      extraction: selectAiRows(b1).map(id => { const request = extractionRequest(rows.find(r => r.row_id === id)!, config.extraction); return { rowId: id, request, hash: hash(canonicalJson(request)), promptHash: hash(request.instructions), schemaHash: hash(canonicalJson(request.schema)), parametersHash: hash(canonicalJson(request.parameters)), inputHash: hash(canonicalJson(request.input)) }; }),
      matching: shadowPairs.map(rowIds => { const request = matchingRequest(rowIds.map(id => rows.find(r => r.row_id === id)!), config.matching, { rowIds, status: 'shadow' }); return { rowIds, request, hash: hash(canonicalJson(request)), promptHash: hash(request.instructions), schemaHash: hash(canonicalJson(request.schema)), parametersHash: hash(canonicalJson(request.parameters)), inputHash: hash(canonicalJson(request.input)) }; }) })),
    gate: '12/12 valid; 11/11 expected; zero extra, false citations or dangerous merges; 8/8 matching valid; B1 checks and replay unchanged',
    concurrency: 1, holdoutEvaluation: false, localComputeCost: null };
  if (resumeSmoke) {
    const previous = await json(join(root, 'manifest.json'));
    if (!equal(previous.requests, manifest.requests) || !equal(previous.hashes, manifest.hashes) || !equal(previous.profiles, manifest.profiles) || !equal(previous.matchingPairs, shadowPairs)) throw new Error('frozen experiment inputs changed');
    if ((await json(join(root, 'manifest-hash.json'))).hash !== hash(canonicalJson(previous))) throw new Error('manifest integrity');
    await saveJson(join(root, 'smoke-continuation.json'), { createdAt: new Date().toISOString(), code: manifest.code, originalManifestHash: hash(canonicalJson(previous)),
      reason: 'Smoke transport/JSON/schema passed. Semantic rejection is a measured quality failure, not an integration incompatibility. Continue frozen development without another smoke or changes to prompts/schema/parameters/labels.' });
  } else {
    await saveJson(join(root, 'manifest.json'), manifest);
    await saveJson(join(root, 'manifest-hash.json'), { hash: hash(canonicalJson(manifest)) });
    for (const [i, model] of models.entries()) await saveJson(join(root, `config-${model}.json`), configs[i]);
    await saveJson(join(root, `config-${models[0]!}-smoke.json`), { ...configs[0]!, maxRetries: 0 });
    await live.run({ ...base, runId: 'B1-control-code', baseline: 'b1' });
  }
  const benchmarkRuns = [join(root, 'B1-control-code')];
  const outcomes: { model: string; extraction: ExperimentMetrics; matching: ExperimentMetrics | null; replayEqual: boolean; baselineSafe: boolean; eligible: boolean }[] = [];
  async function run(model: string, cohort: 'smoke' | 'development' | 'shadow' | 'full') {
    checkDiscovery(await discovery());
    const id = `ollama-${model}-${cohort}`;
    const cache = join(root, `${id}-cache`);
    const selected = cohort === 'smoke' ? ['row_11462769c5'] : cohort === 'full' ? undefined : ids;
    const task = cohort === 'shadow' ? 'matching' as const : 'extraction' as const;
    const aiConfig = join(root, cohort === 'smoke' ? `config-${models[0]!}-smoke.json` : `config-${model}.json`);
    for (const mode of ['live', 'replay'] as const) {
      console.log(`${id}-${mode}: starting`);
      const options = { ...base, runId: `${id}-${mode}`, baseline: 'b2' as const, aiMode: mode, aiCache: cache, aiConfig, aiTask: task,
        aiCohort: cohort === 'full' ? 'full_input' as const : 'development' as const,
        ...(selected ? { aiRows: selected } : {}), ...(cohort === 'shadow' ? { aiPairs: shadowPairs } : {}) };
      try { await (mode === 'live' ? live : offline).run(options); }
      catch (error) { if (!(await json(join(root, `${id}-${mode}/report.json`))).status) throw error; }
      benchmarkRuns.push(join(root, `${id}-${mode}`));
      const trace = await json(join(root, `${id}-${mode}/ai.json`)) as { records: AiCallRecord[] };
      if (trace.records.length !== (cohort === 'smoke' ? 1 : cohort === 'shadow' ? 8 : cohort === 'full' ? 41 : 12)) throw new Error('request boundary violated');
      const result = await json(join(root, `${id}-${mode}/result.json`)) as ProductResult;
      assertProductIntegrity(result);
      const scoring = cohort === 'smoke' ? { ...suite, cases: suite.cases.filter(c => selected!.includes(c.rowId)) } : suite;
      const metrics = experimentMetrics(trace.records, result, scoring, rows, labels);
      await saveJson(join(root, `${id}-${mode}/experiment-metrics.json`), metrics);
      await saveJson(join(root, `${id}-${mode}/normalized.json`), trace.records.map(r => ({ rowIds: r.rowIds, status: r.status, diagnostics: r.diagnostics,
        data: r.status === 'success' ? r.response?.data : null })));
      console.log(`${id}-${mode}: ${metrics.quality.successful}/${metrics.quality.jobs} valid; additions ${metrics.quality.accepted.correct}, missing ${metrics.quality.accepted.missing}; dangerous merges ${metrics.quality.dangerousMerges}`);
    }
    const [a, b] = await Promise.all(['live', 'replay'].map(mode => json(join(root, `${id}-${mode}/experiment-metrics.json`)))) as [ExperimentMetrics, ExperimentMetrics];
    const [ar, br] = await Promise.all(['live', 'replay'].map(mode => json(join(root, `${id}-${mode}/result.json`)))) as [ProductResult, ProductResult];
    const replayEqual = equal(a.quality, b.quality) && equal(ar, br);
    await saveJson(join(root, `${id}-replay-comparison.json`), { replayEqual, liveQuality: a.quality, replayQuality: b.quality, decisionsEqual: equal(ar, br) });
    if (!replayEqual) throw new Error('replay mismatch');
    const report = await json(join(root, `${id}-live/report.json`)) as RunReport;
    const control = await json(join(root, 'B1-control-code/report.json')) as RunReport;
    const baselineSafe = equal(evaluate(ar, labels), evaluate(b1, labels)) && equal(report.checks, control.checks) && (task !== 'matching' || equal(ar, b1));
    return { metrics: a, replayEqual, baselineSafe, records: (await json(join(root, `${id}-live/ai.json`))).records as AiCallRecord[] };
  }
  const smokeModel = models[0]!;
  const smoke = resumeSmoke ? { metrics: await json(join(root, `ollama-${smokeModel}-smoke-live/experiment-metrics.json`)) as ExperimentMetrics, replayEqual: (await json(join(root, `ollama-${smokeModel}-smoke-replay-comparison.json`))).replayEqual } : await run(smokeModel, 'smoke');
  if (resumeSmoke) benchmarkRuns.push(...['live', 'replay'].map(mode => join(root, `ollama-${smokeModel}-smoke-${mode}`)));
  if (!smoke.replayEqual || ['transport', 'completion', 'json', 'schema'].some(stage => smoke.metrics.quality.stages[stage]?.passed !== 1)) {
    await saveJson(join(root, 'stop.json'), { reason: 'smoke did not pass; integration review and a new experiment namespace required', smoke: smoke.metrics });
    await exportBenchmark(benchmarkRuns, 'eval/labels.json', root, resumeSmoke ? 'benchmark-complete' : 'benchmark');
    return;
  }
  const development: Awaited<ReturnType<typeof run>>[] = [];
  for (const model of models) {
    const result = await run(model, 'development'); development.push(result);
    if (!technicallyStable(result.records, 12)) break;
  }
  for (const [i, result] of development.entries()) {
    const model = models[i]!;
    const matching = technicallyStable(result.records, 12) ? await run(model, 'shadow') : null;
    outcomes.push({ model, extraction: result.metrics, matching: matching?.metrics ?? null,
      replayEqual: result.replayEqual && (matching?.replayEqual ?? true), baselineSafe: result.baselineSafe && (matching?.baselineSafe ?? false),
      eligible: !!matching && strictGate(result.metrics, matching.metrics, result.replayEqual && matching.replayEqual, result.baselineSafe && matching.baselineSafe) });
  }
  const eligible = outcomes.filter(o => o.eligible).sort((a, b) => (a.extraction.performance.medianMs! - b.extraction.performance.medianMs!) || (a.extraction.performance.p95Ms! - b.extraction.performance.p95Ms!) || models.indexOf(a.model as typeof models[number]) - models.indexOf(b.model as typeof models[number]));
  const selected = eligible[0]?.model;
  const full = selected ? await run(selected, 'full') : null;
  await saveJson(join(root, 'comparison.json'), { status: 'experimental-development-baseline', annotation: 'provisional', outcomes, selectedFullModel: selected ?? null,
    full: full ? { metrics: full.metrics, replayEqual: full.replayEqual, baselineSafe: full.baselineSafe } : null,
    acceptedProductBaseline: 'B1-v2', architectureComplete: outcomes.some(o => o.extraction.quality.successful > 0 && o.matching !== null && o.matching.quality.successful > 0 && o.replayEqual), developmentQualityConfirmed: eligible.length > 0 });
  const lines = ['# Ollama: experimental development baseline', '', 'Provisional labels; no holdout evaluation. Cold load is included in latency. Local compute cost and unavailable cache usage: N/A.', '',
    '| Model | Extraction valid | Proposed correct / extra / missing | Accepted correct / extra / missing | Citations | Matching valid | Dangerous / unconfirmed merge | Median / p95 ms | Gate |', '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...outcomes.map(o => { const e = o.extraction.quality, m = o.matching?.quality, p = o.extraction.performance; return `| ${o.model} | ${e.successful}/${e.jobs} | ${e.proposed.correct}/${e.proposed.unexpected}/${e.proposed.missing} | ${e.accepted.correct}/${e.accepted.unexpected}/${e.accepted.missing} | ${e.falseCitations} | ${m ? `${m.successful}/${m.jobs}` : 'N/A'} | ${m?.dangerousMerges ?? 'N/A'}/${m?.unconfirmedMerges ?? 'N/A'} | ${p.medianMs?.toFixed(1)}/${p.p95Ms?.toFixed(1)} | ${o.eligible ? 'pass' : 'fail'} |`; }), '',
    `Full experiment: ${selected ?? 'not permitted: strict development threshold not met'}. Accepted product baseline: B1-v2. Matching remains shadow.`, '',
    'Detailed validation denominators, per-request timings, rejected additions, scope/condition reasons, review counts and replay checks are in comparison.json and each run’s experiment-metrics.json.'];
  await writeFile(join(root, 'comparison.md'), lines.join('\n') + '\n', { flag: 'wx' });
  await exportBenchmark(benchmarkRuns, 'eval/labels.json', root, resumeSmoke ? 'benchmark-complete' : 'benchmark');
  await writeFile(join(root, 'experiment-benchmark.jsonl'), outcomes.flatMap(o => [
    { provider: 'ollama', model: o.model, cohort: 'development', mode: 'live', origin: 'real', ...o.extraction },
    ...(o.matching ? [{ provider: 'ollama', model: o.model, cohort: 'shadow', mode: 'live', origin: 'real', ...o.matching }] : []),
  ]).map(value => JSON.stringify(value)).join('\n') + '\n', { flag: 'wx' });
  console.log(`Completed: ${root}/comparison.md`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2];
  if (!root) throw new Error('Usage: node dist/src/ollama-experiment.js NEW_REPORT_DIRECTORY');
  runExperiment(root, process.argv[3] === '--resume-smoke').catch(error => { console.error(error); process.exitCode = 1; });
}
