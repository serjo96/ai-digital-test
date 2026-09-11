import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GeneratedReview } from '../../../src/publication-evaluation.ts';
import type { VerifiedClaim } from '../../../src/domain.ts';
import { productDisplayName, type CatalogSnapshot, type ReviewClaim } from '../data/catalog.ts';
import {
  aiVerdictPhrase,
  controlledKindLabel,
  evidenceFieldLabel,
  verdictExplanation,
  verdictLabel,
} from '../data/labels.ts';
import {
  finalizeGeneratedReview,
  generatedClaimKey,
  generatedReviewProgress,
  mergeGeneratedReview,
} from '../data/generatedReview.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';
import type { Messages } from '../i18n/messages.ts';

type ReviewMode = 'listings' | 'fixtures';
type Verdict = NonNullable<GeneratedReview['claims'][number]['humanVerdict']>;

const VERDICTS: Verdict[] = ['supported', 'unsupported', 'disputed'];

const reviewKey = (publicationHash: string) => `shelf-ready-review:${publicationHash}`;
function verdictClass(verdict: string) {
  return verdict === 'supported'
    ? 'verdict-supported'
    : verdict === 'disputed'
      ? 'verdict-disputed'
      : 'verdict-unsupported';
}

function HighlightedText({
  text,
  claims,
  selected,
  onSelect,
}: {
  text: string;
  claims: Pick<VerifiedClaim, 'id' | 'start' | 'end' | 'verdict'>[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const claim of [...claims].sort((a, b) => a.start - b.start)) {
    if (claim.start > cursor) {
      parts.push(<span key={`gap-${cursor}`}>{text.slice(cursor, claim.start)}</span>);
    }
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

function EvidenceList({
  claim,
  catalog,
  messages,
  t,
}: {
  claim: ReviewClaim;
  catalog: CatalogSnapshot;
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const hasTechnicalIds = claim.supportIds.length > 0 || claim.decisionIds.length > 0;
  return (
    <div className="claim-evidence">
      {claim.evidence.length ? (
        <div className="evidence-section">
          {claim.evidence.map((evidence, index) => {
            const row = catalog.rows.find(item => item.source.row_id === evidence.rowId);
            return (
              <div className="evidence-card" key={`${evidence.rowId}:${index}`}>
                <p className="evidence-field muted">
                  {evidenceFieldLabel(evidence.field, messages)}
                </p>
                <p className="evidence-quote">
                  <q>{evidence.quote}</q>
                </p>
                <p className="evidence-source-meta muted">
                  {t('claims.feedRecord', {
                    meta: row
                      ? `${row.source.supplier} · SKU ${row.source.supplier_sku}`
                      : evidence.rowId,
                  })}
                </p>
                {row ? (
                  <details className="evidence-source">
                    <summary>{t('claims.showFullRow')}</summary>
                    <p>
                      <strong>{t('claims.title')}</strong>{' '}
                      {row.source.raw_title || t('claims.empty')}
                    </p>
                    <p>
                      <strong>{t('claims.specs')}</strong>{' '}
                      {row.source.raw_specs || t('claims.empty')}
                    </p>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">{t('claims.noQuotes')}</p>
      )}
      {hasTechnicalIds ? (
        <details className="technical-ids">
          <summary>{t('claims.technicalIds')}</summary>
          {claim.supportIds.length ? (
            <p className="muted">
              <strong>{t('claims.supports')}</strong> {claim.supportIds.join(', ')}
            </p>
          ) : null}
          {claim.decisionIds.length ? (
            <p className="muted">
              <strong>{t('claims.decisions')}</strong> {claim.decisionIds.join(', ')}
            </p>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}

function AiExplanation({
  claim,
  messages,
  t,
}: {
  claim: ReviewClaim;
  messages: Messages;
  t: (key: string) => string;
}) {
  return (
    <details className="ai-explanation">
      <summary>{t('claims.whyAiOptional')}</summary>
      <p><strong>{aiVerdictPhrase(claim.verdict, messages)}</strong></p>
      <p>{claim.reason}</p>
    </details>
  );
}

function ClaimLegend({ t }: { t: (key: string) => string }) {
  return (
    <ul className="claim-legend" aria-label={t('claims.legendAria')}>
      <li>
        <span className={`legend-swatch ${verdictClass('supported')}`} />
        {t('claims.legendMatches')}
      </li>
      <li>
        <span className={`legend-swatch ${verdictClass('disputed')}`} />
        {t('claims.legendConflict')}
      </li>
      <li>
        <span className={`legend-swatch ${verdictClass('unsupported')}`} />
        {t('claims.legendMismatch')}
      </li>
    </ul>
  );
}

export function ClaimReview({ catalog }: { catalog: CatalogSnapshot }) {
  const { t, messages } = useI18n();
  const data = catalog.claimReview!;
  const [mode, setMode] = useState<ReviewMode>('listings');
  const [query, setQuery] = useState('');
  const [hideFinished, setHideFinished] = useState(false);
  const [reviewer, setReviewer] = useState('');
  const [generated, setGenerated] = useState<GeneratedReview>(data.generated);
  const [reviewDraftHydrated, setReviewDraftHydrated] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [selectedControlled, setSelectedControlled] = useState(
    data.controlled[0]?.item.id ?? null,
  );
  const decisionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(reviewKey(data.generated.publicationHash));
      if (!saved) return;
      const parsed = JSON.parse(saved) as { reviewer?: string; generated?: unknown };
      if (parsed.generated) {
        setGenerated(mergeGeneratedReview(data.generated, parsed.generated));
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
    localStorage.setItem(
      reviewKey(data.generated.publicationHash),
      JSON.stringify({ reviewer, generated }),
    );
  }, [data.generated.publicationHash, generated, reviewer, reviewDraftHydrated]);

  const reviews = new Map(generated.claims.map(item => [generatedClaimKey(item), item]));
  const requiredProducts = new Set(generated.sampleProductIds);

  const products = useMemo(() => {
    const listed = catalog.products.filter(product => {
      const publication = catalog.listings[product.id]?.publication;
      if (!publication?.publishedText) return false;
      const name = productDisplayName(product, catalog.rows).toLowerCase();
      if (query.trim() && !name.includes(query.trim().toLowerCase())) return false;
      const attempt = publication.attempts.find(
        item => item.attempt === publication.selectedAttempt,
      );
      const unfinished =
        attempt?.claims.some(
          claim =>
            reviews.get(`${product.id}:${attempt.attempt}:${claim.id}`)?.state !== 'reviewed',
        ) ?? false;
      if (hideFinished && !unfinished) return false;
      return true;
    });

    return [...listed].sort((a, b) => {
      const pubA = catalog.listings[a.id]!.publication!;
      const pubB = catalog.listings[b.id]!.publication!;
      const attemptA = pubA.attempts.find(item => item.attempt === pubA.selectedAttempt)!;
      const attemptB = pubB.attempts.find(item => item.attempt === pubB.selectedAttempt)!;
      const doneA = attemptA.claims.every(claim =>
        reviews.get(`${a.id}:${attemptA.attempt}:${claim.id}`)?.state === 'reviewed',
      );
      const doneB = attemptB.claims.every(claim =>
        reviews.get(`${b.id}:${attemptB.attempt}:${claim.id}`)?.state === 'reviewed',
      );
      if (doneA === doneB) {
        const requiredA = requiredProducts.has(a.id);
        const requiredB = requiredProducts.has(b.id);
        if (requiredA !== requiredB) return requiredA ? -1 : 1;
        return 0;
      }
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
  const attempt = publication?.attempts.find(
    item => item.attempt === publication.selectedAttempt,
  );
  const claims = attempt?.claims ?? [];
  const activeClaim = claims.find(claim => claim.id === selectedClaim) ?? claims[0] ?? null;
  const activeIndex = activeClaim ? claims.findIndex(claim => claim.id === activeClaim.id) : -1;
  const progress = generatedReviewProgress(generated);
  const exportReady = progress.requiredSampleProducts >= 20
    && progress.completedSampleProducts === progress.requiredSampleProducts
    && Boolean(reviewer.trim());
  const productRows = product
    ? catalog.rows.filter(row => product.rowIds.includes(row.source.row_id))
    : [];
  const supplierCount = new Set(productRows.map(row => row.source.supplier)).size;

  function selectClaim(id: string, scroll = false) {
    setSelectedClaim(id);
    if (scroll) {
      requestAnimationFrame(() => {
        decisionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  function updateClaim(id: string, change: Partial<{ humanVerdict: Verdict | null; rationale: string; state: 'pending' | 'reviewed'; issueTypes: GeneratedReview['claims'][number]['issueTypes'] }>) {
    const key = product && attempt ? `${product.id}:${attempt.attempt}:${id}` : null;
    setGenerated(current => ({
      ...current,
      claims: current.claims.map(item =>
        key && generatedClaimKey(item) === key ? { ...item, ...change } : item,
      ),
    }));
  }

  function chooseVerdict(id: string, value: Verdict) {
    updateClaim(id, { humanVerdict: value, state: 'pending' });
  }

  function toggleIssue(id: string, issue: 'non_atomic_claim' | 'unclear_copy') {
    const item = product && attempt ? reviews.get(`${product.id}:${attempt.attempt}:${id}`)! : null;
    if (!item) return;
    updateClaim(id, { issueTypes: item.issueTypes.includes(issue)
      ? item.issueTypes.filter(value => value !== issue)
      : [...item.issueTypes, issue], state: 'pending' });
  }

  function markReviewed(id: string) {
    const item = product && attempt ? reviews.get(`${product.id}:${attempt.attempt}:${id}`)! : null;
    if (!item) return;
    if (!item.humanVerdict || !item.rationale.trim()) return;
    updateClaim(id, { state: 'reviewed' });
  }

  function exportReview() {
    const output = finalizeGeneratedReview(generated, reviewer);
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' }),
    );
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

  const controlled =
    data.controlled.find(item => item.item.id === selectedControlled) ?? data.controlled[0];
  const controlledVerdicts = new Set(
    controlled?.result.claims.map(claim => claim.verdict) ?? [],
  );
  const controlledVerdict =
    (['error', 'unknown', 'unsupported', 'disputed', 'supported'] as const).find(verdict =>
      controlledVerdicts.has(verdict),
    ) ?? 'error';

  const plural = (n: number) => (n === 1 ? t('claims.pluralEmpty') : t('claims.pluralS'));

  return (
    <section className="claim-review">
      <div className="review-toolbar">
        <div>
          <p className="review-mode-label">
            {mode === 'listings' ? t('claims.modeListings') : t('claims.modeFixtures')}
          </p>
          {mode === 'listings' ? (
            <div className="review-progress" role="status">
              {t('claims.progress', {
                completed: progress.checkedClaims,
                total: progress.totalClaims,
              })}
              {' · '}{t('claims.productProgress', { completed: progress.checkedProducts, total: progress.totalProducts })}
              {' · '}{t('claims.sampleProgress', { completed: progress.completedSampleProducts, total: progress.requiredSampleProducts })}
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
              ? t('claims.switchToFixtures', { count: data.controlled.length })
              : t('claims.backToListings')}
          </button>
        ) : null}
      </div>

      {mode === 'listings' ? (
        <>
          <section className="review-onboarding" aria-labelledby="review-onboarding-title">
            <div className="onboarding-copy">
              <h2 id="review-onboarding-title">{t('claims.onboardingTitle')}</h2>
              <p>{t('claims.onboardingBody')}</p>
              <p className="muted">{t('claims.onboardingNoKnowledge')}</p>
            </div>
            <ol className="onboarding-steps">
              <li><span>1</span><strong>{t('claims.onboardingStep1')}</strong></li>
              <li><span>2</span><strong>{t('claims.onboardingStep2')}</strong></li>
              <li><span>3</span><strong>{t('claims.onboardingStep3')}</strong></li>
            </ol>
          </section>
          <div className="review-layout">
            <aside className="review-sidebar">
              <h3 className="sidebar-heading">{t('claims.generatedListings')}</h3>
              <label className="search">
                <span>{t('claims.searchProducts')}</span>
                <input
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={hideFinished}
                  onChange={event => setHideFinished(event.target.checked)}
                />
                {t('claims.hideFinished')}
              </label>
              <ul className="product-list">
                {products.map(item => {
                  const listing = catalog.listings[item.id]!.publication!;
                  const selectedAttempt = listing.attempts.find(
                    value => value.attempt === listing.selectedAttempt,
                  )!;
                  const done = selectedAttempt.claims.filter(claim =>
                    reviews
                      .get(`${item.id}:${selectedAttempt.attempt}:${claim.id}`)
                      ?.state === 'reviewed',
                  ).length;
                  const total = selectedAttempt.claims.length;
                  const finished = done === total;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={
                          item.id === selectedProduct ? 'product-item selected' : 'product-item'
                        }
                        onClick={() => {
                          setSelectedProduct(item.id);
                          setSelectedClaim(null);
                        }}
                      >
                        <span className="product-name">
                          {productDisplayName(item, catalog.rows)}
                        </span>
                        <span className="product-progress">
                          <span
                            className={`progress-dot${finished ? ' done' : done > 0 ? ' partial' : ''}`}
                            aria-hidden="true"
                          />
                          <span className="muted">
                            {t('claims.checked', { done, total })}
                          </span>
                          {requiredProducts.has(item.id) ? <span className="badge">{t('claims.sampleBadge')}</span> : null}
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
                        {t('claims.builtFrom', {
                          rows: productRows.length,
                          rowsPlural: plural(productRows.length),
                          suppliers: supplierCount,
                          suppliersPlural: plural(supplierCount),
                          phrases: claims.length,
                          phrasesPlural: plural(claims.length),
                        })}
                      </p>
                    </div>
                    <span className="badge badge-ready">{t('claims.generatedBadge')}</span>
                  </header>

                  <div className="reading-zone">
                    <div className="reading-zone-header">
                      <h3>{t('claims.generatedListingText')}</h3>
                      <p className="muted">{t('claims.readingHint')}</p>
                    </div>
                    <ClaimLegend t={t} />
                    <HighlightedText
                      text={publication.publishedText}
                      claims={claims}
                      selected={activeClaim?.id ?? null}
                      onSelect={id => selectClaim(id, true)}
                    />
                    <details className="technical-ids">
                      <summary>{t('claims.technicalDetails')}</summary>
                      <p className="muted">
                        {t('claims.attemptMeta', {
                          attempt: attempt.attempt,
                          status: publication.status,
                        })}
                      </p>
                    </details>
                  </div>

                  <div className="claim-nav" aria-label={t('claims.statementsAria')}>
                    {claims.map((claim, index) => {
                      const human = reviews.get(
                        `${product.id}:${attempt.attempt}:${claim.id}`,
                      )!;
                      const checked = human.state === 'reviewed';
                      return (
                        <button
                          type="button"
                          key={claim.id}
                          className={`claim-nav-item${activeClaim?.id === claim.id ? ' selected' : ''}${checked ? ' checked' : ''}`}
                          onClick={() => selectClaim(claim.id, true)}
                        >
                          <span className="claim-nav-index">
                            {index + 1}/{claims.length}
                          </span>
                          <span className="claim-nav-excerpt">{claim.text}</span>
                          <span
                            className={`progress-dot${checked ? ' done' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>

                  {activeClaim
                    ? (() => {
                        const human = reviews.get(
                          `${product.id}:${attempt.attempt}:${activeClaim.id}`,
                        )!;
                        return (
                          <article
                            ref={decisionRef}
                            className="claim-card decision-panel selected"
                            id={`claim-decision-${activeClaim.id}`}
                          >
                            <div className="decision-context">
                              <span className="comparison-label">{t('claims.currentItem')}</span>
                              <strong>{productDisplayName(product, catalog.rows)}</strong>
                              <span className="muted">
                                {t('claims.phraseContext', {
                                  current: activeIndex + 1,
                                  total: claims.length,
                                })}
                              </span>
                            </div>
                            <section className="text-comparison" aria-label={t('claims.comparisonAria')}>
                              <div className="comparison-side generated-side">
                                <div className="comparison-heading">
                                  <span className="comparison-number">1</span>
                                  <div>
                                    <span className="comparison-label">{t('claims.systemText')}</span>
                                    <p className="muted">{t('claims.systemTextHint')}</p>
                                  </div>
                                </div>
                                <blockquote>{activeClaim.text}</blockquote>
                              </div>
                              <div className="comparison-arrow" aria-hidden="true">
                                <span className="comparison-arrow-mark">↓</span>
                                {t('claims.compareWith')}
                              </div>
                              <div className="comparison-side source-side">
                                <div className="comparison-heading">
                                  <span className="comparison-number">2</span>
                                  <div>
                                    <span className="comparison-label">{t('claims.originalText')}</span>
                                    <p className="muted">{t('claims.originalTextHint')}</p>
                                  </div>
                                </div>
                                <EvidenceList
                                  claim={activeClaim}
                                  catalog={catalog}
                                  messages={messages}
                                  t={t}
                                />
                              </div>
                            </section>
                            <div className="human-decision decision-step">
                              <div className="comparison-heading">
                                <span className="comparison-number">3</span>
                                <div>
                                  <span className="comparison-label">{t('claims.decideStep')}</span>
                                  <p className="muted">{t('claims.decideStepHint')}</p>
                                </div>
                              </div>
                              <fieldset className="verdict-picker">
                                <legend>{t('claims.simpleQuestion')}</legend>
                                <p className="muted verdict-picker-hint">
                                  {t('claims.matchHint')}
                                </p>
                                <div
                                  className="verdict-options"
                                  role="radiogroup"
                                  aria-label={t('claims.yourDecision')}
                                >
                                  {VERDICTS.map(value => (
                                    <button
                                      key={value}
                                      type="button"
                                      role="radio"
                                      aria-checked={
                                        human.humanVerdict === value
                                      }
                                      className={`verdict-option ${verdictClass(value)}${human.humanVerdict === value ? ' selected' : ''}`}
                                      onClick={() => chooseVerdict(activeClaim.id, value)}
                                    >
                                      <span className="verdict-option-label">
                                        {verdictLabel(value, messages)}
                                      </span>
                                      <span className="verdict-option-hint">
                                        {verdictExplanation(value, messages)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </fieldset>
                              <AiExplanation claim={activeClaim} messages={messages} t={t} />
                              <label>
                                {t('claims.whyEditable')}
                                <textarea
                                  value={human.rationale}
                                  onChange={event =>
                                    updateClaim(activeClaim.id, {
                                      rationale: event.target.value,
                                      state: 'pending',
                                    })
                                  }
                                  placeholder={t('claims.whyPlaceholder')}
                                />
                                {human.state !== 'reviewed' ? (
                                  <span className="field-hint muted">
                                    {t('claims.notChecked')}
                                  </span>
                                ) : (
                                  <span className="field-hint muted">
                                    {t('claims.checkedHint')}
                                  </span>
                                )}
                              </label>
                              <fieldset className="issue-picker">
                                <legend>{t('claims.issueLegend')}</legend>
                                <p className="muted">{t('claims.issueHint')}</p>
                                <label className="checkbox">
                                  <input type="checkbox" checked={human.issueTypes.includes('non_atomic_claim')} onChange={() => toggleIssue(activeClaim.id, 'non_atomic_claim')} />
                                  {t('claims.issueNonAtomic')}
                                </label>
                                <label className="checkbox">
                                  <input type="checkbox" checked={human.issueTypes.includes('unclear_copy')} onChange={() => toggleIssue(activeClaim.id, 'unclear_copy')} />
                                  {t('claims.issueCopy')}
                                </label>
                              </fieldset>
                              <p className="muted">{t('claims.issueVerdictGuidance')}</p>
                              <div className="review-state-actions">
                                {human.state === 'reviewed' ? (
                                  <button type="button" onClick={() => updateClaim(activeClaim.id, { state: 'pending' })}>{t('claims.returnPending')}</button>
                                ) : (
                                  <button type="button" disabled={!human.humanVerdict || !human.rationale.trim()} onClick={() => markReviewed(activeClaim.id)}>{t('claims.markReviewed')}</button>
                                )}
                              </div>
                              <div className="claim-stepper">
                                <button
                                  type="button"
                                  disabled={activeIndex <= 0}
                                  onClick={() => goToAdjacentClaim(-1)}
                                >
                                  {t('claims.previous')}
                                </button>
                                <span className="muted">
                                  {t('claims.of', {
                                    current: activeIndex + 1,
                                    total: claims.length,
                                  })}
                                </span>
                                <button
                                  type="button"
                                  disabled={
                                    activeIndex < 0 || activeIndex >= claims.length - 1
                                  }
                                  onClick={() => goToAdjacentClaim(1)}
                                >
                                  {t('claims.next')}
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })()
                    : null}
                </>
              ) : (
                <p className="state muted">{t('claims.noProduct')}</p>
              )}
            </main>
          </div>

          <div className="review-finish">
            <h3>{t('claims.finish')}</h3>
            <p className="muted" role="status">
              {t('claims.progress', {
                completed: progress.checkedClaims,
                total: progress.totalClaims,
              })}
              {exportReady ? t('claims.finishReady') : t('claims.finishProvisional')}
            </p>
            <div className="review-finish-actions">
              <label>
                {t('claims.reviewer')}
                <input
                  value={reviewer}
                  onChange={event => setReviewer(event.target.value)}
                  placeholder={t('claims.reviewerPlaceholder')}
                />
              </label>
              <button type="button" onClick={exportReview}>
                {t('claims.download')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="review-layout">
          <aside className="review-sidebar">
            <h3 className="sidebar-heading">{t('claims.fixturesHeading')}</h3>
            <ul className="product-list">
              {data.controlled.map(entry => (
                <li key={entry.item.id}>
                  <button
                    type="button"
                    className={
                      entry.item.id === controlled?.item.id
                        ? 'product-item selected'
                        : 'product-item'
                    }
                    onClick={() => setSelectedControlled(entry.item.id)}
                  >
                    <span className="product-name">
                      {controlledKindLabel(entry.item.kind)}
                    </span>
                    <span className="muted">
                      {t('claims.expectedPrefix', {
                        label: verdictLabel(entry.item.expectedVerdict, messages),
                      })}
                    </span>
                    <span className="technical-id muted">
                      <code>{entry.item.id}</code>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <main className="review-detail">
            {controlled ? (
              <>
                <aside className="verification-scope fixture-scope" role="note">
                  <div>
                    <strong>{t('claims.fixturesWhatTitle')}</strong>
                    <p>{t('claims.fixturesWhatBody')}</p>
                  </div>
                  <div>
                    <strong>{t('claims.fixturesHowTitle')}</strong>
                    <p>{t('claims.fixturesHowBody')}</p>
                  </div>
                </aside>
                <header className="detail-header">
                  <div>
                    <h2>{controlledKindLabel(controlled.item.kind)}</h2>
                    <p className="muted">
                      {t('claims.row', { rowId: controlled.item.rowId })}
                    </p>
                    <p className="technical-id muted">
                      <code>{controlled.item.id}</code>
                    </p>
                  </div>
                  <span className={`badge ${verdictClass(controlledVerdict)}`}>
                    {verdictLabel(controlledVerdict, messages)}
                  </span>
                </header>
                <p className="review-text">{controlled.item.text}</p>
                <p>
                  <strong>{t('claims.expected')}</strong>{' '}
                  {verdictLabel(controlled.item.expectedVerdict, messages)}
                </p>
                <p>
                  <strong>{t('claims.rationale')}</strong> {controlled.item.rationale}
                </p>
                <div className="claim-list">
                  {controlled.result.claims.map(claim => (
                    <article className="claim-card" key={claim.id}>
                      <div className="claim-card-header">
                        <strong>
                          <q>{claim.text}</q>
                        </strong>
                        <span className={`badge ${verdictClass(claim.verdict)}`}>
                          {aiVerdictPhrase(claim.verdict, messages)}
                        </span>
                      </div>
                      <EvidenceList
                        claim={claim}
                        catalog={catalog}
                        messages={messages}
                        t={t}
                      />
                      <AiExplanation claim={claim} messages={messages} t={t} />
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="state muted">{t('claims.noControlled')}</p>
            )}
          </main>
        </div>
      )}
    </section>
  );
}
