import {
  GeneratedReviewSchema,
  migrateGeneratedReview,
  type GeneratedReview,
} from '../../../src/publication-evaluation.ts';

export const generatedClaimKey = (item: Pick<GeneratedReview['claims'][number], 'productId' | 'attempt' | 'claimId'>) =>
  `${item.productId}:${item.attempt}:${item.claimId}`;

export function generatedClaimNeedsAttention(claim: GeneratedReview['claims'][number], aiVerdict: string): boolean {
  return claim.state === 'reviewed' && (claim.humanVerdict !== aiVerdict || claim.issueTypes.length > 0);
}

export function generatedReviewProgress(review: GeneratedReview) {
  const productClaims = new Map<string, GeneratedReview['claims']>();
  for (const claim of review.claims) productClaims.set(claim.productId, [...(productClaims.get(claim.productId) ?? []), claim]);
  const completeProducts = new Set([...productClaims].filter(([, claims]) => claims.every(claim => claim.state === 'reviewed')).map(([productId]) => productId));
  return {
    checkedClaims: review.claims.filter(claim => claim.state === 'reviewed').length,
    totalClaims: review.claims.length,
    checkedProducts: completeProducts.size,
    totalProducts: productClaims.size,
    completedSampleProducts: review.sampleProductIds.filter(productId => completeProducts.has(productId)).length,
    requiredSampleProducts: review.sampleProductIds.length,
  };
}

export function generatedReviewReady(review: GeneratedReview, reviewer: string): boolean {
  const progress = generatedReviewProgress(review);
  return Boolean(reviewer.trim()) && progress.requiredSampleProducts >= 20
    && progress.completedSampleProducts === progress.requiredSampleProducts;
}

export function finalizeGeneratedReview(review: GeneratedReview, reviewer: string, reviewedAt = new Date().toISOString()): GeneratedReview {
  const complete = generatedReviewReady(review, reviewer);
  return GeneratedReviewSchema.parse({
    ...review,
    status: complete ? 'human_verified' : 'provisional',
    reviewedBy: complete ? reviewer.trim() : null,
    reviewedAt: complete ? reviewedAt : null,
  });
}

/** Merge a compatible local draft without allowing it to overwrite repository-backed reviewed decisions. */
export function mergeGeneratedReview(bundle: GeneratedReview, saved: unknown): GeneratedReview {
  const local = migrateGeneratedReview(saved, bundle.sampleProductIds);
  if (local.publicationHash !== bundle.publicationHash || local.claims.length !== bundle.claims.length) return bundle;
  const localByKey = new Map(local.claims.map(claim => [generatedClaimKey(claim), claim]));
  if (bundle.claims.some(claim => !localByKey.has(generatedClaimKey(claim)))) return bundle;
  return GeneratedReviewSchema.parse({
    ...bundle,
    status: 'provisional',
    reviewedBy: null,
    reviewedAt: null,
    claims: bundle.claims.map(claim => claim.state === 'reviewed' ? claim : localByKey.get(generatedClaimKey(claim))!),
  });
}
