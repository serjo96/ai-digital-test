import { category, identify, productBaseline, type ProductEnrichment } from '../products.js';
import { extract } from '../facts.js';
import { sourceEvidence, type Evidence, type Fact, type ProductResult } from '../domain.js';
import { TAXONOMY } from '../baseline.js';
import type { SourceRow } from '../types.js';
import { AiRuntime } from './runtime.js';
import { additionFact, evidenceFor, ExtractionSchema, MatchingSchema, extractionPrompt, matchingPrompt, jsonSchema } from './schemas.js';
import type { AiRequest } from './contracts.js';
import type { AiConfig, RoleConfig } from './config.js';

export function selectAiRows(b1: ProductResult): string[] {
  const active = new Set(b1.rows.filter(r => r.outcome === 'grouped').map(r => r.source.row_id));
  return [...new Set([...b1.unparsed.map(e => e.rowId), ...b1.review.filter(r => r.reason === 'uncertain_category' || r.reason.startsWith('identity:')).flatMap(r => r.rowIds)])]
    .filter(id => active.has(id)).sort();
}
const requestFor = (role: RoleConfig, schemaName: string, schema: AiRequest['schema'], instructions: string, input: unknown): AiRequest => ({
  model: role.model, ... (role.identity ? { identity: role.identity } : {}), parameters: Object.fromEntries(Object.entries(role).filter(([key, value]) => !['provider', 'model', 'identity', 'enabled'].includes(key) && value !== undefined)) as AiRequest['parameters'], schemaName, schema, instructions, input,
});
const raw = (row: SourceRow) => ({ rowId: row.row_id, raw_title: row.raw_title, raw_specs: row.raw_specs });
const policy = 'Only supplied taxonomy. Ear tips/tablet cases/laptop sleeves and ordinary non-gaming mice: other; USB-C hubs: chargers_cables. Never classify an accessory as its compatible device.';

export function extractionRequest(row: SourceRow, config: RoleConfig): AiRequest {
  const original = extract(row); const identity = identify(row, original.facts);
  return requestFor(config, 'semantic_extraction_v1', jsonSchema(ExtractionSchema), extractionPrompt,
    { row: raw(row), existingFacts: original.facts, identity, unresolved: original.unparsed, taxonomy: TAXONOMY, categoryPolicy: policy });
}

export function matchingRequest(members: SourceRow[], config: RoleConfig, pair: unknown): AiRequest {
  return requestFor(config, 'ambiguous_matching_v3', jsonSchema(MatchingSchema), matchingPrompt, { rows: members.map(raw), codeDecision: pair });
}

function remaining(unparsed: Evidence[], facts: Fact[]): Evidence[] {
  return unparsed.filter(e => [...e.quote].some((char, i) => /[\p{L}\p{N}]/u.test(char) && !facts.some(f =>
    f.evidence.field === e.field && f.evidence.start <= e.start + i && f.evidence.end > e.start + i)));
}

export function selectedTaskRows(b1: ProductResult, task: 'extraction' | 'matching', eligible?: Set<string>): string[] {
  const targets = task === 'extraction' ? selectAiRows(b1) : [...new Set(b1.candidates.filter(c => c.status === 'review' && c.rowIds.every(id => !eligible || eligible.has(id))).flatMap(c => c.rowIds))].sort();
  return targets.filter(id => !eligible || eligible.has(id));
}

