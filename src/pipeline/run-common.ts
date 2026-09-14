import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { assertAccounting, hash, titleKey, validateInputs } from '../baseline.js';
import { validateLabels } from '../evaluation.js';
import { isProductResult, isPublicationResult, type PublicationResult } from '../domain.js';
import type { SemanticSuite } from '../semantic-quality.js';
import { generatedReviewTemplate } from '../publication-evaluation.js';
import { metricsFor } from '../metrics.js';
import { codeVersion, reportMarkdown } from '../reports.js';
import type { AiCallRecord } from '../ai/contracts.js';
import type { ErrorKind } from '../ai/contracts.js';
import type { AiRuntime } from '../ai/runtime.js';
import type { RuntimeConfig } from '../ai/config.js';
import type { BaselineResult, Labels, RunReport, SourceRow } from '../types.js';
import type { RunOptions } from './run-options.js';
import { RunStoreService } from '../storage/run-store.service.js';

export const baseConfig = {
  titleNormalization: 'trim+collapse-whitespace+lowercase',
  dollarCurrency: 'USD',
  split: 'development' as const,
};

export class PartialRunError extends Error {
  constructor(readonly directory: string) {
    super(`Degraded AI run completed safely: ${directory}`);
    this.name = 'PartialRunError';
  }
}

export interface RunInput {
  feedText: string;
  taxonomyText: string;
  labelsText: string;
  taxonomy: unknown;
  rows: SourceRow[];
  labels: Labels;
  code: RunReport['code'];
}

export async function loadRunInput(store: RunStoreService, options: RunOptions): Promise<RunInput> {
  const [feedText, taxonomyText, labelsText, code] = await Promise.all([
    store.readText(options.feed),
    store.readText(options.taxonomy),
    store.readText(options.labels),
    codeVersion(),
  ]);
  const taxonomy: unknown = JSON.parse(taxonomyText);
  const rows = validateInputs(JSON.parse(feedText), taxonomy);
  const labels = validateLabels(JSON.parse(labelsText), rows);
  return { feedText, taxonomyText, labelsText, taxonomy, rows, labels, code };
}

export function auditFor(input: RunInput, result: BaselineResult): RunReport['audit'] {
  const priceStatuses: Record<string, number> = {};
  for (const row of result.rows) priceStatuses[row.price.status] = (priceStatuses[row.price.status] ?? 0) + 1;
  return {
    inputRows: input.rows.length,
    accountedRows: result.rows.length,
    lostRows: 0,
    duplicateAssignments: 0,
    suppliers: new Set(input.rows.map(row => row.supplier)).size,
    taxonomySize: (input.taxonomy as string[]).length,
    emptySpecs: input.rows.filter(row => !row.raw_specs.trim()).length,
    emptyTitles: input.rows.filter(row => !row.raw_title.trim()).length,
    emptyPrices: input.rows.filter(row => !row.price.trim()).length,
    normalizedTitles: new Set(input.rows.map(row => titleKey(row.raw_title))).size,
    nonProducts: result.rows.filter(row => row.outcome === 'non_product').length,
    reviewRows: isProductResult(result) ? new Set(result.review.flatMap(review => review.rowIds)).size : result.rows.filter(row => row.outcome === 'review').length,
    groups: result.groups.length,
    groupedRows: result.groups.reduce((count, group) => count + group.rowIds.length, 0),
    repeatedGroups: result.groups.filter(group => group.rowIds.length > 1).length,
    priceStatuses,
  };
}

export function inputHashes(input: RunInput, config: RunReport['config']): RunReport['hashes'] {
  return {
    feed: hash(input.feedText),
    taxonomy: hash(input.taxonomyText),
    labels: hash(input.labelsText),
    config: hash(JSON.stringify(config)),
  };
}

export function publicationSummary(result: PublicationResult): NonNullable<RunReport['generation']> {
  const target = result.listings.filter(listing => !listing.withholdReasons.includes('not_in_cohort'));
  const reasons: Record<string, number> = {};
  for (const listing of target) for (const reason of listing.withholdReasons) reasons[reason] = (reasons[reason] ?? 0) + 1;
  return {
    products: target.length,
    drafts: target.filter(listing => listing.draftText !== null).length,
    ready: target.filter(listing => listing.status === 'ready').length,
    withheld: target.filter(listing => listing.status === 'withheld').length,
    review: target.filter(listing => listing.status === 'review').length,
    coveredRows: target.filter(listing => listing.status === 'ready').reduce((count, listing) => count + (result.products.find(product => product.id === listing.productId)?.rowIds.length ?? 0), 0),
    repairAttempted: target.filter(listing => listing.attempts.length === 2).length,
    repairSucceeded: target.filter(listing => listing.selectedAttempt === 2).length,
    reasons,
  };
}

