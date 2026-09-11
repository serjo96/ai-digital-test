import type { CanonicalProduct } from '../../../src/domain.ts';
import type { NormalizedRow } from '../../../src/types.ts';
import {
  productDisplayName,
  productStatus,
  statusLabel,
  type ListingView,
} from '../data/catalog.ts';
import { hasUnresolvedFacts, primaryReviewReason } from '../data/labels.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';

interface Props {
  products: CanonicalProduct[];
  rows: NormalizedRow[];
  listings: Record<string, ListingView>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyMessage: string;
}

export function ProductList({
  products,
  rows,
  listings,
  selectedId,
  onSelect,
  emptyMessage,
}: Props) {
  const { t, messages } = useI18n();

  if (products.length === 0) {
    return <p className="state muted">{emptyMessage}</p>;
  }

  return (
    <ul className="product-list">
      {products.map(product => {
        const listing = listings[product.id];
        const status = productStatus(product, listing);
        const primary = primaryReviewReason(product, listing, messages);
        const unresolved = hasUnresolvedFacts(product);
        return (
          <li key={product.id}>
            <button
              type="button"
              className={product.id === selectedId ? 'product-item selected' : 'product-item'}
              aria-pressed={product.id === selectedId}
              onClick={() => onSelect(product.id)}
            >
              <span className="product-name">{productDisplayName(product, rows)}</span>
              <span className="product-meta">
                <span className="category">{product.category}</span>
                <span className={`badge badge-${status}`}>{statusLabel(status, messages)}</span>
                {unresolved ? (
                  <span className="chip chip-conflict">{t('productList.conflict')}</span>
                ) : null}
                <span className="chip">
                  {t('productList.offers', { count: product.offerIds.length })}
                </span>
              </span>
              {primary ? (
                <span className="product-reason muted">{primary.label}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
