import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { provenanceSchema, validateProductResult } from './catalog-snapshot.js';
import { hash } from './baseline.js';
import { isPublicationResult } from './domain.js';
import { ClaimSuiteSchema, evaluateGenerated, migrateGeneratedReview, rebaseGeneratedReview } from './publication-evaluation.js';
import { VerificationSchema } from './publication.js';
import { validateLabels } from './evaluation.js';
import { validateMatchingAudit } from './matching-audit.js';

export async function prepareWeb(runDir: string, output = 'web/public/data', claimChecks = 'eval/stage4-claims.json', generatedChecks?: string, generatedSourceRun?: string, generatedReviewOutput?: string, matchingLabels = 'eval/labels.json', matchingAuditPath = 'eval/matching-audit.json'): Promise<string> {
  const result = validateProductResult(JSON.parse(await readFile(join(runDir, 'result.json'), 'utf8')));
  const report = JSON.parse(await readFile(join(runDir, 'report.json'), 'utf8'));
  const provenance = provenanceSchema.parse({ runId: report.runId, createdAt: report.createdAt, rulesVersion: report.rulesVersion, mode: report.mode, status: report.status, qualityStatus: report.evaluation?.status, split: report.evaluation?.split, decisionsHash: report.decisionsHash });
  let review: unknown = undefined;
  let generatedForOutput: unknown = undefined;
  let decisionInput = result;
  if (report.schemaVersion === '4' || report.rulesVersion === 'B3-v1') {
    if (report.schemaVersion !== '4' || report.rulesVersion !== 'B3-v1' || !['success', 'partial'].includes(report.status) || !isPublicationResult(result)) throw new Error('Invalid B3 review run');
    const { listings: _listings, ...base } = result;
    decisionInput = base;
    if (hash(JSON.stringify(result.listings)) !== report.publicationHash) throw new Error('B3 publication hash mismatch');
    const trace = JSON.parse(await readFile(join(runDir, 'ai.json'), 'utf8')) as { records?: unknown[] };
    if (!Array.isArray(trace.records) || trace.records.some(record => !record || typeof record !== 'object' || typeof (record as { key?: unknown }).key !== 'string')) throw new Error('Invalid B3 AI trace');
    const recordKeys = new Set(trace.records.map(record => (record as { key: string }).key));
    if (recordKeys.size !== trace.records.length || (report.ai && JSON.stringify(report.ai.requestHashes) !== JSON.stringify(trace.records.map(record => (record as { key: string }).key)))) throw new Error('B3 AI trace does not match its report');
    for (const listing of result.listings) {
      for (const attempt of listing.attempts) {
        if (!recordKeys.has(attempt.generationRecordKey) || (attempt.verifierRecordKey && !recordKeys.has(attempt.verifierRecordKey))) throw new Error('B3 listing references missing AI records');
      }
      for (const key of listing.failure?.recordKeys ?? []) if (!recordKeys.has(key)) throw new Error('B3 failure references a missing AI record');
    }
    if (report.status === 'partial') {
      // A partial run remains a complete, safe catalog; human-review bundles may be incomplete.
      review = undefined;
    } else {
    const generatedInput = JSON.parse(await readFile(generatedChecks ?? join(runDir, 'generated-review.json'), 'utf8'));
    const migrated = migrateGeneratedReview(generatedInput);
    let sourceResult: import('./domain.js').PublicationResult | undefined;
    if (generatedSourceRun) {
      const candidate = validateProductResult(JSON.parse(await readFile(join(generatedSourceRun, 'result.json'), 'utf8')));
      const sourceReport = JSON.parse(await readFile(join(generatedSourceRun, 'report.json'), 'utf8'));
      if (!isPublicationResult(candidate) || sourceReport.publicationHash !== migrated.publicationHash || hash(JSON.stringify(candidate.listings)) !== migrated.publicationHash) throw new Error('Generated review source run does not match its publication');
      sourceResult = candidate;
    }
    const generated = generatedChecks && migrated.publicationHash !== report.publicationHash
      ? rebaseGeneratedReview(migrated, result, report.publicationHash, sourceResult)
      : migrated;
    if (generated.publicationHash !== report.publicationHash) throw new Error('Generated review does not match B3 publication');
    evaluateGenerated(generated, result, report.publicationHash);
    generatedForOutput = generated;
    const claimText = await readFile(claimChecks, 'utf8');
    if (hash(claimText) !== report.hashes?.claimChecks) throw new Error('Controlled claim suite does not match B3 report');
    const suite = ClaimSuiteSchema.parse(JSON.parse(claimText));
    const records = (trace.records ?? []) as { role?: string; status?: string; response?: { data?: unknown } }[];
    const controlled = records.filter(record => record.role === 'controlled_verification');
    if (controlled.length !== suite.cases.length || controlled.some(record => record.status !== 'success')) throw new Error('Controlled verifier records are incomplete');
    review = { generated, controlled: suite.cases.map((item, index) => ({ item, result: VerificationSchema.parse(controlled[index]!.response?.data) })) };
    }
  } else if (report.generation !== null || report.verifier !== null) {
    throw new Error('This viewer supports B3 review bundles or pre-generation results only');
  }
  const digest = createHash('sha256').update(JSON.stringify(decisionInput)).digest('hex');
  if (digest !== provenance.decisionsHash || report.audit?.inputRows !== result.rows.length) throw new Error('Result does not match its run report');
  const labelsText = await readFile(matchingLabels, 'utf8');
  if (hash(labelsText) !== report.hashes?.labels) throw new Error('Matching labels do not match the run report');
  const labels = validateLabels(JSON.parse(labelsText), result.rows.map(row => row.source));
  const matchingLabelsHash = hash(labelsText);
  const matchingAudit = validateMatchingAudit(
    JSON.parse(await readFile(matchingAuditPath, 'utf8')),
    result.rows.map(row => row.source),
    matchingLabelsHash,
  );
  await mkdir(output, { recursive: true });
  const destination = join(output, 'catalog.json');
  const temporary = `${destination}.${process.pid}.tmp`;
  const retryCommand = report.status === 'partial' && report.ai?.origin === 'real' && ((report.ai.failedJobs ?? 0) > 0 || (report.degradation?.retryableWithheldProducts ?? 0) > 0) ? `npm run retry -- --from-run ${report.runId} --prepare-web` : null;
  await writeFile(temporary, JSON.stringify({ provenance, result, labels, matchingLabelsHash, matchingAudit, degradation: report.degradation ?? null, retryCommand, ...(review ? { review } : {}) }));
  await rename(temporary, destination);
  if (generatedReviewOutput) {
    if (!generatedForOutput) throw new Error('Generated review output requires a B3 review bundle');
    await mkdir(dirname(generatedReviewOutput), { recursive: true });
    await writeFile(generatedReviewOutput, JSON.stringify(generatedForOutput, null, 2) + '\n', { flag: 'wx' });
  }
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { 'run-dir': { type: 'string' }, 'claim-checks': { type: 'string' }, 'generated-checks': { type: 'string' }, 'generated-source-run': { type: 'string' }, 'generated-review-out': { type: 'string' }, 'matching-labels': { type: 'string' }, 'matching-audit': { type: 'string' } } });
    if (!values['run-dir']) throw new Error('Usage: npm run web:prepare -- --run-dir <saved run directory>');
    console.log(await prepareWeb(values['run-dir'], 'web/public/data', values['claim-checks'], values['generated-checks'], values['generated-source-run'], values['generated-review-out'], values['matching-labels'], values['matching-audit']));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
