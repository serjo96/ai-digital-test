import type { CanonicalProduct } from '../../../src/domain.ts';
import type { NormalizedRow } from '../../../src/types.ts';
import {
  productDisplayName,
  productStatus,
  statusLabel,
  type ListingView,
} from '../data/catalog.ts';

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
  if (products.length === 0) {
    return <p className="state muted">{emptyMessage}</p>;
  }

  return (
    <ul className="product-list">
      {products.map(product => {
        const status = productStatus(product, listings[product.id]);
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
                <span className={`badge badge-${status}`}>{statusLabel(status)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
