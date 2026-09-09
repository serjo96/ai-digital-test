import type { BaselineResult, PriceResult, SourceRow } from './types.js';
import type { TAXONOMY } from './baseline.js';

export type Category = typeof TAXONOMY[number];
export interface Confidence { level: 'high' | 'medium' | 'low'; reasons: string[] }
export interface Evidence { rowId: string; field: 'raw_title' | 'raw_specs'; quote: string; start: number; end: number }
export interface Fact {
  id: string;
  attribute: string;
  value: string | number | boolean;
  unit: string | null;
  scope: 'product' | 'offer';
  conditions: string[];
  evidence: Evidence;
  rule: string;
  interval: [number, number] | null;
}
export interface Extraction { facts: Fact[]; unparsed: Evidence[] }
export interface Identity {
  model: string;
  type: string | null;
  brand: string | null;
  variants: Record<string, string[]>;
  evidence: Evidence[];
  conflicts: string[];
}
export interface ReconciledFact {
  attribute: string;
  observations: string[];
  status: 'agreed' | 'conflict' | 'incomparable';
  acceptedFactId: string | null;
  confidence: Confidence;
}
export interface Offer {
  id: string; rowId: string; productId: string | null;
  supplier: string; sku: string; price: PriceResult; stock: number;
  condition: string | null; factIds: string[];
}
export interface CanonicalProduct {
  id: string; rowIds: string[]; identities: Identity[]; offerIds: string[];
  category: Category; categoryConfidence: Confidence; identityConfidence: Confidence;
  facts: ReconciledFact[];
  reviewIds: string[];
}
export interface CandidateDecision {
  rowIds: [string, string];
  status: 'merge' | 'reject' | 'review';
  reasons: string[];
}
export interface ReviewItem {
  id: string; rowIds: string[]; productIds: string[];
  reason: string; evidence: Evidence[]; factIds: string[];
}
export interface ProductResult extends BaselineResult {
  products: CanonicalProduct[];
  offers: Offer[];
  facts: Fact[];
  unparsed: Evidence[];
  candidates: CandidateDecision[];
  review: ReviewItem[];
}
export const isProductResult = (result: BaselineResult): result is ProductResult => 'products' in result;
export const sourceEvidence = (row: SourceRow, field: Evidence['field']): Evidence => ({
  rowId: row.row_id, field, quote: row[field], start: 0, end: row[field].length,
});
