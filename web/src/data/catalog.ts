import type {
  CanonicalProduct,
  Fact,
  Offer,
  ReviewItem,
} from '../../../src/domain.ts';
import type { CatalogProvenance } from '../../../src/catalog-snapshot.ts';
import type { NormalizedRow } from '../../../src/types.ts';

export type CatalogSource = 'demo' | 'pipeline';

export type ProductStatus = 'ready' | 'needs_review' | 'withheld';

export interface ListingView {
  draftText: string | null;
  publishedText: string | null;
  withholdReasons: string[];
  reviewFlags: ReviewItem[];
}

export interface CatalogSnapshot {
  source: CatalogSource;
  demoNotice?: string;
  provenance?: CatalogProvenance | null;
  products: CanonicalProduct[];
  offers: Offer[];
  facts: Fact[];
  rows: NormalizedRow[];
  review: ReviewItem[];
  listings: Record<string, ListingView>;
}

export function productDisplayName(product: CanonicalProduct, rows: NormalizedRow[]): string {
  const model = product.identities[0]?.model?.trim();
  if (model) return model;
  const firstRow = rows.find(r => product.rowIds.includes(r.source.row_id));
  return firstRow?.source.raw_title.trim() || product.id;
}

export function productStatus(product: CanonicalProduct, listing: ListingView | undefined): ProductStatus {
  const hasReview = product.reviewIds.length > 0 || (listing?.reviewFlags.length ?? 0) > 0;
  if (hasReview) return 'needs_review';
  const withhold = listing?.withholdReasons.length ?? 0;
  if (withhold > 0 || !listing?.publishedText) return 'withheld';
  return 'ready';
}

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'needs_review':
      return 'Needs review';
    case 'withheld':
      return 'Withheld';
  }
}
