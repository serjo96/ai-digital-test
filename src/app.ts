import { Inject, Injectable, Module } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { assertAccounting, baseline, hash, titleKey, validateInputs } from './baseline.js';
import { evaluate, validateLabels } from './evaluation.js';
import { codeVersion, compareReports, comparisonMarkdown, reportMarkdown } from './reports.js';
import { productBaseline } from './products.js';
import { isProductResult } from './domain.js';
import { evaluateQuality, validateQuality } from './quality.js';
import { metricsFor } from './metrics.js';
import { readRun } from './benchmark.js';
import type { RunReport } from './types.js';
import { AI_PROVIDERS, ProviderRegistry } from './ai/contracts.js';
import { OpenAiAdapter } from './ai/openai.js';
import { AiRuntime } from './ai/runtime.js';
import { readAiConfig } from './ai/config.js';
import { aiBaseline, selectedTaskRows } from './ai/pipeline.js';
import { evaluateSemantic, validateSemantic } from './semantic-quality.js';

export interface RunOptions { feed: string; taxonomy: string; labels: string; out: string; runId: string; baseline?: 'b0' | 'b1' | 'b2'; checks?: string;
  aiConfig?: string; aiMode?: 'live' | 'replay'; aiCache?: string; semanticChecks?: string; aiTask?: 'extraction' | 'matching'; aiCohort?: 'development' | 'full_input' }
const baseConfig = { titleNormalization: 'trim+collapse-whitespace+lowercase', dollarCurrency: 'USD', split: 'development' as const };
export const saveJson = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

async function reserve(root: string, id: string): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error('run ID must contain only letters, digits, dots, underscores and hyphens');
  await mkdir(root, { recursive: true });
  const directory = join(root, id);
  await mkdir(directory); // Exclusive: a saved baseline can never be overwritten by a rerun.
  return directory;
}

