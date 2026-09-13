# Current Status and Next Work Block

Recorded: 2026-09-13, branch `review-section`. Stages 1–5 are complete. The final UI is Catalog + Review. The compact matching audit is saved in the repository as [matching-audit-human-verified.json](../eval/matching-audit-human-verified.json) with metrics in [matching-audit-metrics.json](../eval/matching-audit-metrics.json): 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 `unknown`, 0 disagreements (post-holdout validation). Extended family labels on 108 rows remain provisional. Stage 6 modular refactoring is not started and is optional. 73 backend tests and 18 web tests pass; typecheck and the production build have been verified.

This file is a concise handoff for the next chat. The full scope and criteria remain in [ROADMAP.md](ROADMAP.md).

## Unambiguous Stage Status

| Stage | Status | Decision |
|---|---|---|
| 1. Code foundation | Completed | Runnable Nest/TypeScript CLI, B0 baseline, eval path, and saved reports. |
| 2. Product baseline | Completed | B1-v2 accepted: 220/220 rows, 156 products, 4 non-products; extended family metrics remain provisional. |
| 3. AI extraction/matching | Completed experiment with a negative B2 decision | Integration, live/replay, and fail-closed checks work. B2 was not accepted on quality; B1-v2 is retained. Do not continue model selection without a newly measured error or a separate requirement. |
| 4. Generation/verifier | Completed | Development gate accepted; full-input: 154/156 ready, 2 identity review, 0 withheld, 390 atomic claims. Offline replay reproduces the hashes. |
| 5. UI and final evaluation | Completed | B1/B3 UI, generated review, full-input, holdout, and the repo-backed compact matching audit/metrics are saved. |
| 6. Modular architecture | Not started / optional refactoring | May begin after stages 1–5; do not change baseline rules or evaluation while refactoring. |

In summary: stages 1–5 are closed. Stage 6 is optional architectural work, not required to close the MVP.

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

Full-input B3: 154/156 ready, 2 identity review, 0 withheld, 390 claims. Holdout replay saved without API calls. Compact matching audit and metrics are repository-backed. Extended family labels remain provisional; the compact sample is post-holdout validation.

## What Not to Do Now

- Do not improve B2 extraction/matching or try new AI models without an error identified by human review. The negative stage 3 experiment is already an acceptable result; B1 is safer and remains accepted.
- Do not run a second full-input live: the first is saved and reproducible offline.
- Do not begin moving modules en masse while changing domain rules, prompts, or evaluation labels.
- Do not ask the user to label the remaining 38 claims or all 108 family-label rows: the 20/20 compact sample is complete.
- Do not silently retune rules against the revealed holdout; any such change must be called post-holdout development.

## When to Move to Architecture (optional Stage 6)

Stage 6 can be planned now. The B1 `decisionsHash`, B3 `publicationHash`, human-verified development results, holdout replay, and saved matching-audit metrics form the characterization baseline for safe refactoring.

The first architectural step is to extract browser-safe artifact contracts and run storage, then split `PipelineService` into B0/B1/B2/B3 use cases. Do not change domain rules or prompts during the migration.

## Starter Prompt for a New Chat

> Read `docs/NEXT_STEPS.md`. Stages 1–5 are complete. The compact matching audit is saved at `eval/matching-audit-human-verified.json` with metrics in `eval/matching-audit-metrics.json` (20/20 reviewed, 18/18 agreement, 18/20 coverage, 2 unknown, 0 disagreements). Extended family labels remain provisional. Stage 6 modular refactoring is optional and not started. Do not run new model calls or change product rules unless a new measured error requires it.
