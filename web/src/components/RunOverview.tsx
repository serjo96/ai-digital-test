import type { CatalogSnapshot } from '../data/catalog.ts';
import { productNeedsReview, productStatus } from '../data/catalog.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { useState } from 'react';

export function RunOverview({ catalog, onRefresh, refreshStatus = 'idle' }: { catalog: CatalogSnapshot; onRefresh?: () => void; refreshStatus?: 'idle' | 'loading' | 'success' | 'error' }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const reviewProducts = catalog.products.filter(
    product => productNeedsReview(product, catalog.listings[product.id]),
  ).length;
  const withheldProducts = catalog.products.filter(product => productStatus(product, catalog.listings[product.id]) === 'withheld').length;
  const outcomes = ['grouped', 'non_product', 'review'] as const;
  const rules = catalog.provenance?.rulesVersion ?? t('runOverview.unknownRules');
  const summary = t('runOverview.summary', {
    products: catalog.products.length,
    review: reviewProducts,
    rows: catalog.rows.length,
    rules,
  });
  const summaryShort = t('runOverview.summaryShort', {
    products: catalog.products.length,
    review: reviewProducts,
  });
  const claimPart = catalog.claimReview
    ? t('runOverview.claimReviewAvailable', {
        count: catalog.claimReview.generated.claims.length,
        status: catalog.claimReview.generated.status,
      })
    : t('runOverview.claimReviewMissing');
  const outcomeSummary = outcomes
    .map(outcome => `${outcome}: ${catalog.rows.filter(row => row.outcome === outcome).length}`)
    .join(' · ');

  const degradedBanner = catalog.provenance?.status === 'partial' ? (
    <div className="degraded-banner" role="status">
      <strong>{t('runOverview.degradedTitle')}</strong>
      <p>{t('runOverview.degradedSummary', { failed: catalog.degradation?.failedAiJobs ?? 0, withheld: withheldProducts })}</p>
      <div className="degraded-actions">
        {catalog.retryCommand ? (
          <span className="retry-copy">
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(catalog.retryCommand!); setCopyStatus('success'); } catch { setCopyStatus('error'); } }}>{t('runOverview.copyRetry')}</button>
            <span className="retry-help">
              <button type="button" className="help-trigger" aria-label={t('runOverview.copyHelpLabel')} aria-describedby="retry-copy-tooltip">?</button>
              <span id="retry-copy-tooltip" className="help-tooltip" role="tooltip">{t('runOverview.copyHelp')}</span>
            </span>
          </span>
        ) : null}
        {copyStatus === 'success' ? <span>{t('runOverview.copySuccess')}</span> : null}
        {copyStatus === 'error' ? <span className="state error">{t('runOverview.copyError')}</span> : null}
        {onRefresh ? <button type="button" disabled={refreshStatus === 'loading'} onClick={onRefresh}>{refreshStatus === 'loading' ? t('runOverview.checking') : t('runOverview.checkUpdated')}</button> : null}
        {refreshStatus === 'success' ? <span>{t('runOverview.refreshSuccess')}</span> : null}
        {refreshStatus === 'error' ? <span className="state error">{t('runOverview.refreshError')}</span> : null}
      </div>
    </div>
  ) : null;

  const details = (
    <>
      <details>
        <summary>{t('runOverview.metadataSummary')}</summary>
        <p>
          {catalog.provenance
            ? t('runOverview.metadataLine', {
                runId: catalog.provenance.runId,
                rulesVersion: catalog.provenance.rulesVersion,
                mode: catalog.provenance.mode,
                status: catalog.provenance.status,
                createdAt: catalog.provenance.createdAt,
              })
            : t('runOverview.metadataUnavailable')}
        </p>
        <p className="muted">
          {t('runOverview.quality', {
            quality: catalog.provenance?.qualityStatus ?? t('runOverview.qualityNotSupplied'),
            split: catalog.provenance?.split ?? t('runOverview.qualityNotSupplied'),
            claimPart,
          })}
        </p>
      </details>
      <details>
        <summary>{t('runOverview.allRowOutcomes', { summary: outcomeSummary })}</summary>
        <ul className="outcome-list">
          {catalog.rows.map(row => (
            <li key={row.source.row_id}>
              <strong>{row.source.row_id}</strong> ·{' '}
              {row.source.raw_title || t('runOverview.emptyTitle')} · {row.outcome}
              {row.groupId ? ` · ${t('runOverview.product')}: ${row.groupId}` : ''}
              {row.reasons.length ? ` · ${row.reasons.join('; ')}` : ''}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>
          {t('runOverview.nonProducts', {
            count: catalog.rows.filter(row => row.outcome === 'non_product').length,
          })}
        </summary>
        {catalog.rows
          .filter(row => row.outcome === 'non_product')
          .map(row => (
            <div className="source-card" key={row.source.row_id}>
              <p>
                <strong>{row.source.row_id}</strong> · {row.source.supplier} /{' '}
                {row.source.supplier_sku}
              </p>
              <p>
                {t('runOverview.title')}: {row.source.raw_title || t('runOverview.empty')}
                <br />
                {t('runOverview.specs')}: {row.source.raw_specs || t('runOverview.empty')}
              </p>
              <p>
                {t('runOverview.originalPrice')}: {row.source.price || t('runOverview.empty')} ·{' '}
                {t('runOverview.stock')}: {row.source.stock}
              </p>
              <p>
                {t('runOverview.reason')}: {row.reasons.join('; ')}
              </p>
            </div>
          ))}
      </details>
    </>
  );

  if (isMobile) {
    return (
      <section className="run-overview run-overview-compact" aria-label={t('runOverview.aria')}>
        {degradedBanner}
        <details>
          <summary>
            <strong>{summaryShort}</strong>
            <span className="muted run-overview-expand-hint">{t('runOverview.expandDetails')}</span>
          </summary>
          <p className="run-summary">
            <strong>{summary}</strong>
          </p>
          {details}
        </details>
      </section>
    );
  }

  return (
    <section className="run-overview" aria-label={t('runOverview.aria')}>
      {degradedBanner}
      <p className="run-summary">
        <strong>{summary}</strong>
      </p>
      {details}
    </section>
  );
}
