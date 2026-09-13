import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { AI_PROVIDERS, type ProviderRegistry } from '../ai/contracts.js';
import { RunStoreService } from '../storage/run-store.service.js';
import { AiMatchingRunService } from './ai-matching-run.service.js';
import { CatalogRunService } from './catalog-run.service.js';
import { ComparisonService } from './comparison.service.js';
import { PipelineService } from './pipeline.service.js';
import { PublicationRunService } from './publication-run.service.js';

@Module({
  imports: [AiModule],
  providers: [
    { provide: RunStoreService, useFactory: () => new RunStoreService() },
    { provide: CatalogRunService, inject: [RunStoreService], useFactory: (store: RunStoreService) => new CatalogRunService(store) },
    { provide: AiMatchingRunService, inject: [AI_PROVIDERS, RunStoreService], useFactory: (providers: ProviderRegistry, store: RunStoreService) => new AiMatchingRunService(providers, store) },
    { provide: PublicationRunService, inject: [AI_PROVIDERS, RunStoreService], useFactory: (providers: ProviderRegistry, store: RunStoreService) => new PublicationRunService(providers, store) },
    { provide: ComparisonService, inject: [RunStoreService], useFactory: (store: RunStoreService) => new ComparisonService(store) },
    {
      provide: PipelineService,
      inject: [CatalogRunService, AiMatchingRunService, PublicationRunService, ComparisonService],
      useFactory: (catalog: CatalogRunService, aiMatching: AiMatchingRunService, publication: PublicationRunService, comparison: ComparisonService) =>
        new PipelineService(catalog, aiMatching, publication, comparison),
    },
  ],
  exports: [PipelineService],
})
export class PipelineModule {}
