import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash, baseline, validateInputs } from '../src/baseline.js';
import { productBaseline } from '../src/products.js';
import { readRun } from '../src/benchmark.js';
import { ProviderRegistry } from '../src/ai/contracts.js';
import { OpenAiAdapter } from '../src/ai/openai.js';
import { createPipelineService } from '../src/app.js';
import { PartialRunError } from '../src/pipeline/run-common.js';
import { prepareWeb } from '../src/prepare-web.js';

const B0_HASH = '25daa7d7325b01ee62f3ad7496708080fa31aa609eb6b1ebd2ec2559965ebee0';
const B1_HASH = '749beaa9a87ba02530fd3db35841780cf6f2816f28d6764906b2f7652d6e461e';
const B3_HASH = '7de47155e843f2f618f38aa384ee01c363017a949fe02a95558fe477151eaac6';

describe('architecture characterization', () => {
  test('B0 and B1 domain decisions remain frozen', async () => {
    const [feedText, taxonomyText] = await Promise.all([readFile('supplier_feed.json', 'utf8'), readFile('taxonomy.json', 'utf8')]);
    const rows = validateInputs(JSON.parse(feedText), JSON.parse(taxonomyText));
    assert.equal(hash(JSON.stringify(baseline(rows))), B0_HASH);
    assert.equal(hash(JSON.stringify(productBaseline(rows))), B1_HASH);
  });

  test('authoritative B0, B1 and B3 artifacts retain their hashes and remain readable', async () => {
    const [b0] = await readRun('reports/B0');
    const [b1] = await readRun('reports/B1-v2');
    const [b3] = await readRun('reports/B3-openai-full-input-atomic-v2-replay');
    assert.equal(b0.decisionsHash, B0_HASH);
    assert.equal(b1.decisionsHash, B1_HASH);
    assert.equal(b3.decisionsHash, B1_HASH);
    assert.equal(b3.publicationHash, B3_HASH);
  });

  test('full-input B3 replay reproduces the publication without network calls', async () => {
    const output = await mkdtemp(join(tmpdir(), 'shelf-b3-characterization-'));
    let networkCalls = 0;
    const networkForbidden: typeof fetch = async () => { networkCalls++; throw new Error('network forbidden during characterization'); };
    const providers = new ProviderRegistry(new Map([['openai', () => new OpenAiAdapter(networkForbidden, 'fixture-not-used')]]));
    try {
      let directory = '';
      await assert.rejects(createPipelineService(providers).run({
        baseline: 'b3',
        feed: 'supplier_feed.json',
        taxonomy: 'taxonomy.json',
        labels: 'eval/labels.json',
        out: output,
        runId: 'replay',
        aiMode: 'replay',
        aiCache: 'reports/B3-openai-full-input-atomic-v2-cache',
        aiConfig: 'config/stage4.openai.json',
        aiCohort: 'full_input',
        claimChecks: 'eval/stage4-claims.json',
        stage4Gate: 'reports/B3-openai-development-verifier-only-v2-human-gate-replay',
      }), (error: unknown) => { assert.ok(error instanceof PartialRunError); directory = error.directory; return true; });
      const [report] = await readRun(directory);
      assert.equal(networkCalls, 0);
      assert.equal(report.mode, 'replay');
      assert.equal(report.api.calls, 0);
      assert.equal(report.api.cacheHits, 319);
      assert.equal(report.decisionsHash, B1_HASH);
      assert.equal(report.status, 'partial');
      assert.equal(report.generation?.withheld, 1);
      const prepared = await prepareWeb(directory, join(output, 'web'));
      const payload = JSON.parse(await readFile(prepared, 'utf8'));
      assert.equal(payload.provenance.status, 'partial');
      assert.equal(payload.review, undefined);
      assert.match(payload.retryCommand, /npm run retry/);
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
});
