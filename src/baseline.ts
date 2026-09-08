import { createHash } from 'node:crypto';
import type { BaselineResult, NormalizedRow, PriceResult, SourceRow } from './types.js';

export const TAXONOMY = [
  'audio_headphones', 'audio_speakers', 'wearables', 'laptops', 'tablets', 'phones',
  'cameras', 'home_kitchen', 'gaming_accessories', 'storage', 'chargers_cables', 'other',
] as const;

export function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function validateInputs(feed: unknown, taxonomy: unknown): SourceRow[] {
  const errors: string[] = [];
  if (!Array.isArray(taxonomy) || taxonomy.length !== TAXONOMY.length ||
      new Set(taxonomy).size !== TAXONOMY.length ||
      taxonomy.some(x => !TAXONOMY.includes(x as typeof TAXONOMY[number]))) {
    errors.push('taxonomy must contain exactly the 12 supplied categories');
  }
  if (!Array.isArray(feed) || feed.length === 0) throw new Error([...errors, 'feed must be a nonempty array'].join('\n'));
  const ids = new Set<string>();
  const skus = new Set<string>();
  feed.forEach((row: unknown, index: number) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      errors.push(`row[${index}] must be an object`);
      return;
    }
    const r = row as Record<string, unknown>;
    for (const key of ['row_id', 'supplier', 'supplier_sku', 'raw_title', 'raw_specs', 'price']) {
      if (typeof r[key] !== 'string') errors.push(`row[${index}].${key} must be a string`);
    }
    for (const key of ['row_id', 'supplier', 'supplier_sku']) {
      if (typeof r[key] === 'string' && !r[key].trim()) errors.push(`row[${index}].${key} must not be blank`);
    }
    if (!Number.isSafeInteger(r.stock) || (r.stock as number) < 0) errors.push(`row[${index}].stock must be a nonnegative safe integer`);
    if (typeof r.row_id === 'string') {
      if (ids.has(r.row_id)) errors.push(`duplicate row_id: ${r.row_id}`);
      ids.add(r.row_id);
    }
    if (typeof r.supplier === 'string' && typeof r.supplier_sku === 'string') {
      const key = JSON.stringify([r.supplier, r.supplier_sku]);
      if (skus.has(key)) errors.push(`duplicate supplier/SKU: ${key}`);
      skus.add(key);
    }
  });
  if (errors.length) throw new Error(errors.join('\n'));
  return feed as SourceRow[];
}

export function titleKey(title: string): string {
  return title.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function decimal(value: string): string {
  const [whole = '0', fraction = ''] = value.replace(',', '.').split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
}

export function parsePrice(raw: string): PriceResult {
  const text = raw.trim();
  const base = { raw, amount: null, currency: null, assumption: null };
  if (!text) return { ...base, status: 'missing' };
  const formats = [
    { regex: /^£(\d+(?:\.\d{1,2})?)$/, currency: 'GBP' },
    { regex: /^(\d+(?:,\d{1,2})?)\s+EUR$/, currency: 'EUR' },
    { regex: /^USD\s+(\d+(?:\.\d{1,2})?)$/, currency: 'USD' },
    { regex: /^\$(\d+(?:\.\d{1,2})?)$/, currency: 'USD' },
  ] as const;
  for (const format of formats) {
    const match = format.regex.exec(text);
    if (match?.[1]) return {
      raw, amount: decimal(match[1]), currency: format.currency, status: 'parsed',
      assumption: text.startsWith('$') ? '$ interpreted as USD (MVP policy)' : null,
    };
  }
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) return { ...base, amount: decimal(text), status: 'unknown_currency' };
  return { ...base, status: 'unsupported_format' };
}

function nonProductReason(row: SourceRow): string | null {
  const title = titleKey(row.raw_title);
  if (!title && !row.raw_specs.trim()) return 'empty_product';
  if (/^\W*price drop\W+see attached sheet\W*$/.test(title)) return 'price_notice';
  if (/^test row do not import[.!\s]*$/.test(title)) return 'test_record';
  if (/^mixed pallet\b.*\bassorted electronics\b/.test(title)) return 'mixed_pallet';
  return null;
}

export function baseline(source: SourceRow[]): BaselineResult {
  const rows: NormalizedRow[] = [...source].sort((a, b) => a.row_id < b.row_id ? -1 : a.row_id > b.row_id ? 1 : 0).map(row => {
    const reason = nonProductReason(row);
    const key = titleKey(row.raw_title);
    return {
      source: structuredClone(row), titleKey: key, price: parsePrice(row.price),
      outcome: reason ? 'non_product' : key ? 'grouped' : 'review', groupId: null,
      reasons: reason ? [reason] : key ? [] : ['missing_title'],
    };
  });
  const buckets = new Map<string, NormalizedRow[]>();
  for (const row of rows) {
    if (row.price.status !== 'parsed') row.reasons.push(`price_${row.price.status}`);
    if (row.outcome !== 'grouped') continue;
    const bucket = buckets.get(row.titleKey) ?? [];
    bucket.push(row);
    buckets.set(row.titleKey, bucket);
  }
  const groups = [...buckets.entries()].map(([key, members]) => {
    const rowIds = members.map(r => r.source.row_id).sort();
    const id = `b0_${hash(JSON.stringify(rowIds))}`;
    for (const member of members) member.groupId = id;
    return { id, rowIds, titleKey: key, method: 'exact_normalized_title' as const };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { rows, groups };
}

export function assertAccounting(source: SourceRow[], result: BaselineResult): void {
  const expected = new Set(source.map(r => r.row_id));
  const outcomes = new Set<string>();
  const assignments = new Map<string, string>();
  for (const group of result.groups) {
    if (!group.rowIds.length) throw new Error('empty group');
    for (const id of group.rowIds) {
      if (!expected.has(id) || assignments.has(id)) throw new Error(`invalid/double group assignment: ${id}`);
      assignments.set(id, group.id);
    }
  }
  for (const row of result.rows) {
    const id = row.source.row_id;
    if (!expected.has(id) || outcomes.has(id)) throw new Error(`invalid/double row outcome: ${id}`);
    outcomes.add(id);
    if (row.outcome === 'grouped') {
      if (!row.groupId || assignments.get(id) !== row.groupId) throw new Error(`missing group assignment: ${id}`);
    } else if (row.groupId !== null || assignments.has(id)) throw new Error(`non-group outcome assigned to group: ${id}`);
  }
  if (outcomes.size !== expected.size) throw new Error('lost source rows');
}
