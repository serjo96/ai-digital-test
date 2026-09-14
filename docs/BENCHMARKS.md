# Quality and performance history

This document defines the metrics and preserves cumulative measurement history. Stage-specific status statements below describe the corresponding recorded checkpoint and do not override the final status in the root [README](../README.md). Primary metrics for each run are saved in its `report.json`/`metrics.json`; exported JSONL series are intended for comparisons and charts.

Every new successful `pipeline`/`eval` automatically saves `metrics.json` and the same values in `report.json`, together with decisions. These are the primary results; exporting history is not required to preserve them. Run and export directories cannot be overwritten: a new run ID is required. `reports/local/` is ignored by Git; specify `--out reports` for a benchmark that should be preserved.

## What quality means

| Question | Metrics | Denominator and limitations |
|---|---|---|
| Match selection quality | `matching.precision`, `matching.recall`, `matching.true_positive`, `matching.false_merge`, `matching.missed_pair` | Precision = TP/(TP+FP); recall = TP/(TP+FN). Development only; unknown excluded |
| Negative sample quality | `matching.negative_specificity`, `matching.hard_negative_specificity`, `matching.hard_negative_false_merges` | Correctly separated / known different pairs. A hard negative is a pair of different products within one labeled case, excluding non-products; this approximates difficulty and is not a separate manual difficulty label |
| Trash rows and false rejections | `non_product.precision`, `non_product.recall`, `non_product.false_rejection`, `non_product.missed_trash`, `non_product.valid_product_retention` | The positive class here is non-product. False rejection means a product was incorrectly rejected; missed trash means trash was retained as a product. The total number of rejected rows is reported separately |
| Candidate search | `matching.candidate_recall` | Found known positive pairs / all positive pairs, before the merge/reject/review decision |
| Review queue | `review.items`, `review.rows`, `review.products`, `review.row_rate`, `review.product_rate` | Messages; unique affected rows / all input rows; unique products / all products. The counts are not interchangeable |
| Review reasons | `review.identity_items`, `review.category_items`, `review.extraction_items`, `review.missing_specs_items`, `review.conflict_items`, `review.incomparable_items`; `review.reason.*` | The first metrics have stable names, including zeros. A detailed reason series appears only when that reason occurs; absence of such a series cannot automatically be treated as a measured zero |
| Category and fact quality | `categories.check_accuracy`, `facts.check_accuracy`, `reconciliation.check_accuracy` | Correctly completed / all specified checks in a separate provisional development sample. This is not precision over all extracted facts |
| Fact diagnostics | `facts.extracted`, `facts.accepted_attributes`, `facts.conflicts`, `facts.incomparable`, `facts.unparsed_fragments` | All input data. An accepted attribute is a reconciliation result, not a claim allowed for publication |
| Errors | `errors.matching`, `errors.non_product`, `errors.quality_checks`, `errors.execution`; losses and duplicate assignments in `accounting.*` | Errors from different tasks are counted separately: they cannot be summed into an “error percentage” with one shared denominator |
| Performance | `timing.wall`, `timing.pipeline` | Milliseconds, each run as a separate observation; boundaries below |

“Trash decisions” are operationalized here as false merges, false product rejections, and missed non-products. In the early B0/B1 observations, generated claim/verifier quality is N/A because generation did not yet exist. A large number of correct negative pairs does not replace matching precision/recall.

## Format and comparability

Each observation contains `benchmarkSchema`, `runId`, `createdAt`, `status`, `rules`, `schema`, `hashes`, `code`, `cohort`, `metricCohort`, `name`, `value`, `numerator`, `denominator`, `unit`, `scope`, `qualityStatus`, `availability`. For old/failed runs, unavailable metadata is absent or null.

