import { useId, useState } from 'react';
import type { CanonicalProduct, Fact, Offer, ReconciledFact } from '../../../src/domain.ts';
import type { NormalizedRow } from '../../../src/types.ts';
import type { ListingView, ProductStatus } from '../data/catalog.ts';

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

function FactRow({
  reconciled,
  factsById,
  rowsById,
}: {
  reconciled: ReconciledFact;
  factsById: Map<string, Fact>;
  rowsById: Map<string, NormalizedRow>;
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

  return (
    <div className={`fact-row status-${reconciled.status}`}>
      <button type="button" className="fact-toggle" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen(value => !value)}>
        <span className="fact-attr">{reconciled.attribute}</span>
        <span className="fact-summary">{summary}</span>
        <span className={`badge badge-fact-${reconciled.status}`}>{reconciled.status}</span>
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="fact-details" id={detailId}>
          <p className="muted">
            Confidence: {reconciled.confidence.level}
            {reconciled.confidence.reasons.length
              ? ` — ${reconciled.confidence.reasons.join('; ')}`
              : ''}
          </p>
          {observations.map(fact => {
            const row = rowsById.get(fact.evidence.rowId);
            return (
              <div key={fact.id} className="evidence-card">
                <p>
                  <strong>Observation:</strong> {formatValue(fact)} · scope: {fact.scope} · rule: {fact.rule}
                </p>
                <p>
                  <strong>Source row:</strong>{' '}
                  <a href={`#source-${fact.evidence.rowId}`}>{row
                    ? `${row.source.supplier} / ${row.source.supplier_sku} (${row.source.row_id})`
                    : fact.evidence.rowId}</a>
                </p>
                {row ? (
                  <>
                    <p>
                      <strong>raw_title:</strong> {row.source.raw_title || '(empty)'}
                    </p>
                    <p>
                      <strong>raw_specs:</strong> {row.source.raw_specs || '(empty)'}
                    </p>
                  </>
                ) : null}
                <p>
                  <strong>Quote ({fact.evidence.field}):</strong>{' '}
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
  const factsById = new Map(facts.map(f => [f.id, f]));
  const rowsById = new Map(rows.map(r => [r.source.row_id, r]));
  const confidence = product.categoryConfidence;

  return (
    <article className="product-detail">
      <header className="detail-header">
        <div>
          <h2>{product.identities[0]?.model || product.id}</h2>
          <p className="muted">ID: {product.id}</p>
        </div>
        <span className={`badge badge-${status}`}>{statusText}</span>
      </header>

      <section>
        <h3>Category & confidence</h3>
        <p>
          <strong>{product.category}</strong>
        </p>
        <p>
          Confidence: <strong>{confidence.level}</strong>
        </p>
        {confidence.reasons.length ? (
          <ul className="reasons">
            {confidence.reasons.map((reason, index) => (
              <li key={`${reason}-${index}`}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No confidence reasons recorded.</p>
        )}
        <p className="muted">
          Identity confidence: {product.identityConfidence.level}
          {product.identityConfidence.reasons.length
            ? ` — ${product.identityConfidence.reasons.join('; ')}`
            : ''}
        </p>
      </section>

      <section>
        <h3>Supplier offers</h3>
        {offers.length === 0 ? (
          <p className="muted">No offers attached.</p>
        ) : (
          <div className="table-scroll" role="region" aria-label="Supplier offers table" tabIndex={0}><table className="offers">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Currency</th>
                <th>Stock</th>
                <th>Condition / offer facts</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(offer => (
                <tr key={offer.id}>
                  <td>{offer.supplier}</td>
                  <td><a href={`#source-${offer.rowId}`}>{offer.sku}</a></td>
                  <td>{(offer.price.amount ?? offer.price.raw) || '—'}</td>
                  <td>{offer.price.currency ?? '—'}</td>
                  <td>{offer.stock}</td>
                  <td>{offer.condition ?? 'unknown'}
                    {offer.factIds.map(id => factsById.get(id)).filter((fact): fact is Fact => !!fact && fact.scope === 'offer').map(fact => <p key={fact.id}>
                      {fact.attribute}: {formatValue(fact)}<br />
                      <a href={`#source-${fact.evidence.rowId}`}>{fact.evidence.rowId}</a>: <q>{fact.evidence.quote}</q> · {fact.rule}
                    </p>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section>
        <h3>Source and review rows (unchanged)</h3>
        {rows.length === 0 ? (
          <p className="muted">No source rows.</p>
        ) : (
          <ul className="source-rows">
            {rows.map(row => (
              <li key={row.source.row_id} id={`source-${row.source.row_id}`} tabIndex={-1} className="source-card">
                <p>
                  <strong>{row.source.supplier}</strong> · {row.source.supplier_sku} ·{' '}
                  {row.source.row_id}
                </p>
                <p><strong>Original price:</strong> {row.source.price || '(empty)'} · <strong>Stock:</strong> {row.source.stock}</p>
                <p>
                  <strong>Title:</strong> {row.source.raw_title || '(empty)'}
                </p>
                <p>
                  <strong>Specs:</strong> {row.source.raw_specs || '(empty)'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Normalized facts & conflicts</h3>
        {product.facts.length === 0 ? (
          <p className="muted">No normalized product facts.</p>
        ) : (
          <div className="facts">
            {product.facts.map(fact => (
              <FactRow
                key={fact.attribute}
                reconciled={fact}
                factsById={factsById}
                rowsById={rowsById}
              />
            ))}
          </div>
        )}
      </section>

      <section className="text-block">
        <h3>Draft description</h3>
        {listing?.draftText ? (
          <p className="description">{listing.draftText}</p>
        ) : (
          <p className="muted">Generation has not run. No draft text.</p>
        )}
      </section>

      <section className="text-block publishable">
        <h3>Publishable text</h3>
        {listing?.publishedText ? (
          <p className="description">{listing.publishedText}</p>
        ) : (
          <p className="muted withheld-note">Not released for publication.</p>
        )}
      </section>

      <section>
        <h3>Withhold reasons</h3>
        {listing?.withholdReasons.length ? (
          <ul className="reasons">
            {listing.withholdReasons.map(reason => (
              <li key={reason}>{reason === 'generation_not_run' ? 'Generation and claim verification have not run.' : reason}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">None.</p>
        )}
      </section>

      <section>
        <h3>Review flags</h3>
        {listing?.reviewFlags.length ? (
          <ul className="review-flags">
            {listing.reviewFlags.map(flag => (
              <li key={flag.id}>
                <strong>{flag.reason}</strong>
                <span className="muted">
                  {' '}· rows: {flag.rowIds.map(id => <a key={id} href={`#source-${id}`}>{id} </a>)}
                </span>
                {flag.evidence.map((evidence, index) => <p key={index}><a href={`#source-${evidence.rowId}`}>{evidence.field}</a>: <q>{evidence.quote}</q></p>)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None.</p>
        )}
      </section>
    </article>
  );
}
