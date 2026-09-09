import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { exportBenchmark } from './benchmark.js';
import { AppModule, PipelineService } from './app.js';

async function main(): Promise<void> {
  const start = performance.now();
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      baseline: { type: 'string' }, checks: { type: 'string' }, runs: { type: 'string' }, feed: { type: 'string' }, taxonomy: { type: 'string' }, labels: { type: 'string' },
      out: { type: 'string' }, 'run-id': { type: 'string' }, before: { type: 'string' }, after: { type: 'string' },
    },
  });
  const [command] = positionals;
  if (positionals.length !== 1 || !['pipeline', 'eval', 'compare', 'benchmark'].includes(command ?? '')) throw new Error('Usage: benchmark --runs DIR,DIR [--out DIR --run-id ID] | pipeline|eval [--baseline b0|b1 --checks PATH --feed PATH --taxonomy PATH --labels PATH --out DIR --run-id ID] | compare --before DIR|none --after DIR [--out DIR --run-id ID]');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const service = app.get(PipelineService);
    const out = values.out ?? process.env.REPORTS_DIR ?? 'reports/local';
    const id = values['run-id'] ?? `${command}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (command === 'benchmark') {
      if (!values.runs || values.before || values.after || values.baseline) throw new Error('benchmark requires --runs DIR,DIR');
      console.log(await exportBenchmark(values.runs.split(','), values.labels ?? process.env.LABELS_PATH ?? 'eval/labels.json', out, id));
    } else if (command === 'compare') {
      if (!values.before || !values.after) throw new Error('compare requires --before DIR|none and --after DIR');
      console.log(await service.compare(values.before === 'none' ? null : values.before, values.after, out, id));
    } else {
      if (values.baseline && !['b0', 'b1'].includes(values.baseline)) throw new Error('--baseline must be b0 or b1');
      if (values.runs) throw new Error('--runs is only valid for benchmark');
      if (values.before || values.after) throw new Error('--before/--after are only valid for compare');
      console.log(await service.run({
        baseline: (values.baseline ?? 'b1') as 'b0' | 'b1', ...(values.checks ? { checks: values.checks } : {}),
        feed: values.feed ?? process.env.FEED_PATH ?? 'supplier_feed.json',
        taxonomy: values.taxonomy ?? process.env.TAXONOMY_PATH ?? 'taxonomy.json',
        labels: values.labels ?? process.env.LABELS_PATH ?? 'eval/labels.json', out, runId: id,
      }, start));
    }
  } finally { await app.close(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