- `unit`: count, ratio, or ms. Ratios are stored in the range 0–1, not 0–100; a change of 0.5882 means approximately +58.82 percentage points.
- `scope`: development, full_input, or run. Do not build one line from different scopes.
- `qualityStatus`: provisional, human_verified, not_evaluated, or not_applicable. Diagnostic counts are not quality evaluations.
- `availability`: measured, not_implemented, no_denominator. In the latter two cases, `value = null`. Do not turn null into 0; do not connect missing measurements as real points.
- `cohort` fixes the feed, taxonomy, matching labels, split, and metrics-v1 protocol. `metricCohort` additionally accounts for the stage2-checks hash for category/fact/reconciliation quality. Compare quality only within one metricCohort and one labeling status.
- A rules/configuration/code change is the subject of an experiment and does not change the sample. Use `rules`, `hashes.config`, `code.implementationHash`, commit/dirty to explain changes. A change in metric definition requires a new protocol version and explicit adapter, not recalculation of history under the old name.

For schema 2 reports, export carries saved metrics without recalculation. For historical B0 schema 1, the adapter reconstructs only available metrics from saved decisions and source labels with a verified SHA-256. Any other labels file is rejected. B0 did not have a complete review: its former `audit.reviewRows = 0` meant only rows without a title; in the history, the new review metric for B0 is N/A.

`summary.json` lists included runs and the observation count. An explicitly selected set is exported, not every attempt ever made. To account for failures, include directories containing `failure.json`: they will have `errors.execution = 1` and time to failure, without invented quality scores. Controlled test failures are not included in the current benchmark of successful runs.

## Commands

```sh
npm run pipeline -- --baseline b1 --out reports --run-id B1-next
npm run eval -- --baseline b1 --out reports --run-id B1-next-repeat
npm run compare -- --before reports/B1-v2 --after reports/B1-next --out reports/comparisons --run-id B1-next
npm run benchmark -- --runs reports/B0,reports/B1-v2,reports/B1-next --out reports/benchmarks --run-id history-next
```

Example loading code for a future chart without third-party libraries:

```js
import { readFileSync } from 'node:fs';
const rows = readFileSync('reports/benchmarks/stage2-v2/observations.jsonl', 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));
const series = rows.filter(x => x.name === 'matching.recall' && x.value !== null);
// Group by metricCohort and qualityStatus, sort by createdAt.
// X: createdAt/runId, Y: value; show numerator/denominator alongside.
```

## Timing protocol

`timing.wall` / `wallTimeMs`: from CLI entry until result/diagnostics are written, including Nest bootstrap, reading/validation, obtaining the code version, pipeline, and eval. Excludes compilation, imports before main entry, serialization of metrics/report, and context shutdown. This is the saved stage 1 boundary (`cli-through-result-v1`).

`timing.pipeline`: only the baseline or extraction/matching/reconciliation/review with internal invariants; excludes file reads and eval. The old B0 does not have this measurement. The new B0-stage2-control allows the cost of the simple baseline to be observed in the current application.

New reports record Node/platform/arch; historical B0 lacks these fields. Repeats confirm decision reproducibility, but two runs are insufficient for a statistical speedup claim. B1 performs more work and is currently slower than B0. For a future speed benchmark, fix the environment, mode, inputs, and warmup; preserve every repeat, not only the best.

## Stage 3 extension: offline integration

B1-v2 remains the accepted baseline. The [stage3-offline](../reports/benchmarks/stage3-offline/summary.json) history adds **code-only** control runs; B2-live was absent from that checkpoint per the user’s instruction. Do not interpret the word stage3 or schema 3 as evidence of a model call.

Schema 3 preserves metrics without recalculation, like schema 2, and adds `mode` (code-only/live/replay/test), partial status, role/provider configuration, API usage, and `semanticChecks`. Mode and configuration are copied into every JSONL observation. `test` runs are not admitted into real history. A partial run saves results and diagnostic/evaluation metrics with explicit status=partial and `errors.execution=1`; it cannot be accepted as successful. A complete failure without a result continues to contain only available diagnostics.

The new `eval/stage3-checks.json` sample contains 12 provisional development rows, 11 expected semantic additions, and type and category checks. The original matching labels and stage2-checks do not change. `semantic.precision` = correct accepted additions / all accepted additions on these rows; `semantic.recall` = correct / 11 expected additions. Repeated instances of one value are collapsed by attribute/value/unit/scope/conditions. This is a narrow evaluation of five allowed attributes, not precision over all product information. Invalid-response errors are additionally visible in ai.failed_jobs/ai.json; a discarded response does not become a correct extraction.

