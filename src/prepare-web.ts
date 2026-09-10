import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { provenanceSchema, validateProductResult } from './catalog-snapshot.js';
import { hash } from './baseline.js';
import { isPublicationResult } from './domain.js';
import { ClaimSuiteSchema, GeneratedReviewSchema } from './publication-evaluation.js';
import { VerificationSchema } from './publication.js';

export async function prepareWeb(runDir: string, output = 'web/public/data', claimChecks = 'eval/stage4-claims.json'): Promise<string> {
  const result = validateProductResult(JSON.parse(await readFile(join(runDir, 'result.json'), 'utf8')));
  const report = JSON.parse(await readFile(join(runDir, 'report.json'), 'utf8'));
  const provenance = provenanceSchema.parse({ runId: report.runId, createdAt: report.createdAt, rulesVersion: report.rulesVersion, mode: report.mode, status: report.status, qualityStatus: report.evaluation?.status, split: report.evaluation?.split, decisionsHash: report.decisionsHash });
  let review: unknown = undefined;
  let decisionInput = result;
  if (report.schemaVersion === '4' || report.rulesVersion === 'B3-v1') {
    if (report.schemaVersion !== '4' || report.rulesVersion !== 'B3-v1' || report.status !== 'success' || !isPublicationResult(result)) throw new Error('Invalid B3 review run');
    const { listings: _listings, ...base } = result;
    decisionInput = base;
    if (hash(JSON.stringify(result.listings)) !== report.publicationHash) throw new Error('B3 publication hash mismatch');
    const generated = GeneratedReviewSchema.parse(JSON.parse(await readFile(join(runDir, 'generated-review.json'), 'utf8')));
    if (generated.publicationHash !== report.publicationHash) throw new Error('Generated review does not match B3 publication');
    const claimText = await readFile(claimChecks, 'utf8');
    if (hash(claimText) !== report.hashes?.claimChecks) throw new Error('Controlled claim suite does not match B3 report');
    const suite = ClaimSuiteSchema.parse(JSON.parse(claimText));
    const trace = JSON.parse(await readFile(join(runDir, 'ai.json'), 'utf8')) as { records?: unknown[] };
    const records = (trace.records ?? []) as { role?: string; status?: string; response?: { data?: unknown } }[];
    const controlled = records.filter(record => record.role === 'controlled_verification');
    if (controlled.length !== suite.cases.length || controlled.some(record => record.status !== 'success')) throw new Error('Controlled verifier records are incomplete');
    review = { generated, controlled: suite.cases.map((item, index) => ({ item, result: VerificationSchema.parse(controlled[index]!.response?.data) })) };
  } else if (report.generation !== null || report.verifier !== null) {
    throw new Error('This viewer supports B3 review bundles or pre-generation results only');
  }
  const digest = createHash('sha256').update(JSON.stringify(decisionInput)).digest('hex');
  if (digest !== provenance.decisionsHash || report.audit?.inputRows !== result.rows.length) throw new Error('Result does not match its run report');
  await mkdir(output, { recursive: true });
  const destination = join(output, 'catalog.json');
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ provenance, result, ...(review ? { review } : {}) }));
  await rename(temporary, destination);
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { 'run-dir': { type: 'string' }, 'claim-checks': { type: 'string' } } });
    if (!values['run-dir']) throw new Error('Usage: npm run web:prepare -- --run-dir <saved run directory>');
    console.log(await prepareWeb(values['run-dir'], 'web/public/data', values['claim-checks']));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
