import type { BaselineResult, EvalCase, Evaluation, Labels, Pair, Ratio, SourceRow } from './types.js';

const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every(v => typeof v === 'string' && v.length > 0);
export const pairKey = (a: string, b: string): string => JSON.stringify([a, b].sort());
export const ratio = (numerator: number, denominator: number): Ratio => ({ numerator, denominator, value: denominator ? numerator / denominator : null });
export function isIsoTimestamp(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (month! < 1 || month! > 12 || hour! > 23 || minute! > 59 || second! > 59) return false;
  return day! >= 1 && day! <= new Date(Date.UTC(year!, month!, 0)).getUTCDate();
}

export function validateLabels(value: unknown, source: SourceRow[]): Labels {
  if (!object(value) || typeof value.version !== 'string' || !value.version || !Array.isArray(value.cases)) throw new Error('invalid labels envelope');
  const sourceIds = new Set(source.map(r => r.row_id));
  const seen = new Set<string>();
  const caseIds = new Set<string>();
  const families = new Map<string, string>();
  for (const c of value.cases) {
    if (!object(c) || typeof c.id !== 'string' || !c.id || typeof c.family !== 'string' || !c.family ||
      !['development', 'holdout'].includes(String(c.split)) || !['provisional', 'human_verified'].includes(String(c.status)) ||
      !strings(c.rowIds) || !c.rowIds.length || !strings(c.nonProductRowIds) || !Array.isArray(c.expectedGroups) ||
      !c.expectedGroups.every(g => strings(g) && g.length > 0) || !Array.isArray(c.unknownPairs) ||
      !c.unknownPairs.every(p => strings(p) && p.length === 2) || typeof c.explanation !== 'string' || !c.explanation.trim() ||
      !(c.reviewedBy === null || typeof c.reviewedBy === 'string') || !(c.reviewedAt === null || typeof c.reviewedAt === 'string')) {
      throw new Error('invalid evaluation case schema');
    }
    const item = c as unknown as EvalCase;
    if (caseIds.has(item.id)) throw new Error(`duplicate case ID: ${item.id}`);
    caseIds.add(item.id);
    if (families.has(item.family) && families.get(item.family) !== item.split) throw new Error(`family split leakage: ${item.family}`);
    families.set(item.family, item.split);
    if (item.status === 'human_verified' && (!item.reviewedBy?.trim() || !item.reviewedAt || !isIsoTimestamp(item.reviewedAt))) {
      throw new Error(`human verification metadata missing: ${item.id}`);
    }
    for (const id of item.rowIds) {
      if (!sourceIds.has(id) || seen.has(id)) throw new Error(`unknown/duplicate labelled row: ${id}`);
      seen.add(id);
    }
    const assigned = [...item.expectedGroups.flat(), ...item.nonProductRowIds];
    if (assigned.length !== item.rowIds.length || new Set(assigned).size !== assigned.length || assigned.some(id => !item.rowIds.includes(id))) {
      throw new Error(`expected groups/non-products must partition case rows: ${item.id}`);
    }
    const unknown = new Set<string>();
    for (const [a, b] of item.unknownPairs) {
      if (a === b || !item.rowIds.includes(a) || !item.rowIds.includes(b) || unknown.has(pairKey(a, b))) throw new Error(`invalid unknown pair: ${item.id}`);
      if (item.expectedGroups.some(g => g.includes(a) && g.includes(b)) || item.nonProductRowIds.includes(a) || item.nonProductRowIds.includes(b)) {
        throw new Error(`unknown pair contradicts known label: ${item.id}`);
      }
      unknown.add(pairKey(a, b));
    }
  }
  return value as unknown as Labels;
}

export function evaluate(result: BaselineResult, labels: Labels, split: Evaluation['split'] = 'development'): Evaluation {
  const cases = labels.cases.filter(c => c.split === split);
  const expected = new Map<string, string>();
  const unknown = new Set<string>();
  const nonProducts = new Set<string>();
  for (const c of cases) {
    c.expectedGroups.forEach((group, i) => group.forEach(id => expected.set(id, `${c.id}:${i}`)));
    for (const id of c.nonProductRowIds) {
      expected.set(id, `non-product:${id}`);
      nonProducts.add(id);
    }
    for (const [a, b] of c.unknownPairs) unknown.add(pairKey(a, b));
  }
  const predicted = new Map<string, string>();
  const unevaluated = new Map<string, Pair>();
  for (const group of result.groups) {
    for (const id of group.rowIds) {
      if (predicted.has(id)) throw new Error(`duplicate prediction: ${id}`);
      predicted.set(id, group.id);
    }
    for (let i = 0; i < group.rowIds.length; i++) {
      for (let j = i + 1; j < group.rowIds.length; j++) {
        const a = group.rowIds[i]!; const b = group.rowIds[j]!;
        if (expected.has(a) !== expected.has(b)) unevaluated.set(pairKey(a, b), [a, b].sort() as Pair);
      }
    }
  }
  let tp = 0; let fp = 0; let fn = 0;
  const errors: Evaluation['errors'] = [];
  const ids = [...expected.keys()].sort();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!; const b = ids[j]!;
      if (unknown.has(pairKey(a, b))) continue;
      const positive = expected.get(a) === expected.get(b);
      const merged = predicted.has(a) && predicted.get(a) === predicted.get(b);
      if (positive && merged) tp++;
      if (!positive && merged) { fp++; errors.push({ kind: 'false_merge', pair: [a, b] }); }
      if (positive && !merged) { fn++; errors.push({ kind: 'missed_pair', pair: [a, b] }); }
    }
  }
  const outcomes = new Map(result.rows.map(r => [r.source.row_id, r.outcome]));
  const nonProductErrors = ids.filter(id => !outcomes.has(id) || (outcomes.get(id) === 'non_product') !== nonProducts.has(id));
  return {
    split, status: cases.length === 0 ? 'not_evaluated' : cases.every(c => c.status === 'human_verified') ? 'human_verified' : 'provisional',
    caseCount: cases.length, evaluatedRows: ids.length, tp, fp, fn,
    precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn), unknownPairs: unknown.size,
    unevaluatedPairs: [...unevaluated.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([, p]) => p), errors,
    nonProducts: { correct: ids.length - nonProductErrors.length, checked: ids.length, errors: nonProductErrors },
  };
}
