# Stage 2 — Code Work Complete, B1-v2 Accepted

> Historical snapshot of stage 2. The current status is in [NEXT_STEPS.md](NEXT_STEPS.md); the open items below describe the state as of this stage.

Date: 2026-09-09. All labels are **provisional**; human verification remains open. Stage 3 has **not started**.

## Actual Starting Point and Dependencies

Before implementation, the roadmap, TASK_ANALYSIS, stage 1 report, saved B0/B0-repeat runs and comparisons, code, and tests were checked. Git was clean at HEAD `6099ce2`. Node v24.14.1; typecheck and all 16 existing tests passed. Recomputing B0 in memory matched the saved decisions; feed/taxonomy/labels hashes and report integrity were confirmed. Stage 1 genuinely provided a working code foundation, not merely a status claim in the documentation.

The user chose extended parsing of explicit development formats, allowing the 65-minute guideline to be exceeded, while preserving the original matching labels and requiring a history of values for future charts/benchmarks. API access and human verification of labels do not block this code work. The stack and runtime dependencies were unchanged.

## Implemented Result

B1 separates offers from products, extracts supported facts with exact quotations and conditions, builds candidates, checks compatibility across every pair in groups being merged, classifies into the taxonomy, reconciles/withholds attributes, and preserves review items. Empty specs do not reject a product. Price and stock remain attached to the specific offer; warranty and condition do not propagate to the product.

Deterministic IDs and sorting, interval-based reconciliation of Nimbus/LedgerLite mass without averages or majority voting, explicit unknown/conflict/incomparable states, speed and duration qualifiers, and a separate charging_case subject were established. Unparsed text remains for stage 3. Specific rules and contracts are documented in README.

B0 mode is preserved through `--baseline b0`; without the parameter, B1-v2 runs. Report schema 2 extends the metrics; an adapter compares it with historical B0 schema 1. Full review for B0 is marked N/A. In addition to the complete row diff, a group-membership diff independent of the new ID prefix is preserved.

Every run saves metrics.json and report.json; `benchmark` exports history to JSONL with metadata, fractions, label status, and comparability groups. Saved metrics from new runs are not recalculated during export. Failed attempts are also supported through failure.json, without fabricated quality scores. Detailed protocol: [BENCHMARKS.md](BENCHMARKS.md).

## Metric Comparison

Matching and non-product decisions use the same 14 provisional development cases over 59 rows. Facts and categories use 52 separate provisional development checks established before the first B1 measurement. The holdout was not evaluated.

| Metric | B0 | B1-v2 | Change |
|---|---|---|---|
| Rows accounted for | 220/220 | 220/220 | no losses |
| Lost / multiply assigned | 0 / 0 | 0 / 0 | 0 / 0 |
| Groups / product rows | 165 / 216 | 156 / 216 | −9 groups |
| TP / FP / FN | 7 / 0 / 10 | 17 / 0 / 0 | +10 / 0 / −10 |
| Matching precision | 7/7 = 100% | 17/17 = 100% | 0 pp |
| Matching recall | 7/17 = 41.18% | 17/17 = 100% | +58.82 pp |
| Correctly separated known negative pairs | 1692/1692 | 1692/1692 | no new FP |
| Negative pairs within product families | 170/170 | 170/170 | no new FP |
| Candidate recall | N/A | 17/17 | new metric |
| Unknown / unevaluated attached pairs | 2 / 0 | 2 / 0 | excluded from quality |
| Non-products in the full feed | 4 | 4 | 0 |
| Trash-rejection precision / recall | 4/4 / 4/4 | 4/4 / 4/4 | unchanged |
| False product rejections / missed trash | 0 / 0 | 0 / 0 | unchanged |
| Valid development products retained | 55/55 | 55/55 | unchanged |
| Review messages | N/A | 64 | first measured |
| Unique review rows | N/A | 64/220 = 29.09% | first measured |
| Review products | N/A | 51/156 = 32.69% | first measured |
| Category checks | N/A | 18/18 | provisional |
| Fact / absence-of-fact checks | N/A | 30/30 | provisional |
| Reconciliation checks | N/A | 4/4 | provisional |
| Extracted observations / reconciled attributes | N/A | 545 / 392 | diagnostic counts |
| Conflicting / incomparable attributes | N/A | 0 / 1 | conflict handling verified synthetically |
| Unparsed specs fragments | N/A | 43 | preserved for the next stage |
| Execution / quality-check errors | 0 / N/A | 0 / 0 | quality only on selected checks |
| Wall time | 43.058 ms | 72.445 ms | +29.387 ms |
| Generation / verifier / API calls | N/A / N/A / 0 | N/A / N/A / 0 | stages 3–4 not run |

B1 performs more work and is slower than the simple B0. Current B0-stage2-control: wall 32.804 ms, pipeline 2.192 ms. B1-v2: pipeline 36.770 ms. B1-v2 repeat: wall 71.196 ms, pipeline 36.855 ms; decision and implementation hashes match, and all non-timing metrics are equal. These are individual local observations, not a statistical speed comparison.

Group membership changed for 17 rows; structural records changed for 216 product rows because of the new result model. A lower group count is not itself considered an improvement: the basis is the specific TP/FP/FN values under unchanged labels.

### Iteration History

