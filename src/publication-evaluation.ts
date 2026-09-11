import { z } from 'zod';
import type { Labels, ControlledClaimEvaluation, GeneratedClaimEvaluation } from './types.js';
import type { PublicationResult, VerifiedClaim, ClaimVerdict, ProductResult } from './domain.js';

const verdict = z.enum(['supported', 'disputed', 'unsupported']);
const issueType = z.enum(['non_atomic_claim', 'unclear_copy']);
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

export const LegacyGeneratedReviewSchema = z.strictObject({
  version: z.literal('stage4-generated-review-v1'),
  status: z.enum(['provisional', 'human_verified']),
  publicationHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  claims: z.array(z.strictObject({ productId: z.string(), attempt: z.union([z.literal(1), z.literal(2)]), claimId: z.string(), expectedVerdict: verdict, rationale: z.string() })),
});

export const GeneratedReviewSchema = z.strictObject({
  version: z.literal('stage4-generated-review-v2'),
  status: z.enum(['provisional', 'human_verified']),
  publicationHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  sampleProductIds: z.array(z.string().min(1)),
  claims: z.array(z.strictObject({
    productId: z.string().min(1),
    attempt: z.union([z.literal(1), z.literal(2)]),
    claimId: z.string().min(1),
    state: z.enum(['pending', 'reviewed']),
    humanVerdict: verdict.nullable(),
    rationale: z.string(),
    issueTypes: z.array(issueType),
  })),
}).superRefine((review, context) => {
  if (new Set(review.sampleProductIds).size !== review.sampleProductIds.length) {
    context.addIssue({ code: 'custom', path: ['sampleProductIds'], message: 'duplicate sample product' });
  }
  for (const [index, claim] of review.claims.entries()) {
    if (new Set(claim.issueTypes).size !== claim.issueTypes.length) {
      context.addIssue({ code: 'custom', path: ['claims', index, 'issueTypes'], message: 'duplicate issue type' });
    }
    if (claim.state === 'reviewed' && (!claim.humanVerdict || !claim.rationale.trim())) {
      context.addIssue({ code: 'custom', path: ['claims', index], message: 'reviewed claim requires human verdict and rationale' });
    }
  }
});
export type GeneratedReview = z.infer<typeof GeneratedReviewSchema>;
export type LegacyGeneratedReview = z.infer<typeof LegacyGeneratedReviewSchema>;

export function migrateGeneratedReview(input: unknown, sampleProductIds: string[] = []): GeneratedReview {
  const current = GeneratedReviewSchema.safeParse(input);
  if (current.success) return current.data;
  const legacy = LegacyGeneratedReviewSchema.parse(input);
  return GeneratedReviewSchema.parse({
    version: 'stage4-generated-review-v2',
    status: 'provisional',
    publicationHash: legacy.publicationHash,
    reviewedBy: null,
    reviewedAt: null,
    sampleProductIds,
    claims: legacy.claims.map(claim => ({
      productId: claim.productId,
      attempt: claim.attempt,
      claimId: claim.claimId,
      state: claim.rationale.trim() ? 'reviewed' : 'pending',
      humanVerdict: claim.rationale.trim() ? claim.expectedVerdict : null,
      rationale: claim.rationale,
      issueTypes: [],
    })),
  });
}

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
  return { version: 'stage4-generated-review-v2', status: 'provisional', publicationHash, reviewedBy: null, reviewedAt: null, sampleProductIds: [],
    claims: result.listings.filter(listing => listing.publishedText !== null).flatMap(listing => listing.attempts.filter(a => a.attempt === listing.selectedAttempt).flatMap(a => a.claims.map(claim => ({
      productId: listing.productId, attempt: a.attempt, claimId: claim.id, state: 'pending' as const, humanVerdict: null, rationale: '', issueTypes: [],
    })))) };
}

/** Carry only stable reviewed claim keys into a new publication; changed claims remain pending. */
export function rebaseGeneratedReview(input: unknown, result: PublicationResult, publicationHash: string, sourceResult?: PublicationResult): GeneratedReview {
  const source = migrateGeneratedReview(input);
  const target = generatedReviewTemplate(result, publicationHash);
  const targetProducts = new Set(target.claims.map(claim => claim.productId));
  const reviewed = new Map(source.claims.filter(claim => claim.state === 'reviewed').map(claim => [`${claim.productId}:${claim.attempt}:${claim.claimId}`, claim]));
  const sourceListings = new Map(sourceResult?.listings.map(listing => [listing.productId, listing]) ?? []);
  const targetListings = new Map(result.listings.map(listing => [listing.productId, listing]));
  const migrateByCoverage = (claim: GeneratedReview['claims'][number]) => {
    const oldListing = sourceListings.get(claim.productId);
    const newListing = targetListings.get(claim.productId);
    if (!oldListing?.publishedText || oldListing.publishedText !== newListing?.publishedText) return null;
    const oldAttempt = oldListing.attempts.find(attempt => attempt.attempt === oldListing.selectedAttempt);
    const newAttempt = newListing.attempts.find(attempt => attempt.attempt === newListing.selectedAttempt);
    const newClaim = newAttempt?.claims.find(item => item.id === claim.claimId);
    if (!oldAttempt || !newClaim || oldAttempt.attempt !== newAttempt?.attempt) return null;
    const coveredClaims = oldAttempt.claims.filter(item => item.start >= newClaim.start && item.end <= newClaim.end);
    if (!coveredClaims.length) return null;
    for (let index = newClaim.start; index < newClaim.end; index++) {
      if (/[\p{L}\p{N}]/u.test(newAttempt.text[index]!) && !coveredClaims.some(item => item.start <= index && item.end > index)) return null;
    }
    const decisions = coveredClaims.map(item => reviewed.get(`${claim.productId}:${oldAttempt.attempt}:${item.id}`));
    if (decisions.some(item => !item || item.humanVerdict !== 'supported')) return null;
    const complete = decisions as GeneratedReview['claims'];
    const resolvedAtomicity = complete.some(item => item.issueTypes.includes('non_atomic_claim'));
    return {
      ...claim,
      state: 'reviewed' as const,
      humanVerdict: 'supported' as const,
      rationale: `${resolvedAtomicity ? 'Atomic-v2 span resolves the prior structural issue. Prior human rationale: ' : ''}${[...new Set(complete.map(item => item.rationale))].join(' | ')}`,
      issueTypes: [...new Set(complete.flatMap(item => item.issueTypes).filter(issue => issue !== 'non_atomic_claim'))],
    };
  };
  const claims = target.claims.map(claim => reviewed.get(`${claim.productId}:${claim.attempt}:${claim.claimId}`) ?? migrateByCoverage(claim) ?? claim);
  const sampleProductIds = source.sampleProductIds.filter(productId => targetProducts.has(productId));
  const sampleComplete = sampleProductIds.length >= 20 && sampleProductIds.every(productId => claims.filter(claim => claim.productId === productId).every(claim => claim.state === 'reviewed'));
  return GeneratedReviewSchema.parse({
    ...target,
    status: source.status === 'human_verified' && sampleComplete ? 'human_verified' : 'provisional',
    reviewedBy: source.status === 'human_verified' && sampleComplete ? source.reviewedBy : null,
    reviewedAt: source.status === 'human_verified' && sampleComplete ? source.reviewedAt : null,
    sampleProductIds,
    claims,
  });
}

