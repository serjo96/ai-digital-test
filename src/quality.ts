import type { Category, ProductResult } from './domain.js';
import type { Labels, Ratio } from './types.js';
import { ratio } from './evaluation.js';
import { TAXONOMY } from './baseline.js';

export type QualityCheck = { id: string; rowId: string } & (
  { kind: 'category'; expected: Category } |
  { kind: 'fact'; attribute: string; value: string | number | boolean; unit: string | null; scope: 'product' | 'offer'; conditions: string[]; field: 'raw_title' | 'raw_specs' } |
  { kind: 'absent_fact'; attribute: string } |
  { kind: 'reconciliation'; attribute: string; expected: 'agreed' | 'conflict' | 'incomparable'; acceptedValue?: string | number | boolean }
);
export interface QualitySuite { version: string; status: 'provisional'; feedHash: string; checks: QualityCheck[] }
export interface QualityEvaluation {
  status: 'provisional'; version: string;
  categories: Ratio; facts: Ratio; reconciliation: Ratio;
  errors: { checkId: string; rowId: string; kind: QualityCheck['kind']; expected: QualityCheck; actual: unknown }[];
}
export function validateQuality(value: unknown, labels: Labels, feedHash: string): QualitySuite {
  if (!value || typeof value !== 'object') throw new Error('invalid quality suite');
  const suite = value as QualitySuite;
  if (typeof suite.version !== 'string' || suite.status !== 'provisional' || suite.feedHash !== feedHash || !Array.isArray(suite.checks)) throw new Error('invalid quality suite or feed hash');
  const dev = new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds));
  const ids = new Set<string>();
  for (const check of suite.checks) {
    if (!check || typeof check.id !== 'string' || ids.has(check.id) || !dev.has(check.rowId)) throw new Error('duplicate quality check or non-development row');
    ids.add(check.id);
    if (check.kind === 'category') {
      if (!TAXONOMY.includes(check.expected)) throw new Error('invalid quality category');
    } else if (check.kind === 'fact') {
      if (typeof check.attribute !== 'string' || !['string', 'number', 'boolean'].includes(typeof check.value) || !(check.unit === null || typeof check.unit === 'string') ||
        !['product', 'offer'].includes(check.scope) || !['raw_title', 'raw_specs'].includes(check.field) || !Array.isArray(check.conditions) || check.conditions.some(c => typeof c !== 'string')) throw new Error('invalid quality fact');
    } else if (check.kind === 'absent_fact' || check.kind === 'reconciliation') {
      if (typeof check.attribute !== 'string' || (check.kind === 'reconciliation' && !['agreed', 'conflict', 'incomparable'].includes(check.expected))) throw new Error('invalid quality reconciliation');
    } else throw new Error('unknown quality check kind');
  }
  return suite;
}
export function evaluateQuality(result: ProductResult, suite: QualitySuite): QualityEvaluation {
  const errors: QualityEvaluation['errors'] = [];
  const counts = { categories: [0, 0], facts: [0, 0], reconciliation: [0, 0] };
  for (const check of suite.checks) {
    const product = result.products.find(p => p.rowIds.includes(check.rowId));
    let correct = false; let actual: unknown;
    const group = check.kind === 'category' ? 'categories' : check.kind === 'reconciliation' ? 'reconciliation' : 'facts';
    if (check.kind === 'category') { actual = product?.category ?? null; correct = actual === check.expected; }
    else if (check.kind === 'reconciliation') {
      const reconciled = product?.facts.find(f => f.attribute === check.attribute);
      const accepted = result.facts.find(f => f.id === reconciled?.acceptedFactId);
      actual = { status: reconciled?.status ?? null, acceptedValue: accepted?.value ?? null };
      correct = reconciled?.status === check.expected && (check.acceptedValue === undefined || accepted?.value === check.acceptedValue);
    } else {
      const found = result.facts.filter(f => f.evidence.rowId === check.rowId && f.attribute === check.attribute);
      actual = found;
      correct = check.kind === 'absent_fact' ? found.length === 0 : found.some(f => f.value === check.value && f.unit === check.unit && f.scope === check.scope && f.evidence.field === check.field && JSON.stringify(f.conditions) === JSON.stringify([...check.conditions].sort()));
    }
    counts[group][1]!++;
    if (correct) counts[group][0]!++;
    else errors.push({ checkId: check.id, rowId: check.rowId, kind: check.kind, expected: check, actual });
  }
  return { status: 'provisional', version: suite.version, categories: ratio(counts.categories[0]!, counts.categories[1]!),
    facts: ratio(counts.facts[0]!, counts.facts[1]!), reconciliation: ratio(counts.reconciliation[0]!, counts.reconciliation[1]!), errors };
}
