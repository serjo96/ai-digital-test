import { assertAccounting, baseline, hash, TAXONOMY, titleKey } from './baseline.js';
import { extract, reconcile } from './facts.js';
import { sourceEvidence } from './domain.js';
import type { CandidateDecision, Category, Confidence, Fact, Identity, ProductResult, ReviewItem } from './domain.js';
import type { SourceRow } from './types.js';

const types: [string, Category, RegExp][] = [
  ['ear_tips', 'other', /\b(?:replacement\s+)?ear tips\b/],
  ['tablet_case', 'other', /\btablet case\b/],
  ['laptop_sleeve', 'other', /\blaptop sleeve\b/],
  ['usb_hub', 'chargers_cables', /\busb[ -]?c hub\b/],
  ['charger', 'chargers_cables', /\b(?:gan\s+)?charger\b/],
  ['cable', 'chargers_cables', /\b(?:usb[ -]?c\s+)?cable\b/],
  ['keyboard', 'gaming_accessories', /\b(?:(?:mechanical|mech)\s+)?keyboard\b/],
  ['mouse', 'other', /\b(?:wireless\s+)?mouse\b/],
  ['earbuds', 'audio_headphones', /\b(?:true wireless\s+|wired\s+)?earbuds?\b/],
  ['headphones', 'audio_headphones', /\b(?:headphones|kopfhoerer|wireless over-ear)\b/],
  ['speaker', 'audio_speakers', /\b(?:(?:portable bluetooth|bookshelf)\s+)?speaker\b/],
  ['tracker', 'wearables', /\b(?:fitness|activity) tracker\b/],
  ['laptop', 'laptops', /\b(?:laptop|notebook)\b/],
  ['tablet', 'tablets', /\btablet\b/],
  ['phone', 'phones', /\b(?:smartphone|phone)\b/],
  ['camera', 'cameras', /\b(?:compact digital camera|kompaktkamera|action camera|camera)\b/],
  ['ssd', 'storage', /\bssd\b/],
  ['memory_card', 'storage', /\bmicrosd card\b/],
  ['scale', 'home_kitchen', /\bsmart scale\b/],
  ['lamp', 'home_kitchen', /\bdesk lamp\b/],
];

