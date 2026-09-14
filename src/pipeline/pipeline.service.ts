import { performance } from 'node:perf_hooks';
import { AiMatchingRunService } from './ai-matching-run.service.js';
import { CatalogRunService } from './catalog-run.service.js';
import { ComparisonService } from './comparison.service.js';
import { PublicationRunService } from './publication-run.service.js';
import type { RunOptions } from './run-options.js';

export class PipelineService {
  constructor(
    private readonly catalog: CatalogRunService,
    private readonly aiMatching: AiMatchingRunService,
    private readonly publication: PublicationRunService,
    private readonly comparison: ComparisonService,
  ) {}

  run(options: RunOptions, start = performance.now()): Promise<string> {
    const selected = options.baseline ?? 'b1';
    if (selected === 'b2') return this.aiMatching.run({ ...options, baseline: selected }, start);
    if (selected === 'b3') return this.publication.run({ ...options, baseline: selected }, start);
    return this.catalog.run({ ...options, baseline: selected }, start);
  }

  compare(beforeDir: string | null, afterDir: string, out: string, runId: string): Promise<string> {
    return this.comparison.compare(beforeDir, afterDir, out, runId);
  }
}
