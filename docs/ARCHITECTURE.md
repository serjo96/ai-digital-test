# Architecture

The application is a NestJS standalone CLI, not an HTTP service. Its boundaries follow the four executable scenarios in the take-home while keeping the deterministic domain functions framework-independent.

```text
CLI
  -> PipelineService (dispatch only)
      -> CatalogRunService (B0/B1)
      -> AiMatchingRunService (B2)
      -> PublicationRunService (B3)
      -> ComparisonService
          -> domain functions
          -> RunStoreService
          -> AiRuntime / ProviderRegistry where required
```

## Modules and responsibilities

- `app.module.ts` is the composition root. It assembles configuration, AI providers, and the pipeline module.
- `ai/ai.module.ts` owns provider registration. OpenAI and Ollama adapters keep their existing contracts and behavior.
- `pipeline/pipeline.service.ts` selects a run service and exposes the unchanged `run`/`compare` API.
- `pipeline/catalog-run.service.ts` orchestrates deterministic B0/B1 loading, evaluation, and immutable artifacts.
- `pipeline/ai-matching-run.service.ts` owns B2 runtime configuration and advisory extraction/matching. B1 remains the safety base.
- `pipeline/publication-run.service.ts` owns B3 development/full-input/holdout gates, generation, verification, and the single repair path.
- `pipeline/comparison.service.ts` compares validated stored runs.
- `storage/run-store.service.ts` owns run-directory reservation and exclusive filesystem reads/writes.
- `pipeline/run-common.ts` contains shared orchestration mechanics: validated input loading, audit/report helpers, and success/failure persistence.
- Root files such as `baseline.ts`, `products.ts`, `facts.ts`, `publication.ts`, and `evaluation.ts` remain pure domain functions. They are not Nest providers.
- `app.ts` is a compatibility facade for existing scripts and tests; new application entrypoints should import the concrete module/service paths.

## Invariants

- Saved runs are immutable: directories and artifacts use exclusive creation.
- B0/B1 are code-only. B2/B3 require an explicit live/replay mode and cache.
- Holdout B3 forbids live calls and requires full-input replay.
- Publication never changes the B1 catalog decision hash.
- A run writes `report.json` last; validation and execution failures write `failure.json`.
- Domain code has no Nest dependency, and the dispatcher has no filesystem, AI-runtime, evaluation, or publication-policy logic.

Architecture and characterization tests enforce these boundaries and freeze the accepted B0/B1/B3 hashes. `npm run verify` runs typecheck, backend tests, web tests, and the production web build.

## Deliberate limits

There is no HTTP controller, database, queue, multi-tenant layer, or interface for a hypothetical second storage implementation. Web still consumes the existing backend types and schemas. Historical reports and experimental entrypoints remain in place. These are deliberate scope cuts: none is required by the take-home, while changing them would expand migration risk without improving the evaluated pipeline.

If the project later gains another transport, storage backend, or independently deployed frontend, introduce those boundaries in response to that concrete requirement rather than pre-building them now.
