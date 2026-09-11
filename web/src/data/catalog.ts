import type {
  CanonicalProduct,
  Fact,
  Listing,
  Offer,
  ReviewItem,
  VerifiedClaim,
} from '../../../src/domain.ts';
import type { CatalogProvenance } from '../../../src/catalog-snapshot.ts';
import type { ClaimSuite, GeneratedReview } from '../../../src/publication-evaluation.ts';
import type { NormalizedRow } from '../../../src/types.ts';
import type { Messages } from '../i18n/messages.ts';

export type CatalogSource = 'demo' | 'pipeline';

export type ProductStatus = 'ready' | 'needs_review' | 'withheld';

export interface ListingView {
  draftText: string | null;
  publishedText: string | null;
  withholdReasons: string[];
  reviewFlags: ReviewItem[];
  publication?: Listing | null;
}

export interface ControlledReviewCase {
  item: ClaimSuite['cases'][number];
  result: { textHash: string; claims: ReviewClaim[] };
}

export type ReviewClaim = Omit<VerifiedClaim, 'evidence'> & {
  evidence: { rowId: string; field: 'raw_title' | 'raw_specs'; quote: string }[];
};

export interface ClaimReviewData {
  generated: GeneratedReview;
  controlled: ControlledReviewCase[];
}

export interface CatalogSnapshot {
  source: CatalogSource;
  provenance?: CatalogProvenance | null;
  products: CanonicalProduct[];
  offers: Offer[];
  facts: Fact[];
  rows: NormalizedRow[];
  review: ReviewItem[];
  listings: Record<string, ListingView>;
  claimReview?: ClaimReviewData;
}

export function productDisplayName(product: CanonicalProduct, rows: NormalizedRow[]): string {
  const model = product.identities[0]?.model?.trim();
  if (model) return model;
  const firstRow = rows.find(r => product.rowIds.includes(r.source.row_id));
  return firstRow?.source.raw_title.trim() || product.id;
}

export function productStatus(product: CanonicalProduct, listing: ListingView | undefined): ProductStatus {
  if (listing?.publication) return listing.publication.status === 'review' ? 'needs_review' : listing.publication.status;
  const hasReview = product.reviewIds.length > 0 || (listing?.reviewFlags.length ?? 0) > 0;
  if (hasReview) return 'needs_review';
  const withhold = listing?.withholdReasons.length ?? 0;
  if (withhold > 0 || !listing?.publishedText) return 'withheld';
  return 'ready';
}

export function statusLabel(status: ProductStatus, messages: Messages): string {
  return messages.status[status];
}