@Injectable()
export class PipelineService {
  constructor(@Inject(AI_PROVIDERS) private readonly providers: ProviderRegistry) {}
  async run(options: RunOptions, start = performance.now()): Promise<string> {
    const directory = await reserve(options.out, options.runId);
    let runtime: AiRuntime | undefined;
    try {
      const [feedText, taxonomyText, labelsText, code] = await Promise.all([
        readFile(options.feed, 'utf8'), readFile(options.taxonomy, 'utf8'), readFile(options.labels, 'utf8'), codeVersion(),
      ]);
      const taxonomy: unknown = JSON.parse(taxonomyText);
      const rows = validateInputs(JSON.parse(feedText), taxonomy);
      const labels = validateLabels(JSON.parse(labelsText), rows);
      const selected = options.baseline ?? 'b1';
      if (selected === 'b2' && (!options.aiMode || !options.aiCache)) throw new Error('B2 requires explicit --ai-mode live|replay and --ai-cache DIR');
      if (selected !== 'b2' && (options.aiConfig || options.aiMode || options.aiCache || options.aiTask || options.aiCohort)) throw new Error('AI options require --baseline b2');
      const ai = selected === 'b2' ? await readAiConfig(options.aiConfig ?? 'config/ai.json') : undefined;
      const config = { ...baseConfig, baseline: selected, ...(ai ? { ai, aiTask: options.aiTask ?? 'extraction', aiCohort: options.aiCohort ?? 'full_input' } : {}) };
      const eligible = options.aiCohort === 'development' ? new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds)) : undefined;
      const checksText = selected !== 'b0' ? await readFile(options.checks ?? 'eval/stage2-checks.json', 'utf8') : null;
      const suite = checksText ? validateQuality(JSON.parse(checksText), labels, hash(feedText)) : null;
      const semanticText = options.semanticChecks || selected === 'b2' ? await readFile(options.semanticChecks ?? 'eval/stage3-checks.json', 'utf8') : null;
      const semanticSuite = semanticText ? validateSemantic(JSON.parse(semanticText), labels, hash(feedText)) : null;
      if (ai) runtime = new AiRuntime(this.providers, ai, options.aiMode!, options.aiCache!);
      const pipelineStart = performance.now();
      const result = runtime ? await aiBaseline(rows, runtime, options.aiTask ?? 'extraction', eligible) : selected === 'b1' ? productBaseline(rows) : baseline(rows);
      const pipelineMs = performance.now() - pipelineStart;
      assertAccounting(rows, result);
      const evaluation = evaluate(result, labels);
      const priceStatuses: Record<string, number> = {};
      for (const row of result.rows) priceStatuses[row.price.status] = (priceStatuses[row.price.status] ?? 0) + 1;
      const report: RunReport = {
        schemaVersion: runtime || semanticSuite ? '3' : '2', rulesVersion: runtime ? 'B2-v1' : selected === 'b1' ? 'B1-v2' : 'B0-v1', runId: options.runId, createdAt: new Date().toISOString(),
        status: runtime?.records.some(r => r.status === 'error') ? 'partial' : 'success',
        mode: runtime ? runtime.records.some(r => r.origin === 'test') ? 'test' : options.aiMode! : 'code-only', code, config,
        hashes: { feed: hash(feedText), taxonomy: hash(taxonomyText), labels: hash(labelsText), config: hash(JSON.stringify(config)), ...(checksText ? { checks: hash(checksText) } : {}), ...(semanticText ? { semanticChecks: hash(semanticText) } : {}) },
        audit: {
          inputRows: rows.length, accountedRows: result.rows.length, lostRows: 0, duplicateAssignments: 0,
          suppliers: new Set(rows.map(r => r.supplier)).size, taxonomySize: (taxonomy as string[]).length,
          emptySpecs: rows.filter(r => !r.raw_specs.trim()).length, emptyTitles: rows.filter(r => !r.raw_title.trim()).length,
          emptyPrices: rows.filter(r => !r.price.trim()).length, normalizedTitles: new Set(rows.map(r => titleKey(r.raw_title))).size,
          nonProducts: result.rows.filter(r => r.outcome === 'non_product').length,
          reviewRows: isProductResult(result) ? new Set(result.review.flatMap(r => r.rowIds)).size : result.rows.filter(r => r.outcome === 'review').length,
          groups: result.groups.length, groupedRows: result.groups.reduce((n, g) => n + g.rowIds.length, 0),
          repeatedGroups: result.groups.filter(g => g.rowIds.length > 1).length, priceStatuses,
        },
        ...(suite && isProductResult(result) ? { checks: evaluateQuality(result, suite) } : {}),
        ...(semanticSuite && isProductResult(result) ? { semanticChecks: evaluateSemantic(result, semanticSuite) } : {}),
        ...(runtime ? { ai: { targetRows: selectedTaskRows(productBaseline(rows), options.aiTask ?? 'extraction', eligible).length, jobs: runtime.records.length,
          failedJobs: runtime.records.filter(r => r.status === 'error').length, origin: runtime.records.some(r => r.origin === 'test') ? 'test' as const : 'real' as const,
          requestHashes: runtime.records.map(r => r.key) } } : {}),
        timing: { protocol: 'cli-through-result-v1', node: process.version, platform: process.platform, arch: process.arch, pipelineMs },
        evaluation, generation: null, verifier: null, api: runtime?.summary() ?? { calls: 0, errors: 0, tokens: 0, cost: 0 },
        wallTimeMs: performance.now() - start, decisionsHash: hash(JSON.stringify(result)),
      };
      // Success marker is written last. Validation failures produce no partial result.
      await saveJson(join(directory, 'result.json'), result);
      await saveJson(join(directory, 'diagnostics.json'), result.rows.filter(r => r.reasons.length).map(r => ({ rowId: r.source.row_id, outcome: r.outcome, reasons: r.reasons })));
      if (runtime) await saveJson(join(directory, 'ai.json'), { version: 'ai-trace-v1', config: ai, records: runtime.records });
      report.wallTimeMs = performance.now() - start;
      report.metrics = metricsFor(report, result, labels);
      await saveJson(join(directory, 'metrics.json'), { schemaVersion: 'metrics-v1', runId: report.runId, createdAt: report.createdAt, rulesVersion: report.rulesVersion, hashes: report.hashes, split: report.evaluation.split, metrics: report.metrics });
      await writeFile(join(directory, 'report.md'), reportMarkdown(report), { flag: 'wx' });
      await saveJson(join(directory, 'report.json'), report);
      if (report.status !== 'success') throw new Error('Incomplete AI run; inspect report.json and ai.json');
      return directory;
    } catch (error) {
      await saveJson(join(directory, 'failure.json'), {
        status: 'failed', baseline: options.baseline ?? 'b1', runId: options.runId, createdAt: new Date().toISOString(), wallTimeMs: performance.now() - start,
        ...(runtime ? { api: runtime.summary(), mode: options.aiMode } : {}),
        errors: [error instanceof Error ? error.message : String(error)],
      });
      throw error;
    }
  }

  async compare(beforeDir: string | null, afterDir: string, out: string, runId: string): Promise<string> {
    const [after, afterResult] = await readRun(afterDir);
    const previous = beforeDir ? await readRun(beforeDir) : null;
    const comparison = compareReports(previous?.[0] ?? null, after, previous?.[1] ?? null, afterResult);
    const dir = await reserve(out, runId);
    await saveJson(join(dir, 'comparison.json'), comparison);
    await writeFile(join(dir, 'comparison.md'), comparisonMarkdown(comparison), { flag: 'wx' });
    if (!comparison.comparable || comparison.violations.length) throw new Error(`comparison failed; see ${dir}`);
    return dir;
  }
}

@Module({ providers: [PipelineService, { provide: AI_PROVIDERS,
  useFactory: () => new ProviderRegistry(new Map([['openai', () => new OpenAiAdapter()]])) }] })
export class AppModule {}
