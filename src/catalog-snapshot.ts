import { z } from 'zod';
import type { ProductResult } from './domain.js';

const strings = z.array(z.string());
const confidence = z.object({ level: z.enum(['high', 'medium', 'low']), reasons: strings });
const evidence = z.object({ rowId: z.string(), field: z.enum(['raw_title', 'raw_specs']), quote: z.string(), start: z.number().int().nonnegative(), end: z.number().int().nonnegative() });
const price = z.object({ raw: z.string(), amount: z.string().nullable(), currency: z.enum(['GBP', 'EUR', 'USD']).nullable(), status: z.enum(['parsed', 'missing', 'unknown_currency', 'unsupported_format']), assumption: z.string().nullable() });
const resultSchema = z.object({
  rows: z.array(z.object({ source: z.object({ row_id: z.string(), supplier: z.string(), supplier_sku: z.string(), raw_title: z.string(), raw_specs: z.string(), price: z.string(), stock: z.number().int().nonnegative() }), titleKey: z.string(), price, outcome: z.enum(['grouped', 'non_product', 'review']), groupId: z.string().nullable(), reasons: strings })),
  groups: z.array(z.object({ id: z.string(), rowIds: strings, titleKey: z.string(), method: z.enum(['exact_normalized_title', 'compatible_identity']) })),
  products: z.array(z.object({ id: z.string(), rowIds: strings, offerIds: strings, reviewIds: strings, category: z.enum(['audio_headphones', 'audio_speakers', 'wearables', 'laptops', 'tablets', 'phones', 'cameras', 'home_kitchen', 'gaming_accessories', 'storage', 'chargers_cables', 'other']), categoryConfidence: confidence, identityConfidence: confidence,
    identities: z.array(z.object({ model: z.string(), type: z.string().nullable(), brand: z.string().nullable(), variants: z.record(z.string(), strings), evidence: z.array(evidence), conflicts: strings })),
    facts: z.array(z.object({ attribute: z.string(), observations: strings, status: z.enum(['agreed', 'conflict', 'incomparable']), acceptedFactId: z.string().nullable(), confidence })) })),
  offers: z.array(z.object({ id: z.string(), rowId: z.string(), productId: z.string().nullable(), supplier: z.string(), sku: z.string(), price, stock: z.number().int().nonnegative(), condition: z.string().nullable(), factIds: strings })),
  facts: z.array(z.object({ id: z.string(), attribute: z.string(), value: z.union([z.string(), z.number(), z.boolean()]), unit: z.string().nullable(), scope: z.enum(['product', 'offer']), conditions: strings, evidence, rule: z.string(), interval: z.tuple([z.number(), z.number()]).nullable() })),
  unparsed: z.array(evidence),
  candidates: z.array(z.object({ rowIds: z.tuple([z.string(), z.string()]), status: z.enum(['merge', 'reject', 'review']), reasons: strings })),
  review: z.array(z.object({ id: z.string(), rowIds: strings, productIds: strings, reason: z.string(), evidence: z.array(evidence), factIds: strings })),
});

export const provenanceSchema = z.object({
  runId: z.string(), createdAt: z.string(), rulesVersion: z.string(),
  mode: z.enum(['code-only', 'live', 'replay']), status: z.enum(['success', 'partial']),
  qualityStatus: z.enum(['provisional', 'human_verified', 'not_evaluated']),
  split: z.literal('development'), decisionsHash: z.string(),
});
export type CatalogProvenance = z.infer<typeof provenanceSchema>;
export interface SavedCatalog { result: ProductResult; provenance: CatalogProvenance | null }

/** Validate shape and source links, never recompute product or publication decisions. */
export function validateProductResult(input: unknown): ProductResult {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid catalog: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
  const result = input as ProductResult;
  function index<T>(items: T[], key: (item: T) => string): Map<string, T> {
    const map = new Map(items.map(item => [key(item), item]));
    if (map.size !== items.length) throw new Error('Invalid catalog: duplicate IDs');
    return map;
  }
  const rows = index(result.rows, row => row.source.row_id);
  const products = index(result.products, item => item.id);
  const offers = index(result.offers, item => item.id);
  const facts = index(result.facts, item => item.id);
  const review = index(result.review, item => item.id);
  const groups = index(result.groups, item => item.id);
  function requireLink(ok: unknown): asserts ok { if (!ok) throw new Error('Invalid catalog: broken source or product link'); }
  function checkEvidence(item: z.infer<typeof evidence>) {
    const source = rows.get(item.rowId)?.source;
    requireLink(source && item.end >= item.start && source[item.field].slice(item.start, item.end) === item.quote);
  }
  result.facts.forEach(fact => checkEvidence(fact.evidence));
  result.unparsed.forEach(checkEvidence);
  const assigned = new Set<string>();
  for (const product of result.products) {
    const group = groups.get(product.id);
    requireLink(group && group.rowIds.length === product.rowIds.length && group.rowIds.every(id => product.rowIds.includes(id)));
    for (const id of product.rowIds) {
      requireLink(rows.get(id)?.groupId === product.id && !assigned.has(id));
      assigned.add(id);
    }
    for (const id of product.offerIds) requireLink(offers.get(id)?.productId === product.id);
    for (const id of product.reviewIds) requireLink(review.has(id));
    product.identities.forEach(identity => identity.evidence.forEach(checkEvidence));
    for (const fact of product.facts) {
      for (const id of fact.observations) requireLink(facts.has(id) && product.rowIds.includes(facts.get(id)!.evidence.rowId));
      if (fact.acceptedFactId !== null) requireLink(fact.observations.includes(fact.acceptedFactId));
    }
  }
  requireLink(groups.size === products.size);
  for (const row of result.rows) requireLink(row.groupId === null ? !assigned.has(row.source.row_id) : assigned.has(row.source.row_id));
  for (const offer of result.offers) {
    requireLink(rows.has(offer.rowId));
    if (offer.productId !== null) requireLink(products.get(offer.productId)?.offerIds.includes(offer.id) && products.get(offer.productId)?.rowIds.includes(offer.rowId));
    for (const id of offer.factIds) requireLink(facts.get(id)?.evidence.rowId === offer.rowId);
  }
  for (const item of result.review) {
    item.rowIds.forEach(id => requireLink(rows.has(id)));
    item.productIds.forEach(id => requireLink(products.has(id)));
    item.factIds.forEach(id => requireLink(facts.has(id)));
    item.evidence.forEach(checkEvidence);
  }
  result.candidates.forEach(item => item.rowIds.forEach(id => requireLink(rows.has(id))));
  return result;
}

export function parseCatalogPayload(input: unknown): SavedCatalog {
  if (input && typeof input === 'object' && 'result' in input) {
    if (!('provenance' in input)) throw new Error('Invalid catalog: missing provenance');
    return { result: validateProductResult(input.result), provenance: provenanceSchema.parse(input.provenance) };
  }
  return { result: validateProductResult(input), provenance: null };
}
