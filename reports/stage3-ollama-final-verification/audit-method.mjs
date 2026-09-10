// Run from repository root. Read-only analysis of saved real responses; no provider calls.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { AdditionSchema, additionFact } = await import(pathToFileURL(`${process.cwd()}/dist/src/ai/schemas.js`));
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const rows = await read('supplier_feed.json');
const runs = [
 ['qwen3:4b', 'smoke', 'reports/stage3-ollama-v1/ollama-qwen3-4b-smoke-live'],
 ['qwen3:4b', 'development', 'reports/stage3-ollama-v1/ollama-qwen3-4b-development-live'],
 ['gemma4:12b', 'development', 'reports/stage3-ollama-v1/ollama-gemma4-12b-development-live'],
 ['qwen3:4b', 'shadow-incompatible-schema-v2', 'reports/stage3-ollama-v1/ollama-qwen3-4b-shadow-live'],
 ['qwen3:4b', 'shadow-schema-v3', 'reports/stage3-ollama-v2/ollama-qwen3-4b-shadow-live'],
];
const summaries = [];
for (const [model, cohort, directory] of runs) {
 const { records } = await read(`${directory}/ai.json`), metrics = await read(`${directory}/experiment-metrics.json`);
 const report = await read(`${directory}/report.json`);
 let checkedAdditions = 0, sourceSupported = 0, scopeErrors = 0, conditionErrors = 0, unitErrors = 0, valueTypeErrors = 0, wrongPairIds = 0;
 const errors = [];
 for (const r of records) {
  const data = r.response?.data;
  if (r.role === 'matching' && data?.rowIds && JSON.stringify([...data.rowIds].sort()) !== JSON.stringify([...r.rowIds].sort())) wrongPairIds++;
  for (const raw of Array.isArray(data?.facts) ? data.facts : []) {
   const parsed = AdditionSchema.safeParse(raw); if (!parsed.success) continue;
   const f = parsed.data; checkedAdditions++;
   if (f.scope !== 'product') scopeErrors++;
   const conditions = f.attribute === 'wireless_frequency' ? ['radio_link'] : f.attribute === 'compatible_model' ? ['compatible_device'] : [];
   if (JSON.stringify([...f.conditions].sort()) !== JSON.stringify(conditions)) conditionErrors++;
   if (f.unit !== (f.attribute === 'wireless_frequency' ? 'GHz' : null)) unitErrors++;
   const valueType = f.attribute === 'compatible_model' ? 'string' : f.attribute === 'bluetooth_supported' ? 'boolean' : 'number';
   if (typeof f.value !== valueType) valueTypeErrors++;
   try { additionFact(f, rows.find(row => row.row_id === r.rowIds[0])); sourceSupported++; }
   catch (e) { errors.push({ rowId: r.rowIds[0], attribute: f.attribute, value: f.value, scope: f.scope, conditions: f.conditions, reason: e.message }); }
  }
 }
 const responses = records.filter(r => r.response !== null).length;
 summaries.push({ model, cohort, directory, origin: 'real', status: report.status, modelQualityAvailable: responses > 0,
  answeredJobs: responses, unansweredJobs: records.length - responses, stages: metrics.quality.stages,
  proposedQuality: responses ? metrics.quality.proposed : null, acceptedPipeline: metrics.quality.accepted,
  additions: checkedAdditions ? { checked: checkedAdditions, sourceSupported, sourceUnsupported: checkedAdditions - sourceSupported, scopeErrors, conditionErrors, unitErrors, valueTypeErrors, errors } : null,
  citations: responses ? metrics.quality.falseCitations : null, wrongPairIds: responses && records[0]?.role === 'matching' ? wrongPairIds : null,
  dangerousMerges: responses && records[0]?.role === 'matching' ? metrics.quality.dangerousMerges : null,
  unconfirmedMerges: responses && records[0]?.role === 'matching' ? metrics.quality.unconfirmedMerges : null,
  rejectedAdditions: metrics.quality.rejectedAdditions, unknowns: responses ? metrics.quality.unknowns : null, review: metrics.quality.review,
  calls: report.api.calls, retries: report.api.retries, tokens: report.api.tokens, cost: null,
  medianWallMs: metrics.performance.medianMs, p95WallMs: metrics.performance.p95Ms,
  loadMs: metrics.performance.loadMs, generationMs: metrics.performance.generationMs, pipelineWallMs: report.wallTimeMs });
}
const replay = await Promise.all(['qwen3-4b-smoke', 'qwen3-4b-development', 'gemma4-12b-development', 'qwen3-4b-shadow'].map(id => read(`reports/stage3-ollama-final-verification/ollama-${id}-replay/verification.json`)));
const summary = { version: 'stage3-audit-v1', createdAt: new Date().toISOString(), annotation: 'provisional', architectureComplete: replay.every(r => r.successful),
 productQualityConfirmed: false, acceptedProductBaseline: 'B1-v2', fullRunExecuted: false, stage4Started: false,
 totals: { liveJobs: summaries.reduce((n,r) => n+r.answeredJobs+r.unansweredJobs,0), calls: summaries.reduce((n,r) => n+r.calls,0), retries: summaries.reduce((n,r) => n+r.retries,0), openaiCalls: 0, finalVerificationCalls: 0, localComputeCost: null },
 summaries, replay, limitations: ['Gemma did not load; its model quality is N/A.', 'Schema-v2 shadow failures are integration overhead, excluded from schema-v3 quality.', 'Provisional labels and two unknown pairs retained without correction.', 'No final verifier or holdout evaluation.'] };
await writeFile('reports/stage3-ollama-final-verification/summary.json', JSON.stringify(summary,null,2)+'\n', { flag: 'wx' });
await writeFile('reports/stage3-ollama-final-verification/observations.jsonl', summaries.map(r => JSON.stringify({ version: summary.version, mode: 'live', ...r })).join('\n')+'\n', { flag: 'wx' });
console.log(JSON.stringify({ totals: summary.totals, summaries: summaries.map(({model,cohort,additions,...r}) => ({ model,cohort,valid:r.stages.semantic, additions: additions ? {...additions,errors:undefined}:null, wrongPairIds:r.wrongPairIds })) },null,2));
