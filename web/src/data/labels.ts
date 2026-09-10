import type { CanonicalProduct } from '../../../src/domain.ts';
import type { ListingView, ProductStatus } from './catalog.ts';

export interface FormattedReason {
  label: string;
  code: string;
  known: boolean;
}

const EXACT: Record<string, string> = {
  missing_specs: 'Empty supplier specs',
  unparsed_specs: 'Specs text not fully understood by rules',
  uncertain_category: 'Category is uncertain',
  generation_not_run: 'Generation and claim verification have not run',
  insufficient_evidence: 'Not enough evidence for a publishable description',
  internal_identity_conflict: 'Conflicting identity signals inside a source row',
  conflicting_offer_condition: 'Conflicting offer condition on the same row',
  agreed: 'Agreed across observations',
  conflict: 'Conflicting values',
  incomparable: 'Values not comparable under the same conditions',
  literal_model_and_compatible_group: 'Same model, type, and compatible variants',
  unresolved_candidate: 'Identity or variant still unresolved',
  unrecognized_product_type: 'Product type not recognized',
  common_mass_rounding_interval: 'Mass values agree within rounding intervals',
  different_values_same_conditions: 'Different values under the same conditions',
  different_units_or_conditions: 'Different units or measurement conditions',
  same_value_and_conditions: 'Same value and conditions',
};

const PREFIX: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^fact_conflict:(.+)$/, m => `Conflicting product attribute: ${m[1] ?? 'unknown'}`],
  [/^fact_incomparable:(.+)$/, m => `Incomparable product attribute: ${m[1] ?? 'unknown'}`],
  [/^literal_type:(.+)$/, m => `Recognized type: ${(m[1] ?? 'unknown').replaceAll('_', ' ')}`],
  [/^identity:(.+)$/, m => `Identity check needs review: ${(m[1] ?? 'unknown').replaceAll('_', ' ')}`],
  [/^disputed_claim:(.+)$/, m => `Disputed claim held back: ${m[1] ?? 'unknown'}`],
  [/^price_(.+)$/, m => `Price issue: ${(m[1] ?? 'unknown').replaceAll('_', ' ')}`],
];

/** Turn a machine reason code into a short human label. Unknown codes keep the raw code. */
export function formatReason(code: string): FormattedReason {
  const trimmed = code.trim();
  if (!trimmed) return { label: 'Unspecified reason', code: trimmed, known: false };
  const exact = EXACT[trimmed];
  if (exact) return { label: exact, code: trimmed, known: true };
  for (const [pattern, render] of PREFIX) {
    const match = trimmed.match(pattern);
    if (match) return { label: render(match), code: trimmed, known: true };
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

export function primaryReviewReason(product: CanonicalProduct, listing: ListingView | undefined): FormattedReason | null {
  const codes = reviewReasonCodes(product, listing);
  const first = codes[0];
  return first ? formatReason(first) : null;
}

export function statusExplanation(status: ProductStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready to publish locally';
    case 'needs_review':
      return 'Needs human review';
    case 'withheld':
      return 'Publication withheld';
  }
}

export function publicationState(listing: ListingView | undefined): {
  available: boolean;
  summary: string;
} {
  if (listing?.publishedText) {
    return { available: true, summary: 'Publishable text is available for this card.' };
  }
  const reasons = uniqueReasons(listing?.withholdReasons ?? []);
  if (reasons.length) {
    return {
      available: false,
      summary: reasons.map(code => formatReason(code).label).join('; '),
    };
  }
  return {
    available: false,
    summary: 'No publishable text on this card.',
  };
}

export function hasUnresolvedFacts(product: CanonicalProduct): boolean {
  return product.facts.some(fact => fact.status === 'conflict' || fact.status === 'incomparable');
}
