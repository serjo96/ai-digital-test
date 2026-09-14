import type { ProviderRegistry } from '../ai/contracts.js';
import { RunStoreService } from '../storage/run-store.service.js';
import { AiMatchingRunService } from './ai-matching-run.service.js';
import { CatalogRunService } from './catalog-run.service.js';
import { ComparisonService } from './comparison.service.js';
import { PipelineService } from './pipeline.service.js';
import { PublicationRunService } from './publication-run.service.js';

/** Composition helper for fixture and experimental callers outside Nest. */
export function createPipelineService(providers: ProviderRegistry): PipelineService {
  const store = new RunStoreService();
  return new PipelineService(
    new CatalogRunService(store),
    new AiMatchingRunService(providers, store),
    new PublicationRunService(providers, store),
    new ComparisonService(store),
  );
}
