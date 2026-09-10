import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GeneratedReview } from '../../../src/publication-evaluation.ts';
import type { VerifiedClaim } from '../../../src/domain.ts';
import { productDisplayName, type CatalogSnapshot, type ReviewClaim } from '../data/catalog.ts';
import {
  aiVerdictPhrase,
  controlledKindLabel,
  verdictExplanation,
  verdictLabel,
} from '../data/labels.ts';

type ReviewMode = 'listings' | 'fixtures';
type Verdict = GeneratedReview['claims'][number]['expectedVerdict'];

const reviewKey = (publicationHash: string) => `shelf-ready-review:${publicationHash}`;
const claimKey = (item: GeneratedReview['claims'][number]) => `${item.productId}:${item.attempt}:${item.claimId}`;

function verdictClass(verdict: string) {
  return verdict === 'supported' ? 'verdict-supported' : verdict === 'disputed' ? 'verdict-disputed' : 'verdict-unsupported';
}

function HighlightedText({ text, claims, selected, onSelect }: {
  text: string;
  claims: Pick<VerifiedClaim, 'id' | 'start' | 'end' | 'verdict'>[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const claim of [...claims].sort((a, b) => a.start - b.start)) {
    if (claim.start > cursor) parts.push(<span key={`gap-${cursor}`}>{text.slice(cursor, claim.start)}</span>);
    parts.push(
      <button
        type="button"
        key={claim.id}
        className={`claim-mark ${verdictClass(claim.verdict)}${selected === claim.id ? ' selected' : ''}`}
        onClick={() => onSelect(claim.id)}
      >
        {text.slice(claim.start, claim.end)}
      </button>,
    );
    cursor = claim.end;
  }
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <p className="review-text">{parts}</p>;
}

function EvidenceList({ claim, catalog }: { claim: ReviewClaim; catalog: CatalogSnapshot }) {
  const hasTechnicalIds = claim.supportIds.length > 0 || claim.decisionIds.length > 0;
  return (
    <div className="claim-evidence">
      <div className="ai-reason">
        <h4>Why the AI decided this</h4>
        <p>{claim.reason}</p>
      </div>
      {claim.evidence.map((evidence, index) => {
        const row = catalog.rows.find(item => item.source.row_id === evidence.rowId);
        return (
          <div className="evidence-card" key={`${evidence.rowId}:${index}`}>
            <p className="evidence-quote">
              <strong>{evidence.field}:</strong> <q>{evidence.quote}</q>
            </p>
            <p className="muted">
              {row ? `${row.source.supplier} / ${row.source.supplier_sku}` : evidence.rowId}
            </p>
            {row ? (
              <details className="evidence-source">
                <summary>Full source row</summary>
                <p><strong>Title:</strong> {row.source.raw_title || '(empty)'}</p>
                <p><strong>Specs:</strong> {row.source.raw_specs || '(empty)'}</p>
              </details>
            ) : null}
          </div>
        );
      })}
      {hasTechnicalIds ? (
        <details className="technical-ids">
          <summary>Technical IDs</summary>
          {claim.supportIds.length ? <p className="muted"><strong>Supports:</strong> {claim.supportIds.join(', ')}</p> : null}
          {claim.decisionIds.length ? <p className="muted"><strong>Decisions:</strong> {claim.decisionIds.join(', ')}</p> : null}
        </details>
      ) : null}
    </div>
  );
}

function ClaimLegend() {
  return (
    <ul className="claim-legend" aria-label="Highlight colors">
      <li><span className={`legend-swatch ${verdictClass('supported')}`} />Supported</li>
      <li><span className={`legend-swatch ${verdictClass('disputed')}`} />Disputed</li>
      <li><span className={`legend-swatch ${verdictClass('unsupported')}`} />Not supported</li>
    </ul>
  );
}

export function ClaimReview({ catalog }: { catalog: CatalogSnapshot }) {
  const data = catalog.claimReview!;
  const [mode, setMode] = useState<ReviewMode>('listings');
  const [query, setQuery] = useState('');
  const [hideFinished, setHideFinished] = useState(false);
  const [reviewer, setReviewer] = useState('');
  const [generated, setGenerated] = useState<GeneratedReview>(data.generated);
  const [reviewDraftHydrated, setReviewDraftHydrated] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [selectedControlled, setSelectedControlled] = useState(data.controlled[0]?.item.id ?? null);
  const decisionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(reviewKey(data.generated.publicationHash));
      if (!saved) return;
      const parsed = JSON.parse(saved) as { reviewer?: string; generated?: GeneratedReview };
      if (parsed.generated?.publicationHash === data.generated.publicationHash && parsed.generated.claims.length === data.generated.claims.length) {
        setGenerated(parsed.generated);
        setReviewer(parsed.reviewer ?? '');
      }
    } catch {
      /* An invalid local draft must not block the source review bundle. */
    } finally {
      setReviewDraftHydrated(true);
    }
  }, [data.generated]);

  useEffect(() => {
    if (!reviewDraftHydrated) return;
    localStorage.setItem(reviewKey(data.generated.publicationHash), JSON.stringify({ reviewer, generated }));
  }, [data.generated.publicationHash, generated, reviewer, reviewDraftHydrated]);

  const reviews = new Map(generated.claims.map(item => [claimKey(item), item]));

  const products = useMemo(() => {
    const listed = catalog.products.filter(product => {
      const publication = catalog.listings[product.id]?.publication;
      if (!publication?.publishedText) return false;
      const name = productDisplayName(product, catalog.rows).toLowerCase();
      if (query.trim() && !name.includes(query.trim().toLowerCase())) return false;
      const attempt = publication.attempts.find(item => item.attempt === publication.selectedAttempt);
      const unfinished = attempt?.claims.some(claim => !reviews.get(`${product.id}:${attempt.attempt}:${claim.id}`)?.rationale.trim()) ?? false;
      if (hideFinished && !unfinished) return false;
      return true;
    });

    return [...listed].sort((a, b) => {
      const pubA = catalog.listings[a.id]!.publication!;
      const pubB = catalog.listings[b.id]!.publication!;
      const attemptA = pubA.attempts.find(item => item.attempt === pubA.selectedAttempt)!;
      const attemptB = pubB.attempts.find(item => item.attempt === pubB.selectedAttempt)!;
      const doneA = attemptA.claims.every(claim => reviews.get(`${a.id}:${attemptA.attempt}:${claim.id}`)?.rationale.trim());
      const doneB = attemptB.claims.every(claim => reviews.get(`${b.id}:${attemptB.attempt}:${claim.id}`)?.rationale.trim());
      if (doneA === doneB) return 0;
      return doneA ? 1 : -1;
    });
  }, [catalog, generated, query, hideFinished]);

  useEffect(() => {
    if (mode !== 'listings') return;
    if (selectedProduct && products.some(product => product.id === selectedProduct)) return;
    setSelectedProduct(products[0]?.id ?? null);
    setSelectedClaim(null);
  }, [products, selectedProduct, mode]);

  const product = catalog.products.find(item => item.id === selectedProduct);
  const publication = product ? catalog.listings[product.id]?.publication : null;
  const attempt = publication?.attempts.find(item => item.attempt === publication.selectedAttempt);
  const claims = attempt?.claims ?? [];
  const activeClaim = claims.find(claim => claim.id === selectedClaim) ?? claims[0] ?? null;
  const activeIndex = activeClaim ? claims.findIndex(claim => claim.id === activeClaim.id) : -1;
  const completed = generated.claims.filter(item => item.rationale.trim()).length;
  const exportReady = completed === generated.claims.length && Boolean(reviewer.trim());

  function selectClaim(id: string, scroll = false) {
    setSelectedClaim(id);
    if (scroll) {
      requestAnimationFrame(() => {
        decisionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  function updateClaim(id: string, change: Partial<{ expectedVerdict: Verdict; rationale: string }>) {
    setGenerated(current => ({
      ...current,
      claims: current.claims.map(item => item.claimId === id ? { ...item, ...change } : item),
    }));
  }

  function exportReview() {
    const complete = exportReady;
    const output: GeneratedReview = {
      ...generated,
      status: complete ? 'human_verified' : 'provisional',
      reviewedBy: complete ? reviewer.trim() : null,
      reviewedAt: complete ? new Date().toISOString() : null,
    };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `generated-review-${data.generated.publicationHash.slice(0, 12)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function goToAdjacentClaim(delta: number) {
    if (!claims.length || activeIndex < 0) return;
    const next = claims[activeIndex + delta];
    if (next) selectClaim(next.id, true);
  }

  const controlled = data.controlled.find(item => item.item.id === selectedControlled) ?? data.controlled[0];
  const controlledVerdicts = new Set(controlled?.result.claims.map(claim => claim.verdict) ?? []);
  const controlledVerdict = (['error', 'unknown', 'unsupported', 'disputed', 'supported'] as const)
    .find(verdict => controlledVerdicts.has(verdict)) ?? 'error';

  return (
    <section className="claim-review">
      <div className="review-toolbar">
        <div>
          <p className="review-mode-label">
            {mode === 'listings' ? 'Published listings' : 'Fixed test cases'}
          </p>
          {mode === 'listings' ? (
            <div className="review-progress" role="status">
              <strong>{completed}</strong> of <strong>{generated.claims.length}</strong> statements have a reason
            </div>
          ) : null}
        </div>
        {data.controlled.length ? (
          <button
            type="button"
            className="secondary-link"
            onClick={() => setMode(mode === 'listings' ? 'fixtures' : 'listings')}
          >
            {mode === 'listings'
              ? `QA fixtures (${data.controlled.length} cases)`
              : 'Back to published listings'}
          </button>
        ) : null}
      </div>

      {mode === 'listings' ? (
        <>
          <div className="review-layout">
            <aside className="review-sidebar">
              <h3 className="sidebar-heading">Listings to review</h3>
              <label className="search">
                <span>Search products</span>
                <input type="search" value={query} onChange={event => setQuery(event.target.value)} />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={hideFinished}
                  onChange={event => setHideFinished(event.target.checked)}
                />
                Hide finished listings
              </label>
              <ul className="product-list">
                {products.map(item => {
                  const listing = catalog.listings[item.id]!.publication!;
                  const selectedAttempt = listing.attempts.find(value => value.attempt === listing.selectedAttempt)!;
                  const done = selectedAttempt.claims.filter(claim =>
                    reviews.get(`${item.id}:${selectedAttempt.attempt}:${claim.id}`)?.rationale.trim()).length;
                  const total = selectedAttempt.claims.length;
                  const finished = done === total;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={item.id === selectedProduct ? 'product-item selected' : 'product-item'}
                        onClick={() => { setSelectedProduct(item.id); setSelectedClaim(null); }}
                      >
                        <span className="product-name">{productDisplayName(item, catalog.rows)}</span>
                        <span className="product-progress">
                          <span
                            className={`progress-dot${finished ? ' done' : done > 0 ? ' partial' : ''}`}
                            aria-hidden="true"
                          />
                          <span className="muted">{done} of {total} checked</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <main className="review-detail">
              {product && publication?.publishedText && attempt ? (
                <>
                  <header className="detail-header">
                    <div>
                      <h2>{productDisplayName(product, catalog.rows)}</h2>
                      <p className="muted">
                        {claims.length} statement{claims.length === 1 ? '' : 's'} to check
                      </p>
                    </div>
                    <span className="badge badge-ready">Published listing</span>
                  </header>

                  <div className="reading-zone">
                    <div className="reading-zone-header">
                      <h3>Published product text</h3>
                      <p className="muted">
                        This is the listing copy under review. Colored underlines mark statements —
                        click one to open its evidence and decide below.
                      </p>
                    </div>
                    <ClaimLegend />
                    <HighlightedText
                      text={publication.publishedText}
                      claims={claims}
                      selected={activeClaim?.id ?? null}
                      onSelect={id => selectClaim(id, true)}
                    />
                    <details className="technical-ids">
                      <summary>Technical details</summary>
                      <p className="muted">Publication attempt {attempt.attempt} · listing status {publication.status}</p>
                    </details>
                  </div>

                  <div className="claim-nav" aria-label="Statements in this listing">
                    {claims.map((claim, index) => {
                      const human = reviews.get(`${product.id}:${attempt.attempt}:${claim.id}`)!;
                      const checked = Boolean(human.rationale.trim());
                      return (
                        <button
                          type="button"
                          key={claim.id}
                          className={`claim-nav-item${activeClaim?.id === claim.id ? ' selected' : ''}${checked ? ' checked' : ''}`}
                          onClick={() => selectClaim(claim.id, true)}
                        >
                          <span className="claim-nav-index">{index + 1}/{claims.length}</span>
                          <span className="claim-nav-excerpt">{claim.text}</span>
                          <span className={`progress-dot${checked ? ' done' : ''}`} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>

                  {activeClaim ? (() => {
                    const human = reviews.get(`${product.id}:${attempt.attempt}:${activeClaim.id}`)!;
                    return (
                      <article
                        ref={decisionRef}
                        className="claim-card decision-panel selected"
                        id={`claim-decision-${activeClaim.id}`}
                      >
                        <div className="claim-card-header">
                          <strong><q>{activeClaim.text}</q></strong>
                          <span className={`badge ${verdictClass(activeClaim.verdict)}`}>
                            {aiVerdictPhrase(activeClaim.verdict)}
                          </span>
                        </div>
                        <EvidenceList claim={activeClaim} catalog={catalog} />
                        <div className="human-decision">
                          <label>
                            Your decision
                            <select
                              value={human.expectedVerdict}
                              onChange={event => updateClaim(activeClaim.id, { expectedVerdict: event.target.value as Verdict })}
                            >
                              <option value="supported">{verdictLabel('supported')}</option>
                              <option value="unsupported">{verdictLabel('unsupported')}</option>
                              <option value="disputed">{verdictLabel('disputed')}</option>
                            </select>
                            <span className="field-hint muted">{verdictExplanation(human.expectedVerdict)}</span>
                          </label>
                          <label>
                            Why? Required to mark this as reviewed
                            <textarea
                              value={human.rationale}
                              onChange={event => updateClaim(activeClaim.id, { rationale: event.target.value })}
                              placeholder="Why does the source support or reject this claim?"
                            />
                          </label>
                          <div className="claim-stepper">
                            <button type="button" disabled={activeIndex <= 0} onClick={() => goToAdjacentClaim(-1)}>
                              Previous statement
                            </button>
                            <span className="muted">{activeIndex + 1} of {claims.length}</span>
                            <button
                              type="button"
                              disabled={activeIndex < 0 || activeIndex >= claims.length - 1}
                              onClick={() => goToAdjacentClaim(1)}
                            >
                              Next statement
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })() : null}
                </>
              ) : (
                <p className="state muted">No product selected.</p>
              )}
            </main>
          </div>

          <div className="review-finish">
            <h3>Finish</h3>
            <p className="muted" role="status">
              {completed} of {generated.claims.length} statements have a reason.
              {exportReady
                ? ' Download will be marked human_verified.'
                : ' Download stays provisional until every statement has a reason and a reviewer name is set.'}
            </p>
            <div className="review-finish-actions">
              <label>
                Reviewer
                <input
                  value={reviewer}
                  onChange={event => setReviewer(event.target.value)}
                  placeholder="Name or initials"
                />
              </label>
              <button type="button" onClick={exportReview}>Download review</button>
            </div>
          </div>
        </>
      ) : (
        <div className="review-layout">
          <aside className="review-sidebar">
            <h3 className="sidebar-heading">Fixed test cases</h3>
            <ul className="product-list">
              {data.controlled.map(entry => (
                <li key={entry.item.id}>
                  <button
                    type="button"
                    className={entry.item.id === controlled?.item.id ? 'product-item selected' : 'product-item'}
                    onClick={() => setSelectedControlled(entry.item.id)}
                  >
                    <span className="product-name">{controlledKindLabel(entry.item.kind)}</span>
                    <span className="muted">expected {verdictLabel(entry.item.expectedVerdict)}</span>
                    <span className="technical-id muted"><code>{entry.item.id}</code></span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <main className="review-detail">
            {controlled ? (
              <>
                <header className="detail-header">
                  <div>
                    <h2>{controlledKindLabel(controlled.item.kind)}</h2>
                    <p className="muted">Row {controlled.item.rowId}</p>
                    <p className="technical-id muted"><code>{controlled.item.id}</code></p>
                  </div>
                  <span className={`badge ${verdictClass(controlledVerdict)}`}>
                    {verdictLabel(controlledVerdict)}
                  </span>
                </header>
                <p className="review-text">{controlled.item.text}</p>
                <p><strong>Expected:</strong> {verdictLabel(controlled.item.expectedVerdict)}</p>
                <p><strong>Rationale:</strong> {controlled.item.rationale}</p>
                <div className="claim-list">
                  {controlled.result.claims.map(claim => (
                    <article className="claim-card" key={claim.id}>
                      <div className="claim-card-header">
                        <strong><q>{claim.text}</q></strong>
                        <span className={`badge ${verdictClass(claim.verdict)}`}>
                          {aiVerdictPhrase(claim.verdict)}
                        </span>
                      </div>
                      <EvidenceList claim={claim} catalog={catalog} />
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="state muted">No controlled cases.</p>
            )}
          </main>
        </div>
      )}
    </section>
  );
}
