import { performance } from 'node:perf_hooks';
import { hash } from '../baseline.js';
import { evaluate } from '../evaluation.js';
import { productBaseline } from '../products.js';
import { evaluateQuality, validateQuality } from '../quality.js';
import { evaluateSemantic, validateSemantic } from '../semantic-quality.js';
import { aiBaseline, selectedTaskRows } from '../ai/pipeline.js';
import { readAiConfig, type AiConfig } from '../ai/config.js';
import { ProviderRegistry } from '../ai/contracts.js';
import { AiRuntime } from '../ai/runtime.js';
import type { RunReport } from '../types.js';
import { RunStoreService } from '../storage/run-store.service.js';
import type { RunOptions } from './run-options.js';
import { auditFor, baseConfig, inputHashes, loadRunInput, persistFailure, persistRun, roleSummaries } from './run-common.js';

export class AiMatchingRunService {
  constructor(
    private readonly providers: ProviderRegistry,
    private readonly store: RunStoreService,
  ) {}

  async run(options: RunOptions, start = performance.now()): Promise<string> {
    if (options.baseline !== 'b2') throw new Error('AiMatchingRunService only supports B2');
    const directory = await this.store.reserve(options.out, options.runId);
    let runtime: AiRuntime<AiConfig> | undefined;
    try {
      const input = await loadRunInput(this.store, options);
      if (!options.aiMode || !options.aiCache) throw new Error('B2 requires explicit --ai-mode live|replay and --ai-cache DIR');
      if (options.claimChecks || options.generatedChecks || options.stage4Gate || options.publicationSource) throw new Error('publication checks require --baseline b3');
      if (options.split === 'holdout' && options.aiMode === 'live') throw new Error('holdout evaluation must use code-only or replay; live model calls are not allowed');

      const ai = await readAiConfig(options.aiConfig ?? 'config/ai.json');
      const config: RunReport['config'] = {
        ...baseConfig,
        split: options.split ?? 'development',
        baseline: 'b2',
        ai,
        aiTask: options.aiTask ?? 'extraction',
        aiCohort: options.aiCohort ?? 'full_input',
        ...(options.aiRows ? { aiRows: options.aiRows } : {}),
        ...(options.aiPairs ? { aiPairs: options.aiPairs } : {}),
      };
      let eligible = options.aiCohort === 'development'
        ? new Set(input.labels.cases.filter(testCase => testCase.split === 'development').flatMap(testCase => testCase.rowIds))
        : undefined;
      const checksText = await this.store.readText(options.checks ?? 'eval/stage2-checks.json');
      const suite = validateQuality(JSON.parse(checksText), input.labels, hash(input.feedText));
      const semanticText = await this.store.readText(options.semanticChecks ?? 'eval/stage3-checks.json');
      const semanticSuite = validateSemantic(JSON.parse(semanticText), input.labels, hash(input.feedText));
      if (options.aiRows) {
        if (new Set(options.aiRows).size !== options.aiRows.length || options.aiRows.some(id => !semanticSuite.cases.some(testCase => testCase.rowId === id))) {
          throw new Error('explicit AI rows must belong to the frozen semantic cohort');
        }
        eligible = new Set(options.aiRows);
      }
      if (options.aiPairs && options.aiPairs.some(pair => pair.length !== 2 || pair.some(id => !eligible?.has(id)))) {
        throw new Error('matching pairs must belong to explicit cohort');
      }

      runtime = new AiRuntime(this.providers, ai, options.aiMode, options.aiCache);
      const pipelineStart = performance.now();
      const b1 = productBaseline(input.rows);
      const result = await aiBaseline(input.rows, runtime, options.aiTask ?? 'extraction', eligible, options.aiPairs);
      const pipelineMs = performance.now() - pipelineStart;
      const executionFailed = runtime.records.some(record => record.status === 'error');
      const report: RunReport = {
        schemaVersion: '3',
        rulesVersion: 'B2-v1',
        runId: options.runId,
        createdAt: new Date().toISOString(),
        status: executionFailed ? 'partial' : 'success',
        mode: runtime.records.some(record => record.origin === 'test') ? 'test' : options.aiMode,
        code: input.code,
        config,
        hashes: { ...inputHashes(input, config), checks: hash(checksText), semanticChecks: hash(semanticText) },
        audit: auditFor(input, result),
        checks: evaluateQuality(result, suite),
        semanticChecks: evaluateSemantic(result, semanticSuite),
        ai: {
          targetRows: selectedTaskRows(b1, options.aiTask ?? 'extraction', eligible).length,
          jobs: runtime.records.length,
          failedJobs: runtime.records.filter(record => record.status === 'error').length,
          origin: runtime.records.some(record => record.origin === 'test') ? 'test' : 'real',
          requestHashes: runtime.records.map(record => record.key),
          roles: roleSummaries(runtime),
        },
        timing: { protocol: 'cli-through-result-v1', node: process.version, platform: process.platform, arch: process.arch, pipelineMs },
        evaluation: evaluate(result, input.labels, options.split ?? 'development'),
        generation: null,
        verifier: null,
        api: runtime.summary(),
        wallTimeMs: performance.now() - start,
        decisionsHash: hash(JSON.stringify(result)),
      };
      await persistRun(this.store, directory, result, report, input.labels, start, runtime, ai);
      if (report.status !== 'success') throw new Error('Incomplete AI run; inspect report.json and ai.json');
      return directory;
    } catch (error) {
      await persistFailure(this.store, directory, options, start, error, runtime);
      throw error;
    }
  }
}
