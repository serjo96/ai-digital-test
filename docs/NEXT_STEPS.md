# Current Status and Next Work Block

Recorded: 2026-09-14, branch `codex/architecture-refactor-v2`. Stages 1–5 and the minimal stage 6 stabilization are complete. The final UI is Catalog + Review. The compact matching audit is saved in the repository as [matching-audit-human-verified.json](../eval/matching-audit-human-verified.json) with metrics in [matching-audit-metrics.json](../eval/matching-audit-metrics.json): 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 `unknown`, 0 disagreements (post-holdout validation). Extended family labels on 108 rows remain provisional. Current runs and the backward-compatible UI give both identity-review products a source-grounded draft while preserving `publishedText = null`. 93 backend tests and 19 web tests pass; typecheck and the production build have been verified.

This file is a concise handoff for the next chat. The full scope and criteria remain in [ROADMAP.md](ROADMAP.md).

## Unambiguous Stage Status

| Stage | Status | Decision |
|---|---|---|
| 1. Code foundation | Completed | Runnable Nest/TypeScript CLI, B0 baseline, eval path, and saved reports. |
| 2. Product baseline | Completed | B1-v2 accepted: 220/220 rows, 156 products, 4 non-products; extended family metrics remain provisional. |
| 3. AI extraction/matching | Completed experiment with a negative B2 decision | Integration, live/replay, and fail-closed checks work. B2 was not accepted on quality; B1-v2 is retained. Do not continue model selection without a newly measured error or a separate requirement. |
| 4. Generation/verifier | Completed | Development gate accepted; full-input: 154/156 ready, 2 identity review with unpublished drafts, 0 technically withheld, 390 published atomic claims. Offline replay reproduces the historical hashes. |
| 5. UI and final evaluation | Completed | B1/B3 UI, generated review, full-input, holdout, and the repo-backed compact matching audit/metrics are saved. |
| 6. Minimal architecture stabilization | Completed | Thin dispatcher, separate B0/B1, B2, B3 and compare services, run storage, AI module, and boundary/characterization tests. Domain rules and artifacts are unchanged. |

In summary: stages 1–5 are closed and the agreed minimal stage 6 refactor is complete. Larger clean-architecture or contracts migrations remain deliberately out of scope.

## Human Review Status

The original human review covered 120/158 claims, 28/37 cards, and a sample of 20/20. Verifier-only P0.2 preserved the old texts, resegmented them into 99 atomic claims, and safely migrated decisions where the new spans were fully covered by previously reviewed spans. The new canonical review: 76/99 claims, 28/37 cards, sample 20/20, factual errors 0, non-atomic 0, unclear-copy 2. Controlled cases were confirmed 12/12.

The current file is [generated-review-fdca0138d88f.json](../eval/generated-review-fdca0138d88f.json), `human_verified`, with 76 reviewed and 23 pending outside the required sample. The historical [generated-review-e478435a3d39.json](../eval/generated-review-e478435a3d39.json) is preserved without being rewritten.

The nine identified discrepancies were investigated against the supplier feed. All corresponding facts are supported by the input data; four issues concern non-atomic spans and two concern unclear copy. They are preserved as separate issue flags and rationale, not as false factual errors. The interface gained a discrepancy/issues filter and an explicit human/AI verdict comparison.

## Compact matching audit — saved

Canonical artifacts:

- [matching-audit.json](../eval/matching-audit.json) — 20 atomic questions (`stage5-matching-audit-v1`)
- [matching-audit-human-verified.json](../eval/matching-audit-human-verified.json) — human answers, reviewer `Serjo`, status `human_verified`
- [matching-audit-metrics.json](../eval/matching-audit-metrics.json) — post-holdout validation metrics

Final metric: 20/20 reviewed; 18 scored; 18 agreements; 0 disagreements; 2 unknown; agreement 18/18 = 1.0; scored coverage 18/20 = 0.9. Development split: 12/12 scored agreements and 2 unknown. Holdout split: 6/6 scored agreements. Do not promote all of `eval/labels.json`: its 108 rows / 70 groups remain provisional.

## Closed P0 blocks (stages 4–5)

### P0.1. Human-review contract — complete

The `stage4-generated-review-v2` contract uses `pending/reviewed`, nullable `humanVerdict`, required rationale, and separate `non_atomic_claim`/`unclear_copy` flags. A model verdict is not treated as a human verdict. The gate accepts a fully reviewed fixed sample of at least 20 cards; the current verifier-only artifact reports claims 76/99, products 28/37, sample 20/20. `web:prepare --generated-checks` attaches the canonical labels without changing the historical run.

### P0.2. Development gate — complete

Human-verified controlled 12/12 and generated sample 20/20. Verifier-only live and human-gate replay are saved with identical `decisionsHash` / `publicationHash`. Development gate accepted.

### P0.3. Stage 5 closure — complete

Full-input B3: 154/156 ready, 2 identity review with source-grounded unpublished drafts, 0 technically withheld, 390 published claims. Holdout replay saved without API calls. Compact matching audit and metrics are repository-backed. Extended family labels remain provisional; the compact sample is post-holdout validation.

## What Not to Do Now

- Do not improve B2 extraction/matching or try new AI models without an error identified by human review. The negative stage 3 experiment is already an acceptable result; B1 is safer and remains accepted.
- Do not run a second full-input live: the first is saved and reproducible offline.
- Do not begin moving modules en masse while changing domain rules, prompts, or evaluation labels.
- Do not ask the user to label the remaining 38 claims or all 108 family-label rows: the 20/20 compact sample is complete.
- Do not silently retune rules against the revealed holdout; any such change must be called post-holdout development.

## Architecture stabilization — complete

`PipelineService` now dispatches to separate catalog, AI matching, publication, and comparison services. `RunStoreService` owns immutable run I/O, `AiModule` owns provider registration, and root domain functions remain framework-independent. Characterization tests freeze the accepted B0/B1/B3 hashes; the authoritative full-input B3 replay still makes zero network calls and reproduces `publicationHash=7de47155…aac6`.

Deliberately deferred: browser-safe contract extraction, storage ports, HTTP, database/queue, cleanup of historical reports, and runtime scaling without volume requirements. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Starter Prompt for a New Chat

> Read `docs/NEXT_STEPS.md` and `docs/ARCHITECTURE.md`. Stages 1–5 and the minimal architecture stabilization are complete. The compact matching audit is saved at `eval/matching-audit-human-verified.json` with metrics in `eval/matching-audit-metrics.json` (20/20 reviewed, 18/18 agreement, 18/20 coverage, 2 unknown, 0 disagreements). Extended family labels remain provisional. Do not run new model calls or change product rules unless a new measured error requires it.