`semantic.types` and `semantic.categories` check the expected type, including null, and allowed category. B1-control: precision N/A (0/0), recall 0/11, types/categories 12/12. This pre-measured a gap in code extraction before real B2 evaluation. A synthetic test fixture implementing the expected 11 additions verifies eval and pipeline wiring, not Sol quality.

Semantic series have a `metricCohort` that additionally includes the semanticChecks hash. New values without a previous measurement have delta=null. Existing metrics and metrics-v1 definitions were not renamed; USD was added as a unit for new monetary metrics, with availability=unavailable when usage/rate is missing. Do not connect incomparable series or turn unknown cost into 0.

`api.calls` counts real attempts to contact the provider, including retries; a local configuration/key error before a call does not increase calls. `api.errors` counts errors from such live attempts, including invalid results, but not replay cache misses. `ai.failed_jobs` counts failed tasks, including cache/configuration errors. `api.tokens`, input/output tokens, and cost relate to the current live run; replay reports 0 new expenditure and cache_hits. Raw usage and responses remain in ai.json/cache; usage for an unknown failed request is not reconstructed with invented numbers. Pricing accounts for cache read and cache write separately.

The `timing.wall` boundary remains: CLI entry → results/diagnostics written (for B2, also ai.json), excluding compilation, early imports, and report/metrics serialization. `timing.pipeline` includes AI waiting and retry/replay for B2. Show code-only/live/replay timing separately. Sol/Astra comparison uses `--ai-task matching --ai-cohort development` on fixed B1 review pairs, separately from extraction; the current pairs are unknown and do not provide a confirmed evaluation of recommendation correctness.

## Stage 5: code control and screen

[stage5-offline](../reports/benchmarks/stage5-offline/summary.json) extends stage3-offline with two runs: **14 runs, 963 observations**. [JSONL](../reports/benchmarks/stage5-offline/observations.jsonl) preserves prior metric definitions, scopes, and provisional status.

[Control](../reports/B1-stage5-control/report.md) / [repeat](../reports/B1-stage5-repeat/report.md): B1-v2 decisions are identical; all comparable non-timing values are unchanged. Accounting 220/220, products 156, non-products 4, TP/FP/FN 17/0/0; review 64 messages, 64 rows, 51 products. Wall 81.957 / 80.121 ms; pipeline 37.224 / 38.409 ms on Node 24.14.1, darwin arm64. These are single observations, not evidence of acceleration. API calls/tokens/USD: 0/0/0; generation/verifier N/A, holdout not evaluated.

Comparisons: [B1-v2 → stage 5](../reports/comparisons/B1-v2-to-stage5/comparison.md), [stage 3 → stage 5](../reports/comparisons/stage3-to-stage5/comparison.md), [repeat](../reports/comparisons/stage5-repeat/comparison.md). Viewing JSON in a browser is not a model replay. Clean-environment runs serve as reproducibility checks and are recorded in `reports/ui/stage5/clean-environment.json`; they were not added as new quality experiments.

## Stage 3: local Ollama, protocol v1 (2026-09-10)

Experimental development baseline: `qwen3:4b` and `gemma4:12b`, Ollama 0.9.6, endpoint `http://127.0.0.1:11434`. Names and full digests are checked through /api/version and /api/tags; metadata requests are not inference and are excluded from api.calls. The server and models are not installed or updated. OpenAI is not called.

Before inference, `manifest.json` records the code version, source/labels/checks hashes, exact requests, separate prompt/schema/parameters/input hashes, profiles, and order. Extraction uses the existing semantic_extraction_v1 and evidence rules. The initial ambiguous_matching_v2 added confidence high/medium/low and reason, but server 0.9.6 rejected tuple-prefixItems. A separate experiment version used the equivalent ambiguous_matching_v3 (an array of exactly two strings). The prompt, parameters, pairs, and labels were preserved. Qwen ran in v3; Gemma did not load, so its matching did not run. Confidence is not a probability.

Order: smoke Quill row_11462769c5 (1 request, maxRetries=0), then 12 rows in cases order from stage3-checks.json (11 expected additions), then the same 12 for the second model if the first is technically stable; 8 shadow pairs separately. Technical stability means every task reached a terminal state, the server was available, transport retries were not exhausted, and there were no timeouts. Quality errors alone do not exclude the second model. Smoke is not included in development denominators. A semantic smoke error with working JSON/schema is preserved as a measured failure; transport/schema incompatibility requires a new experiment version after the integration is fixed.

