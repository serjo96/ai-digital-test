import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { hash } from '../baseline.js';
import { evaluate } from '../evaluation.js';
import { productBaseline } from '../products.js';
import { evaluateQuality, validateQuality } from '../quality.js';
import { isPublicationResult, type PublicationResult, type VerifiedClaim } from '../domain.js';
import { publicationPipeline } from '../publication.js';
import { readStage4Config, type Stage4Config } from '../publication-config.js';
import { evaluateControlled, evaluateGenerated, generatedReviewGatePassed, validateClaimSuite } from '../publication-evaluation.js';
import { ProviderRegistry } from '../ai/contracts.js';
import { AiRuntime } from '../ai/runtime.js';
import type { RunReport } from '../types.js';
import { RunStoreService } from '../storage/run-store.service.js';
import type { RunOptions } from './run-options.js';
import { auditFor, baseConfig, hasUnrecoveredAiErrors, inputHashes, loadRunInput, persistFailure, persistRun, publicationSummary, roleSummaries } from './run-common.js';

export class PublicationRunService {
  constructor(
    private readonly providers: ProviderRegistry,
    private readonly store: RunStoreService,
  ) {}

  async run(options: RunOptions, start = performance.now()): Promise<string> {
    if (options.baseline !== 'b3') throw new Error('PublicationRunService only supports B3');
    const directory = await this.store.reserve(options.out, options.runId);
    let runtime: AiRuntime<Stage4Config> | undefined;
    try {
      const input = await loadRunInput(this.store, options);
      if (!options.aiMode || !options.aiCache) throw new Error('B3 requires explicit --ai-mode live|replay and --ai-cache DIR');
      if (options.aiTask || options.aiRows || options.aiPairs || options.semanticChecks) throw new Error('stage3 AI options are not valid for B3');
      if (options.publicationSource && (options.aiCohort ?? 'full_input') !== 'development') throw new Error('--publication-source requires B3 development');
      if (options.split === 'holdout' && options.aiMode === 'live') throw new Error('holdout evaluation must use code-only or replay; live model calls are not allowed');
      if (options.split === 'holdout' && (options.aiMode !== 'replay' || (options.aiCohort ?? 'full_input') !== 'full_input')) {
        throw new Error('B3 holdout evaluation requires full-input replay');
      }

      const ai = await readStage4Config(options.aiConfig ?? 'config/stage4.openai.json');
      const config: RunReport['config'] = {
        ...baseConfig,
        split: options.split ?? 'development',
        baseline: 'b3',
        ai,
        aiCohort: options.aiCohort ?? 'full_input',
        ...(options.publicationSource ? { publicationSourceRunId: '' } : {}),
      };
      const checksText = await this.store.readText(options.checks ?? 'eval/stage2-checks.json');
      const suite = validateQuality(JSON.parse(checksText), input.labels, hash(input.feedText));
      runtime = new AiRuntime(this.providers, ai, options.aiMode, options.aiCache);
      const pipelineStart = performance.now();
      const b1 = productBaseline(input.rows);
      const baseDecisionsHash = hash(JSON.stringify(b1));

      let publicationSource: PublicationResult | undefined;
      let publicationSourceHash: string | undefined;
      if (options.publicationSource) {
        const [sourceReport, sourceResult] = await this.store.readRun(options.publicationSource);
        if (!isPublicationResult(sourceResult) || sourceReport.schemaVersion !== '4' || sourceReport.rulesVersion !== 'B3-v1' || sourceReport.status !== 'success'
          || sourceReport.mode === 'test' || sourceReport.ai?.origin === 'test' || sourceReport.config.aiCohort !== 'development'
          || sourceReport.hashes.feed !== hash(input.feedText) || sourceReport.hashes.taxonomy !== hash(input.taxonomyText) || sourceReport.hashes.labels !== hash(input.labelsText)
          || JSON.stringify(sourceReport.config.ai) !== JSON.stringify(ai) || sourceReport.decisionsHash !== baseDecisionsHash
          || sourceReport.publicationHash !== hash(JSON.stringify(sourceResult.listings))) {
          throw new Error('publication source is not a compatible successful development run');
        }
        publicationSource = sourceResult;
        publicationSourceHash = sourceReport.publicationHash;
        config.publicationSourceRunId = sourceReport.runId;
      }

      const claimText = await this.store.readText(options.claimChecks ?? 'eval/stage4-claims.json');
      const claimSuite = validateClaimSuite(JSON.parse(claimText), input.labels, b1, hash(input.feedText), baseDecisionsHash);
      let gateText: string | null = null;
      if ((options.aiCohort ?? 'full_input') === 'full_input') {
        if (!options.stage4Gate) throw new Error('full-input B3 requires --stage4-gate with a human-verified development run');
        gateText = await this.store.readText(join(options.stage4Gate, 'report.json'));
        const [gate] = await this.store.readRun(options.stage4Gate);
        if (gate.schemaVersion !== '4' || gate.rulesVersion !== 'B3-v1' || gate.status !== 'success' || gate.mode === 'test' || gate.ai?.origin === 'test' || gate.config.aiCohort !== 'development'
          || gate.hashes.feed !== hash(input.feedText) || gate.hashes.taxonomy !== hash(input.taxonomyText) || gate.hashes.labels !== hash(input.labelsText) || gate.hashes.claimChecks !== hash(claimText)
          || JSON.stringify(gate.config.ai) !== JSON.stringify(ai) || gate.verifier?.controlled.status !== 'human_verified' || gate.verifier.controlled.unsupported.leaked > 0
          || gate.verifier.controlled.disputed.leaked > 0 || gate.verifier.controlled.supported.allowed === 0 || gate.verifier.generated.status !== 'human_verified'
          || !generatedReviewGatePassed(gate.verifier.generated)) throw new Error('stage4 development gate is incomplete or failed');
      }

      let controlledClaims = new Map<string, VerifiedClaim[]>();
      const publicationRun = await publicationPipeline(
        b1,
        runtime,
        ai,
        options.aiCohort === 'development' ? new Set(input.labels.cases.filter(testCase => testCase.split === 'development').flatMap(testCase => testCase.rowIds)) : undefined,
        claimSuite,
        publicationSource,
      );
      controlledClaims = publicationRun.controlledClaims;
      const result = publicationRun.result;
      const pipelineMs = performance.now() - pipelineStart;
      const publicationHash = hash(JSON.stringify(result.listings));
      const controlled = evaluateControlled(claimSuite, controlledClaims);
      const generatedText = options.generatedChecks ? await this.store.readText(options.generatedChecks) : null;
      const generated = evaluateGenerated(generatedText ? JSON.parse(generatedText) : null, result, publicationHash);
      const publication = publicationSummary(result);
      const gateFailed = controlled.status === 'human_verified' && (controlled.unsupported.leaked > 0 || controlled.disputed.leaked > 0 || controlled.supported.allowed === 0);
      const executionFailed = hasUnrecoveredAiErrors('b3', runtime.records, controlled.errors.length, publication.withheld);
      const report: RunReport = {
        schemaVersion: '4',
        rulesVersion: 'B3-v1',
        runId: options.runId,
        createdAt: new Date().toISOString(),
        status: executionFailed || gateFailed ? 'partial' : 'success',
        mode: runtime.records.some(record => record.origin === 'test') ? 'test' : options.aiMode,
        code: input.code,
        config,
        hashes: {
          ...inputHashes(input, config),
          checks: hash(checksText),
          claimChecks: hash(claimText),
          ...(generatedText ? { generatedChecks: hash(generatedText) } : {}),
          ...(gateText ? { stage4Gate: hash(gateText) } : {}),
          ...(publicationSourceHash ? { publicationSource: publicationSourceHash } : {}),
        },
        audit: auditFor(input, result),
        checks: evaluateQuality(result, suite),
        ai: {
          targetRows: publication.products,
          jobs: runtime.records.length,
          failedJobs: runtime.records.filter(record => record.status === 'error').length,
          origin: runtime.records.some(record => record.origin === 'test') ? 'test' : 'real',
          requestHashes: runtime.records.map(record => record.key),
          roles: roleSummaries(runtime),
        },
        timing: { protocol: 'cli-through-result-v1', node: process.version, platform: process.platform, arch: process.arch, pipelineMs },
        evaluation: evaluate(result, input.labels, options.split ?? 'development'),
        generation: publication,
        verifier: { controlled, generated },
        api: runtime.summary(),
        wallTimeMs: performance.now() - start,
        decisionsHash: baseDecisionsHash,
        publicationHash,
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
