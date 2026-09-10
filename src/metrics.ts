import { isProductResult } from './domain.js';
import { pairKey } from './evaluation.js';
import type { BaselineResult, Labels, Ratio, RunReport } from './types.js';

export interface Metric {
  name: string; value: number | null; numerator: number | null; denominator: number | null;
  unit: 'count' | 'ratio' | 'ms' | 'USD'; scope: 'development' | 'full_input' | 'run';
  qualityStatus: 'provisional' | 'human_verified' | 'not_evaluated' | 'not_applicable';
  availability: 'measured' | 'not_implemented' | 'no_denominator' | 'unavailable';
}
export const countMetric = (name: string, value: number | null, scope: Metric['scope'] = 'full_input', qualityStatus: Metric['qualityStatus'] = 'not_applicable'): Metric => ({
  name, value, numerator: null, denominator: null, unit: 'count', scope, qualityStatus, availability: value === null ? 'not_implemented' : 'measured',
});
export function metricsFor(report: RunReport, result: BaselineResult, labels: Labels): Metric[] {
  const metrics: Metric[] = [];
  const quality = report.evaluation.status;
  const count = (name: string, value: number | null, scope: Metric['scope'] = 'full_input', status: Metric['qualityStatus'] = 'not_applicable') => metrics.push(countMetric(name, value, scope, status));
  const ratio = (name: string, numerator: number | null, denominator: number | null, scope: Metric['scope'] = 'development', status: Metric['qualityStatus'] = quality) => metrics.push({
    name, numerator, denominator, value: numerator === null || !denominator ? null : numerator / denominator,
    unit: 'ratio', scope, qualityStatus: status,
    availability: numerator === null || denominator === null ? 'not_implemented' : denominator === 0 ? 'no_denominator' : 'measured',
  });
  const e = report.evaluation;
  for (const [name, value] of Object.entries({ true_positive: e.tp, false_merge: e.fp, missed_pair: e.fn, unknown_pairs: e.unknownPairs, unevaluated_attached_pairs: e.unevaluatedPairs.length })) count(`matching.${name}`, value, 'development', quality);
  ratio('matching.precision', e.tp, e.tp + e.fp); ratio('matching.recall', e.tp, e.tp + e.fn);
  const cases = labels.cases.filter(c => c.split === 'development');
  const expected = new Map<string, string>(); const family = new Map<string, string>(); const unknown = new Set<string>(); const nonProducts = new Set<string>();
  for (const c of cases) {
    c.expectedGroups.forEach((g, i) => g.forEach(id => expected.set(id, `${c.id}:${i}`)));
    for (const id of c.nonProductRowIds) { expected.set(id, `non_product:${id}`); nonProducts.add(id); }
    c.rowIds.forEach(id => family.set(id, c.id));
    c.unknownPairs.forEach(([a, b]) => unknown.add(pairKey(a, b)));
  }
  const predicted = new Map(result.groups.flatMap(g => g.rowIds.map(id => [id, g.id] as const)));
  const ids = [...expected.keys()].sort();
  const candidatePairs = isProductResult(result) ? new Set(result.candidates.map(c => pairKey(...c.rowIds))) : null;
  let negatives = 0; let negativeCorrect = 0; let hardNegatives = 0; let hardNegativeCorrect = 0; let candidateFound = 0; let positives = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i]!; const b = ids[j]!;
    if (unknown.has(pairKey(a, b))) continue;
    if (expected.get(a) === expected.get(b)) { positives++; if (candidatePairs?.has(pairKey(a, b))) candidateFound++; }
    else {
      const merged = predicted.has(a) && predicted.get(a) === predicted.get(b);
      negatives++; if (!merged) negativeCorrect++;
      if (family.get(a) === family.get(b) && !nonProducts.has(a) && !nonProducts.has(b)) { hardNegatives++; if (!merged) hardNegativeCorrect++; }
    }
  }
  count('matching.true_negative', negativeCorrect, 'development', quality);
  ratio('matching.negative_specificity', negativeCorrect, negatives);
  ratio('matching.hard_negative_specificity', hardNegativeCorrect, hardNegatives);
  count('matching.hard_negative_false_merges', hardNegatives - hardNegativeCorrect, 'development', quality);
  ratio('matching.candidate_recall', candidatePairs ? candidateFound : null, candidatePairs ? positives : null);
  let tp = 0; let fp = 0; let fn = 0; let tn = 0;
  const outcomes = new Map(result.rows.map(r => [r.source.row_id, r.outcome]));
  for (const id of ids) {
    const expectedTrash = nonProducts.has(id); const predictedTrash = outcomes.get(id) === 'non_product';
    if (expectedTrash && predictedTrash) tp++;
    else if (predictedTrash) fp++;
    else if (expectedTrash) fn++;
    else tn++;
  }
  for (const [name, value] of Object.entries({ true_positive: tp, false_rejection: fp, missed_trash: fn, true_negative: tn })) count(`non_product.${name}`, value, 'development', quality);
  ratio('non_product.precision', tp, tp + fp); ratio('non_product.recall', tp, tp + fn);
  ratio('non_product.valid_product_retention', tn, tn + fp);
  ratio('non_product.accuracy', tp + tn, ids.length);
  count('input.rows', report.audit.inputRows); count('accounting.lost_rows', report.audit.lostRows); count('accounting.duplicate_assignments', report.audit.duplicateAssignments);
  ratio('accounting.coverage', report.audit.accountedRows, report.audit.inputRows, 'full_input', 'not_applicable');
  count('products.count', result.groups.length); count('non_product.rejected_rows', report.audit.nonProducts);
  const b1 = isProductResult(result) ? result : null;
  const reviewRows = b1 ? new Set(b1.review.flatMap(r => r.rowIds)).size : null;
  const reviewProducts = b1 ? new Set(b1.review.flatMap(r => r.productIds)).size : null;
  count('review.items', b1?.review.length ?? null); count('review.rows', reviewRows); count('review.products', reviewProducts);
  ratio('review.row_rate', reviewRows, b1 ? result.rows.length : null, 'full_input', 'not_applicable');
  ratio('review.product_rate', reviewProducts, b1 ? b1.products.length : null, 'full_input', 'not_applicable');
  count('review.identity_items', b1 ? b1.review.filter(r => r.reason.startsWith('identity:') || r.reason === 'internal_identity_conflict').length : null);
  for (const [name, prefix] of [['category', 'uncertain_category'], ['extraction', 'unparsed_specs'], ['missing_specs', 'missing_specs'], ['conflict', 'fact_conflict:'], ['incomparable', 'fact_incomparable:']] as const) count(`review.${name}_items`, b1 ? b1.review.filter(r => r.reason.startsWith(prefix)).length : null);
  for (const reason of [...new Set(b1?.review.map(r => r.reason) ?? [])].sort()) {
    count(`review.reason.${reason}.items`, b1!.review.filter(r => r.reason === reason).length);
    count(`review.reason.${reason}.rows`, new Set(b1!.review.filter(r => r.reason === reason).flatMap(r => r.rowIds)).size);
  }
  count('facts.extracted', b1?.facts.length ?? null);
  count('facts.accepted_attributes', b1 ? b1.products.flatMap(p => p.facts).filter(f => f.status === 'agreed').length : null);
  count('facts.conflicts', b1 ? b1.products.flatMap(p => p.facts).filter(f => f.status === 'conflict').length : null);
  count('facts.incomparable', b1 ? b1.products.flatMap(p => p.facts).filter(f => f.status === 'incomparable').length : null);
  count('facts.unparsed_fragments', b1?.unparsed.length ?? null);
  for (const key of ['categories', 'facts', 'reconciliation'] as const) {
    const score: Ratio | undefined = report.checks?.[key];
    ratio(`${key}.check_accuracy`, score?.numerator ?? null, score?.denominator ?? null, 'development', 'provisional');
  }
  count('errors.matching', e.errors.length, 'development', quality);
  count('errors.non_product', e.nonProducts.errors.length, 'development', quality);
  count('errors.quality_checks', report.checks?.errors.length ?? null, 'development', 'provisional');
  count('errors.execution', report.status === 'partial' ? 1 : 0, 'run');
  count('api.calls', report.api.calls, 'run');
  if (report.schemaVersion === '3' || report.schemaVersion === '4') {
    count('api.errors', report.api.errors, 'run'); count('api.retries', report.api.retries ?? 0, 'run');
    count('api.cache_hits', report.api.cacheHits ?? 0, 'run'); count('api.tokens', report.api.tokens, 'run');
    count('api.input_tokens', report.api.inputTokens ?? (report.mode === 'code-only' ? 0 : null), 'run');
    count('api.output_tokens', report.api.outputTokens ?? (report.mode === 'code-only' ? 0 : null), 'run');
    metrics.push({ ...countMetric('api.cost', report.api.cost, 'run'), unit: 'USD' });
    count('ai.target_rows', report.ai?.targetRows ?? null, 'run'); count('ai.failed_jobs', report.ai?.failedJobs ?? null, 'run');
    if (report.schemaVersion === '3') {
      const s = report.semanticChecks;
      for (const [name, value] of Object.entries({ correct_additions: s?.correct ?? null, unexpected_additions: s?.unexpected ?? null, missed_additions: s?.missing ?? null })) count(`semantic.${name}`, value, 'development', 'provisional');
      for (const name of ['precision', 'recall', 'types', 'categories'] as const) ratio(`semantic.${name}`, s?.[name].numerator ?? null, s?.[name].denominator ?? null, 'development', 'provisional');
    }
    for (const [role, summary] of Object.entries(report.ai?.roles ?? {})) {
      count(`ai.role.${role}.jobs`, summary.jobs, 'run'); count(`ai.role.${role}.calls`, summary.calls, 'run'); count(`ai.role.${role}.errors`, summary.errors, 'run');
      count(`ai.role.${role}.tokens`, summary.tokens, 'run');
      metrics.push({ ...countMetric(`ai.role.${role}.cost`, summary.cost, 'run'), unit: 'USD', availability: summary.cost === null ? 'unavailable' : 'measured' });
      metrics.push({ ...countMetric(`ai.role.${role}.median_wall`, summary.medianWallMs, 'run'), unit: 'ms' });
      metrics.push({ ...countMetric(`ai.role.${role}.p95_wall`, summary.p95WallMs, 'run'), unit: 'ms' });
    }
    for (const metric of metrics) if (/^api\./.test(metric.name) && metric.value === null) metric.availability = 'unavailable';
  }
  if (report.schemaVersion === '4' && report.generation && report.verifier) {
    const g = report.generation; const v = report.verifier.controlled; const generated = report.verifier.generated;
    const publicationScope: Metric['scope'] = report.config.aiCohort === 'development' ? 'development' : 'full_input';
    for (const [name, value] of Object.entries({ products: g.products, drafts: g.drafts, ready: g.ready, withheld: g.withheld, review: g.review, covered_rows: g.coveredRows, repair_attempted: g.repairAttempted, repair_succeeded: g.repairSucceeded })) count(`publication.${name}`, value, publicationScope);
    ratio('publication.ready_rate', g.ready, g.products, publicationScope, 'not_applicable');
    ratio('verifier.controlled.unsupported_detection_recall', v.unsupported.blocked, v.unsupported.total, 'development', v.status);
    ratio('verifier.controlled.false_block_rate', v.supported.falseBlocks, v.supported.total, 'development', v.status);
    ratio('verifier.controlled.disputed_leakage', v.disputed.leaked, v.disputed.total, 'development', v.status);
    count('verifier.controlled.errors', v.errors.length, 'development', v.status);
    ratio('verifier.generated.published_claim_error_rate', generated.publishedClaimErrors, generated.checkedPublishedClaims, 'development', generated.status);
    count('verifier.generated.checked_published_claims', generated.checkedPublishedClaims, 'development', generated.status);
    for (const [reason, value] of Object.entries(g.reasons).sort(([a], [b]) => a.localeCompare(b))) count(`publication.reason.${reason}`, value, publicationScope);
  } else {
    ratio('generation.quality', null, null); ratio('verifier.quality', null, null);
  }
  metrics.push({ ...countMetric('timing.wall', report.wallTimeMs, 'run'), unit: 'ms' });
  metrics.push({ ...countMetric('timing.pipeline', report.timing?.pipelineMs ?? null, 'run'), unit: 'ms' });
  return metrics.sort((a, b) => a.name.localeCompare(b.name));
}

export function metricTable(metrics: Metric[]): string {
  return '| Metric | Value | Numerator | Denominator | Scope | Status |\n|---|---|---|---|---|---|\n' + metrics.map(m =>
    `| ${m.name} | ${m.value ?? 'N/A'} | ${m.numerator ?? 'N/A'} | ${m.denominator ?? 'N/A'} | ${m.scope} | ${m.qualityStatus}; ${m.availability} |`).join('\n') + '\n';
}