Shadow pairs: 2 saved unknown AeroBuds; positive English AeroBuds and Onyx Lite; negative ear tips against each of 3 AeroBuds rows, Cobalt lamp against Cobalt mouse. Labels are provided only to the evaluator. A dangerous merge is a known negative or deterministic hard conflict; an unknown merge is an unsupported recommendation, not TP/FP. Recommendations do not alter decisions, groups, or product confidence, including for reject/unknown. Their review is measured separately from the B1 product queue.

All local requests are sequential, temperature=0, seed=42, context=8192, maxOutputTokens=2048, topK=20, topP=0.9, repeatPenalty=1, keepAlive=5m. Qwen think=false; Gemma does not receive think. 120 seconds per attempt, at most one retry for transport/429/5xx. JSON/schema/evidence are not repaired through regeneration.

Each diagnostic level (transport, completion, JSON, schema, citations, semantic) contains checked/passed/failed and unchecked. Stopping at a previous level does not mean subsequent levels passed. A quote with correct text may not support an attribute: false citation (nonexistent/wrong/ambiguous source) and unsupported semantic addition are separate. Failure of one part of extraction withholds the entire response; an individually correct suggestion may appear in proposed and be absent from accepted.

`experiment-metrics.json` records successful/failed tasks; proposed and accepted correct/unexpected/missing; malformed/duplicate/rejected additions; false citations and semantic rejection reasons (including scope/conditions); unknowns; review messages/unique rows; dangerous and unsupported merges. Proposed is compared by attribute/value/unit/scope/conditions, so matching an expected value alone does not prove evidence. Accepted is evaluated by the common evaluateSemantic; holdout is not evaluated.

Latency for each live task includes waiting and cold loading; median is the lower order-statistic median (nearest rank p=0.5), p95 is nearest rank p=0.95. ai.json separately preserves elapsed for each attempt; Ollama load/prompt/generation values are converted from ns to ms. Final wall does not subtract load. Smoke warms Qwen; Gemma’s first load may be included in its development latency—this is one observed local scenario, not a universal model ranking. In replay, per-attempt latency comes from live, while wall/replay and new calls are measured separately. Missing load/usage/cache breakdown and local-compute cost are N/A. Codex session cost is unrelated to the pipeline.

Cache-v2 stores response and raw before validation, full request, origin, response/attempt hashes, and each attempt in a separate file. Endpoint, model digest/serverVersion, and the complete request are included in the key. Secrets/headers are not written. Cache-v1 is read using the historical key. Replay does not call generate or discovery, repeats validation, preserves failures, and compares quality and decisions with live; test transport in replay explicitly prohibits network access. Synthetic origin=test is not admitted into benchmark/export. Historical schema 1/2/3 and JSONL are not rewritten.

Strict admission to full: 12/12 responses pass schema/evidence, 11/11 additions with no extras or false citations, 8/8 shadow pass validation, dangerous merges 0, B1/accounting/group checks preserved, replay identical. If both pass, choose the lower extraction median, then p95, then Qwen. Otherwise full is not run. Full processes 220 rows in code and 41 problematic rows with AI; matching remains shadow. The product baseline is not promoted automatically. Generation, final verifier, and holdout evaluation are outside this protocol.

Artifacts and results: `reports/stage3-ollama-v1`, with the outcome summarized in [LLM_ROLES.md](../LLM_ROLES.md). Live/replay/smoke/development/shadow directories are separate; JSON/Markdown comparison and two types of benchmark JSONL preserve specific provenance.

Final result: [stage3-ollama-v2/comparison.md](../reports/stage3-ollama-v2/comparison.md). The shared JSONL of source metrics is benchmark/observations.jsonl; availability and additional counts for wrong scope/conditions/unit/value type/wrong pair IDs are in [stage3-ollama-final-verification/observations.jsonl](../reports/stage3-ollama-final-verification/observations.jsonl). The latest summary is a read-only analysis of the same raw responses, not a new live run or acceptance change. It reports modelQualityAvailable=false and proposedQuality=null when no model response exists; missing Gemma generations are not presented as “0 quality errors.” Historical comparison v1 remains as an intermediate integration result; v2 and the final raw-replay verification define the current architecture status.

