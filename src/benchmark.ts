import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { assertAccounting, hash } from './baseline.js';
import { isProductResult } from './domain.js';
import { assertProductIntegrity } from './products.js';
import { validateLabels, evaluate } from './evaluation.js';
import { countMetric, metricsFor, type Metric } from './metrics.js';
import type { BaselineResult, RunReport } from './types.js';

export async function readRun(dir: string): Promise<[RunReport, BaselineResult]> {
  const report = JSON.parse(await readFile(join(dir, 'report.json'), 'utf8')) as RunReport;
  const result = JSON.parse(await readFile(join(dir, 'result.json'), 'utf8')) as BaselineResult;
  if (!['success', 'partial'].includes(report.status) || !['1', '2', '3'].includes(report.schemaVersion) || (report.status === 'partial' && report.schemaVersion !== '3') || hash(JSON.stringify(result)) !== report.decisionsHash) throw new Error(`invalid or modified run: ${dir}`);
  assertAccounting(result.rows.map(r => r.source), result);
  if (/^B[12]-/.test(report.rulesVersion) && !isProductResult(result)) throw new Error('product result missing');
  if (isProductResult(result)) assertProductIntegrity(result);
  return [report, result];
}

export async function exportBenchmark(dirs: string[], labelsPath: string, out: string, runId: string): Promise<string> {
  if (!dirs.length || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) throw new Error('benchmark requires run directories and a safe run ID');
  const labelsText = await readFile(labelsPath, 'utf8');
  const points: object[] = [];
  const runs: { runId: string; directory: string; status: string; cohort: string | null; rules: string | null; wallTimeMs: number; decisionsHash: string | null; implementationHash: string | null }[] = [];
  const seen = new Set<string>();
  for (const directory of dirs) {
    let success = true;
    try { await access(join(directory, 'report.json')); } catch { success = false; }
    let metrics: Metric[]; let metadata: Record<string, unknown>;
    if (success) {
      const [report, result] = await readRun(directory);
      if (report.mode === 'test' || report.ai?.origin === 'test') throw new Error('test fixtures cannot enter real benchmark history');
      if (report.schemaVersion !== '1') {
        // Preserve measurements made by that implementation; never silently recalculate history.
        if (!Array.isArray(report.metrics) || new Set(report.metrics.map(m => m.name)).size !== report.metrics.length ||
          report.metrics.some(m => typeof m.name !== 'string' || (m.value !== null && !Number.isFinite(m.value)))) throw new Error(`invalid saved metrics: ${directory}`);
        metrics = report.metrics;
      } else {
        if (report.hashes.labels !== hash(labelsText)) throw new Error(`benchmark labels hash changed: ${directory}`);
        const labels = validateLabels(JSON.parse(labelsText), result.rows.map(r => r.source));
        if (JSON.stringify(evaluate(result, labels)) !== JSON.stringify(report.evaluation)) throw new Error(`saved evaluation differs from decisions: ${directory}`);
        metrics = metricsFor(report, result, labels);
      }
      const cohort = hash(JSON.stringify([report.hashes.feed, report.hashes.taxonomy, report.hashes.labels, report.evaluation.split, 'metrics-v1']));
      metadata = { runId: report.runId, createdAt: report.createdAt, status: report.status, rules: report.rulesVersion, schema: report.schemaVersion,
        mode: report.mode, ai: report.ai ?? null, config: report.config,
        cohort, hashes: report.hashes, code: report.code, timingProtocol: report.timing?.protocol ?? 'cli-through-result-v1', environment: report.timing ?? null };
      runs.push({ runId: report.runId, directory: resolve(directory), status: report.status, cohort, rules: report.rulesVersion, wallTimeMs: report.wallTimeMs,
        decisionsHash: report.decisionsHash, implementationHash: report.code.implementationHash });
    } else {
      const failure = JSON.parse(await readFile(join(directory, 'failure.json'), 'utf8')) as { status: string; runId: string; createdAt: string; wallTimeMs: number; errors: string[] };
      if (failure.status !== 'failed' || !Array.isArray(failure.errors) || !Number.isFinite(failure.wallTimeMs)) throw new Error(`invalid failure artifact: ${directory}`);
      metrics = [countMetric('errors.execution', 1, 'run'), { ...countMetric('timing.wall', failure.wallTimeMs, 'run'), unit: 'ms' }];
      metadata = { runId: failure.runId, createdAt: failure.createdAt, status: 'failed', cohort: null, hashes: null, errors: failure.errors, timingProtocol: 'failed-attempt-v1' };
      runs.push({ runId: failure.runId, directory: resolve(directory), status: 'failed', cohort: null, rules: null, wallTimeMs: failure.wallTimeMs, decisionsHash: null, implementationHash: null });
    }
    const id = String(metadata.runId);
    if (seen.has(id)) throw new Error(`duplicate benchmark run ID: ${id}`);
    seen.add(id);
    for (const metric of metrics) points.push({ benchmarkSchema: 'metrics-v1', ...metadata, ...metric,
      metricCohort: metric.name.startsWith('semantic.') ? hash(JSON.stringify([metadata.cohort, (metadata.hashes as RunReport['hashes'])?.semanticChecks ?? null])) : /^(categories|facts|reconciliation)\.check_accuracy$/.test(metric.name) ? hash(JSON.stringify([metadata.cohort, (metadata.hashes as RunReport['hashes'])?.checks ?? null])) : metadata.cohort });
  }
  const directory = join(out, runId);
  await mkdir(out, { recursive: true }); await mkdir(directory);
  await writeFile(join(directory, 'observations.jsonl'), points.map(p => JSON.stringify(p)).join('\n') + '\n', { flag: 'wx' });
  await writeFile(join(directory, 'summary.json'), JSON.stringify({ schema: 'metrics-v1', createdAt: new Date().toISOString(), runs, observations: points.length }, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(directory, 'README.md'), '# Benchmark history\n\nOne JSON object per run/metric in observations.jsonl. Null means unavailable, never zero. Compare quality within metricCohort only; keep provisional and human_verified separate. Timing is a single local observation, not a statistical speedup estimate. Failed attempts have no quality scores.\n\n' + runs.map(r => `- ${r.runId}: ${r.status}; ${r.rules ?? 'N/A'}; wall ${r.wallTimeMs} ms`).join('\n') + '\n', { flag: 'wx' });
  return directory;
}
