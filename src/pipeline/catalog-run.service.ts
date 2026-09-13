import { performance } from 'node:perf_hooks';
import { baseline, hash } from '../baseline.js';
import { evaluate } from '../evaluation.js';
import { productBaseline } from '../products.js';
import { isProductResult } from '../domain.js';
import { evaluateQuality, validateQuality } from '../quality.js';
import { evaluateSemantic, validateSemantic } from '../semantic-quality.js';
import type { RunReport } from '../types.js';
import { RunStoreService } from '../storage/run-store.service.js';
import type { RunOptions } from './run-options.js';
import { auditFor, baseConfig, inputHashes, loadRunInput, persistFailure, persistRun } from './run-common.js';

export class CatalogRunService {
  constructor(private readonly store: RunStoreService) {}

  async run(options: RunOptions, start = performance.now()): Promise<string> {
    const selected = options.baseline ?? 'b1';
    if (selected !== 'b0' && selected !== 'b1') throw new Error('CatalogRunService only supports B0 and B1');
    const directory = await this.store.reserve(options.out, options.runId);
    try {
      const input = await loadRunInput(this.store, options);
      if (options.aiConfig || options.aiMode || options.aiCache || options.aiTask || options.aiCohort || options.claimChecks || options.generatedChecks || options.stage4Gate || options.publicationSource) {
        throw new Error('AI options require --baseline b2 or b3');
      }
      const config: RunReport['config'] = { ...baseConfig, split: options.split ?? 'development', baseline: selected };
      const checksText = selected !== 'b0' ? await this.store.readText(options.checks ?? 'eval/stage2-checks.json') : null;
      const suite = checksText ? validateQuality(JSON.parse(checksText), input.labels, hash(input.feedText)) : null;
      const semanticText = options.semanticChecks ? await this.store.readText(options.semanticChecks) : null;
      const semanticSuite = semanticText ? validateSemantic(JSON.parse(semanticText), input.labels, hash(input.feedText)) : null;
      if (options.aiRows) {
        if (!semanticSuite || new Set(options.aiRows).size !== options.aiRows.length || options.aiRows.some(id => !semanticSuite.cases.some(testCase => testCase.rowId === id))) {
          throw new Error('explicit AI rows must belong to the frozen semantic cohort');
        }
      }
      if (options.aiPairs?.length) throw new Error('matching pairs must belong to explicit cohort');

      const pipelineStart = performance.now();
      const result = selected === 'b1' ? productBaseline(input.rows) : baseline(input.rows);
      const pipelineMs = performance.now() - pipelineStart;
      const report: RunReport = {
        schemaVersion: semanticSuite ? '3' : '2',
        rulesVersion: selected === 'b1' ? 'B1-v2' : 'B0-v1',
        runId: options.runId,
        createdAt: new Date().toISOString(),
        status: 'success',
        mode: 'code-only',
        code: input.code,
        config,
        hashes: {
          ...inputHashes(input, config),
          ...(checksText ? { checks: hash(checksText) } : {}),
          ...(semanticText ? { semanticChecks: hash(semanticText) } : {}),
        },
        audit: auditFor(input, result),
        ...(suite && isProductResult(result) ? { checks: evaluateQuality(result, suite) } : {}),
        ...(semanticSuite && isProductResult(result) ? { semanticChecks: evaluateSemantic(result, semanticSuite) } : {}),
        timing: { protocol: 'cli-through-result-v1', node: process.version, platform: process.platform, arch: process.arch, pipelineMs },
        evaluation: evaluate(result, input.labels, options.split ?? 'development'),
        generation: null,
        verifier: null,
        api: { calls: 0, errors: 0, tokens: 0, cost: 0 },
        wallTimeMs: performance.now() - start,
        decisionsHash: hash(JSON.stringify(result)),
      };
      await persistRun(this.store, directory, result, report, input.labels, input.rows, start);
      return directory;
    } catch (error) {
      await persistFailure(this.store, directory, options, start, error);
      throw error;
    }
  }
}
