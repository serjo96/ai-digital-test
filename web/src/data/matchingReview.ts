import type { Labels } from '../../../src/types.ts';

export interface MatchingReviewDraft {
  version: 'matching-review-draft-v1';
  labelsVersion: string;
  decisionsHash: string;
  reviewer: string;
  reviewedCaseIds: string[];
}

export function matchingReviewProgress(labels: Labels, reviewedCaseIds: Iterable<string>) {
  const reviewed = new Set(reviewedCaseIds);
  const completed = labels.cases.filter(item => item.status === 'human_verified' || reviewed.has(item.id));
  return {
    completed: completed.length,
    total: labels.cases.length,
    development: completed.filter(item => item.split === 'development').length,
    developmentTotal: labels.cases.filter(item => item.split === 'development').length,
    holdout: completed.filter(item => item.split === 'holdout').length,
    holdoutTotal: labels.cases.filter(item => item.split === 'holdout').length,
  };
}

export function restoreMatchingDraft(input: unknown, labels: Labels, decisionsHash: string): MatchingReviewDraft {
  const canonical = labels.cases.filter(item => item.status === 'human_verified').map(item => item.id);
  if (!input || typeof input !== 'object') return { version: 'matching-review-draft-v1', labelsVersion: labels.version, decisionsHash, reviewer: '', reviewedCaseIds: canonical };
  const value = input as Partial<MatchingReviewDraft>;
  const validIds = new Set(labels.cases.map(item => item.id));
  if (value.version !== 'matching-review-draft-v1' || value.labelsVersion !== labels.version || value.decisionsHash !== decisionsHash) {
    return { version: 'matching-review-draft-v1', labelsVersion: labels.version, decisionsHash, reviewer: '', reviewedCaseIds: canonical };
  }
  return {
    version: 'matching-review-draft-v1', labelsVersion: labels.version, decisionsHash,
    reviewer: typeof value.reviewer === 'string' ? value.reviewer : '',
    reviewedCaseIds: [...new Set([...canonical, ...(Array.isArray(value.reviewedCaseIds) ? value.reviewedCaseIds.filter(id => typeof id === 'string' && validIds.has(id)) : [])])],
  };
}

export function finalizeMatchingLabels(labels: Labels, reviewedCaseIds: Iterable<string>, reviewer: string, reviewedAt = new Date().toISOString()): Labels {
  const reviewed = new Set(reviewedCaseIds);
  const name = reviewer.trim();
  return {
    ...labels,
    cases: labels.cases.map(item => item.status === 'human_verified' || (reviewed.has(item.id) && name)
      ? { ...item, status: 'human_verified' as const, reviewedBy: item.reviewedBy ?? name, reviewedAt: item.reviewedAt ?? reviewedAt }
      : item),
  };
}