After the local server was updated to 0.34.0, Gemma passed a separate technical retry under a new run identity: [comparison](../reports/stage3-ollama-gemma4-v034-thinkoff/comparison.md), [raw benchmark JSONL](../reports/stage3-ollama-gemma4-v034-thinkoff/experiment-benchmark.jsonl), and [replay comparison](../reports/stage3-ollama-gemma4-v034-thinkoff/ollama-gemma4-12b-development-replay-comparison.json). Model responses were saved and revalidated without network access; the result is not merged with the historical benchmark and does not prove product quality.

## Stage 4: OpenAI B3 development (2026-09-10)

[Stage4-openai-development-v4 history](../reports/benchmarks/stage4-openai-development-v4/summary.json) contains B1-v2, the authoritative B3 live run, and its offline replay: 3 runs, 280 observations. Schema 4 adds `publicationHash`, publication/verifier/generated-review metrics, and usage/latency/cost breakdown by role. N/A is not replaced by zero: generated human review has 0 reviewed claims and error rate N/A; repair latency/quality were also not measured because repair was not called.

Live: 39 development products, 37 drafts/ready, 0 withheld, 2 identity review, ready rate 37/39, covering 52 rows. Controlled provisional: unsupported detection 4/4, false block 0/7, disputed leakage 0/1, structural errors 0. API: 86 calls, 0 errors/retries, 151618 tokens, $2.6475128. Breakdown: controlled Astra 12 calls, Sol generation 37, Astra publication verification 37. Wall 519931.2525 ms—one sequential measurement, not a claim about general performance.

[B1-v2→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md) is comparable, `decisionsEqual=true`, changed row/matching IDs are empty, and TP/FP/FN and all B1 outcomes/facts/offers/review are unchanged. [Live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md) additionally has `publicationEqual=true`; replay performed 86 cache hits, 0 calls, wall 199.929042 ms. At this development-v1 checkpoint, the controlled suite and 158 generated claims were not yet human-verified, so those results alone did not permit full-input B3 or holdout.

The historical limitation above was removed by P0.1/P0.2: the development gate is human-verified and reproducible. Full-input B3 was completed on 2026-09-12: 154/156 ready, 2 identity review, 0 withheld, 213 covered rows, 390 claims without prohibited atomicity patterns. Live: 322 calls, 526449 tokens, $8.110955; one invalid initial verifier response was rejected fail-closed and successfully recovered by the single repair. [Offline replay](../reports/B3-openai-full-input-atomic-v2-replay/report.md) has the same `decisionsHash`/`publicationHash`, and the [comparison](../reports/comparisons/B3-openai-full-input-atomic-v2-live-to-replay/comparison.md) contains no changes or violations.

P0.3 added an explicit split and revealed holdout once through offline full-input replay. [Holdout report](../reports/B3-openai-full-input-atomic-v2-holdout-replay/report.md): 6 cases / 49 rows; TP/FP/FN 22/0/0; precision, recall, and candidate recall 22/22; true negatives 1154/1154; hard-negative specificity 256/256; non-product correctness 49/49; unknown/unevaluated pairs 0/0. Runtime: 0 API calls, 0 tokens, $0, 321 successful cache hits. These remain provisional family-label metrics.

On September 13, the user completed a separate compact matching audit. Canonical artifacts: [matching-audit-human-verified.json](../eval/matching-audit-human-verified.json) and [matching-audit-metrics.json](../eval/matching-audit-metrics.json). Final metric: 20/20 reviewed, 18 scored, 18 agreements, 0 disagreements, 2 `unknown`; agreement = 18/18 = 1.0; scored coverage = 18/20 = 0.9. Development: 12/12 scored agreements and 2 unknown; holdout: 6/6 scored agreements. Status `human_verified`; evaluation type `post_holdout_validation`. The sample was created after holdout was revealed and must be called post-holdout validation, not an independent holdout. Extended family-label metrics on 108 rows remain provisional.
