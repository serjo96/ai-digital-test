import { z } from 'zod';
import type { Labels, ControlledClaimEvaluation, GeneratedClaimEvaluation } from './types.js';
import type { PublicationResult, VerifiedClaim, ClaimVerdict, ProductResult } from './domain.js';

const verdict = z.enum(['supported', 'disputed', 'unsupported']);
export const ClaimSuiteSchema = z.strictObject({
  version: z.literal('stage4-claims-v1'),
  status: z.enum(['provisional', 'human_verified']),
  feedHash: z.string().regex(/^[a-f0-9]{64}$/),
  b1DecisionsHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  cases: z.array(z.strictObject({
    id: z.string().min(1), rowId: z.string().min(1), text: z.string().min(1),
    expectedVerdict: verdict, kind: z.enum(['supported', 'different_number', 'foreign_characteristic', 'removed_qualifier', 'wrong_scope', 'incomparable']),
    rationale: z.string().min(1),
  })).min(1),
});
export type ClaimSuite = z.infer<typeof ClaimSuiteSchema>;

export const GeneratedReviewSchema = z.strictObject({
  version: z.literal('stage4-generated-review-v1'),
  status: z.enum(['provisional', 'human_verified']),
  publicationHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  claims: z.array(z.strictObject({ productId: z.string(), attempt: z.union([z.literal(1), z.literal(2)]), claimId: z.string(), expectedVerdict: verdict, rationale: z.string() })),
});
export type GeneratedReview = z.infer<typeof GeneratedReviewSchema>;

function verificationMetadata(status: string, reviewedBy: string | null, reviewedAt: string | null): void {
  if (status === 'human_verified' && (!reviewedBy?.trim() || !reviewedAt || !Number.isFinite(Date.parse(reviewedAt)))) throw new Error('human verification metadata missing');
  if (status === 'provisional' && (reviewedBy !== null || reviewedAt !== null)) throw new Error('provisional suite cannot claim a reviewer');
}

export function validateClaimSuite(input: unknown, labels: Labels, b1: ProductResult, feedHash: string, decisionsHash: string): ClaimSuite {
  const suite = ClaimSuiteSchema.parse(input);
  verificationMetadata(suite.status, suite.reviewedBy, suite.reviewedAt);
  if (suite.feedHash !== feedHash || suite.b1DecisionsHash !== decisionsHash) throw new Error('stage4 claim suite provenance mismatch');
  if (new Set(suite.cases.map(c => c.id)).size !== suite.cases.length) throw new Error('duplicate stage4 claim case');
  const development = new Set(labels.cases.filter(c => c.split === 'development').flatMap(c => c.rowIds));
  const products = new Map(b1.products.flatMap(p => p.rowIds.map(id => [id, p] as const)));
  for (const item of suite.cases) {
    if (!development.has(item.rowId)) throw new Error(`stage4 claim case is not development: ${item.id}`);
    if (!products.has(item.rowId)) throw new Error(`stage4 claim case has no product: ${item.id}`);
  }
  return suite;
}

const aggregateVerdict = (claims: VerifiedClaim[]): ClaimVerdict | null => {
  if (!claims.length) return null;
  for (const value of ['error', 'unknown', 'unsupported', 'disputed', 'supported'] as const) if (claims.some(c => c.verdict === value)) return value;
  return null;
};

export function evaluateControlled(suite: ClaimSuite | null, actual: Map<string, VerifiedClaim[]>): ControlledClaimEvaluation {
  if (!suite) return { status: 'not_evaluated', checked: 0, supported: { allowed: 0, total: 0, falseBlocks: 0 }, unsupported: { blocked: 0, total: 0, leaked: 0 }, disputed: { blocked: 0, total: 0, leaked: 0 }, errors: [] };
  const result: ControlledClaimEvaluation = { status: suite.status, checked: 0, supported: { allowed: 0, total: 0, falseBlocks: 0 }, unsupported: { blocked: 0, total: 0, leaked: 0 }, disputed: { blocked: 0, total: 0, leaked: 0 }, errors: [] };
  for (const item of suite.cases) {
    const value = aggregateVerdict(actual.get(item.id) ?? []);
    if (value === null) { result.errors.push({ caseId: item.id, expected: item.expectedVerdict, actual: null }); continue; }
    result.checked++;
    if (item.expectedVerdict === 'supported') {
      result.supported.total++;
      if (value === 'supported') result.supported.allowed++; else result.supported.falseBlocks++;
    } else if (item.expectedVerdict === 'unsupported') {
      result.unsupported.total++;
      if (value === 'supported') result.unsupported.leaked++; else result.unsupported.blocked++;
    } else {
      result.disputed.total++;
      if (value === 'supported') result.disputed.leaked++; else result.disputed.blocked++;
    }
    if (value !== item.expectedVerdict) result.errors.push({ caseId: item.id, expected: item.expectedVerdict, actual: value });
  }
  return result;
}

export function generatedReviewTemplate(result: PublicationResult, publicationHash: string): GeneratedReview {
  return { version: 'stage4-generated-review-v1', status: 'provisional', publicationHash, reviewedBy: null, reviewedAt: null,
    claims: result.listings.flatMap(listing => listing.attempts.filter(a => a.attempt === listing.selectedAttempt).flatMap(a => a.claims.map(claim => ({
      productId: listing.productId, attempt: a.attempt, claimId: claim.id, expectedVerdict: claim.verdict === 'supported' ? 'supported' as const : claim.verdict === 'disputed' ? 'disputed' as const : 'unsupported' as const, rationale: '',
    })))) };
}

export function evaluateGenerated(input: unknown | null, result: PublicationResult, publicationHash: string): GeneratedClaimEvaluation {
  if (input === null) return { status: 'not_evaluated', checkedPublishedClaims: 0, publishedClaimErrors: 0 };
  const review = GeneratedReviewSchema.parse(input);
  verificationMetadata(review.status, review.reviewedBy, review.reviewedAt);
  if (review.publicationHash !== publicationHash) throw new Error('generated review publication hash mismatch');
  const published = new Map<string, VerifiedClaim>();
  for (const listing of result.listings.filter(l => l.publishedText !== null)) for (const attempt of listing.attempts.filter(a => a.attempt === listing.selectedAttempt)) for (const claim of attempt.claims) published.set(`${listing.productId}:${attempt.attempt}:${claim.id}`, claim);
  if (review.claims.length !== published.size) throw new Error('generated review must cover every published claim');
  let errors = 0;
  for (const item of review.claims) {
    const key = `${item.productId}:${item.attempt}:${item.claimId}`;
    const claim = published.get(key);
    if (!claim) throw new Error('generated review references a non-published claim');
    if (item.expectedVerdict !== 'supported') errors++;
    published.delete(key);
  }
  if (published.size) throw new Error('generated review is incomplete');
  return { status: review.status, checkedPublishedClaims: review.claims.length, publishedClaimErrors: errors };
}