export async function aiBaseline(source: SourceRow[], runtime: AiRuntime<AiConfig>, task: 'extraction' | 'matching' = 'extraction', eligible?: Set<string>, fixedPairs?: [string, string][]): Promise<ProductResult> {
  const b1 = productBaseline(source);
  if (task === 'matching' && !runtime.config.matching.enabled) throw new Error('matching experiment is disabled in config');
  const targets = task === 'extraction' ? (eligible ? [...eligible].filter(id => selectAiRows(b1).includes(id)) : selectedTaskRows(b1, task)) : [];
  const enrichment: ProductEnrichment = { extractions: new Map(), identities: new Map(), categories: new Map(), reviews: [], pairHints: new Map() };
  let authFailed = false;
  for (const id of targets) {
    const row = source.find(r => r.row_id === id)!;
    const original = extract(row); const identity = identify(row, original.facts);
    if (authFailed) {
      enrichment.reviews.push({ rowIds: [id], reason: 'ai_error:skipped_after_auth', evidence: [sourceEvidence(row, 'raw_title')] });
      continue;
    }
    const config = runtime.config.extraction;
    const request = extractionRequest(row, config);
    const parsed = await runtime.execute(config.provider, 'extraction', [id], request, data => {
      const parsed = runtime.check('schema', () => ExtractionSchema.parse(data));
      runtime.check('citations', () => {
        if (parsed.rowId !== id) throw new Error('foreign row');
        for (const citation of [...parsed.facts.map(f => f.evidence), ...(parsed.type ? [parsed.type.evidence] : []), ...(parsed.category ? [parsed.category.evidence] : [])]) evidenceFor(citation, row);
      });
      return runtime.check('semantic', () => {
      if (parsed.rowId !== id) throw new Error('foreign row');
      const facts = parsed.facts.map(f => additionFact(f, row));
      if (new Set(facts.map(f => f.id)).size !== facts.length) throw new Error('duplicate addition');
      const typeEvidence = parsed.type ? evidenceFor(parsed.type.evidence, row) : null;
      const categoryEvidence = parsed.category ? evidenceFor(parsed.category.evidence, row) : null;
      return { parsed, facts, typeEvidence, categoryEvidence };
      });
    });
    if (!parsed) {
      authFailed = runtime.records.at(-1)?.error === 'auth';
      enrichment.reviews.push({ rowIds: [id], reason: `ai_error:${runtime.records.at(-1)?.error ?? 'invalid_response'}`, evidence: [sourceEvidence(row, 'raw_title')] });
      continue;
    }
    enrichment.extractions.set(id, { facts: [...original.facts, ...parsed.facts].sort((a, b) => a.id.localeCompare(b.id)), unparsed: remaining(original.unparsed, parsed.facts) });
    // The model locates explicit type evidence. No invented noun or external model lookup can fill an unknown type.
    const literalType = (evidence: Evidence | null) => {
      if (!evidence || /\b(?:compatible with|for use with|without|not|no)\b/i.test(row[evidence.field])) return null;
      return identify({ ...row, raw_title: evidence.quote }, []).type;
    };
    if (parsed.parsed.type) {
      const proposed = parsed.parsed.type.value;
      if (!identity.type && literalType(parsed.typeEvidence) === proposed) {
        enrichment.identities.set(id, { ...identity, type: proposed, evidence: [...identity.evidence, parsed.typeEvidence!] });
      } else if (identity.type !== proposed) enrichment.reviews.push({ rowIds: [id], reason: 'identity:ai_type_withheld', evidence: [parsed.typeEvidence!] });
    }
    if (parsed.parsed.category) {
      const current = category(identity, row);
      const groundedType = literalType(parsed.categoryEvidence);
      const grounded = groundedType ? category({ ...identity, type: groundedType }, row) : null;
      if (current.confidence.level !== 'high' && grounded?.category === parsed.parsed.category.value) {
        enrichment.categories.set(id, { category: grounded.category, confidence: { level: 'medium', reasons: ['ai_category_with_literal_type_evidence'] } });
        enrichment.reviews.push({ rowIds: [id], reason: 'ai_category_evidence', evidence: [parsed.categoryEvidence!] });
      } else if (current.category !== parsed.parsed.category.value) enrichment.reviews.push({ rowIds: [id], reason: 'ai_category_withheld', evidence: [parsed.categoryEvidence!] });
    }
  }
  if (task === 'matching' && !authFailed) {
    for (const pair of fixedPairs ? fixedPairs.map(rowIds => ({ rowIds, status: 'shadow' })) : b1.candidates.filter(c => c.status === 'review' && c.rowIds.every(id => !eligible || eligible.has(id)))) {
      const members = pair.rowIds.map(id => source.find(r => r.row_id === id)!);
      const config = runtime.config.matching;
      const request = matchingRequest(members, config, pair);
      const decision = await runtime.execute(config.provider, 'matching', pair.rowIds, request, data => {
        const parsed = runtime.check('schema', () => MatchingSchema.parse(data));
        return runtime.check('citations', () => {
        if (JSON.stringify([...parsed.rowIds].sort()) !== JSON.stringify([...pair.rowIds].sort())) throw new Error('foreign pair');
        const evidence = parsed.evidence.map(c => {
          const row = members.find(r => r.row_id === c.rowId);
          if (!row) throw new Error('foreign matching source');
          return evidenceFor(c, row);
        });
        if (parsed.decision !== 'unknown' && members.some(row => !evidence.some(e => e.rowId === row.row_id))) throw new Error('missing pair evidence');
        runtime.check('semantic', () => true);
        return { ...parsed, evidence };
        });
      });
      // Recommendations live exclusively in the AI trace; never mutate deterministic output.
      void decision;
      if (runtime.records.at(-1)?.error === 'auth') break;
    }
  }
  return task === 'matching' ? b1 : productBaseline(source, enrichment);
}