export function identify(row: SourceRow, facts: Fact[]): Identity {
  let title = titleKey(row.raw_title).replace(/\bsony corp\.?\b/g, 'sony').replace(/\bwh-(\d+[a-z]*)\b/g, 'wh$1');
  const kind = types.find(([, , pattern]) => pattern.test(title));
  const variants: Record<string, string[]> = {};
  for (const attribute of ['color', 'ram', 'storage', 'capacity_unspecified', 'switch', 'keyboard_layout']) {
    const values = [...new Set(facts.filter(f => f.attribute === attribute).map(f => `${f.value}${f.unit ?? ''}`))].sort();
    if (values.length) variants[attribute] = values;
  }
  for (const attribute of ['power', 'ports']) {
    const values = [...new Set(facts.filter(f => f.attribute === attribute && f.evidence.field === 'raw_title').map(f => `${f.value}${f.unit ?? ''}`))].sort();
    if (values.length) variants[`title_${attribute}`] = values;
  }
  if (/\bpair\b/.test(title)) variants.bundle = ['pair'];
  const conflicts = Object.entries(variants).filter(([, values]) => values.length > 1).map(([key]) => `conflicting_${key}`);
  // Strip only recognized literal descriptors; preserve unknown model words and generations.
  if (kind) title = title.replace(kind[2], ' ');
  title = title.replace(/\b(?:open box|new in box|portable drive|portable|wireless|over-ear|waterproof|anc|true wireless|replacement|pair)\b/g, ' ')
    .replace(/\b(?:black|schwarz|white|silver|(?:blue|red|brown)(?: switch)?|tenkeyless|tkl)\b/g, ' ')
    .replace(/\b\d+\s*(?:gb|tb|w|port)\b/g, ' ')
    .replace(/\b\d+-port\b/g, ' ').replace(/\bgan\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  return { model: title, type: kind?.[0] ?? null, brand: /^sony\b/.test(title) ? 'Sony' : null,
    variants, conflicts, evidence: [sourceEvidence(row, 'raw_title'), ...facts.filter(f => ['ram', 'storage', 'switch', 'color', 'keyboard_layout'].includes(f.attribute)).map(f => f.evidence)] };
}

export function category(identity: Identity, row: SourceRow): { category: Category; confidence: Confidence } {
  const type = types.find(([name]) => name === identity.type);
  if (!type) return { category: 'other', confidence: { level: 'low', reasons: ['unrecognized_product_type'] } };
  return { category: identity.type === 'mouse' && /\bgaming\b/i.test(row.raw_title) ? 'gaming_accessories' : type[1],
    confidence: { level: 'high', reasons: [`literal_type:${type[0]}`] } };
}

const candidateKey = (identity: Identity) => identity.model.replace(/\b(?:pro|lite|plus|x|\d+)\b/g, '').trim().replace(/\s+/g, ' ');
export function compareIdentity(a: Identity, b: Identity): Omit<CandidateDecision, 'rowIds'> {
  if (a.conflicts.length || b.conflicts.length) return { status: 'review', reasons: ['internal_identity_conflict'] };
  if (a.type && b.type && a.type !== b.type) return { status: 'reject', reasons: ['different_product_type'] };
  if (a.model !== b.model) return { status: 'reject', reasons: ['different_model_or_generation'] };
  let unknown = !a.type || !b.type || !a.model;
  for (const key of new Set([...Object.keys(a.variants), ...Object.keys(b.variants)])) {
    const av = a.variants[key]; const bv = b.variants[key];
    if (av && bv && JSON.stringify(av) !== JSON.stringify(bv)) return { status: 'reject', reasons: [`different_variant:${key}`] };
    if (!av || !bv) unknown = true;
  }
  return unknown ? { status: 'review', reasons: ['incomplete_type_or_variant'] } : { status: 'merge', reasons: ['same_model_type_and_variants'] };
}

export function productBaseline(source: SourceRow[]): ProductResult {
  const initial = baseline(source);
  const rows = initial.rows;
  const active = rows.filter(r => r.outcome === 'grouped');
  const extracted = new Map(active.map(r => [r.source.row_id, extract(r.source)]));
  const identities = new Map(active.map(r => [r.source.row_id, identify(r.source, extracted.get(r.source.row_id)!.facts)]));
  const facts = [...extracted.values()].flatMap(x => x.facts).sort((a, b) => a.id.localeCompare(b.id));
  const unparsed = [...extracted.values()].flatMap(x => x.unparsed);
  const candidates: CandidateDecision[] = [];
  const decisions = new Map<string, CandidateDecision>();
  const key = (a: string, b: string) => JSON.stringify([a, b].sort());
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const a = active[i]!; const b = active[j]!;
    const ai = identities.get(a.source.row_id)!; const bi = identities.get(b.source.row_id)!;
    if (!(candidateKey(ai) && candidateKey(ai) === candidateKey(bi)) && a.titleKey !== b.titleKey) continue;
    const decision: CandidateDecision = { rowIds: [a.source.row_id, b.source.row_id], ...compareIdentity(ai, bi) };
    candidates.push(decision); decisions.set(key(...decision.rowIds), decision);
  }
  const buckets: string[][] = active.map(r => [r.source.row_id]);
  for (const candidate of candidates.filter(c => c.status === 'merge')) {
    const a = buckets.find(g => g.includes(candidate.rowIds[0]))!;
    const b = buckets.find(g => g.includes(candidate.rowIds[1]))!;
    if (a === b) continue;
    if (a.every(x => b.every(y => decisions.get(key(x, y))?.status === 'merge'))) {
      a.push(...b); a.sort(); buckets.splice(buckets.indexOf(b), 1);
    } else {
      candidate.status = 'review'; candidate.reasons = ['group_compatibility_blocked'];
    }
  }
  const groups = buckets.map(rowIds => ({ id: `product_${hash(JSON.stringify(rowIds))}`, rowIds,
    titleKey: identities.get(rowIds[0]!)!.model, method: 'compatible_identity' as const })).sort((a, b) => a.id.localeCompare(b.id));
  for (const row of active) row.groupId = groups.find(g => g.rowIds.includes(row.source.row_id))!.id;
  const review: ReviewItem[] = [];
  const addReview = (rowIds: string[], reason: string, selectedFacts: Fact[] = [], evidence = selectedFacts.map(f => f.evidence)) => {
    const body = { rowIds: [...new Set(rowIds)].sort(), productIds: groups.filter(g => g.rowIds.some(id => rowIds.includes(id))).map(g => g.id),
      reason, evidence, factIds: selectedFacts.map(f => f.id).sort() };
    const item = { id: `review_${hash(JSON.stringify(body))}`, ...body };
    if (!review.some(r => r.id === item.id)) review.push(item);
  };
  for (const candidate of candidates.filter(c => c.status === 'review')) addReview(candidate.rowIds, `identity:${candidate.reasons.join(',')}`, [], candidate.rowIds.flatMap(id => identities.get(id)!.evidence));
  for (const row of rows) {
    for (const reason of row.reasons) if (row.outcome !== 'non_product' && (reason.startsWith('price_') || row.outcome === 'review')) addReview([row.source.row_id], reason);
    if (row.outcome !== 'grouped') continue;
    const identity = identities.get(row.source.row_id)!;
    if (identity.conflicts.length) addReview([row.source.row_id], 'internal_identity_conflict', [], identity.evidence);
    if (!row.source.raw_specs.trim()) addReview([row.source.row_id], 'missing_specs', [], [sourceEvidence(row.source, 'raw_title')]);
    const unknown = extracted.get(row.source.row_id)!.unparsed;
    if (unknown.length) addReview([row.source.row_id], 'unparsed_specs', [], unknown);
  }
  const offers = rows.map(row => {
    const offerFacts = facts.filter(f => f.evidence.rowId === row.source.row_id && f.scope === 'offer');
    const conditions = [...new Set(offerFacts.filter(f => f.attribute === 'condition').map(f => String(f.value)))];
    if (conditions.length > 1) addReview([row.source.row_id], 'conflicting_offer_condition', offerFacts);
    return { id: `offer_${row.source.row_id}`, rowId: row.source.row_id, productId: row.groupId, supplier: row.source.supplier,
      sku: row.source.supplier_sku, price: row.price, stock: row.source.stock,
      condition: conditions.length === 1 ? conditions[0]! : null, factIds: offerFacts.map(f => f.id) };
  });
  const products = groups.map(group => {
    const members = active.filter(r => group.rowIds.includes(r.source.row_id));
    const categories = members.map(r => category(identities.get(r.source.row_id)!, r.source));
    const categoryValues = new Set(categories.map(c => c.category));
    const categoryValue = categoryValues.size === 1 ? categories[0]!.category : 'other';
    const uncertainCategory = categoryValues.size > 1 || categories.some(c => c.confidence.level !== 'high');
    if (uncertainCategory) addReview(group.rowIds, 'uncertain_category', [], members.map(r => sourceEvidence(r.source, 'raw_title')));
    const groupFacts = facts.filter(f => group.rowIds.includes(f.evidence.rowId));
    const reconciled = reconcile(groupFacts);
    for (const fact of reconciled.filter(f => f.status !== 'agreed')) addReview(group.rowIds, `fact_${fact.status}:${fact.attribute}`, groupFacts.filter(f => fact.observations.includes(f.id)));
    const unresolvedIdentity = group.rowIds.some(id => !identities.get(id)!.type || !identities.get(id)!.model) || review.some(r => r.rowIds.some(id => group.rowIds.includes(id)) && /identity/.test(r.reason));
    return { id: group.id, rowIds: group.rowIds, identities: group.rowIds.map(id => identities.get(id)!), offerIds: group.rowIds.map(id => `offer_${id}`),
      category: categoryValue, categoryConfidence: { level: uncertainCategory ? 'low' as const : 'high' as const, reasons: categories.flatMap(c => c.confidence.reasons) },
      identityConfidence: { level: unresolvedIdentity ? 'medium' as const : 'high' as const, reasons: [unresolvedIdentity ? 'unresolved_candidate' : 'literal_model_and_compatible_group'] },
      facts: reconciled, reviewIds: [] as string[] };
  });
  review.sort((a, b) => a.id.localeCompare(b.id));
  for (const product of products) product.reviewIds = review.filter(r => r.productIds.includes(product.id)).map(r => r.id);
  const result: ProductResult = { rows, groups, products, offers, facts, unparsed, candidates, review };
  assertAccounting(source, result); assertProductIntegrity(result);
  return result;
}

export function assertProductIntegrity(result: ProductResult): void {
  const sources = new Map(result.rows.map(r => [r.source.row_id, r.source]));
  const facts = new Map(result.facts.map(f => [f.id, f]));
  if (facts.size !== result.facts.length) throw new Error('duplicate fact ID');
  for (const evidence of [...result.facts.map(f => f.evidence), ...result.unparsed, ...result.review.flatMap(r => r.evidence)]) {
    const source = sources.get(evidence.rowId)?.[evidence.field];
    if (!evidence.quote || source?.slice(evidence.start, evidence.end) !== evidence.quote) throw new Error('invalid fact evidence');
  }
  for (const product of result.products) {
    if (!TAXONOMY.includes(product.category)) throw new Error('invalid product category');
    for (const fact of product.facts) {
      if (!fact.observations.length || fact.observations.some(id => !facts.has(id) || !product.rowIds.includes(facts.get(id)!.evidence.rowId) || facts.get(id)!.scope !== 'product')) throw new Error('invalid reconciliation observation');
      if ((fact.status === 'agreed') !== (fact.acceptedFactId !== null) || (fact.acceptedFactId && !fact.observations.includes(fact.acceptedFactId))) throw new Error('invalid accepted fact');
    }
  }
}
