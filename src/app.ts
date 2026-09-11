import { Inject, Injectable, Module } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { assertAccounting, baseline, hash, titleKey, validateInputs } from './baseline.js';
import { evaluate, validateLabels } from './evaluation.js';
import { codeVersion, compareReports, comparisonMarkdown, reportMarkdown } from './reports.js';
import { productBaseline } from './products.js';
import { isProductResult, isPublicationResult, type PublicationResult, type VerifiedClaim } from './domain.js';
import { evaluateQuality, validateQuality } from './quality.js';
import { metricsFor } from './metrics.js';
import { readRun } from './benchmark.js';
import type { RunReport } from './types.js';
import { AI_PROVIDERS, ProviderRegistry, type AiCallRecord } from './ai/contracts.js';
import { OllamaAdapter } from './ai/ollama.js';
import { OpenAiAdapter } from './ai/openai.js';
import { AppConfigModule } from './config/config.module.js';
import { APP_CONFIG } from './config/main.config.js';
import type { AppConfig } from './config/types.js';
import { AiRuntime } from './ai/runtime.js';
import { readAiConfig } from './ai/config.js';
import type { AiConfig } from './ai/config.js';
import { aiBaseline, selectedTaskRows } from './ai/pipeline.js';
import { evaluateSemantic, validateSemantic } from './semantic-quality.js';
import { readStage4Config } from './publication-config.js';
import { evaluateControlled, evaluateGenerated, generatedReviewGatePassed, generatedReviewTemplate, validateClaimSuite } from './publication-evaluation.js';
import { publicationPipeline } from './publication.js';

export interface RunOptions { feed: string; taxonomy: string; labels: string; out: string; runId: string; baseline?: 'b0' | 'b1' | 'b2' | 'b3'; checks?: string;
  aiRows?: string[]; aiPairs?: [string, string][]; aiConfig?: string; aiMode?: 'live' | 'replay'; aiCache?: string; semanticChecks?: string; aiTask?: 'extraction' | 'matching'; aiCohort?: 'development' | 'full_input'; claimChecks?: string; generatedChecks?: string; stage4Gate?: string; publicationSource?: string }
const baseConfig = { titleNormalization: 'trim+collapse-whitespace+lowercase', dollarCurrency: 'USD', split: 'development' as const };
export const saveJson = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

function publicationSummary(result: PublicationResult): NonNullable<RunReport['generation']> {
  const target = result.listings.filter(l => !l.withholdReasons.includes('not_in_cohort'));
  const reasons: Record<string, number> = {};
  for (const listing of target) for (const reason of listing.withholdReasons) reasons[reason] = (reasons[reason] ?? 0) + 1;
  return {
    products: target.length, drafts: target.filter(l => l.draftText !== null).length,
    ready: target.filter(l => l.status === 'ready').length, withheld: target.filter(l => l.status === 'withheld').length,
    review: target.filter(l => l.status === 'review').length,
    coveredRows: target.filter(l => l.status === 'ready').reduce((n, l) => n + (result.products.find(p => p.id === l.productId)?.rowIds.length ?? 0), 0),
    repairAttempted: target.filter(l => l.attempts.length === 2).length,
    repairSucceeded: target.filter(l => l.selectedAttempt === 2).length, reasons,
  };
}

function roleSummaries(runtime: AiRuntime): NonNullable<NonNullable<RunReport['ai']>['roles']> {
  const result: NonNullable<NonNullable<RunReport['ai']>['roles']> = {};
  for (const role of [...new Set(runtime.records.map(r => r.role))].sort()) {
    const records = runtime.records.filter(r => r.role === role && r.origin === 'real');
    const elapsed = records.map(r => r.elapsedMs).sort((a, b) => a - b);
    const percentile = (p: number) => elapsed.length ? elapsed[Math.max(0, Math.ceil(elapsed.length * p) - 1)]! : null;
    result[role] = { ...runtime.summary(role), jobs: records.length, medianWallMs: percentile(0.5), p95WallMs: percentile(0.95) };
  }
  return result;
}

