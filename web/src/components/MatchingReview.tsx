import { useEffect, useMemo, useState } from 'react';
import type { CatalogSnapshot } from '../data/catalog.ts';
import { finalizeMatchingLabels, matchingReviewProgress, restoreMatchingDraft, type MatchingReviewDraft } from '../data/matchingReview.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';

export function MatchingReview({ catalog }: { catalog: CatalogSnapshot }) {
  const { t } = useI18n();
  const labels = catalog.matchingReview!;
  const decisionsHash = catalog.provenance?.decisionsHash ?? 'external';
  const storageKey = `shelf-ready:matching-review:${labels.version}:${decisionsHash}`;
  const [draft, setDraft] = useState<MatchingReviewDraft>(() => {
    try { return restoreMatchingDraft(JSON.parse(localStorage.getItem(storageKey) ?? 'null'), labels, decisionsHash); }
    catch { return restoreMatchingDraft(null, labels, decisionsHash); }
  });
  const [pendingOnly, setPendingOnly] = useState(false);
  const reviewed = useMemo(() => new Set(draft.reviewedCaseIds), [draft.reviewedCaseIds]);
  const progress = matchingReviewProgress(labels, reviewed);
  const rows = new Map(catalog.rows.map(row => [row.source.row_id, row.source]));

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(draft)); }, [draft, storageKey]);

  const setReviewed = (caseId: string, value: boolean) => setDraft(current => ({
    ...current,
    reviewedCaseIds: value
      ? [...new Set([...current.reviewedCaseIds, caseId])]
      : current.reviewedCaseIds.filter(id => id !== caseId || labels.cases.find(item => item.id === id)?.status === 'human_verified'),
  }));
  const download = () => {
    const output = finalizeMatchingLabels(labels, reviewed, draft.reviewer);
    const href = URL.createObjectURL(new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = 'labels-human-verified.json'; anchor.click(); URL.revokeObjectURL(href);
  };
  const visible = labels.cases.filter(item => !pendingOnly || (!reviewed.has(item.id) && item.status !== 'human_verified'));

  return (
    <main className="matching-review">
      <section className="review-onboarding matching-onboarding">
        <div>
          <p className="eyebrow">{t('matching.eyebrow')}</p>
          <h2>{t('matching.title')}</h2>
          <p>{t('matching.intro')}</p>
          <p className="review-attention">{t('matching.holdoutWarning')}</p>
        </div>
        <div className="matching-progress" aria-label={t('matching.progressAria')}>
          <strong>{t('matching.progress', { completed: progress.completed, total: progress.total })}</strong>
          <span>{t('matching.splitProgress', { development: progress.development, developmentTotal: progress.developmentTotal, holdout: progress.holdout, holdoutTotal: progress.holdoutTotal })}</span>
        </div>
      </section>
      <section className="matching-toolbar">
        <label className="checkbox"><input type="checkbox" checked={pendingOnly} onChange={event => setPendingOnly(event.target.checked)} />{t('matching.pendingOnly')}</label>
        <label><span>{t('matching.reviewer')}</span><input value={draft.reviewer} onChange={event => setDraft(current => ({ ...current, reviewer: event.target.value }))} placeholder={t('matching.reviewerPlaceholder')} /></label>
        <button type="button" onClick={download} disabled={progress.completed !== progress.total || !draft.reviewer.trim()}>{t('matching.download')}</button>
      </section>
      <div className="matching-cases">
        {visible.map(item => {
          const done = item.status === 'human_verified' || reviewed.has(item.id);
          return (
            <article className={`matching-case ${done ? 'reviewed' : ''}`} key={item.id}>
              <header><div><p className="eyebrow">{item.split}</p><h3>{item.id}</h3></div><span className={`status ${done ? 'ready' : 'needs_review'}`}>{done ? t('matching.reviewed') : t('matching.pending')}</span></header>
              <p>{item.explanation}</p>
              {item.expectedGroups.map((group, index) => <section key={`${item.id}:group:${index}`}><h4>{t('matching.group', { number: index + 1 })}</h4>{group.map(id => <SourceRow key={id} id={id} row={rows.get(id)} />)}</section>)}
              {item.nonProductRowIds.length ? <section><h4>{t('matching.nonProducts')}</h4>{item.nonProductRowIds.map(id => <SourceRow key={id} id={id} row={rows.get(id)} />)}</section> : null}
              {item.unknownPairs.length ? <p><strong>{t('matching.unknownPairs')}</strong> {item.unknownPairs.map(pair => pair.join(' ↔ ')).join('; ')}</p> : null}
              <p className="muted">{t('matching.confirmHint')}</p>
              <button type="button" onClick={() => setReviewed(item.id, !done)} disabled={item.status === 'human_verified'}>{done ? t('matching.returnPending') : t('matching.confirm')}</button>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function SourceRow({ id, row }: { id: string; row: { supplier: string; supplier_sku: string; raw_title: string; raw_specs: string } | undefined }) {
  const { t } = useI18n();
  return <div className="source-card"><p><strong>{id}</strong>{row ? ` · ${row.supplier} / ${row.supplier_sku}` : ''}</p><p><strong>{t('matching.rowTitle')}</strong> {row?.raw_title || t('matching.empty')}<br /><strong>{t('matching.rowSpecs')}</strong> {row?.raw_specs || t('matching.empty')}</p></div>;
}