export function degradationFor(result: PublicationResult, records: AiCallRecord[], retryOfRunId: string | null): NonNullable<RunReport['degradation']> {
  const affected = result.listings.filter(listing => listing.status === 'withheld' && !listing.withholdReasons.includes('not_in_cohort'));
  const counts = new Map<string, { stage: NonNullable<typeof affected[number]['failure']>['stage']; kind: NonNullable<typeof affected[number]['failure']>['kind']; count: number }>();
  const knownKinds = new Set<ErrorKind>(['auth', 'rate_limit', 'server', 'network', 'timeout', 'invalid_response', 'configuration', 'cache']);
  for (const record of records.filter(record => record.status === 'error')) {
    const stage = record.role === 'generation' ? 'generation' : record.role === 'repair' ? 'repair' : 'verification';
    const kind = knownKinds.has(record.error as ErrorKind) ? record.error as ErrorKind : 'invalid_response';
    const key = `${stage}:${kind}`;
    const current = counts.get(key);
    counts.set(key, current ? { ...current, count: current.count + 1 } : { stage, kind, count: 1 });
  }
  return {
    failedAiJobs: records.filter(record => record.status === 'error').length,
    retryableWithheldProducts: affected.filter(listing => listing.failure?.retryable).length,
    nonRetryableWithheldProducts: affected.filter(listing => !listing.failure?.retryable).length,
    failures: [...counts.values()].sort((a, b) => `${a.stage}:${a.kind}`.localeCompare(`${b.stage}:${b.kind}`)),
    circuitOpened: affected.some(listing => listing.withholdReasons.includes('skipped_after_circuit_open')),
    retryOfRunId,
  };
}

export function roleSummaries(runtime: AiRuntime): NonNullable<NonNullable<RunReport['ai']>['roles']> {
  const result: NonNullable<NonNullable<RunReport['ai']>['roles']> = {};
  for (const role of [...new Set(runtime.records.map(record => record.role))].sort()) {
    const records = runtime.records.filter(record => record.role === role && record.origin === 'real');
    const elapsed = records.map(record => record.elapsedMs).sort((left, right) => left - right);
    const percentile = (p: number) => elapsed.length ? elapsed[Math.max(0, Math.ceil(elapsed.length * p) - 1)]! : null;
    result[role] = { ...runtime.summary(role), jobs: records.length, medianWallMs: percentile(0.5), p95WallMs: percentile(0.95) };
  }
  return result;
}

/** B3 may safely recover an invalid first verification through its single bounded repair. */
export function hasUnrecoveredAiErrors(baseline: RunOptions['baseline'], records: Pick<AiCallRecord, 'status'>[], controlledErrors: number, publicationWithheld: number): boolean {
  return records.some(record => record.status === 'error') && (baseline !== 'b3' || controlledErrors > 0 || publicationWithheld > 0);
}

export function assertExplicitAiRows(rows: string[] | undefined, suite: SemanticSuite | null): void {
  if (!rows) return;
  if (!suite || new Set(rows).size !== rows.length || rows.some(id => !suite.cases.some(testCase => testCase.rowId === id))) {
    throw new Error('explicit AI rows must belong to the frozen semantic cohort');
  }
}

export async function persistRun(
  store: RunStoreService,
  directory: string,
  result: BaselineResult,
  report: RunReport,
  labels: Labels,
  sourceRows: SourceRow[],
  start: number,
  runtime?: AiRuntime<RuntimeConfig>,
  aiConfig?: RuntimeConfig,
): Promise<void> {
  assertAccounting(sourceRows, result);
  await store.saveJson(join(directory, 'result.json'), result);
  const rowDiagnostics = result.rows.filter(row => row.reasons.length).map(row => ({ rowId: row.source.row_id, outcome: row.outcome, reasons: row.reasons }));
  await store.saveJson(join(directory, 'diagnostics.json'), isPublicationResult(result) ? {
    rows: rowDiagnostics,
    publication: result.listings.filter(listing => listing.status !== 'ready').map(listing => ({ productId: listing.productId, status: listing.status, reasons: listing.withholdReasons, failure: listing.failure ?? null })),
  } : rowDiagnostics);
  if (runtime) await store.saveJson(join(directory, 'ai.json'), { version: 'ai-trace-v1', config: aiConfig, records: runtime.records });
  if (isPublicationResult(result)) await store.saveJson(join(directory, 'generated-review.json'), generatedReviewTemplate(result, report.publicationHash!));
  report.wallTimeMs = performance.now() - start;
  report.metrics = metricsFor(report, result, labels);
  await store.saveJson(join(directory, 'metrics.json'), {
    schemaVersion: 'metrics-v1', runId: report.runId, createdAt: report.createdAt,
    rulesVersion: report.rulesVersion, hashes: report.hashes, split: report.evaluation.split, metrics: report.metrics,
  });
  await store.writeTextExclusive(join(directory, 'report.md'), reportMarkdown(report));
  await store.saveJson(join(directory, 'report.json'), report);
}

export async function persistFailure(
  store: RunStoreService,
  directory: string,
  options: RunOptions,
  start: number,
  error: unknown,
  runtime?: AiRuntime<RuntimeConfig>,
): Promise<void> {
  await store.saveJson(join(directory, 'failure.json'), {
    status: 'failed',
    baseline: options.baseline ?? 'b1',
    runId: options.runId,
    createdAt: new Date().toISOString(),
    wallTimeMs: performance.now() - start,
    ...(runtime ? { api: runtime.summary(), mode: options.aiMode } : {}),
    errors: [error instanceof Error ? error.message : String(error)],
  });
}
