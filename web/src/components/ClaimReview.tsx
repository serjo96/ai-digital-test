import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GeneratedReview } from '../../../src/publication-evaluation.ts';
import type { VerifiedClaim } from '../../../src/domain.ts';
import { productDisplayName, type CatalogSnapshot, type ReviewClaim } from '../data/catalog.ts';

type ReviewTab = 'generated' | 'controlled';
type Verdict = GeneratedReview['claims'][number]['expectedVerdict'];

const reviewKey = (publicationHash: string) => `shelf-ready-review:${publicationHash}`;
const claimKey = (item: GeneratedReview['claims'][number]) => `${item.productId}:${item.attempt}:${item.claimId}`;

function verdictClass(verdict: string) {
  return verdict === 'supported' ? 'verdict-supported' : verdict === 'disputed' ? 'verdict-disputed' : 'verdict-unsupported';
}

function HighlightedText({ text, claims, selected, onSelect }: { text: string; claims: Pick<VerifiedClaim, 'id' | 'start' | 'end' | 'verdict'>[]; selected: string | null; onSelect: (id: string) => void }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const claim of [...claims].sort((a, b) => a.start - b.start)) {
    if (claim.start > cursor) parts.push(<span key={`gap-${cursor}`}>{text.slice(cursor, claim.start)}</span>);
    parts.push(<button type="button" key={claim.id} className={`claim-mark ${verdictClass(claim.verdict)}${selected === claim.id ? ' selected' : ''}`} onClick={() => onSelect(claim.id)}>{text.slice(claim.start, claim.end)}</button>);
    cursor = claim.end;
  }
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <p className="review-text">{parts}</p>;
}

function EvidenceList({ claim, catalog }: { claim: ReviewClaim; catalog: CatalogSnapshot }) {
  return <div className="claim-evidence">
    <p><strong>Verifier:</strong> {claim.reason}</p>
    {claim.supportIds.length ? <p className="muted"><strong>Supports:</strong> {claim.supportIds.join(', ')}</p> : null}
    {claim.decisionIds.length ? <p className="muted"><strong>Decisions:</strong> {claim.decisionIds.join(', ')}</p> : null}
    {claim.evidence.map((evidence, index) => {
      const row = catalog.rows.find(item => item.source.row_id === evidence.rowId);
      return <div className="evidence-card" key={`${evidence.rowId}:${index}`}>
        <p><strong>{row ? `${row.source.supplier} / ${row.source.supplier_sku}` : evidence.rowId}</strong></p>
        {row ? <><p><strong>Title:</strong> {row.source.raw_title || '(empty)'}</p><p><strong>Specs:</strong> {row.source.raw_specs || '(empty)'}</p></> : null}
        <p><strong>{evidence.field}:</strong> <q>{evidence.quote}</q></p>
      </div>;
    })}
  </div>;
}

