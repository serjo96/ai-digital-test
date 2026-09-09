import type { CanonicalProduct, ProductResult, ReviewItem } from '../../../src/domain.ts';
import { parseCatalogPayload, type CatalogProvenance } from '../../../src/catalog-snapshot.ts';
import type { CatalogSnapshot, ListingView } from './catalog.ts';

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
export function projectProductResult(result: ProductResult, provenance: CatalogProvenance | null = null): CatalogSnapshot {
  const listings: Record<string, ListingView> = {};
  for (const product of result.products) {
    listings[product.id] = listingFromReview(product, result.review);
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
  };
}

export async function loadCatalog(url = import.meta.env?.VITE_CATALOG_URL?.trim() || '/data/catalog.json'): Promise<CatalogSnapshot> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { result, provenance } = parseCatalogPayload(await response.json());
    return projectProductResult(result, provenance);
  } catch (error) {
    throw new Error(`Cannot load catalog from ${url}: ${error instanceof Error ? error.message : String(error)}. Prepare a saved run with: npm run web:prepare -- --run-dir reports/B1-stage5-control`);
  }
}
