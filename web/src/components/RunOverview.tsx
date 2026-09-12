import type { CatalogSnapshot } from '../data/catalog.ts';
import { productStatus } from '../data/catalog.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';

export function RunOverview({ catalog }: { catalog: CatalogSnapshot }) {
  const { t } = useI18n();
  const reviewProducts = catalog.products.filter(
    product => productStatus(product, catalog.listings[product.id]) === 'needs_review',
  ).length;
  const outcomes = ['grouped', 'non_product', 'review'] as const;
  const rules = catalog.provenance?.rulesVersion ?? t('runOverview.unknownRules');
  const summary = t('runOverview.summary', {
    products: catalog.products.length,
    review: reviewProducts,
    rows: catalog.rows.length,
    rules,
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

  return (
    <section className="run-overview" aria-label={t('runOverview.aria')}>
      <p className="run-summary">
        <strong>{summary}</strong>
      </p>
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
    </section>
  );
}
