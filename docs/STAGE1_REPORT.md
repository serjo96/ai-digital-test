# Stage 1 — Code Work Complete

> Historical snapshot of stage 1. The current status is in [NEXT_STEPS.md](NEXT_STEPS.md); later human review, B3, and holdout results have intentionally not been rewritten retroactively.

Date: 2026-09-08. Labels are **provisional** and have not been human-verified. Stage 2 has not started.

## Verified Initial State

At the start of implementation, Git was clean at HEAD `939f7fa`; the repository contained the PDF, two JSON files, and the ROADMAP/TASK_ANALYSIS documents. There was no application, package/lockfile, labeling, or run reports. The source dependencies for the stage were available: 220 unique row_id values, 220 unique supplier/SKU pairs, 5 suppliers, and 12 categories. A repeated audit confirmed 23 empty specs, 1 empty title, 2 empty prices, and 169 titles after normalization. The last number is not the number of real products.

TypeScript with a NestJS standalone context, familiar to the user, was selected. No material advantage was found that would justify switching to another stack for a file-based pipeline over 220 rows. React was agreed for stage 5. No external catalog, HTTP service, database, or model API was connected.

## What Was Implemented

Loading and strict schema/identifier validation; preservation of source rows; conservative title normalization; exact decimal prices with currency and diagnostics; four content-based non-product types; B0 grouping with stable IDs; and validation that every row has exactly one outcome.

A development eval was added with TP/FP/FN, precision/recall, cross-case errors, unknown/unevaluated relationships, and validation of non-product decisions. 20 provisional cases covering 108 rows were prepared: 14 development cases over 59 rows and 6 holdout cases over 49. All rows from the selected families are included; families do not cross splits. The holdout was not evaluated. Two AeroBuds relationships with missing color were left unknown.

Reports record sources, configuration, versions, decisions, metrics, timing, and the absence of model calls. A saved run cannot be overwritten by a CLI command. An input error saves failure.json and returns a nonzero exit code without producing a successful report. README, AI_USAGE, and a human-review package for the labels were created.

## Metric Comparison

All matching and non-product evaluations below are provisional. Before implementation, only an input audit existed; there were no prior pipeline metrics.

| Metric | Before implementation | B0 | B0 repeat |
|---|---|---|---|
| Input rows | 220 | 220 | 220 |
| Accounted for by pipeline | N/A | 220/220 | 220/220 |
| Lost / multiply assigned | N/A | 0 / 0 | 0 / 0 |
| Rows in groups / non-products | N/A | 216 / 4 | 216 / 4 |
| Diagnostic groups | N/A | 165 | 165 |
| Repeated groups | N/A | 48 | 48 |
| Parsed prices | N/A | 217/220 | 217/220 |
| Empty prices / unknown currency | N/A | 2 / 1 | 2 / 1 |
| Matching TP / FP / FN | N/A | 7 / 0 / 10 | 7 / 0 / 10 |
| Matching precision | N/A | 100% (7/7) | 100% (7/7) |
| Matching recall | N/A | 41,18% (7/17) | 41,18% (7/17) |
| Correct product/non-product decisions on development | N/A | 59/59 | 59/59 |
| Unknown / unevaluated attached pairs | N/A | 2 / 0 | 2 / 0 |
| Wall time | N/A | 43,058 ms | 40,680 ms |
| Generation / verifier / categories | N/A | N/A | N/A |

All comparable B0 → B0-repeat deltas are zero, with no changed rows. The decision hash and implementation hash match across both runs. Timing differs as expected; measurement boundaries are documented in README. 100% precision over seven provisional positive predictions does not demonstrate quality across the entire feed.

Artifacts:

- [B0: readable report](../reports/B0/report.md), [JSON](../reports/B0/report.json), [outcomes and groups](../reports/B0/result.json).
- [B0 repeat](../reports/B0-repeat/report.md).
- [Before implementation → B0](../reports/comparisons/before-to-B0/comparison.md), with comparison.json alongside.
- [B0 → repeat](../reports/comparisons/B0-repeat/comparison.md), with comparison.json alongside.
- [Labels](../eval/labels.json), [human-review package](../eval/REVIEW.md).

## Verification and Timing

Successfully run:

```sh
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run pipeline -- --out reports --run-id B0
npm run eval -- --out reports --run-id B0-repeat
npm run compare -- --before none --after reports/B0 --out reports/comparisons --run-id before-to-B0
npm run compare -- --before reports/B0 --after reports/B0-repeat --out reports/comparisons --run-id B0-repeat
git diff --exit-code -- supplier_feed.json taxonomy.json AI-Digital-Take-Home-Shelf-Ready.pdf docs/TASK_ANALYSIS.md
```

16 tests passed, covering prices, invalid inputs/duplicates, dangerous title differences, non-products with nonzero stock and products with zero stock, empty specs, source offers, accounting for all rows, decision invariance under input reordering, controlled FP/FN, cross-case errors, unknown/unevaluated relationships, exclusion of holdout evaluation, label integrity, CLI behavior, overwrite refusal, incomparable reports, and failure diagnostics. The npm ci installation recreated node_modules from the lockfile; a separate clean Git clone was not created because the changes had not yet been committed. Final verification from a clean clone remains part of stage 5.

Implementation and verification took about 17 minutes of elapsed wall time in this session, including label preparation, documentation, and npm. Prior planning is not included. No separate exact focused-time counter was maintained. Time waiting for model APIs and user responses during implementation was 0; npm network operations are included in elapsed time. Human labeling was not performed and was not counted as completed work.

## Handoff to Stage 2

There are 10 known missed pairs: Sony (3), AeroBuds (1), Lumen (1), Vault (1), PulseFit (1), TaskFlow (1), LedgerLite (1), Nimbus (1). The cause is exact title comparison without translation, model matching, or separation of offer condition. They are preserved in the report and were not fixed in B0. Matching names do not yet undergo domain conflict validation; the data is not ready for publication.

The next stage receives an immutable B0, provisional development labels, and the eval harness. According to the roadmap, stage 2 should add product/offer/fact entities, candidates and group incompatibility checks, supported units and rounding, categories, reconciliation, and review, then save B1 and a comparison with B0. Do not tune rules on the holdout; revising labels means a new hash and an explicit comparison-protocol change.

Open items: human verification of labels; uncertain AeroBuds color; and all domain and semantic tasks for stage 2. This does not block independent stage 2 code work. A key will be needed for stage 3; receipt has not been confirmed. The status “code work complete” does not mean hand-labeling or the AI portion of the task is complete. No commits or pushes were performed.
