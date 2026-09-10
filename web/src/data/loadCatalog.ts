import { isPublicationResult, type CanonicalProduct, type ProductResult, type ReviewItem } from '../../../src/domain.ts';
import { parseCatalogPayload, type CatalogProvenance } from '../../../src/catalog-snapshot.ts';
import { ClaimSuiteSchema, GeneratedReviewSchema } from '../../../src/publication-evaluation.ts';
import type { CatalogSnapshot, ClaimReviewData, ListingView, ReviewClaim } from './catalog.ts';

function parseReviewResult(input: unknown): { textHash: string; claims: Omit<ReviewClaim, 'id'>[] } {
  if (!input || typeof input !== 'object') throw new Error('Invalid controlled verifier result');
  const value = input as Record<string, unknown>;
  if (typeof value.textHash !== 'string' || !Array.isArray(value.claims)) throw new Error('Invalid controlled verifier result');
  const claims = value.claims.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid controlled claim');
    const claim = item as Record<string, unknown>;
    if (typeof claim.text !== 'string' || typeof claim.start !== 'number' || typeof claim.end !== 'number'
      || typeof claim.verdict !== 'string' || !Array.isArray(claim.supportIds) || !Array.isArray(claim.decisionIds)
      || !Array.isArray(claim.evidence) || typeof claim.reason !== 'string') throw new Error('Invalid controlled claim');
    return claim as unknown as Omit<ReviewClaim, 'id'>;
  });
  return { textHash: value.textHash, claims };
}

function listingFromReview(product: CanonicalProduct, review: ReviewItem[]): ListingView {
  const reviewFlags = review.filter(item => product.reviewIds.includes(item.id)
    || item.productIds.includes(product.id));
  return {
    draftText: null,
    publishedText: null,
    withholdReasons: ['generation_not_run'],
    reviewFlags,
    publication: null,
  };
}

/** Project a saved ProductResult into the UI catalog. No matching or verification in the browser. */
export function projectProductResult(result: ProductResult, provenance: CatalogProvenance | null = null, claimReview?: ClaimReviewData): CatalogSnapshot {
  const listings: Record<string, ListingView> = {};
  const publications = isPublicationResult(result) ? new Map(result.listings.map(listing => [listing.productId, listing])) : null;
  for (const product of result.products) {
    const fallback = listingFromReview(product, result.review);
    const publication = publications?.get(product.id) ?? null;
    listings[product.id] = publication ? {
      draftText: publication.draftText,
      publishedText: publication.publishedText,
      withholdReasons: publication.withholdReasons,
      reviewFlags: fallback.reviewFlags,
      publication,
    } : fallback;
  }
  return {
    source: 'pipeline',
    provenance,
    products: result.products,
    offers: result.offers,
    facts: result.facts,
    rows: result.rows,
    review: result.review,
    listings,
    ...(claimReview ? { claimReview } : {}),
  };
}

export async function loadCatalog(url = import.meta.env?.VITE_CATALOG_URL?.trim() || '/data/catalog.json'): Promise<CatalogSnapshot> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const { result, provenance } = parseCatalogPayload(payload);
    let claimReview: ClaimReviewData | undefined;
    if (payload.review && typeof payload.review === 'object' && !Array.isArray(payload.review) && 'generated' in payload.review) {
      const review = payload.review as Record<string, unknown>;
      const generated = GeneratedReviewSchema.parse(review.generated);
      const controlled = Array.isArray(review.controlled) ? review.controlled.map(value => {
        if (!value || typeof value !== 'object') throw new Error('Invalid controlled review case');
        const entry = value as Record<string, unknown>;
        const item = ClaimSuiteSchema.shape.cases.element.parse(entry.item);
        const result = parseReviewResult(entry.result);
        return { item, result: { ...result, claims: result.claims.map((claim, index) => ({ ...claim, id: `controlled:${item.id}:${index}` })) } };
      }) : [];
      claimReview = { generated, controlled };
    }
    return projectProductResult(result, provenance, claimReview);
  } catch (error) {
    throw new Error(`Cannot load catalog from ${url}: ${error instanceof Error ? error.message : String(error)}. Prepare a saved B1 or B3 run with npm run web:prepare -- --run-dir <run-directory>`);
  }
}
