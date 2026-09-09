import type {
  CanonicalProduct,
  Fact,
  Offer,
  ProductResult,
  ReviewItem,
} from '../../../src/domain.ts';
import type { NormalizedRow } from '../../../src/types.ts';
import type { CatalogSnapshot, ListingView } from './catalog.ts';
import { demoCatalog } from './fixtures.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeProductResult(value: unknown): value is ProductResult {
  if (!isRecord(value)) return false;
  return Array.isArray(value.products) && Array.isArray(value.offers) && Array.isArray(value.facts)
    && Array.isArray(value.rows) && Array.isArray(value.review);
}

function listingFromReview(product: CanonicalProduct, review: ReviewItem[]): ListingView {
  const reviewFlags = review.filter(item => product.reviewIds.includes(item.id)
    || item.productIds.includes(product.id));
  return {
    draftText: null,
    publishedText: null,
    withholdReasons: ['generation_not_run'],
    reviewFlags,
  };
}

/** Project a saved ProductResult into the UI catalog. No matching or verification in the browser. */
export function projectProductResult(result: ProductResult): CatalogSnapshot {
  const listings: Record<string, ListingView> = {};
  for (const product of result.products) {
    listings[product.id] = listingFromReview(product, result.review);
  }
  return {
    source: 'pipeline',
    products: result.products,
    offers: result.offers,
    facts: result.facts,
    rows: result.rows,
    review: result.review,
    listings,
  };
}

function assertArrays(result: ProductResult): void {
  const products = result.products as CanonicalProduct[];
  const offers = result.offers as Offer[];
  const facts = result.facts as Fact[];
  const rows = result.rows as NormalizedRow[];
  const review = result.review as ReviewItem[];
  if (!products || !offers || !facts || !rows || !review) {
    throw new Error('Invalid pipeline result: missing required arrays');
  }
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  const url = import.meta.env.VITE_CATALOG_URL as string | undefined;
  if (!url || !url.trim()) {
    return demoCatalog;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load catalog from ${url} (${response.status})`);
  }

  const payload: unknown = await response.json();
  if (!looksLikeProductResult(payload)) {
    throw new Error('Catalog JSON is not a ProductResult (expected products, offers, facts, rows, review)');
  }

  assertArrays(payload);
  return projectProductResult(payload);
}
