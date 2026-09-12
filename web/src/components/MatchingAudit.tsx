import { useEffect, useMemo, useState } from 'react';
import type { CatalogSnapshot } from '../data/catalog.ts';
import {
  finalizeMatchingAudit,
  restoreMatchingAuditDraft,
} from '../data/matchingAudit.ts';
import type { MatchingAuditVerdict } from '../../../src/types.ts';
import { useI18n } from '../i18n/I18nProvider.tsx';

export function MatchingAudit({ catalog }: { catalog: CatalogSnapshot }) {
  const { t } = useI18n();
  const audit = catalog.matchingAudit!;
  const decisionsHash = catalog.provenance?.decisionsHash ?? 'external';
  const storageKey = `shelf-ready:matching-audit:${audit.version}:${decisionsHash}`;
  const [draft, setDraft] = useState(() => {
    try {
      return restoreMatchingAuditDraft(
        JSON.parse(localStorage.getItem(storageKey) ?? 'null'), audit, decisionsHash,
      );
    } catch {
      return restoreMatchingAuditDraft(null, audit, decisionsHash);
    }
  });
  const initialIndex = Math.max(0, audit.items.findIndex(item => !draft.answers[item.id]));
  const [index, setIndex] = useState(initialIndex);
  const item = audit.items[index]!;
  const rows = useMemo(
    () => new Map(catalog.rows.map(row => [row.source.row_id, row.source])),
    [catalog.rows],
  );
  const completed = Object.keys(draft.answers).length;

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  const choose = (verdict: MatchingAuditVerdict) => {
    setDraft(current => ({
      ...current,
      answers: { ...current.answers, [item.id]: verdict },
    }));
  };

  const download = () => {
    const output = finalizeMatchingAudit(audit, draft);
    const href = URL.createObjectURL(new Blob(
      [`${JSON.stringify(output, null, 2)}\n`], { type: 'application/json' },
    ));
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'matching-audit-human-verified.json';
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const verdicts: MatchingAuditVerdict[] = item.kind === 'pair'
    ? ['same_product', 'different_product', 'unknown']
    : ['product', 'non_product', 'unknown'];

  return (
    <main className="matching-audit">
      <section className="audit-intro">
        <div>
          <p className="eyebrow">{t('audit.eyebrow')}</p>
          <h2>{t('audit.title')}</h2>
          <p>{t('audit.intro')}</p>
        </div>
        <strong>{t('audit.progress', { completed, total: audit.items.length })}</strong>
      </section>

      <article className="audit-question">
        <header>
          <div>
            <p className="eyebrow">
              {t(`matching.split.${item.split}`)} · {item.family}
            </p>
            <h3>{t('audit.itemOf', { current: index + 1, total: audit.items.length })}</h3>
          </div>
          <span className={`status ${draft.answers[item.id] ? 'ready' : 'needs_review'}`}>
            {draft.answers[item.id] ? t('audit.answered') : t('audit.pending')}
          </span>
        </header>

        <h4>{item.kind === 'pair' ? t('audit.pairQuestion') : t('audit.rowQuestion')}</h4>
        <p className="audit-rule">
          {item.kind === 'pair' ? t('audit.pairHint') : t('audit.rowHint')}
        </p>

        <div className={`audit-sources ${item.kind === 'row' ? 'single' : ''}`}>
          {item.rowIds.map((id, rowIndex) => (
            <AuditSourceRow
              key={id}
              label={item.kind === 'pair' ? t('audit.rowLabel', { label: rowIndex ? 'B' : 'A' }) : t('audit.sourceRow')}
              id={id}
              row={rows.get(id)}
            />
          ))}
        </div>

        <div className="audit-answer">
          <p className="audit-answer-label" id={`audit-answer-${item.id}`}>
            {t('audit.answerAria')}
          </p>
          <div
            className="audit-verdicts"
            role="group"
            aria-labelledby={`audit-answer-${item.id}`}
          >
            {verdicts.map(verdict => (
              <button
                key={verdict}
                type="button"
                className={draft.answers[item.id] === verdict ? 'selected' : ''}
                aria-pressed={draft.answers[item.id] === verdict}
                onClick={() => choose(verdict)}
              >
                {t(`audit.verdict.${verdict}`)}
              </button>
            ))}
          </div>
        </div>

        <nav className="audit-stepper" aria-label={t('audit.navigationAria')}>
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            {t('audit.previous')}
          </button>
          <button
            type="button"
            disabled={index === audit.items.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            {t('audit.next')}
          </button>
        </nav>
      </article>

      <section className="audit-finish">
        <label>
          <span>{t('audit.reviewer')}</span>
          <input
            value={draft.reviewer}
            onChange={event => setDraft(current => ({ ...current, reviewer: event.target.value }))}
            placeholder={t('audit.reviewerPlaceholder')}
          />
        </label>
        <button
          type="button"
          className="audit-download"
          onClick={download}
          disabled={completed !== audit.items.length || !draft.reviewer.trim()}
        >
          {t('audit.download')}
        </button>
      </section>
    </main>
  );
}

function AuditSourceRow({
  label, id, row,
}: {
  label: string;
  id: string;
  row: { supplier: string; supplier_sku: string; raw_title: string; raw_specs: string } | undefined;
}) {
  const { t } = useI18n();
  return (
    <section className="audit-source-card">
      <span className="audit-source-label">{label}</span>
      <h5>{row?.raw_title || t('matching.empty')}</h5>
      <p>{row?.raw_specs || t('matching.empty')}</p>
      <small>{row ? `${row.supplier} / ${row.supplier_sku}` : id}</small>
    </section>
  );
}
