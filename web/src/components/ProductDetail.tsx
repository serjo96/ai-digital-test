import { useId, useState } from 'react';
import type { CanonicalProduct, Fact, Offer, ReconciledFact } from '../../../src/domain.ts';
import type { NormalizedRow } from '../../../src/types.ts';
import type { ListingView, ProductStatus } from '../data/catalog.ts';
import {
  formatReason,
  publicationState,
  reviewReasonCodes,
  statusExplanation,
  uniqueReasons,
} from '../data/labels.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import type { Messages } from '../i18n/messages.ts';

interface Props {
  product: CanonicalProduct;
  listing: ListingView | undefined;
  offers: Offer[];
  facts: Fact[];
  rows: NormalizedRow[];
  status: ProductStatus;
  statusText: string;
}

function formatValue(fact: Fact): string {
  const unit = fact.unit ? ` ${fact.unit}` : '';
  const conditions = fact.conditions.length ? ` (${fact.conditions.join(', ')})` : '';
  return `${String(fact.value)}${unit}${conditions}`;
}

function ReasonText({ code, messages }: { code: string; messages: Messages }) {
  const formatted = formatReason(code, messages);
  return (
    <>
      {formatted.label}
      {!formatted.known ? <span className="muted"> ({formatted.code})</span> : null}
    </>
  );
}

