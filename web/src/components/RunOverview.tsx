import type { CatalogSnapshot } from '../data/catalog.ts';
import { productStatus } from '../data/catalog.ts';

export function RunOverview({ catalog }: { catalog: CatalogSnapshot }) {
  const reviewProducts = catalog.products.filter(product => productStatus(product, catalog.listings[product.id]) === 'needs_review').length;
  const outcomes = ['grouped', 'non_product', 'review'] as const;
  const rules = catalog.provenance?.rulesVersion ?? 'unknown rules';
  const summary = `${catalog.products.length} products · ${reviewProducts} review · ${catalog.rows.length} rows · ${rules}`;

  return (
    <section className="run-overview" aria-label="Run overview">
      <p className="run-summary"><strong>{summary}</strong></p>
      <details>
        <summary>Run metadata and quality notes</summary>
        <p>{catalog.provenance
          ? `Run: ${catalog.provenance.runId} · ${catalog.provenance.rulesVersion} · ${catalog.provenance.mode} · ${catalog.provenance.status} · ${catalog.provenance.createdAt}`
          : 'Run metadata unavailable — external result only.'}</p>
        <p className="muted">
          Development evaluation: {catalog.provenance?.qualityStatus ?? 'not supplied'}. Holdout not evaluated.
          {catalog.claimReview ? ` B3 claim review is available; ${catalog.claimReview.generated.claims.length} generated claims remain ${catalog.claimReview.generated.status}.` : ' Generation and claim verification have not run; no publication-ready listings.'}
        </p>
      </details>
      <details>
        <summary>
          All row outcomes: {outcomes.map(outcome =>
            `${outcome}: ${catalog.rows.filter(row => row.outcome === outcome).length}`).join(' · ')}
        </summary>
        <ul className="outcome-list">
          {catalog.rows.map(row => (
            <li key={row.source.row_id}>
              <strong>{row.source.row_id}</strong> · {row.source.raw_title || '(empty title)'} · {row.outcome}
              {row.groupId ? ` · product: ${row.groupId}` : ''}
              {row.reasons.length ? ` · ${row.reasons.join('; ')}` : ''}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Non-products ({catalog.rows.filter(row => row.outcome === 'non_product').length})</summary>
        {catalog.rows.filter(row => row.outcome === 'non_product').map(row => (
          <div className="source-card" key={row.source.row_id}>
            <p><strong>{row.source.row_id}</strong> · {row.source.supplier} / {row.source.supplier_sku}</p>
            <p>Title: {row.source.raw_title || '(empty)'}<br />Specs: {row.source.raw_specs || '(empty)'}</p>
            <p>Original price: {row.source.price || '(empty)'} · Stock: {row.source.stock}</p>
            <p>Reason: {row.reasons.join('; ')}</p>
          </div>
        ))}
      </details>
    </section>
  );
}
