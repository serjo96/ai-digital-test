import type { PublicationSupport } from './domain.js';

function displayValue(support: PublicationSupport): string {
  const value = String(support.value).trim();
  const normalized = value.toLocaleLowerCase('en-US');
  for (const item of support.evidence) {
    const index = item.quote.toLocaleLowerCase('en-US').indexOf(normalized);
    if (index >= 0) return item.quote.slice(index, index + value.length);
  }
  return value;
}

/**
 * Builds a deliberately minimal preview for products whose identity still needs review.
 * Every word carrying product meaning comes from an allowed identity support; facts are
 * intentionally omitted because the preview is not verified or publishable.
 */
export function identityReviewDraft(supports: PublicationSupport[]): string | null {
  const identities = supports.filter(item => item.kind === 'identity');
  const model = identities.find(item => item.label === 'model');
  const type = identities.find(item => item.label === 'type');
  const color = identities.find(item => item.label === 'variant:color');
  const subject = model ?? type;
  if (!subject) return null;

  const subjectText = displayValue(subject);
  const typeText = type && type !== subject ? String(type.value).trim() : null;
  const colorText = color ? String(color.value).trim() : null;
  const includesType = typeText
    ? subjectText.toLocaleLowerCase('en-US').includes(typeText.toLocaleLowerCase('en-US'))
    : false;
  const noun = typeText && !includesType ? ` ${typeText}` : '';
  const variant = colorText ? ` in ${colorText}` : '';
  return `${subjectText}${noun}${variant}.`;
}
