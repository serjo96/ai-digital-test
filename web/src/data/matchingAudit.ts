import type { MatchingAudit, MatchingAuditVerdict } from '../../../src/types.ts';

export interface MatchingAuditDraft {
  version: 'matching-audit-draft-v1';
  auditVersion: string;
  decisionsHash: string;
  reviewer: string;
  answers: Record<string, MatchingAuditVerdict>;
}

export function restoreMatchingAuditDraft(
  input: unknown,
  audit: MatchingAudit,
  decisionsHash: string,
): MatchingAuditDraft {
  const empty: MatchingAuditDraft = {
    version: 'matching-audit-draft-v1', auditVersion: audit.version,
    decisionsHash, reviewer: '', answers: {},
  };
  if (!input || typeof input !== 'object') return empty;
  const value = input as Partial<MatchingAuditDraft>;
  if (value.version !== empty.version || value.auditVersion !== audit.version
    || value.decisionsHash !== decisionsHash) return empty;
  const valid = new Map(audit.items.map(item => [item.id, item.kind]));
  const answers: Record<string, MatchingAuditVerdict> = {};
  if (value.answers && typeof value.answers === 'object') {
    for (const [id, verdict] of Object.entries(value.answers)) {
      const kind = valid.get(id);
      if ((kind === 'pair' && ['same_product', 'different_product', 'unknown'].includes(verdict))
        || (kind === 'row' && ['product', 'non_product', 'unknown'].includes(verdict))) {
        answers[id] = verdict;
      }
    }
  }
  return { ...empty, reviewer: typeof value.reviewer === 'string' ? value.reviewer : '', answers };
}

export function finalizeMatchingAudit(
  audit: MatchingAudit,
  draft: MatchingAuditDraft,
  reviewedAt = new Date().toISOString(),
): MatchingAudit {
  const reviewer = draft.reviewer.trim();
  const items = audit.items.map(item => {
    const humanVerdict = draft.answers[item.id] ?? null;
    return humanVerdict ? { ...item, state: 'reviewed' as const, humanVerdict } : item;
  });
  const complete = items.every(item => item.state === 'reviewed');
  return {
    ...audit,
    status: complete && reviewer ? 'human_verified' : 'provisional',
    reviewedBy: complete && reviewer ? reviewer : null,
    reviewedAt: complete && reviewer ? reviewedAt : null,
    items,
  };
}
