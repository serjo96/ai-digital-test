import type { CanonicalProduct } from '../../../src/domain.ts';
import type { ListingView, ProductStatus } from './catalog.ts';
import { t, type Messages } from '../i18n/messages.ts';

export interface FormattedReason {
  label: string;
  code: string;
  known: boolean;
}

const EXACT_KEYS = [
  'missing_specs',
  'unparsed_specs',
  'uncertain_category',
  'generation_not_run',
  'insufficient_evidence',
  'internal_identity_conflict',
  'conflicting_offer_condition',
  'agreed',
  'conflict',
  'incomparable',
  'literal_model_and_compatible_group',
  'unresolved_candidate',
  'unrecognized_product_type',
  'common_mass_rounding_interval',
  'different_values_same_conditions',
  'different_units_or_conditions',
  'same_value_and_conditions',
] as const;

const PREFIX: [RegExp, string][] = [
  [/^fact_conflict:(.+)$/, 'reasons.prefix.fact_conflict'],
  [/^fact_incomparable:(.+)$/, 'reasons.prefix.fact_incomparable'],
  [/^literal_type:(.+)$/, 'reasons.prefix.literal_type'],
  [/^identity:(.+)$/, 'reasons.prefix.identity'],
  [/^disputed_claim:(.+)$/, 'reasons.prefix.disputed_claim'],
  [/^price_(.+)$/, 'reasons.prefix.price'],
];

/** Turn a machine reason code into a short human label. Unknown codes keep the raw code. */
export function formatReason(code: string, messages: Messages): FormattedReason {
  const trimmed = code.trim();
  if (!trimmed) {
    return { label: t(messages, 'reasons.unspecified'), code: trimmed, known: false };
  }
  if ((EXACT_KEYS as readonly string[]).includes(trimmed)) {
    return { label: t(messages, `reasons.${trimmed}`), code: trimmed, known: true };
  }
  for (const [pattern, key] of PREFIX) {
    const match = trimmed.match(pattern);
    if (match) {
      const raw = match[1] ?? t(messages, 'reasons.unknownAttr');
      const attr = pattern.source.startsWith('^literal_type') || pattern.source.startsWith('^identity') || pattern.source.startsWith('^price_')
        ? raw.replaceAll('_', ' ')
        : raw;
      return { label: t(messages, key, { attr }), code: trimmed, known: true };
    }
  }
  return { label: trimmed.replaceAll('_', ' '), code: trimmed, known: false };
}

/** Preserve first-seen order while dropping duplicate codes. */
export function uniqueReasons(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of codes) {
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export function reviewReasonCodes(_product: CanonicalProduct, listing: ListingView | undefined): string[] {
  const fromFlags = (listing?.reviewFlags ?? []).map(flag => flag.reason);
  return uniqueReasons(fromFlags);
}

export function primaryReviewReason(
  product: CanonicalProduct,
  listing: ListingView | undefined,
  messages: Messages,
): FormattedReason | null {
  const codes = reviewReasonCodes(product, listing);
  const first = codes[0];
  return first ? formatReason(first, messages) : null;
}

export function statusExplanation(status: ProductStatus, messages: Messages): string {
  return t(messages, `statusExplanation.${status}`);
}

export function publicationState(
  listing: ListingView | undefined,
  messages: Messages,
): {
  available: boolean;
  summary: string;
} {
  if (listing?.publishedText) {
    return { available: true, summary: t(messages, 'publication.availableSummary') };
  }
  const reasons = uniqueReasons(listing?.withholdReasons ?? []);
  if (reasons.length) {
    return {
      available: false,
      summary: reasons.map(code => formatReason(code, messages).label).join('; '),
    };
  }
  return {
    available: false,
    summary: t(messages, 'publication.noneSummary'),
  };
}

export function hasUnresolvedFacts(product: CanonicalProduct): boolean {
  return product.facts.some(fact => fact.status === 'conflict' || fact.status === 'incomparable');
}

export type ClaimVerdictLabel = 'supported' | 'unsupported' | 'disputed' | 'error' | 'unknown';

/** Short human label for a claim verdict shown in the review UI. */
export function verdictLabel(verdict: string, messages: Messages): string {
  switch (verdict) {
    case 'supported':
    case 'unsupported':
    case 'disputed':
    case 'error':
    case 'unknown':
      return t(messages, `verdict.${verdict}`);
    default:
      return verdict.replaceAll('_', ' ');
  }
}

/** One-line explanation of what a human verdict means for the reviewer. */
export function verdictExplanation(verdict: string, messages: Messages): string {
  switch (verdict) {
    case 'supported':
      return t(messages, 'verdict.explainSupported');
    case 'unsupported':
      return t(messages, 'verdict.explainUnsupported');
    case 'disputed':
      return t(messages, 'verdict.explainDisputed');
    case 'error':
      return t(messages, 'verdict.explainError');
    case 'unknown':
      return t(messages, 'verdict.explainUnknown');
    default:
      return '';
  }
}

/** Label used next to the saved AI verdict badge. */
export function aiVerdictPhrase(verdict: string, messages: Messages): string {
  switch (verdict) {
    case 'supported':
      return t(messages, 'verdict.aiSupported');
    case 'unsupported':
      return t(messages, 'verdict.aiUnsupported');
    case 'disputed':
      return t(messages, 'verdict.aiDisputed');
    default:
      return t(messages, 'verdict.aiSays', { label: verdictLabel(verdict, messages) });
  }
}

/** Human-readable label for a controlled fixture kind. */
export function controlledKindLabel(kind: string): string {
  return kind.replaceAll('_', ' ');
}

/** Turn an evidence field code into a short source label. */
export function evidenceFieldLabel(field: string, messages: Messages): string {
  switch (field) {
    case 'raw_title':
    case 'raw_specs':
    case 'price':
    case 'stock':
      return t(messages, `evidenceField.${field}`);
    default:
      return field.replaceAll('_', ' ');
  }
}