1. `B1-development-01`: first measurement, TP/FP/FN 17/0/0; 69 review messages across 67 rows. Preserved in reports/experiments, including source decisions and metrics.
2. `B1` / `B1-repeat`: strengthened handling of qualifiers, colors in specs, and power/port variants. Four messages on three confidently rejected rows (price_notice and price diagnostics) were excluded from review; everything remained in rows/diagnostics. Review: 65 messages across 64 rows. Matching was unchanged.
3. `B1-v2` / repeat: identified that USB-C Ladecase refers to a charging case. The quotation was expanded to the full construction and the charging_case condition was preserved; unparsed fragments decreased 44 → 43 and review messages 65 → 64, while affected rows remained 64. Matching and checks were unchanged. B1-v2 was accepted; prior results were preserved.

Review was not reduced by simply disabling unclear cases. The reductions above have specific causes. Rule names and implementation hashes distinguish iterations in the history.

## Artifacts and Verification

- [Accepted report](../reports/B1-v2/report.md), [machine-readable report](../reports/B1-v2/report.json), [decisions and evidence](../reports/B1-v2/result.json), [separate metrics](../reports/B1-v2/metrics.json).
- [B0 → B1-v2](../reports/comparisons/B0-to-B1-v2/comparison.md), [B1 → B1-v2](../reports/comparisons/B1-to-B1-v2/comparison.md), [B1-v2 repeat](../reports/comparisons/B1-v2-repeat/comparison.md); complete comparison.json files alongside.
- [History for charts](../reports/benchmarks/stage2-v2/observations.jsonl): 8 runs, 483 observations; [index](../reports/benchmarks/stage2-v2/summary.json). The previous stage2 snapshot is also preserved.
- [Additional development checks](../eval/stage2-checks.json); original matching labels are unchanged.

Typecheck and **30 tests** were run: the previous 16 and 14 new ones. They cover dangerous merges/accessories, an unknown A–B–C bridge, contradictions within a row, rounding and a real mass conflict, differing conditions, offer/case scope, qualifiers, invalid quotations, taxonomy, unsupported fragments, controlled eval errors, denominators and N/A, export of old/new/failed runs, history overwrite protection, exclusion of holdout from scoring, and B0/B1 reproducibility.

Final recording commands:

```sh
npm run typecheck
npm test
npm run pipeline -- --out reports --run-id B1-v2
npm run eval -- --out reports --run-id B1-v2-repeat
npm run compare -- --before reports/B0 --after reports/B1-v2 --out reports/comparisons --run-id B0-to-B1-v2
npm run compare -- --before reports/B1 --after reports/B1-v2 --out reports/comparisons --run-id B1-to-B1-v2
npm run compare -- --before reports/B1-v2 --after reports/B1-v2-repeat --out reports/comparisons --run-id B1-v2-repeat
npm run benchmark -- --runs reports/B0,reports/B0-repeat,reports/experiments/B1-development-01,reports/B0-stage2-control,reports/B1,reports/B1-repeat,reports/B1-v2,reports/B1-v2-repeat --out reports/benchmarks --run-id stage2-v2
```

Saved IDs cannot be reused: choose new IDs for reproduction. The source feed/taxonomy/PDF, TASK_ANALYSIS, matching labels, and B0 reports were unchanged. A clean clone was not recreated; final verification from a clean clone remains part of stage 5. No new packages were installed: the existing lockfile and installed environment passed build/test.

## Limitations and Handoff to Stage 3

100% over 17 positive pairs and 52 targeted checks does not demonstrate quality across the full feed. The rules and provisional checks were prepared by one AI agent on development, so independence is limited. The labels did not become human_verified; the holdout was not used for evaluation or rule tuning.

An error was found in the original labels/AI_USAGE explanation: the German AeroBuds title contains schwarz, so color is specified. By user decision, the matching labels and two unknown relationships were preserved. B1 recognizes the color but leaves the German row separate because its type is unrecognized; unknown pairs do not become successes. Correcting the labels requires human review and a new comparison protocol.

The following specific tasks are handed off, **without automatic implementation**:

- Structured semantic extraction on top of B1-v2 while preserving evidence/conditions. 43 unparsed fragments remain: development includes `2.4GHz + BT`, `5 colour temps`, `3 sizes`, accessory compatibility, and marketing. Not every unparsed fragment requires an LLM or represents a useful fact.
- German AeroBuds: unknown type; potential reconciliation of 18h with 20h with case after identity is resolved. They are currently in separate products; the absence of a battery conflict in the aggregate count does not mean the semantic problem is resolved.
- Nimbus: `12W output` and `12 W` have different power conditions and are withheld as incomparable. The code does not assume that unspecified power means output.
- 21 missing_specs messages, 38 unparsed_specs, 2 identity uncertainties, 2 categories, and 1 incomparable attribute; reasons and sources are in result.review. Missing data alone is not grounds for inventing characteristics.
- Obtain API access before an actual model run; receipt of the key is unconfirmed. Then compare the new stage with accepted B1-v2 and preserve separate runs/metrics/benchmark history. Generation, verifier, and UI are still absent.

Implementation began at approximately 08:16 UTC; elapsed time for the current implementation and documentation was about 25 minutes, excluding prior planning. No exact focused-time counter was maintained. There were no application model API calls or waits for the user during implementation; human verification of labels was not performed. No commits, pushes, or submissions to the organizers were performed.