export function evaluateGenerated(input: unknown | null, result: PublicationResult, publicationHash: string): GeneratedClaimEvaluation {
  const publishedListings = result.listings.filter(l => l.publishedText !== null);
  const totalPublishedClaims = publishedListings.reduce((count, listing) => count + listing.attempts.filter(a => a.attempt === listing.selectedAttempt).reduce((sum, attempt) => sum + attempt.claims.length, 0), 0);
  const totalPublishedProducts = publishedListings.length;
  if (input === null) return { status: 'not_evaluated', checkedPublishedClaims: 0, totalPublishedClaims, fullyCheckedProducts: 0, totalPublishedProducts, completedSampleProducts: 0, requiredSampleProducts: 0, publishedClaimErrors: 0, nonAtomicIssueClaims: 0, unclearCopyIssueClaims: 0 };
  const review = GeneratedReviewSchema.parse(input);
  verificationMetadata(review.status, review.reviewedBy, review.reviewedAt);
  if (review.publicationHash !== publicationHash) throw new Error('generated review publication hash mismatch');
  const published = new Map<string, VerifiedClaim>();
  const productKeys = new Map<string, string[]>();
  for (const listing of publishedListings) for (const attempt of listing.attempts.filter(a => a.attempt === listing.selectedAttempt)) for (const claim of attempt.claims) {
    const key = `${listing.productId}:${attempt.attempt}:${claim.id}`;
    published.set(key, claim);
    productKeys.set(listing.productId, [...(productKeys.get(listing.productId) ?? []), key]);
  }
  if (review.claims.length !== published.size) throw new Error('generated review must cover every published claim');
  const seenKeys = new Set<string>();
  const reviewedKeys = new Set<string>();
  let errors = 0; let nonAtomicIssueClaims = 0; let unclearCopyIssueClaims = 0;
  for (const item of review.claims) {
    const key = `${item.productId}:${item.attempt}:${item.claimId}`;
    if (seenKeys.has(key)) throw new Error('generated review contains a duplicate claim');
    seenKeys.add(key);
    const claim = published.get(key);
    if (!claim) throw new Error('generated review references a non-published claim');
    if (item.state === 'reviewed') {
      reviewedKeys.add(key);
      if (item.humanVerdict !== 'supported') errors++;
      if (item.issueTypes.includes('non_atomic_claim')) nonAtomicIssueClaims++;
      if (item.issueTypes.includes('unclear_copy')) unclearCopyIssueClaims++;
    }
    published.delete(key);
  }
  if (published.size) throw new Error('generated review is incomplete');
  for (const productId of review.sampleProductIds) if (!productKeys.has(productId)) throw new Error('generated review sample references a non-published product');
  const fullyChecked = new Set([...productKeys].filter(([, keys]) => keys.every(key => reviewedKeys.has(key))).map(([productId]) => productId));
  const completedSampleProducts = review.sampleProductIds.filter(productId => fullyChecked.has(productId)).length;
  if (review.status === 'human_verified' && (review.sampleProductIds.length < 20 || completedSampleProducts !== review.sampleProductIds.length)) {
    throw new Error('human-verified generated review requires a complete sample of at least 20 products');
  }
  return { status: review.status, checkedPublishedClaims: reviewedKeys.size, totalPublishedClaims, fullyCheckedProducts: fullyChecked.size, totalPublishedProducts,
    completedSampleProducts, requiredSampleProducts: review.sampleProductIds.length, publishedClaimErrors: errors, nonAtomicIssueClaims, unclearCopyIssueClaims };
}

export function generatedReviewGatePassed(evaluation: GeneratedClaimEvaluation): boolean {
  return evaluation.status === 'human_verified'
    && evaluation.requiredSampleProducts >= 20
    && evaluation.completedSampleProducts === evaluation.requiredSampleProducts
    && evaluation.publishedClaimErrors === 0
    && evaluation.nonAtomicIssueClaims === 0;
}
