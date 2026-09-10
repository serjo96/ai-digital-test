import type { AiCallRecord } from './contracts.js';
import { canonicalJson } from './runtime.js';
import { AdditionSchema, CitationSchema, MatchingSchema, additionFact, evidenceFor } from './schemas.js';
import type { SemanticSuite } from '../semantic-quality.js';
import { evaluateSemantic } from '../semantic-quality.js';
import type { ProductResult } from '../domain.js';
import type { Labels, SourceRow } from '../types.js';
import { compareIdentity, identify } from '../products.js';
import { extract } from '../facts.js';
import { pairKey } from '../evaluation.js';

export const shadowPairs: [string, string][] = [
  ['row_11bb99b2fa', 'row_e0afb74574'], ['row_bdbc045131', 'row_e0afb74574'],
  ['row_11bb99b2fa', 'row_bdbc045131'], ['row_55a8c9b86d', 'row_74b8f7797a'],
  ['row_fe3ff4b356', 'row_11bb99b2fa'], ['row_fe3ff4b356', 'row_bdbc045131'], ['row_fe3ff4b356', 'row_e0afb74574'],
  ['row_b82f7fcc2a', 'row_bb6d2613d4'],
];
export function pairLabel(pair: string[], labels: Labels): 'positive' | 'negative' | 'unknown' {
  const cases = labels.cases.filter(c => c.split === 'development');
  if (!pair.every(id => cases.some(c => c.rowIds.includes(id)))) throw new Error('pair outside development');
  if (cases.some(c => c.unknownPairs.some(p => pairKey(...p) === pairKey(pair[0]!, pair[1]!)))) return 'unknown';
  return cases.some(c => c.expectedGroups.some(g => pair.every(id => g.includes(id)))) ? 'positive' : 'negative';
}
export const percentile = (values: number[], q: number): number | null => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)]! : null;
};
const additionKey = (f: { attribute: string; value: unknown; unit: unknown; scope: unknown; conditions: string[] }) => canonicalJson({ attribute: f.attribute, value: f.value, unit: f.unit, scope: f.scope, conditions: [...f.conditions].sort() });

