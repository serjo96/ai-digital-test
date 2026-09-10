import { useEffect, useMemo, useState } from 'react';
import {
  productDisplayName,
  productStatus,
  statusLabel,
  type CatalogSnapshot,
} from './data/catalog.ts';
import { loadCatalog } from './data/loadCatalog.ts';
import { ProductDetail } from './components/ProductDetail.tsx';
import { ProductList } from './components/ProductList.tsx';
import { RunOverview } from './components/RunOverview.tsx';
import { ClaimReview } from './components/ClaimReview.tsx';
import './App.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: CatalogSnapshot };

export default function App() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'catalog' | 'claims'>('catalog');

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    loadCatalog()
      .then(catalog => {
        if (cancelled) return;
        setLoad({ status: 'ready', catalog });
        setSelectedId(catalog.products[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoad({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (load.status !== 'ready') return [];
    const { catalog } = load;
    const needle = query.trim().toLowerCase();
    return catalog.products.filter(product => {
      const listing = catalog.listings[product.id];
      const status = productStatus(product, listing);
      if (needsReviewOnly && status !== 'needs_review') return false;
      if (!needle) return true;
      const name = productDisplayName(product, catalog.rows).toLowerCase();
      const titles = catalog.rows
        .filter(r => product.rowIds.includes(r.source.row_id))
        .map(r => r.source.raw_title.toLowerCase());
      return name.includes(needle) || titles.some(t => t.includes(needle));
    });
  }, [load, query, needsReviewOnly]);

  useEffect(() => {
    if (load.status !== 'ready') return;
    if (selectedId && filtered.some(p => p.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [load, filtered, selectedId]);

  if (load.status === 'loading') {
    return (
      <div className="app shell">
        <p className="state" role="status">Loading catalog…</p>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="app shell">
        <p className="state error" role="alert">
          Failed to load catalog: {load.message}
        </p>
      </div>
    );
  }

  const { catalog } = load;
  if (catalog.products.length === 0) {
    return (
      <div className="app shell">
        {catalog.source === 'demo' && catalog.demoNotice ? (
          <p className="demo-banner" role="note">{catalog.demoNotice}</p>
        ) : null}
        <p className="state" role="status">No products in this catalog.</p>
      </div>
    );
  }

  const selected = filtered.find(p => p.id === selectedId) ?? null;
  const selectedListing = selected ? catalog.listings[selected.id] : undefined;
  const filtersActive = needsReviewOnly || Boolean(query.trim());
  const clearFilters = () => {
    setQuery('');
    setNeedsReviewOnly(false);
  };

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Shelf Ready — Results</h1>
          <p className="subtitle">
            Read-only view of canonical products
            {catalog.source === 'pipeline' ? ' (pipeline snapshot)' : ' (demo fixtures)'}
          </p>
        </div>
        {catalog.source === 'demo' && catalog.demoNotice ? (
          <p className="demo-banner" role="note">{catalog.demoNotice}</p>
        ) : null}
      </header>

      <RunOverview catalog={catalog} />
      {catalog.claimReview ? <nav className="view-tabs" aria-label="Result view">
        <button type="button" className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}>Catalog</button>
        <button type="button" className={view === 'claims' ? 'active' : ''} onClick={() => setView('claims')}>Review claims</button>
      </nav> : null}
      {view === 'claims' && catalog.claimReview ? <>
        <p className="review-task" role="note">
          Check each highlighted statement against supplier evidence. Agree or change the AI verdict and write a short reason.
        </p>
        <ClaimReview catalog={catalog} />
      </> : <div className="layout">
        <aside className="sidebar">
          <div className="filters">
            <label className="search">
              <span>Search by name</span>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="e.g. aerobuds"
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={needsReviewOnly}
                onChange={event => setNeedsReviewOnly(event.target.checked)}
              />
              Needs review
            </label>
            {filtersActive ? (
              <button type="button" className="clear-filters" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
          <ProductList
            products={filtered}
            rows={catalog.rows}
            listings={catalog.listings}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyMessage={
              filtersActive
                ? 'No matching products.'
                : 'No products in this catalog.'
            }
          />
        </aside>

        <main className="detail">
          {selected ? (
            <ProductDetail
              key={selected.id}
              product={selected}
              listing={selectedListing}
              offers={catalog.offers.filter(o => selected.offerIds.includes(o.id))}
              facts={catalog.facts}
              rows={catalog.rows.filter(r => selected.rowIds.includes(r.source.row_id) || selectedListing?.reviewFlags.some(flag => flag.rowIds.includes(r.source.row_id) || flag.evidence.some(e => e.rowId === r.source.row_id)))}
              status={productStatus(selected, selectedListing)}
              statusText={statusLabel(productStatus(selected, selectedListing))}
            />
          ) : (
            <div className="state" role="status">
              <p>
                {filtered.length === 0 && filtersActive
                  ? 'No matching products to display.'
                  : 'Select a product to inspect.'}
              </p>
              {filtered.length === 0 && filtersActive ? (
                <button type="button" className="clear-filters" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          )}
        </main>
      </div>}
    </div>
  );
}
