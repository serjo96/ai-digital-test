import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { join } from 'node:path';
import { exportBenchmark } from './benchmark.js';
import { AppModule } from './app.module.js';
import { PipelineService } from './pipeline/pipeline.service.js';
import { APP_CONFIG } from './config/main.config.js';
import type { AppConfig } from './config/types.js';
import { PartialRunError } from './pipeline/run-common.js';
import { prepareWeb } from './prepare-web.js';

async function main(): Promise<void> {
  const start = performance.now();
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      baseline: { type: 'string' }, split: { type: 'string' }, checks: { type: 'string' }, runs: { type: 'string' }, feed: { type: 'string' }, taxonomy: { type: 'string' }, labels: { type: 'string' },
      out: { type: 'string' }, 'run-id': { type: 'string' }, before: { type: 'string' }, after: { type: 'string' },
      'ai-config': { type: 'string' }, 'ai-mode': { type: 'string' }, 'ai-cache': { type: 'string' }, 'semantic-checks': { type: 'string' },
      'ai-task': { type: 'string' }, 'ai-cohort': { type: 'string' },
      'claim-checks': { type: 'string' }, 'generated-checks': { type: 'string' },
      'stage4-gate': { type: 'string' },
      'publication-source': { type: 'string' },
      'from-run': { type: 'string' },
      'prepare-web': { type: 'boolean' },
    },
  });
  const [command] = positionals;
  if ((command === 'compare' || command === 'benchmark') && (values.split || values['ai-config'] || values['ai-mode'] || values['ai-cache'] || values['semantic-checks'] || values['ai-task'] || values['ai-cohort'] || values['claim-checks'] || values['generated-checks'] || values['stage4-gate'] || values['publication-source'])) throw new Error('AI and evaluation options require pipeline or eval');
  if (positionals.length !== 1 || !['pipeline', 'eval', 'compare', 'benchmark', 'retry'].includes(command ?? '')) throw new Error('Usage: retry --from-run RUN_ID_OR_DIR [--prepare-web] | benchmark --runs DIR,DIR [--out DIR --run-id ID] | pipeline|eval [--baseline b0|b1|b2|b3 --split development|holdout --ai-mode live|replay --ai-cache DIR --ai-config PATH --semantic-checks PATH --claim-checks PATH --generated-checks PATH --publication-source RUN_DIR --checks PATH --feed PATH --taxonomy PATH --labels PATH --out DIR --run-id ID] | compare --before DIR|none --after DIR [--out DIR --run-id ID]');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const service = app.get(PipelineService);
    const config = app.get<AppConfig>(APP_CONFIG);
    const out = values.out ?? config.paths.reportsDir;
    const id = values['run-id'] ?? `${command}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (command === 'benchmark') {
      if (!values.runs || values.before || values.after || values.baseline) throw new Error('benchmark requires --runs DIR,DIR');
      console.log(await exportBenchmark(values.runs.split(','), values.labels ?? config.paths.labels, out, id));
    } else if (command === 'compare') {
      if (!values.before || !values.after) throw new Error('compare requires --before DIR|none and --after DIR');
      console.log(await service.compare(values.before === 'none' ? null : values.before, values.after, out, id));
    } else {
      if (command === 'retry' && !values['from-run']) throw new Error('retry requires --from-run RUN_ID_OR_DIR');
      if (command !== 'retry' && (values['from-run'] || values['prepare-web'])) throw new Error('--from-run and --prepare-web are only valid for retry');
      if (values.baseline && !['b0', 'b1', 'b2', 'b3'].includes(values.baseline)) throw new Error('--baseline must be b0, b1, b2 or b3');
      if (values.split && !['development', 'holdout'].includes(values.split)) throw new Error('--split must be development or holdout');
      if (values['ai-mode'] && !['live', 'replay'].includes(values['ai-mode'])) throw new Error('--ai-mode must be live or replay');
      if (values['ai-task'] && !['extraction', 'matching'].includes(values['ai-task'])) throw new Error('--ai-task must be extraction or matching');
      if (values['ai-cohort'] && !['development', 'full_input'].includes(values['ai-cohort'])) throw new Error('--ai-cohort must be development or full_input');
      if (values.runs) throw new Error('--runs is only valid for benchmark');
      if (values.before || values.after) throw new Error('--before/--after are only valid for compare');
      const runOptions = {
        baseline: (command === 'retry' ? 'b3' : values.baseline ?? 'b1') as 'b0' | 'b1' | 'b2' | 'b3', ...(values.checks ? { checks: values.checks } : {}),
        ...(values.split ? { split: values.split as 'development' | 'holdout' } : {}),
        ...(values['ai-config'] ? { aiConfig: values['ai-config'] } : {}),
        ...(command === 'retry' ? { aiMode: 'live' as const } : values['ai-mode'] ? { aiMode: values['ai-mode'] as 'live' | 'replay' } : {}),
        ...(values['ai-cache'] ? { aiCache: values['ai-cache'] } : command === 'retry' ? { aiCache: join(out, `${id}-cache`) } : {}),
        ...(values['semantic-checks'] ? { semanticChecks: values['semantic-checks'] } : {}),
        ...(values['ai-task'] ? { aiTask: values['ai-task'] as 'extraction' | 'matching' } : {}),
        ...(values['ai-cohort'] ? { aiCohort: values['ai-cohort'] as 'development' | 'full_input' } : {}),
        ...(values['claim-checks'] ? { claimChecks: values['claim-checks'] } : {}),
        ...(values['generated-checks'] ? { generatedChecks: values['generated-checks'] } : {}),
        ...(values['stage4-gate'] ? { stage4Gate: values['stage4-gate'] } : {}),
        ...(values['publication-source'] ? { publicationSource: values['publication-source'] } : {}),
        ...(values['from-run'] ? { retryFrom: values['from-run'] } : {}),
        feed: values.feed ?? config.paths.feed,
        taxonomy: values.taxonomy ?? config.paths.taxonomy,
        labels: values.labels ?? config.paths.labels, out, runId: id,
      };
      try {
        const directory = await service.run(runOptions, start);
        if (values['prepare-web']) await prepareWeb(directory);
        console.log(directory);
      } catch (error) {
        if (error instanceof PartialRunError && values['prepare-web']) await prepareWeb(error.directory);
        throw error;
      }
    }
  } finally { await app.close(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof PartialRunError ? 2 : 1;
});