export function ClaimReview({ catalog }: { catalog: CatalogSnapshot }) {
  const data = catalog.claimReview!;
  const [tab, setTab] = useState<ReviewTab>('generated');
  const [query, setQuery] = useState('');
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [reviewer, setReviewer] = useState('');
  const [generated, setGenerated] = useState<GeneratedReview>(data.generated);
  const [reviewDraftHydrated, setReviewDraftHydrated] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [selectedControlled, setSelectedControlled] = useState(data.controlled[0]?.item.id ?? null);

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
  const products = useMemo(() => catalog.products.filter(product => {
    const publication = catalog.listings[product.id]?.publication;
    if (!publication?.publishedText) return false;
    const name = productDisplayName(product, catalog.rows).toLowerCase();
    if (query.trim() && !name.includes(query.trim().toLowerCase())) return false;
    if (!unreviewedOnly) return true;
    const attempt = publication.attempts.find(item => item.attempt === publication.selectedAttempt);
    return attempt?.claims.some(claim => !reviews.get(`${product.id}:${attempt.attempt}:${claim.id}`)?.rationale.trim());
  }), [catalog, generated, query, unreviewedOnly]);

  useEffect(() => {
    if (tab !== 'generated') return;
    if (selectedProduct && products.some(product => product.id === selectedProduct)) return;
    setSelectedProduct(products[0]?.id ?? null);
    setSelectedClaim(null);
  }, [products, selectedProduct, tab]);

  const product = catalog.products.find(item => item.id === selectedProduct);
  const publication = product ? catalog.listings[product.id]?.publication : null;
  const attempt = publication?.attempts.find(item => item.attempt === publication.selectedAttempt);
  const activeClaim = attempt?.claims.find(claim => claim.id === selectedClaim) ?? attempt?.claims[0] ?? null;
  const completed = generated.claims.filter(item => item.rationale.trim()).length;

  function updateClaim(id: string, change: Partial<{ expectedVerdict: Verdict; rationale: string }>) {
    setGenerated(current => ({ ...current, claims: current.claims.map(item => item.claimId === id ? { ...item, ...change } : item) }));
  }

  function exportReview() {
    const complete = completed === generated.claims.length && Boolean(reviewer.trim());
    const output: GeneratedReview = { ...generated, status: complete ? 'human_verified' : 'provisional', reviewedBy: complete ? reviewer.trim() : null, reviewedAt: complete ? new Date().toISOString() : null };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `generated-review-${data.generated.publicationHash.slice(0, 12)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const controlled = data.controlled.find(item => item.item.id === selectedControlled) ?? data.controlled[0];
  const controlledVerdicts = new Set(controlled?.result.claims.map(claim => claim.verdict) ?? []);
  const controlledVerdict = (['error', 'unknown', 'unsupported', 'disputed', 'supported'] as const)
    .find(verdict => controlledVerdicts.has(verdict)) ?? 'error';

  return <section className="claim-review">
    <div className="review-toolbar">
      <div className="mode-tabs" role="tablist" aria-label="Claim review dataset">
        <button type="button" className={tab === 'generated' ? 'active' : ''} onClick={() => setTab('generated')}>Generated ({generated.claims.length})</button>
        <button type="button" className={tab === 'controlled' ? 'active' : ''} onClick={() => setTab('controlled')}>Controlled ({data.controlled.length})</button>
      </div>
      {tab === 'generated' ? <div className="review-progress"><strong>{completed}/{generated.claims.length}</strong> reviewed</div> : null}
    </div>

    {tab === 'generated' ? <>
      <div className="review-actions">
        <label>Reviewer <input value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="Name or initials" /></label>
        <button type="button" onClick={exportReview}>Export review JSON</button>
        <span className="muted">Export becomes human_verified only when every claim has a rationale and reviewer is set.</span>
      </div>
      <div className="review-layout">
        <aside className="review-sidebar">
          <label className="search"><span>Search products</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          <label className="checkbox"><input type="checkbox" checked={unreviewedOnly} onChange={event => setUnreviewedOnly(event.target.checked)} />Unreviewed only</label>
          <ul className="product-list">{products.map(item => {
            const listing = catalog.listings[item.id]?.publication!;
            const selectedAttempt = listing.attempts.find(value => value.attempt === listing.selectedAttempt)!;
            const done = selectedAttempt.claims.filter(claim => reviews.get(`${item.id}:${selectedAttempt.attempt}:${claim.id}`)?.rationale.trim()).length;
            return <li key={item.id}><button type="button" className={item.id === selectedProduct ? 'product-item selected' : 'product-item'} onClick={() => { setSelectedProduct(item.id); setSelectedClaim(null); }}><span className="product-name">{productDisplayName(item, catalog.rows)}</span><span className="muted">{done}/{selectedAttempt.claims.length} claims</span></button></li>;
          })}</ul>
        </aside>
        <main className="review-detail">{product && publication?.publishedText && attempt ? <>
          <header className="detail-header"><div><h2>{productDisplayName(product, catalog.rows)}</h2><p className="muted">Selected publication attempt {attempt.attempt}</p></div><span className="badge badge-ready">{publication.status}</span></header>
          <HighlightedText text={publication.publishedText} claims={attempt.claims} selected={activeClaim?.id ?? null} onSelect={setSelectedClaim} />
          <div className="claim-list">{attempt.claims.map(claim => {
            const human = reviews.get(`${product.id}:${attempt.attempt}:${claim.id}`)!;
            return <article key={claim.id} className={`claim-card${activeClaim?.id === claim.id ? ' selected' : ''}`} onClick={() => setSelectedClaim(claim.id)}>
              <div className="claim-card-header"><strong><q>{claim.text}</q></strong><span className={`badge ${verdictClass(claim.verdict)}`}>AI: {claim.verdict}</span></div>
              <EvidenceList claim={claim} catalog={catalog} />
              <div className="human-decision">
                <label>Human verdict <select value={human.expectedVerdict} onChange={event => updateClaim(claim.id, { expectedVerdict: event.target.value as Verdict })}><option value="supported">Supported</option><option value="unsupported">Unsupported</option><option value="disputed">Disputed</option></select></label>
                <label>Rationale <textarea value={human.rationale} onChange={event => updateClaim(claim.id, { rationale: event.target.value })} placeholder="Why does the source support or reject this claim?" /></label>
              </div>
            </article>;
          })}</div>
        </> : <p className="state muted">No product selected.</p>}</main>
      </div>
    </> : <div className="review-layout">
      <aside className="review-sidebar"><ul className="product-list">{data.controlled.map(entry => <li key={entry.item.id}><button type="button" className={entry.item.id === controlled?.item.id ? 'product-item selected' : 'product-item'} onClick={() => setSelectedControlled(entry.item.id)}><span className="product-name">{entry.item.id}</span><span className="muted">expected {entry.item.expectedVerdict}</span></button></li>)}</ul></aside>
      <main className="review-detail">{controlled ? <>
        <header className="detail-header"><div><h2>{controlled.item.id}</h2><p className="muted">{controlled.item.kind} · row {controlled.item.rowId}</p></div><span className={`badge ${verdictClass(controlledVerdict)}`}>{controlledVerdict}</span></header>
        <p className="review-text">{controlled.item.text}</p>
        <p><strong>Expected:</strong> {controlled.item.expectedVerdict}</p><p><strong>Rationale:</strong> {controlled.item.rationale}</p>
        <div className="claim-list">{controlled.result.claims.map(claim => <article className="claim-card" key={claim.id}><div className="claim-card-header"><strong><q>{claim.text}</q></strong><span className={`badge ${verdictClass(claim.verdict)}`}>{claim.verdict}</span></div><EvidenceList claim={claim} catalog={catalog} /></article>)}</div>
      </> : <p className="state muted">No controlled cases.</p>}</main>
    </div>}
  </section>;
}
