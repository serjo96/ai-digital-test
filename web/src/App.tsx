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
import { MatchingReview } from './components/MatchingReview.tsx';
import { ReviewContextBar, type ContextChip } from './components/ReviewContextBar.tsx';
import { useI18n } from './i18n/I18nProvider.tsx';
import { LanguageSwitcher } from './i18n/LanguageSwitcher.tsx';
import { useIsMobile } from './hooks/useIsMobile.ts';
import './App.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: CatalogSnapshot };

type AppView = 'catalog' | 'claims' | 'matching';
type MobilePane = 'list' | 'detail';

function AppHeader({
  subtitle,
  showDemoNotice = false,
  compact = false,
}: {
  subtitle?: string;
  showDemoNotice?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <header className={`top${compact ? ' top-compact' : ''}`}>
      <div className="top-bar">
        <div>
          <h1>{t('header.title')}</h1>
          {subtitle && !compact ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <LanguageSwitcher />
      </div>
      {showDemoNotice ? (
        <p className="demo-banner" role="note">{t('demo.notice')}</p>
      ) : null}
    </header>
  );
}

function ViewTabs({
  view,
  setView,
  catalog,
  mobile,
}: {
  view: AppView;
  setView: (view: AppView) => void;
  catalog: CatalogSnapshot;
  mobile: boolean;
}) {
  const { t } = useI18n();
  if (!catalog.claimReview && !catalog.matchingReview) return null;

  const tabs: { id: AppView; label: string; show: boolean }[] = [
    {
      id: 'catalog',
      label: mobile ? t('tabs.shortCatalog') : t('tabs.catalog'),
      show: true,
    },
    {
      id: 'claims',
      label: mobile ? t('tabs.shortClaims') : t('tabs.claims'),
      show: Boolean(catalog.claimReview),
    },
    {
      id: 'matching',
      label: mobile ? t('tabs.shortMatching') : t('tabs.matching'),
      show: Boolean(catalog.matchingReview),
    },
  ];

  return (
    <nav
      className={mobile ? 'view-tabs view-tabs-bottom' : 'view-tabs'}
      aria-label={t('tabs.aria')}
    >
      {tabs
        .filter(tab => tab.show)
        .map(tab => (
          <button
            key={tab.id}
            type="button"
            className={view === tab.id ? 'active' : ''}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
    </nav>
  );
}

export default function App() {
  const { t, messages } = useI18n();
  const isMobile = useIsMobile();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('catalog');
  const [mobilePane, setMobilePane] = useState<MobilePane>('list');

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

  useEffect(() => {
    setMobilePane('list');
  }, [view]);

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
      <div className="app">
        <AppHeader />
        <div className="shell">
          <p className="state" role="status">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="app">
        <AppHeader />
        <div className="shell">
          <p className="state error" role="alert">
            {t('app.loadFailed', { message: load.message })}
          </p>
        </div>
      </div>
    );
  }

  const { catalog } = load;
  if (catalog.products.length === 0) {
    return (
      <div className="app">
        <AppHeader showDemoNotice={catalog.source === 'demo'} />
        <div className="shell">
          <p className="state" role="status">{t('app.emptyCatalog')}</p>
        </div>
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

  const screenLabel =
    view === 'catalog'
      ? t('tabs.catalog')
      : view === 'claims'
        ? t('tabs.claims')
        : t('tabs.matching');

  const catalogChips: ContextChip[] = [];
  if (query.trim()) {
    catalogChips.push({
      id: 'search',
      label: t('mobile.searchChip', { query: query.trim() }),
      onClear: () => setQuery(''),
    });
  }
  if (needsReviewOnly) {
    catalogChips.push({
      id: 'needs-review',
      label: t('filters.needsReview'),
      onClear: () => setNeedsReviewOnly(false),
    });
  }

  const showCatalogContext = isMobile && view === 'catalog';

  return (
    <div className={`app${isMobile ? ' app-mobile' : ''}`}>
      <AppHeader
        compact={isMobile}
        subtitle={
          catalog.source === 'pipeline'
            ? t('header.subtitlePipeline')
            : t('header.subtitleDemo')
        }
        showDemoNotice={catalog.source === 'demo'}
      />

      <RunOverview catalog={catalog} />

      {!isMobile ? (
        <ViewTabs view={view} setView={setView} catalog={catalog} mobile={false} />
      ) : null}

      {showCatalogContext ? (
        <ReviewContextBar
          screen={screenLabel}
          item={
            selected && mobilePane === 'detail'
              ? productDisplayName(selected, catalog.rows)
              : null
          }
          chips={catalogChips}
          emptyFilterLabel={t('mobile.allProducts')}
          selectionLabel={t('mobile.selection')}
          onBack={
            mobilePane === 'detail' ? () => setMobilePane('list') : undefined
          }
          backLabel={t('mobile.backToList')}
        />
      ) : null}

      {view === 'matching' && catalog.matchingReview ? (
        <MatchingReview catalog={catalog} />
      ) : view === 'claims' && catalog.claimReview ? (
        <ClaimReview catalog={catalog} />
      ) : (
        <div
          className={`layout${isMobile ? ` layout-mobile pane-${mobilePane}` : ''}`}
        >
          <aside
            className={`sidebar${isMobile && mobilePane !== 'list' ? ' mobile-hidden' : ''}`}
          >
              <div className="filters">
                <label className="search">
                  <span>{t('filters.searchByName')}</span>
                  <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={t('filters.searchPlaceholder')}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={needsReviewOnly}
                    onChange={event => setNeedsReviewOnly(event.target.checked)}
                  />
                  {t('filters.needsReview')}
                </label>
                {filtersActive ? (
                  <button type="button" className="clear-filters" onClick={clearFilters}>
                    {t('filters.clear')}
                  </button>
                ) : null}
              </div>
              <ProductList
                products={filtered}
                rows={catalog.rows}
                listings={catalog.listings}
                selectedId={selectedId}
                onSelect={id => {
                  setSelectedId(id);
                  if (isMobile) setMobilePane('detail');
                }}
                emptyMessage={
                  filtersActive ? t('app.noMatching') : t('app.emptyCatalog')
                }
              />
          </aside>

          <main
            className={`detail${isMobile && mobilePane !== 'detail' ? ' mobile-hidden' : ''}`}
          >
              {selected ? (
                <ProductDetail
                  key={selected.id}
                  product={selected}
                  listing={selectedListing}
                  offers={catalog.offers.filter(o => selected.offerIds.includes(o.id))}
                  facts={catalog.facts}
                  rows={catalog.rows.filter(
                    r =>
                      selected.rowIds.includes(r.source.row_id) ||
                      selectedListing?.reviewFlags.some(
                        flag =>
                          flag.rowIds.includes(r.source.row_id) ||
                          flag.evidence.some(e => e.rowId === r.source.row_id),
                      ),
                  )}
                  status={productStatus(selected, selectedListing)}
                  statusText={statusLabel(
                    productStatus(selected, selectedListing),
                    messages,
                  )}
                />
              ) : (
                <div className="state" role="status">
                  <p>
                    {filtered.length === 0 && filtersActive
                      ? t('app.noMatchingDisplay')
                      : t('app.selectProduct')}
                  </p>
                  {filtered.length === 0 && filtersActive ? (
                    <button type="button" className="clear-filters" onClick={clearFilters}>
                      {t('filters.clear')}
                    </button>
                  ) : null}
                </div>
              )}
          </main>
        </div>
      )}

      {isMobile ? (
        <ViewTabs view={view} setView={setView} catalog={catalog} mobile />
      ) : null}
    </div>
  );
}
