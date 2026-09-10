import 'reflect-metadata';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PipelineService, saveJson } from './app.js';
import { OllamaAdapter } from './ai/ollama.js';
import { ProviderRegistry, type AiCallRecord } from './ai/contracts.js';
import { canonicalJson } from './ai/runtime.js';
import { hash } from './baseline.js';
import { experimentMetrics } from './ai/experiment-metrics.js';
import { validateSemantic } from './semantic-quality.js';
import type { SourceRow, Labels } from './types.js';
import type { ProductResult } from './domain.js';
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));

/** Replay a frozen explicit cohort without discovery, credentials, or a running server. */
export async function replayOllamaRun(original: string, cache: string, output: string, runId: string) {
  const [report, trace] = await Promise.all([json(join(original, 'report.json')), json(join(original, 'ai.json'))]);
  if (trace.records.some((r: AiCallRecord) => r.provider !== 'ollama' || r.origin !== 'real')) throw new Error('expected real Ollama trace');
  for (const [name, path] of [['feed', 'supplier_feed.json'], ['taxonomy', 'taxonomy.json'], ['labels', 'eval/labels.json'], ['checks', 'eval/stage2-checks.json'], ['semanticChecks', 'eval/stage3-checks.json']] as const) {
    if (hash(await readFile(path, 'utf8')) !== report.hashes[name]) throw new Error(`frozen ${name} changed`);
  }
  await mkdir(output, { recursive: true });
  const config = join(output, `${runId}-config.json`); await saveJson(config, trace.config);
  const service = new PipelineService(new ProviderRegistry(new Map([['ollama', () => new OllamaAdapter(async () => { throw new Error('network forbidden during replay'); })]])));
  try { await service.run({ feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: output, runId,
    baseline: 'b2', aiMode: 'replay', aiCache: cache, aiConfig: config,
    aiTask: report.config.aiTask, aiCohort: report.config.aiCohort,
    ...(report.config.aiRows ? { aiRows: report.config.aiRows } : {}), ...(report.config.aiPairs ? { aiPairs: report.config.aiPairs } : {}) }); }
  catch (error) { if (!(await json(join(output, runId, 'report.json'))).status) throw error; }
  const saved = await json(join(output, runId, 'report.json'));
  const records = (await json(join(output, runId, 'ai.json'))).records as AiCallRecord[];
  const decisionsEqual = report.decisionsHash === saved.decisionsHash;
  const outcomes = (rs: AiCallRecord[]) => rs.map(r => ({ key: r.key, status: r.status, error: r.error, diagnostics: r.diagnostics, response: r.response }));
  const validationEqual = canonicalJson(outcomes(records)) === canonicalJson(outcomes(trace.records));
  const result = await json(join(output, runId, 'result.json')) as ProductResult;
  const rows = await json('supplier_feed.json') as SourceRow[], labels = await json('eval/labels.json') as Labels;
  const suite = validateSemantic(await json('eval/stage3-checks.json'), labels, report.hashes.feed);
  const scoring = report.config.aiRows?.length === 1 ? { ...suite, cases: suite.cases.filter(c => report.config.aiRows.includes(c.rowId)) } : suite;
  const metrics = experimentMetrics(records, result, scoring, rows, labels);
  const previous = await json(join(original, 'experiment-metrics.json'));
  const qualityEqual = canonicalJson(metrics.quality) === canonicalJson(previous.quality);
  await saveJson(join(output, runId, 'experiment-metrics.json'), metrics);
  await saveJson(join(output, runId, 'verification.json'), { original, cache, decisionsEqual, validationEqual, qualityEqual, networkCalls: saved.api.calls,
    rawJsonDecodedAgain: true, successful: decisionsEqual && validationEqual && qualityEqual && saved.api.calls === 0 });
  if (!decisionsEqual || !validationEqual || !qualityEqual || saved.api.calls !== 0) throw new Error('replay mismatch');
  return join(output, runId);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , original, cache, output, id] = process.argv;
  if (!original || !cache || !output || !id) throw new Error('Usage: replay-ollama-run ORIGINAL_RUN CACHE NEW_OUTPUT RUN_ID');
  replayOllamaRun(original, cache, output, id).then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
}