/** B3 may safely recover an invalid first verification through its single bounded repair. */
export function hasUnrecoveredAiErrors(baseline: RunOptions['baseline'], records: Pick<AiCallRecord, 'status'>[], controlledErrors: number, publicationWithheld: number): boolean {
  return records.some(record => record.status === 'error') && (baseline !== 'b3' || controlledErrors > 0 || publicationWithheld > 0);
}

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
    let runtime: AiRuntime<AiConfig | import('./publication-config.js').Stage4Config> | undefined;
    try {
      const [feedText, taxonomyText, labelsText, code] = await Promise.all([
        readFile(options.feed, 'utf8'), readFile(options.taxonomy, 'utf8'), readFile(options.labels, 'utf8'), codeVersion(),
      ]);
      const taxonomy: unknown = JSON.parse(taxonomyText);
      const rows = validateInputs(JSON.parse(feedText), taxonomy);
      const labels = validateLabels(JSON.parse(labelsText), rows);
      const selected = options.baseline ?? 'b1';
      if ((selected === 'b2' || selected === 'b3') && (!options.aiMode || !options.aiCache)) throw new Error(`${selected.toUpperCase()} requires explicit --ai-mode live|replay and --ai-cache DIR`);
      if (!['b2', 'b3'].includes(selected) && (options.aiConfig || options.aiMode || options.aiCache || options.aiTask || options.aiCohort || options.claimChecks || options.generatedChecks || options.stage4Gate || options.publicationSource)) throw new Error('AI options require --baseline b2 or b3');
      if (selected === 'b2' && (options.claimChecks || options.generatedChecks || options.stage4Gate || options.publicationSource)) throw new Error('publication checks require --baseline b3');
      if (selected === 'b3' && (options.aiTask || options.aiRows || options.aiPairs || options.semanticChecks)) throw new Error('stage3 AI options are not valid for B3');
      if (options.publicationSource && (selected !== 'b3' || (options.aiCohort ?? 'full_input') !== 'development')) throw new Error('--publication-source requires B3 development');
      const ai = selected === 'b2' ? await readAiConfig(options.aiConfig ?? 'config/ai.json') : selected === 'b3' ? await readStage4Config(options.aiConfig ?? 'config/stage4.openai.json') : undefined;
      const config: RunReport['config'] = { ...baseConfig, baseline: selected, ...(ai ? selected === 'b2'
        ? { ai, aiTask: options.aiTask ?? 'extraction', aiCohort: options.aiCohort ?? 'full_input', ...(options.aiRows ? { aiRows: options.aiRows } : {}), ...(options.aiPairs ? { aiPairs: options.aiPairs } : {}) }
        : { ai, aiCohort: options.aiCohort ?? 'full_input', ...(options.publicationSource ? { publicationSourceRunId: '' } : {}) } : {}) };
      let eligible = options.aiCohort === 'development' ? new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds)) : undefined;
      const checksText = selected !== 'b0' ? await readFile(options.checks ?? 'eval/stage2-checks.json', 'utf8') : null;
      const suite = checksText ? validateQuality(JSON.parse(checksText), labels, hash(feedText)) : null;
      const semanticText = options.semanticChecks || selected === 'b2' ? await readFile(options.semanticChecks ?? 'eval/stage3-checks.json', 'utf8') : null;
      const semanticSuite = semanticText ? validateSemantic(JSON.parse(semanticText), labels, hash(feedText)) : null;
      if (options.aiRows) {
        if (!semanticSuite || new Set(options.aiRows).size !== options.aiRows.length || options.aiRows.some(id => !semanticSuite.cases.some(c => c.rowId === id))) throw new Error('explicit AI rows must belong to the frozen semantic cohort');
        eligible = new Set(options.aiRows);
      }
      if (options.aiPairs && options.aiPairs.some(pair => pair.length !== 2 || pair.some(id => !eligible?.has(id)))) throw new Error('matching pairs must belong to explicit cohort');
      if (ai) runtime = new AiRuntime(this.providers, ai, options.aiMode!, options.aiCache!);
      const pipelineStart = performance.now();
      const b1 = productBaseline(rows);
      const baseDecisionsHash = hash(JSON.stringify(b1));
      let publicationSource: PublicationResult | undefined;
      let publicationSourceHash: string | undefined;
      if (options.publicationSource) {
        const [sourceReport, sourceResult] = await readRun(options.publicationSource);
        if (!isPublicationResult(sourceResult) || sourceReport.schemaVersion !== '4' || sourceReport.rulesVersion !== 'B3-v1' || sourceReport.status !== 'success'
          || sourceReport.mode === 'test' || sourceReport.ai?.origin === 'test' || sourceReport.config.aiCohort !== 'development'
          || sourceReport.hashes.feed !== hash(feedText) || sourceReport.hashes.taxonomy !== hash(taxonomyText) || sourceReport.hashes.labels !== hash(labelsText)
          || JSON.stringify(sourceReport.config.ai) !== JSON.stringify(ai) || sourceReport.decisionsHash !== baseDecisionsHash
          || sourceReport.publicationHash !== hash(JSON.stringify(sourceResult.listings))) {
          throw new Error('publication source is not a compatible successful development run');
        }
        publicationSource = sourceResult;
        publicationSourceHash = sourceReport.publicationHash;
        config.publicationSourceRunId = sourceReport.runId;
      }
      const claimText = selected === 'b3' ? await readFile(options.claimChecks ?? 'eval/stage4-claims.json', 'utf8') : null;
      const claimSuite = claimText ? validateClaimSuite(JSON.parse(claimText), labels, b1, hash(feedText), baseDecisionsHash) : null;
      let gateText: string | null = null;
      if (selected === 'b3' && (options.aiCohort ?? 'full_input') === 'full_input') {
        if (!options.stage4Gate) throw new Error('full-input B3 requires --stage4-gate with a human-verified development run');
        gateText = await readFile(join(options.stage4Gate, 'report.json'), 'utf8');
        const [gate] = await readRun(options.stage4Gate);
        if (gate.schemaVersion !== '4' || gate.rulesVersion !== 'B3-v1' || gate.status !== 'success' || gate.mode === 'test' || gate.ai?.origin === 'test' || gate.config.aiCohort !== 'development'
          || gate.hashes.feed !== hash(feedText) || gate.hashes.taxonomy !== hash(taxonomyText) || gate.hashes.labels !== hash(labelsText) || gate.hashes.claimChecks !== hash(claimText!)
          || JSON.stringify(gate.config.ai) !== JSON.stringify(ai) || gate.verifier?.controlled.status !== 'human_verified' || gate.verifier.controlled.unsupported.leaked > 0
          || gate.verifier.controlled.disputed.leaked > 0 || gate.verifier.controlled.supported.allowed === 0 || gate.verifier.generated.status !== 'human_verified'
          || !generatedReviewGatePassed(gate.verifier.generated)) throw new Error('stage4 development gate is incomplete or failed');
      }
      let controlledClaims = new Map<string, VerifiedClaim[]>();
      const result = selected === 'b3'
        ? await publicationPipeline(b1, runtime as AiRuntime<import('./publication-config.js').Stage4Config>, ai as import('./publication-config.js').Stage4Config, options.aiCohort === 'development' ? new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds)) : undefined, claimSuite, publicationSource).then(run => { controlledClaims = run.controlledClaims; return run.result; })
        : runtime ? await aiBaseline(rows, runtime as AiRuntime<AiConfig>, options.aiTask ?? 'extraction', eligible, options.aiPairs) : selected === 'b1' ? b1 : baseline(rows);
      const pipelineMs = performance.now() - pipelineStart;
      assertAccounting(rows, result);
      const evaluation = evaluate(result, labels);
      const priceStatuses: Record<string, number> = {};
      for (const row of result.rows) priceStatuses[row.price.status] = (priceStatuses[row.price.status] ?? 0) + 1;
      const publicationHash = isPublicationResult(result) ? hash(JSON.stringify(result.listings)) : undefined;
      const controlled = evaluateControlled(claimSuite, controlledClaims);
      const generatedText = options.generatedChecks ? await readFile(options.generatedChecks, 'utf8') : null;
      const generated = isPublicationResult(result) ? evaluateGenerated(generatedText ? JSON.parse(generatedText) : null, result, publicationHash!) : null;
      const publication = isPublicationResult(result) ? publicationSummary(result) : null;
      const gateFailed = controlled.status === 'human_verified' && (controlled.unsupported.leaked > 0 || controlled.disputed.leaked > 0 || controlled.supported.allowed === 0);
      const executionFailed = runtime ? hasUnrecoveredAiErrors(selected, runtime.records, controlled.errors.length, publication?.withheld ?? 0) : false;
      const report: RunReport = {
        schemaVersion: selected === 'b3' ? '4' : runtime || semanticSuite ? '3' : '2', rulesVersion: selected === 'b3' ? 'B3-v1' : runtime ? 'B2-v1' : selected === 'b1' ? 'B1-v2' : 'B0-v1', runId: options.runId, createdAt: new Date().toISOString(),
        status: executionFailed || gateFailed ? 'partial' : 'success',
        mode: runtime ? runtime.records.some(r => r.origin === 'test') ? 'test' : options.aiMode! : 'code-only', code, config,
        hashes: { feed: hash(feedText), taxonomy: hash(taxonomyText), labels: hash(labelsText), config: hash(JSON.stringify(config)), ...(checksText ? { checks: hash(checksText) } : {}), ...(semanticText ? { semanticChecks: hash(semanticText) } : {}), ...(claimText ? { claimChecks: hash(claimText) } : {}), ...(generatedText ? { generatedChecks: hash(generatedText) } : {}), ...(gateText ? { stage4Gate: hash(gateText) } : {}), ...(publicationSourceHash ? { publicationSource: publicationSourceHash } : {}) },
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
        ...(runtime ? { ai: { targetRows: selected === 'b3' ? (publication?.products ?? 0) : selectedTaskRows(b1, options.aiTask ?? 'extraction', eligible).length, jobs: runtime.records.length,
          failedJobs: runtime.records.filter(r => r.status === 'error').length, origin: runtime.records.some(r => r.origin === 'test') ? 'test' as const : 'real' as const,
          requestHashes: runtime.records.map(r => r.key), roles: roleSummaries(runtime) } } : {}),
        timing: { protocol: 'cli-through-result-v1', node: process.version, platform: process.platform, arch: process.arch, pipelineMs },
        evaluation, generation: publication, verifier: isPublicationResult(result) ? { controlled, generated: generated! } : null, api: runtime?.summary() ?? { calls: 0, errors: 0, tokens: 0, cost: 0 },
        wallTimeMs: performance.now() - start, decisionsHash: selected === 'b3' ? baseDecisionsHash : hash(JSON.stringify(result)), ...(publicationHash ? { publicationHash } : {}),
      };
      // Success marker is written last. Validation failures produce no partial result.
      await saveJson(join(directory, 'result.json'), result);
      const rowDiagnostics = result.rows.filter(r => r.reasons.length).map(r => ({ rowId: r.source.row_id, outcome: r.outcome, reasons: r.reasons }));
      await saveJson(join(directory, 'diagnostics.json'), isPublicationResult(result) ? { rows: rowDiagnostics,
        publication: result.listings.filter(l => l.status !== 'ready').map(l => ({ productId: l.productId, status: l.status, reasons: l.withholdReasons })) } : rowDiagnostics);
      if (runtime) await saveJson(join(directory, 'ai.json'), { version: 'ai-trace-v1', config: ai, records: runtime.records });
      if (isPublicationResult(result)) await saveJson(join(directory, 'generated-review.json'), generatedReviewTemplate(result, publicationHash!));
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

@Module({
  imports: [AppConfigModule],
  providers: [PipelineService, {
    provide: AI_PROVIDERS, inject: [APP_CONFIG],
    useFactory: (config: AppConfig) => new ProviderRegistry(new Map<string, () => import('./ai/contracts.js').AiProvider>([
      ['openai', () => new OpenAiAdapter(undefined, config.ai.openAiApiKey ?? undefined, config.ai.openAiBaseUrl)],
      ['ollama', () => new OllamaAdapter(fetch, config.ai.ollamaBaseUrl)],
    ])),
  }],
})
export class AppModule {}