function FactRow({
  reconciled,
  factsById,
  rowsById,
  messages,
  t,
}: {
  reconciled: ReconciledFact;
  factsById: Map<string, Fact>;
  rowsById: Map<string, NormalizedRow>;
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const observations = reconciled.observations
    .map(id => factsById.get(id))
    .filter((f): f is Fact => Boolean(f));
  const accepted = reconciled.acceptedFactId
    ? factsById.get(reconciled.acceptedFactId)
    : undefined;
  const summary = accepted
    ? formatValue(accepted)
    : observations.map(formatValue).join(' · ') || '—';
  const statusLabelText = formatReason(reconciled.status, messages).label;

  return (
    <div className={`fact-row status-${reconciled.status}`}>
      <button
        type="button"
        className="fact-toggle"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen(value => !value)}
      >
        <span className="fact-attr">{reconciled.attribute}</span>
        <span className="fact-summary">{summary}</span>
        <span className={`badge badge-fact-${reconciled.status}`}>{statusLabelText}</span>
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="fact-details" id={detailId}>
          <p className="muted">
            {t('detail.confidence')} {reconciled.confidence.level}
            {reconciled.confidence.reasons.length
              ? ` — ${uniqueReasons(reconciled.confidence.reasons)
                  .map(code => formatReason(code, messages).label)
                  .join('; ')}`
              : ''}
          </p>
          {observations.map(fact => {
            const row = rowsById.get(fact.evidence.rowId);
            return (
              <div key={fact.id} className="evidence-card">
                <p>
                  <strong>{t('detail.observation')}</strong> {formatValue(fact)} · scope:{' '}
                  {fact.scope} · rule: {fact.rule}
                </p>
                <p>
                  <strong>{t('detail.sourceRow')}</strong>{' '}
                  <a href={`#source-${fact.evidence.rowId}`}>
                    {row
                      ? `${row.source.supplier} / ${row.source.supplier_sku} (${row.source.row_id})`
                      : fact.evidence.rowId}
                  </a>
                </p>
                {row ? (
                  <>
                    <p>
                      <strong>raw_title:</strong> {row.source.raw_title || t('detail.empty')}
                    </p>
                    <p>
                      <strong>raw_specs:</strong> {row.source.raw_specs || t('detail.empty')}
                    </p>
                  </>
                ) : null}
                <p>
                  <strong>{t('detail.quote', { field: fact.evidence.field })}</strong>{' '}
                  <q>{fact.evidence.quote}</q>
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ProductDetail({
  product,
  listing,
  offers,
  facts,
  rows,
  status,
  statusText,
}: Props) {
  const { t, messages } = useI18n();
  const factsById = new Map(facts.map(f => [f.id, f]));
  const rowsById = new Map(rows.map(r => [r.source.row_id, r]));
  const confidence = product.categoryConfidence;
  const categoryReasons = uniqueReasons(confidence.reasons);
  const identityReasons = uniqueReasons(product.identityConfidence.reasons);
  const reviewCodes = reviewReasonCodes(product, listing).slice(0, 3);
  const publication = publicationState(listing, messages);
  const conflictCount = product.facts.filter(
    f => f.status === 'conflict' || f.status === 'incomparable',
  ).length;
  const reviewFlagCount = listing?.reviewFlags.length ?? 0;
  const hasPublishable = Boolean(listing?.publishedText);

  return (
    <article className="product-detail">
      <header className="detail-header">
        <div>
          <h2>{product.identities[0]?.model || product.id}</h2>
          <details className="technical-id">
            <summary>{t('detail.technicalId')}</summary>
            <code>{product.id}</code>
          </details>
        </div>
        <span className={`badge badge-${status}`}>{statusText}</span>
      </header>

      <section className="decision-summary" aria-label={t('detail.decisionAria')}>
        <h3>{t('detail.decisionSummary')}</h3>
        <p>
          <strong>{statusExplanation(status, messages)}</strong>
        </p>
        <p>
          <strong>{t('detail.publication')}:</strong>{' '}
          {publication.available
            ? t('publication.available')
            : t('publication.blocked')}{' '}
          — {publication.summary}
        </p>
        {reviewCodes.length ? (
          <ul className="reasons">
            {reviewCodes.map(code => (
              <li key={code}>
                <ReasonText code={code} messages={messages} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('detail.noReviewFlags')}</p>
        )}
        <p className="muted counters">
          {t('detail.counters', {
            offers: offers.length,
            facts: product.facts.length,
            conflicts: conflictCount,
            flags: reviewFlagCount,
          })}
        </p>
        <p className="muted">{t('detail.confidenceNote')}</p>
      </section>

      <section>
        <h3>{t('detail.reviewFlags')}</h3>
        {listing?.reviewFlags.length ? (
          <ul className="review-flags">
            {listing.reviewFlags.map(flag => (
              <li key={flag.id}>
                <strong>
                  <ReasonText code={flag.reason} messages={messages} />
                </strong>
                <span className="muted code-hint"> · {flag.reason}</span>
                <span className="muted">
                  {' '}
                  · {t('detail.rows')}:{' '}
                  {flag.rowIds.map(id => (
                    <a key={id} href={`#source-${id}`}>
                      {id}{' '}
                    </a>
                  ))}
                </span>
                {flag.evidence.map((evidence, index) => (
                  <p key={index}>
                    <a href={`#source-${evidence.rowId}`}>{evidence.field}</a>:{' '}
                    <q>{evidence.quote}</q>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('detail.none')}</p>
        )}
      </section>

      <section>
        <h3>{t('detail.withholdReasons')}</h3>
        {listing?.withholdReasons.length ? (
          <ul className="reasons">
            {listing.withholdReasons.map(reason => (
              <li key={reason}>
                <ReasonText code={reason} messages={messages} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('detail.none')}</p>
        )}
      </section>

      <section className="text-block">
        <h3>{t('detail.draftDescription')}</h3>
        {listing?.draftText ? (
          <p className="description">{listing.draftText}</p>
        ) : (
          <p className="muted">{t('detail.noDraft')}</p>
        )}
      </section>

      <section className={`text-block${hasPublishable ? ' publishable' : ' publishable-empty'}`}>
        <h3>{t('detail.publishableText')}</h3>
        {!hasPublishable ? (
          <p className="publication-banner" role="status">
            {t('detail.publicationBlocked', { summary: publication.summary })}
          </p>
        ) : null}
        {listing?.publishedText ? (
          <p className="description">{listing.publishedText}</p>
        ) : (
          <p className="muted withheld-note">{t('detail.notReleased')}</p>
        )}
      </section>

      <section>
        <h3>{t('detail.categoryConfidence')}</h3>
        <p>
          <strong>{product.category}</strong>
        </p>
        <p>
          {t('detail.categoryConfidenceLevel')} <strong>{confidence.level}</strong>
        </p>
        {categoryReasons.length ? (
          <ul className="reasons">
            {categoryReasons.map(reason => (
              <li key={reason}>
                <ReasonText code={reason} messages={messages} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('detail.noConfidenceReasons')}</p>
        )}
        <p className="muted">
          {t('detail.identityConfidence')} {product.identityConfidence.level}
          {identityReasons.length
            ? ` — ${identityReasons.map(code => formatReason(code, messages).label).join('; ')}`
            : ''}
        </p>
      </section>

      <section>
        <h3>{t('detail.normalizedFacts')}</h3>
        <p className="muted section-note">{t('detail.factsNote')}</p>
        {product.facts.length === 0 ? (
          <p className="muted">{t('detail.noFacts')}</p>
        ) : (
          <div className="facts">
            {product.facts.map(fact => (
              <FactRow
                key={fact.attribute}
                reconciled={fact}
                factsById={factsById}
                rowsById={rowsById}
                messages={messages}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>{t('detail.supplierOffers')}</h3>
        <p className="muted section-note">{t('detail.offersNote')}</p>
        {offers.length === 0 ? (
          <p className="muted">{t('detail.noOffers')}</p>
        ) : (
          <div className="table-scroll" role="region" aria-label={t('detail.offersTableAria')} tabIndex={0}>
            <table className="offers">
              <thead>
                <tr>
                  <th>{t('detail.thSupplier')}</th>
                  <th>{t('detail.thSku')}</th>
                  <th>{t('detail.thPrice')}</th>
                  <th>{t('detail.thCurrency')}</th>
                  <th>{t('detail.thStock')}</th>
                  <th>{t('detail.thCondition')}</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => (
                  <tr key={offer.id}>
                    <td>{offer.supplier}</td>
                    <td>
                      <a href={`#source-${offer.rowId}`}>{offer.sku}</a>
                    </td>
                    <td>{(offer.price.amount ?? offer.price.raw) || '—'}</td>
                    <td>{offer.price.currency ?? '—'}</td>
                    <td>{offer.stock}</td>
                    <td>
                      {offer.condition ?? t('detail.unknown')}
                      {offer.factIds
                        .map(id => factsById.get(id))
                        .filter((fact): fact is Fact => !!fact && fact.scope === 'offer')
                        .map(fact => (
                          <p key={fact.id}>
                            {fact.attribute}: {formatValue(fact)}
                            <br />
                            <a href={`#source-${fact.evidence.rowId}`}>{fact.evidence.rowId}</a>:{' '}
                            <q>{fact.evidence.quote}</q> · {fact.rule}
                          </p>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3>{t('detail.sourceRows')}</h3>
        {rows.length === 0 ? (
          <p className="muted">{t('detail.noSourceRows')}</p>
        ) : (
          <ul className="source-rows">
            {rows.map(row => (
              <li
                key={row.source.row_id}
                id={`source-${row.source.row_id}`}
                tabIndex={-1}
                className="source-card"
              >
                <p>
                  <strong>{row.source.supplier}</strong> · {row.source.supplier_sku} ·{' '}
                  {row.source.row_id}
                </p>
                <p>
                  <strong>{t('detail.originalPrice')}</strong>{' '}
                  {row.source.price || t('detail.empty')} · <strong>{t('detail.stock')}</strong>{' '}
                  {row.source.stock}
                </p>
                <p>
                  <strong>{t('detail.title')}</strong> {row.source.raw_title || t('detail.empty')}
                </p>
                <p>
                  <strong>{t('detail.specs')}</strong> {row.source.raw_specs || t('detail.empty')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
