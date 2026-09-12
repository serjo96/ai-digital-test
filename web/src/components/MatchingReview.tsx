import { useEffect, useMemo, useState } from 'react';
import type { CatalogSnapshot } from '../data/catalog.ts';
import {
  finalizeMatchingLabels,
  matchingReviewProgress,
  restoreMatchingDraft,
  type MatchingReviewDraft,
} from '../data/matchingReview.ts';
import { ReviewContextBar, type ContextChip } from './ReviewContextBar.tsx';
import { useI18n } from '../i18n/I18nProvider.tsx';
import { useIsMobile } from '../hooks/useIsMobile.ts';

type MobilePane = 'list' | 'detail';

export function MatchingReview({ catalog }: { catalog: CatalogSnapshot }) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const labels = catalog.matchingReview!;
  const decisionsHash = catalog.provenance?.decisionsHash ?? 'external';
  const storageKey = `shelf-ready:matching-review:${labels.version}:${decisionsHash}`;
  const [draft, setDraft] = useState<MatchingReviewDraft>(() => {
    try {
      return restoreMatchingDraft(
        JSON.parse(localStorage.getItem(storageKey) ?? 'null'),
        labels,
        decisionsHash,
      );
    } catch {
      return restoreMatchingDraft(null, labels, decisionsHash);
    }
  });
  const [pendingOnly, setPendingOnly] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('list');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    labels.cases[0]?.id ?? null,
  );
  const reviewed = useMemo(() => new Set(draft.reviewedCaseIds), [draft.reviewedCaseIds]);
  const progress = matchingReviewProgress(labels, reviewed);
  const rows = new Map(catalog.rows.map(row => [row.source.row_id, row.source]));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  const setReviewed = (caseId: string, value: boolean) =>
    setDraft(current => ({
      ...current,
      reviewedCaseIds: value
        ? [...new Set([...current.reviewedCaseIds, caseId])]
        : current.reviewedCaseIds.filter(
            id =>
              id !== caseId ||
              labels.cases.find(item => item.id === id)?.status === 'human_verified',
          ),
    }));

  const download = () => {
    const output = finalizeMatchingLabels(labels, reviewed, draft.reviewer);
    const href = URL.createObjectURL(
      new Blob([`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'labels-human-verified.json';
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const visible = labels.cases.filter(
    item =>
      !pendingOnly ||
      (!reviewed.has(item.id) && item.status !== 'human_verified'),
  );

  useEffect(() => {
    if (selectedCaseId && visible.some(item => item.id === selectedCaseId)) return;
    setSelectedCaseId(visible[0]?.id ?? null);
  }, [visible, selectedCaseId]);

  const selectedCase =
    visible.find(item => item.id === selectedCaseId) ?? visible[0] ?? null;
  const selectedIndex = selectedCase
    ? visible.findIndex(item => item.id === selectedCase.id)
    : -1;

  const selectMobileCase = (index: number) => {
    const item = visible[index];
    if (!item) return;
    setSelectedCaseId(item.id);
    setMobilePane('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chips: ContextChip[] = [];
  if (pendingOnly) {
    chips.push({
      id: 'pending',
      label: t('mobile.pendingChip'),
      onClear: () => setPendingOnly(false),
    });
  }

  const renderCase = (item: (typeof labels.cases)[number]) => {
    const done = item.status === 'human_verified' || reviewed.has(item.id);
    return (
      <article className={`matching-case ${done ? 'reviewed' : ''}`} key={item.id}>
        <header>
          <div>
            <p className="eyebrow">{t(`matching.split.${item.split}`)}</p>
            <h3>{item.id}</h3>
          </div>
          <span className={`status ${done ? 'ready' : 'needs_review'}`}>
            {done ? t('matching.reviewed') : t('matching.pending')}
          </span>
        </header>
        <section className="matching-case-task" aria-label={t('matching.caseTaskTitle')}>
          <strong>{t('matching.caseTaskTitle')}</strong>
          <p>{t('matching.caseTaskWholePartition')}</p>
          <ol>
            <li>{t('matching.caseTaskSameGroup')}</li>
            <li>{t('matching.caseTaskDifferentGroups')}</li>
            <li>{t('matching.caseTaskDecision')}</li>
          </ol>
        </section>
        <p>{t(`matching.explanations.${item.id}`)}</p>
        {item.expectedGroups.map((group, index) => (
          <section className="matching-proposed-group" key={`${item.id}:group:${index}`}>
            {index > 0 ? (
              <div className="matching-separate-marker">
                {t('matching.separateFromPrevious')}
              </div>
            ) : null}
            <h4>{t('matching.group', { number: index + 1 })}</h4>
            <p className="matching-group-hint">
              {group.length === 1
                ? index === 0 && item.expectedGroups.length === 1
                  ? t('matching.onlySingleRowGroupHint')
                  : t('matching.singleRowGroupHint')
                : t('matching.multiRowGroupHint', { count: group.length })}
            </p>
            {group.map(id => (
              <SourceRow key={id} id={id} row={rows.get(id)} />
            ))}
          </section>
        ))}
        {item.nonProductRowIds.length ? (
          <section>
            <h4>{t('matching.nonProducts')}</h4>
            <p className="matching-group-hint">{t('matching.nonProductsHint')}</p>
            {item.nonProductRowIds.map(id => (
              <SourceRow key={id} id={id} row={rows.get(id)} />
            ))}
          </section>
        ) : null}
        {item.unknownPairs.length ? (
          <section className="matching-unknown">
            <strong>{t('matching.unknownPairs')}</strong>
            <p>{t('matching.unknownPairsHint')}</p>
            <p>{item.unknownPairs.map(pair => pair.join(' ↔ ')).join('; ')}</p>
          </section>
        ) : null}
        <p className="matching-final-check">{t('matching.confirmHint')}</p>
        <button
          type="button"
          className="matching-confirm"
          onClick={() => setReviewed(item.id, !done)}
          disabled={item.status === 'human_verified'}
        >
          {done ? t('matching.returnPending') : t('matching.confirmWholeCase')}
        </button>
        {isMobile ? (
          <nav className="matching-stepper" aria-label={t('matching.navigationAria')}>
            <button type="button" onClick={() => setMobilePane('list')}>
              {t('mobile.backToList')}
            </button>
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => selectMobileCase(selectedIndex - 1)}
            >
              {t('matching.previous')}
            </button>
            <button
              type="button"
              disabled={selectedIndex < 0 || selectedIndex >= visible.length - 1}
              onClick={() => selectMobileCase(selectedIndex + 1)}
            >
              {t('matching.next')}
            </button>
          </nav>
        ) : null}
      </article>
    );
  };

  if (!isMobile) {
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
            <strong>
              {t('matching.progress', {
                completed: progress.completed,
                total: progress.total,
              })}
            </strong>
            <span>
              {t('matching.splitProgress', {
                development: progress.development,
                developmentTotal: progress.developmentTotal,
                holdout: progress.holdout,
                holdoutTotal: progress.holdoutTotal,
              })}
            </span>
          </div>
        </section>
        <section className="matching-toolbar">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={event => setPendingOnly(event.target.checked)}
            />
            {t('matching.pendingOnly')}
          </label>
          <label>
            <span>{t('matching.reviewer')}</span>
            <input
              value={draft.reviewer}
              onChange={event =>
                setDraft(current => ({ ...current, reviewer: event.target.value }))
              }
              placeholder={t('matching.reviewerPlaceholder')}
            />
          </label>
          <button
            type="button"
            onClick={download}
            disabled={progress.completed !== progress.total || !draft.reviewer.trim()}
          >
            {t('matching.download')}
          </button>
        </section>
        <div className="matching-cases">{visible.map(renderCase)}</div>
      </main>
    );
  }

  return (
    <main className="matching-review matching-review-mobile">
      <ReviewContextBar
        screen={t('tabs.matching')}
        item={
          selectedCase && mobilePane === 'detail'
            ? `${selectedCase.id} · ${t(`matching.split.${selectedCase.split}`)}`
            : null
        }
        progress={t('mobile.casesProgressShort', {
          completed: progress.completed,
          total: progress.total,
        })}
        chips={chips}
        emptyFilterLabel={t('mobile.allCases')}
        selectionLabel={t('mobile.selection')}
        onBack={mobilePane === 'detail' ? () => setMobilePane('list') : undefined}
        backLabel={t('mobile.backToList')}
      />

      {mobilePane === 'list' ? (
        <>
          <details className="matching-onboarding matching-onboarding-collapsible">
            <summary>{t('matching.onboardingSummary')}</summary>
            <p className="eyebrow">{t('matching.eyebrow')}</p>
            <h2>{t('matching.title')}</h2>
            <p>{t('matching.intro')}</p>
            <p className="review-attention">{t('matching.holdoutWarning')}</p>
            <div className="matching-progress" aria-label={t('matching.progressAria')}>
              <strong>
                {t('matching.progress', {
                  completed: progress.completed,
                  total: progress.total,
                })}
              </strong>
              <span>
                {t('matching.splitProgress', {
                  development: progress.development,
                  developmentTotal: progress.developmentTotal,
                  holdout: progress.holdout,
                  holdoutTotal: progress.holdoutTotal,
                })}
              </span>
            </div>
          </details>

          <section className="matching-toolbar">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={event => setPendingOnly(event.target.checked)}
              />
              {t('matching.pendingOnly')}
            </label>
            <label>
              <span>{t('matching.reviewer')}</span>
              <input
                value={draft.reviewer}
                onChange={event =>
                  setDraft(current => ({ ...current, reviewer: event.target.value }))
                }
                placeholder={t('matching.reviewerPlaceholder')}
              />
            </label>
            <button
              type="button"
              onClick={download}
              disabled={progress.completed !== progress.total || !draft.reviewer.trim()}
            >
              {t('matching.download')}
            </button>
          </section>
        </>
      ) : null}

      <div className={`layout-mobile pane-${mobilePane}`}>
        <aside
          className={`matching-case-list${mobilePane !== 'list' ? ' mobile-hidden' : ''}`}
        >
          <h3 className="sidebar-heading">{t('matching.casesHeading')}</h3>
          <ul className="product-list">
            {visible.map(item => {
              const done =
                item.status === 'human_verified' || reviewed.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      item.id === selectedCase?.id
                        ? 'product-item selected'
                        : 'product-item'
                    }
                    onClick={() => {
                      setSelectedCaseId(item.id);
                      setMobilePane('detail');
                    }}
                  >
                    <span className="product-name">{item.id}</span>
                    <span className="product-progress">
                      <span className="badge">{t(`matching.split.${item.split}`)}</span>
                      <span className={`status ${done ? 'ready' : 'needs_review'}`}>
                        {done ? t('matching.reviewed') : t('matching.pending')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <div
          className={`matching-case-detail${mobilePane !== 'detail' ? ' mobile-hidden' : ''}`}
        >
          {selectedCase ? renderCase(selectedCase) : (
            <p className="state muted">{t('matching.noCase')}</p>
          )}
        </div>
      </div>
    </main>
  );
}

function SourceRow({
  id,
  row,
}: {
  id: string;
  row:
    | { supplier: string; supplier_sku: string; raw_title: string; raw_specs: string }
    | undefined;
}) {
  const { t } = useI18n();
  return (
    <div className="source-card">
      <p>
        <strong>{id}</strong>
        {row ? ` · ${row.supplier} / ${row.supplier_sku}` : ''}
      </p>
      <p>
        <strong>{t('matching.rowTitle')}</strong> {row?.raw_title || t('matching.empty')}
        <br />
        <strong>{t('matching.rowSpecs')}</strong> {row?.raw_specs || t('matching.empty')}
      </p>
    </div>
  );
}