export function experimentMetrics(records: AiCallRecord[], result: ProductResult, suite: SemanticSuite, source: SourceRow[], labels: Labels) {
  if (records.some(r => r.origin !== 'real')) throw new Error('test fixtures cannot enter real experiment metrics');
  const stages = Object.fromEntries(['transport', 'completion', 'json', 'schema', 'citations', 'semantic'].map(stage => {
    const checked = records.filter(r => r.diagnostics?.[stage]?.checked);
    return [stage, { checked: checked.length, passed: checked.filter(r => r.diagnostics![stage]!.passed).length,
      failed: checked.filter(r => !r.diagnostics![stage]!.passed).length, unchecked: records.length - checked.length }];
  }));
  let proposedCorrect = 0, proposedUnexpected = 0, proposedMissing = 0, malformedAdditions = 0, rejectedAdditions = 0, duplicateAdditions = 0;
  let falseCitations = 0, unknowns = 0;
  const reasons: { rowId: string; kind: string; reason: string }[] = [];
  const recommendations: { rowIds: string[]; decision: string; confidence: string; reason: string; evidence: unknown; valid: boolean; label: string; hardConflict: boolean; dangerous: boolean; unconfirmed: boolean }[] = [];
  for (const record of records) {
    const data = record.response?.data as { facts?: unknown[]; unknowns?: unknown[]; type?: { evidence?: unknown }; category?: { evidence?: unknown } } | null;
    const row = source.find(r => r.row_id === record.rowIds[0])!;
    if (record.role === 'extraction') {
      unknowns += Array.isArray(data?.unknowns) ? data.unknowns.length : 0;
      const expected = new Set(suite.cases.find(c => c.rowId === row.row_id)?.expectedAdditions.map(additionKey) ?? []);
      const proposed = new Set<string>();
      for (const raw of Array.isArray(data?.facts) ? data.facts : []) {
        const parsed = AdditionSchema.safeParse(raw);
        if (!parsed.success) { malformedAdditions++; rejectedAdditions++; continue; }
        const key = additionKey(parsed.data);
        if (proposed.has(key)) duplicateAdditions++;
        proposed.add(key);
        try { additionFact(parsed.data, row); } catch (error) {
          reasons.push({ rowId: row.row_id, kind: 'addition', reason: (error as Error).message });
        }
        if (record.status !== 'success') rejectedAdditions++;
      }
      for (const key of expected) if (proposed.has(key)) proposedCorrect++; else proposedMissing++;
      for (const key of proposed) if (!expected.has(key)) proposedUnexpected++;
      const citations = [...(Array.isArray(data?.facts) ? data.facts.map(f => (f as { evidence?: unknown })?.evidence) : []),
        ...(data?.type ? [data.type.evidence] : []), ...(data?.category ? [data.category.evidence] : [])];
      for (const citation of citations) {
        try { evidenceFor(CitationSchema.parse(citation), row); } catch (error) {
          falseCitations++; reasons.push({ rowId: row.row_id, kind: 'citation', reason: error instanceof Error ? error.message : 'invalid citation' });
        }
      }
    } else {
      const parsed = MatchingSchema.safeParse(record.response?.data);
      if (!parsed.success) continue;
      const members = record.rowIds.map(id => source.find(r => r.row_id === id)!);
      const identities = members.map(r => identify(r, extract(r).facts));
      const hardConflict = compareIdentity(identities[0]!, identities[1]!).status === 'reject' || identities.some(i => i.conflicts.length > 0);
      const label = pairLabel(record.rowIds, labels);
      for (const c of parsed.data.evidence) {
        try { const member = members.find(r => r.row_id === c.rowId); if (!member) throw new Error('foreign pair source'); evidenceFor(c, member); }
        catch { falseCitations++; }
      }
      recommendations.push({ ...parsed.data, valid: record.status === 'success', label, hardConflict,
        dangerous: parsed.data.decision === 'merge' && (label === 'negative' || hardConflict),
        unconfirmed: parsed.data.decision === 'merge' && label === 'unknown' });
    }
  }
  const affected = new Set(records.filter(r => r.status !== 'success' || (r.response?.data as { unknowns?: unknown[] } | null)?.unknowns?.length).flatMap(r => r.rowIds));
  const accepted = evaluateSemantic(result, suite);
  const quality = { jobs: records.length, successful: records.filter(r => r.status === 'success').length, unsuccessful: records.filter(r => r.status !== 'success').length, stages,
    proposed: { correct: proposedCorrect, unexpected: proposedUnexpected, missing: proposedMissing, malformed: malformedAdditions, duplicate: duplicateAdditions },
    accepted, rejectedAdditions, falseCitations, reasons, unknowns,
    review: { messages: result.review.length, rows: new Set(result.review.flatMap(r => r.rowIds)).size, aiAffectedRows: affected.size, aiMessages: result.review.filter(r => r.reason.startsWith('ai_') || r.reason.startsWith('identity:ai_')).length, shadowReview: recommendations.filter(r => r.decision === 'unknown' || r.confidence === 'low').length },
    recommendations, dangerousMerges: recommendations.filter(r => r.dangerous).length, unconfirmedMerges: recommendations.filter(r => r.unconfirmed).length,
    unknownMatching: recommendations.filter(r => r.decision === 'unknown').length };
  const attempts = records.flatMap(r => r.attemptsLog ?? []);
  const latencies = records.map(r => r.mode === 'live' ? r.elapsedMs : r.attemptsLog?.reduce((n, a) => n + a.elapsedMs, 0) ?? r.elapsedMs);
  return { quality, performance: { calls: records.filter(r => r.mode === 'live').reduce((n, r) => n + r.attempts, 0),
    retries: records.filter(r => r.mode === 'live').reduce((n, r) => n + Math.max(0, r.attempts - 1), 0),
    medianMs: percentile(latencies, 0.5), p95Ms: percentile(latencies, 0.95),
    requests: records.map((r, i) => ({ rowIds: r.rowIds, latencyMs: latencies[i], wallTimeMs: r.elapsedMs, attempts: r.attemptsLog })),
    loadMs: attempts.every(a => a.response?.timings?.loadMs !== null && a.response?.timings?.loadMs !== undefined) ? attempts.reduce((n, a) => n + a.response!.timings!.loadMs!, 0) : null,
    generationMs: attempts.every(a => a.response?.timings?.generationMs !== null && a.response?.timings?.generationMs !== undefined) ? attempts.reduce((n, a) => n + a.response!.timings!.generationMs!, 0) : null,
    cachedTokens: null, localComputeCost: null, latencySource: records[0]?.mode === 'replay' ? 'original-live-attempts' : 'live' } };
}
export type ExperimentMetrics = ReturnType<typeof experimentMetrics>;
export function technicallyStable(records: AiCallRecord[], expected: number): boolean {
  return records.length === expected && records.every(r => r.response !== null && !r.attemptsLog?.some(a => a.error === 'timeout'));
}
export function strictGate(extraction: ExperimentMetrics, matching: ExperimentMetrics, replayEqual: boolean, baselineSafe: boolean): boolean {
  const e = extraction.quality, m = matching.quality;
  return e.jobs === 12 && e.successful === 12 && e.accepted.correct === 11 && e.accepted.unexpected === 0 && e.accepted.missing === 0 && e.accepted.errors.length === 0 &&
    e.proposed.correct === 11 && e.proposed.unexpected === 0 && e.proposed.malformed === 0 && e.proposed.duplicate === 0 && e.falseCitations === 0 &&
    m.jobs === 8 && m.successful === 8 && m.dangerousMerges === 0 && m.falseCitations === 0 && replayEqual && baselineSafe;
}
