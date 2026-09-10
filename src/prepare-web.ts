import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { provenanceSchema, validateProductResult } from './catalog-snapshot.js';

export async function prepareWeb(runDir: string, output = 'web/public/data'): Promise<string> {
  const result = validateProductResult(JSON.parse(await readFile(join(runDir, 'result.json'), 'utf8')));
  const report = JSON.parse(await readFile(join(runDir, 'report.json'), 'utf8'));
  const provenance = provenanceSchema.parse({ runId: report.runId, createdAt: report.createdAt, rulesVersion: report.rulesVersion, mode: report.mode, status: report.status, qualityStatus: report.evaluation?.status, split: report.evaluation?.split, decisionsHash: report.decisionsHash });
  const digest = createHash('sha256').update(JSON.stringify(result)).digest('hex');
  if (digest !== provenance.decisionsHash || report.audit?.inputRows !== result.rows.length) throw new Error('Result does not match its run report');
  if (report.generation !== null || report.verifier !== null) throw new Error('This viewer supports pre-generation results only; integrate the listing contract before preparing B3');
  await mkdir(output, { recursive: true });
  const destination = join(output, 'catalog.json');
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ provenance, result }));
  await rename(temporary, destination);
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { 'run-dir': { type: 'string' } } });
    if (!values['run-dir']) throw new Error('Usage: npm run web:prepare -- --run-dir <saved run directory>');
    console.log(await prepareWeb(values['run-dir']));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
