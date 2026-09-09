import { z } from 'zod';
import { TAXONOMY } from './baseline.js';
import { ratio } from './evaluation.js';
import { identify } from './products.js';
import type { Labels } from './types.js';
import type { ProductResult } from './domain.js';
import { canonicalJson } from './ai/runtime.js';

const addition = z.strictObject({ attribute: z.string(), value: z.union([z.string(), z.number(), z.boolean()]), unit: z.string().nullable(), scope: z.enum(['product', 'offer']), conditions: z.array(z.string()) });
const suiteSchema = z.strictObject({ version: z.literal('semantic-checks-v1'), status: z.literal('provisional'), feedHash: z.string(),
  cases: z.array(z.strictObject({ rowId: z.string(), expectedAdditions: z.array(addition), expectedType: z.string().nullable(), expectedCategory: z.enum(TAXONOMY) })) });
export type SemanticSuite = z.infer<typeof suiteSchema>;
export function validateSemantic(value: unknown, labels: Labels, feedHash: string): SemanticSuite {
  const suite = suiteSchema.parse(value);
  const dev = new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds));
  if (suite.feedHash !== feedHash || new Set(suite.cases.map(c => c.rowId)).size !== suite.cases.length || suite.cases.some(c => !dev.has(c.rowId))) throw new Error('invalid semantic cohort');
  return suite;
}
export function evaluateSemantic(result: ProductResult, suite: SemanticSuite) {
  let correct = 0; let unexpected = 0; let missing = 0; let types = 0; let categories = 0;
  const errors: { rowId: string; kind: string; expected: unknown; actual: unknown }[] = [];
  const key = (f: z.infer<typeof addition>) => canonicalJson({ attribute: f.attribute, value: f.value, unit: f.unit, scope: f.scope, conditions: [...f.conditions].sort() });
  for (const c of suite.cases) {
    const product = result.products.find(p => p.rowIds.includes(c.rowId));
    const row = result.rows.find(r => r.source.row_id === c.rowId)!;
    const index = product?.rowIds.indexOf(c.rowId) ?? -1;
    const type = index >= 0 ? product!.identities[index]!.type : identify(row.source, []).type;
    if (type === c.expectedType) types++; else errors.push({ rowId: c.rowId, kind: 'type', expected: c.expectedType, actual: type });
    if (product?.category === c.expectedCategory) categories++; else errors.push({ rowId: c.rowId, kind: 'category', expected: c.expectedCategory, actual: product?.category ?? null });
    const expected = new Set(c.expectedAdditions.map(key));
    const actual = new Set(result.facts.filter(f => f.evidence.rowId === c.rowId && f.rule.startsWith('B2:')).map(key));
    for (const value of expected) {
      if (actual.has(value)) correct++;
      else { missing++; errors.push({ rowId: c.rowId, kind: 'missed_addition', expected: JSON.parse(value), actual: null }); }
    }
    for (const value of actual) if (!expected.has(value)) { unexpected++; errors.push({ rowId: c.rowId, kind: 'unexpected_addition', expected: null, actual: JSON.parse(value) }); }
  }
  return { status: suite.status, version: suite.version, correct, unexpected, missing,
    precision: ratio(correct, correct + unexpected), recall: ratio(correct, correct + missing),
    types: ratio(types, suite.cases.length), categories: ratio(categories, suite.cases.length), errors };
}
export type SemanticEvaluation = ReturnType<typeof evaluateSemantic>;
