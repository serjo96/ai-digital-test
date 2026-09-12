import type { MatchingAudit, MatchingAuditVerdict, SourceRow } from './types.js';

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isIsoTimestamp(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (month! < 1 || month! > 12 || hour! > 23 || minute! > 59 || second! > 59) return false;
  return day! >= 1 && day! <= new Date(Date.UTC(year!, month!, 0)).getUTCDate();
}

const pairVerdicts = new Set<MatchingAuditVerdict>([
  'same_product', 'different_product', 'unknown',
]);
const rowVerdicts = new Set<MatchingAuditVerdict>([
  'product', 'non_product', 'unknown',
]);

export function validateMatchingAudit(
  input: unknown,
  source: SourceRow[],
  labelsHash: string,
): MatchingAudit {
  if (!object(input) || input.version !== 'stage5-matching-audit-v1'
    || input.labelsHash !== labelsHash || !Array.isArray(input.items)
    || input.items.length < 15 || input.items.length > 20
    || !['provisional', 'human_verified'].includes(String(input.status))) {
    throw new Error('invalid matching audit envelope');
  }
  const sourceIds = new Set(source.map(row => row.row_id));
  const itemIds = new Set<string>();
  for (const raw of input.items) {
    if (!object(raw) || typeof raw.id !== 'string' || !raw.id
      || typeof raw.family !== 'string' || !raw.family
      || !['development', 'holdout'].includes(String(raw.split))
      || !['pair', 'row'].includes(String(raw.kind))
      || !Array.isArray(raw.rowIds) || raw.rowIds.some(id => typeof id !== 'string')
      || !['pending', 'reviewed'].includes(String(raw.state))) {
      throw new Error('invalid matching audit item');
    }
    if (itemIds.has(raw.id)) throw new Error(`duplicate matching audit item: ${raw.id}`);
    itemIds.add(raw.id);
    const rowIds = raw.rowIds as string[];
    if (new Set(rowIds).size !== rowIds.length || rowIds.some(id => !sourceIds.has(id))
      || (raw.kind === 'pair' && rowIds.length !== 2)
      || (raw.kind === 'row' && rowIds.length !== 1)) {
      throw new Error(`invalid matching audit rows: ${raw.id}`);
    }
    const verdicts = raw.kind === 'pair' ? pairVerdicts : rowVerdicts;
    if (raw.state === 'pending' && raw.humanVerdict !== null) {
      throw new Error(`pending matching audit item has a verdict: ${raw.id}`);
    }
    if (raw.state === 'reviewed' && !verdicts.has(raw.humanVerdict as MatchingAuditVerdict)) {
      throw new Error(`reviewed matching audit item has no valid verdict: ${raw.id}`);
    }
  }
  const complete = input.items.every(item => object(item) && item.state === 'reviewed');
  if (input.status === 'human_verified') {
    if (!complete || typeof input.reviewedBy !== 'string' || !input.reviewedBy.trim()
      || typeof input.reviewedAt !== 'string' || !isIsoTimestamp(input.reviewedAt)) {
      throw new Error('human matching audit metadata is incomplete');
    }
  } else if (input.reviewedBy !== null || input.reviewedAt !== null) {
    throw new Error('provisional matching audit must not have review metadata');
  }
  return input as unknown as MatchingAudit;
}
