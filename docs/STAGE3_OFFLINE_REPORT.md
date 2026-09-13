# Stage 3 — Code Integration Ready, Live Run Deferred

> Historical intermediate snapshot from before the live experiments. It is preserved for the audit trail; the current stage 3 outcome is in [STAGE3_REPORT.md](STAGE3_REPORT.md), and the current project status is in [NEXT_STEPS.md](NEXT_STEPS.md).

Date: 2026-09-09. The accepted baseline remains **B1-v2**. Actual application model requests: **0**. The user selected OpenAI GPT-5.6 Sol as the primary model and GPT-6 Astra as a candidate for difficult pairs and the future verifier; all AI requests are prohibited until the user explicitly confirms that the key has been added. Model access was not tested. Stage 3 as a whole is **not complete**: live B2, model comparison, and B1→B2 await continuation. Stage 4 was not implemented.

## Factual Basis

ROADMAP, TASK_ANALYSIS, the stage 1–2 reports, the benchmark protocol, and the code were reviewed. During planning, typecheck and the 30 existing tests passed; B0 and B1-v2 were recomputed in memory and matched the saved decision/input hashes. When implementation began, uncommitted changes from another task appeared in `web/`, `.gitignore`, README, AI_USAGE, and the package.json web scripts. They were preserved; the UI was not changed in this work.

Node v24.14.1, Nest standalone, and TypeScript were retained. Exact dependencies openai 7.12.1 and zod 4.5.4 were added with the lockfile. Installing the new packages did not call any model APIs. The source supplier_feed/taxonomy/PDF, TASK_ANALYSIS, matching labels, stage2-checks, and historical reports were unchanged. Human verification of the labels remained open; the holdout was not evaluated.

## Implemented

- A shared `AiProvider`, factories/registry using Nest DI, OpenAiAdapter, and a test provider. SDK types/errors are confined to the adapter; Ollama was not yet implemented within the selected boundary.
- Explicit B2 with live/replay, role configuration, caching, and development/full_input request limits. The CLI continues to run B1 by default. There is no automatic key discovery followed by execution, health check, or background API calls.
- Strict structured extraction: additional facts, type/category, exact evidence, and unknown. Five supported additions, with local validation of numbers, subject, conditions, and the full compatible model. B1 facts are not overwritten; incompatibilities and unparsed forms are preserved.
- A separate Sol/Astra matching experiment, disabled by default, over the same B1 review-pair inputs. A model merge cannot authorize compatibility that is unknown or prohibited by code. The verifier and generation were not implemented.
- Shared timeout (60 seconds), up to two retries for transient errors, refusal/incomplete/invalid handling, and request termination on an auth error. Invalid data is not accepted; a partial run preserves all rows, B1 observations, review, report, and failure diagnostics, with exit code 1.
- A cache keyed by hashes of provider/endpoint, model, input, parameters, prompt, and schema; entries are immutable. Replay does not use the network, is not substituted for live, and revalidates the response. Test-origin data is excluded from real benchmark history.
- Schema 3, ai.json, API usage/cost with cache read/write, roles/modes in JSONL, and a separate provisional semantic sample. Schema 1/2 remain readable; unavailable measurements are not converted to zeros.

Architecture, limits, and pricing: [LLM_ROLES.md](../LLM_ROLES.md). Exact commands and parameters: [README](../README.md#b2-local-model-extraction-and-matching-experiment).

## Metric Comparison

The runs below are **code-only**. All quality evaluations are provisional; B2 values have not been replaced with synthetic responses.

| Metric | Accepted B1-v2 | B1-stage3-control-v2 | Repeat | Actual B2 |
|---|---|---|---|---|
| Row accounting | 220/220 | 220/220 | 220/220 | N/A |
| Lost / multiply assigned | 0 / 0 | 0 / 0 | 0 / 0 | N/A |
| Products / non-products | 156 / 4 | 156 / 4 | 156 / 4 | N/A |
| TP / FP / FN | 17 / 0 / 0 | 17 / 0 / 0 | 17 / 0 / 0 | N/A |
| Matching precision / recall | 17/17 / 17/17 | 17/17 / 17/17 | 17/17 / 17/17 | N/A |
| Candidate recall | 17/17 | 17/17 | 17/17 | N/A |
| Hard-negative specificity | 170/170 | 170/170 | 170/170 | N/A |
| False product rejections / missed trash | 0 / 0 | 0 / 0 | 0 / 0 | N/A |
| Review: messages / rows / products | 64 / 64 / 51 | 64 / 64 / 51 | 64 / 64 / 51 | N/A |
| Stage2: categories / facts / reconciliation | 18/18 / 30/30 / 4/4 | 18/18 / 30/30 / 4/4 | 18/18 / 30/30 / 4/4 | N/A |
| Facts / unparsed fragments | 545 / 43 | 545 / 43 | 545 / 43 | N/A |
| Semantic: correct / extra / missing additions | N/A | 0 / 0 / 11 | 0 / 0 / 11 | N/A |
| Semantic precision / recall | N/A | N/A (0/0) / 0/11 | N/A (0/0) / 0/11 | N/A |
| Semantic: types / categories | N/A | 12/12 / 12/12 | 12/12 / 12/12 | N/A |
| Wall time, ms | 72.445 | 71.505 | 89.960 | N/A |
| Pipeline time, ms | 36.770 | 36.999 | 37.558 | N/A |
| API calls / tokens / USD | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | N/A |
| Generation / verifier | N/A | N/A | N/A | N/A |

The comparisons confirm identical decisionsHash values, 0 changed rows or groups, and no mandatory violations. All comparable non-timing metrics are equal. Timings are single observations, not evidence of acceleration. The new semantic-checks measurement evaluates 11 predefined additions over 12 development rows; it does not represent a regression in the previous fact evaluation. The two unknown AeroBuds matching relationships are unchanged.

The initial control/repeat runs (`B1-stage3-control`, `B1-stage3-repeat`) are also preserved. After them, the api.errors counter was clarified: local auth/config errors and replay-cache misses are not errors from an actual request. The final v2 controls were captured from the final code; all four runs have identical decisions. Previous artifacts were not overwritten. Distinct codeHash values identify the iterations.

Artifacts:

- [Control](../reports/B1-stage3-control-v2/report.md), [repeat](../reports/B1-stage3-repeat-v2/report.md), with result.json/report.json/metrics.json alongside.
- [B1-v2 → stage 3 code](../reports/comparisons/B1-v2-to-stage3-offline/comparison.md), [repeat](../reports/comparisons/stage3-offline-repeat/comparison.md), with complete comparison.json files alongside.
- [JSONL history](../reports/benchmarks/stage3-offline/observations.jsonl): **12 runs, 803 observations**; [index](../reports/benchmarks/stage3-offline/summary.json).
- [New provisional checks](../eval/stage3-checks.json), [human-review package](../eval/REVIEW.md).

## Verification

Typecheck and **42 tests** passed. The 30 existing tests preserve B0/B1, matching, prices, scope, rounding, eval, and history. The 12 new tests cover the adapter through a stubbed HTTP transport, strict JSON, refusal/truncation/invalid responses, safe errors, limited retries/timeout, cache invalidation/corruption, evidence/conditions/subject, full variant compatibility, an independent matching profile, DI, partial CLI behavior, preservation of all rows, and isolation of test results from benchmarks.

Test fixture responses provide exactly 11 expected additions and verify that eval detects extra/missing ones. This is **not** Sol/Astra accuracy and **not** actual B2. All such results were created in temporary directories and deleted by the tests. OpenAiAdapter tests use a stubbed fetch with a dummy key; neither OpenAI nor Ollama was called. Billing tests use only in-memory data.

Executed:

```sh
npm install --save-exact openai zod --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run pipeline -- --baseline b1 --semantic-checks eval/stage3-checks.json --out reports --run-id B1-stage3-control-v2
node dist/src/cli.js eval --baseline b1 --semantic-checks eval/stage3-checks.json --out reports --run-id B1-stage3-repeat-v2
node dist/src/cli.js compare --before reports/B1-v2 --after reports/B1-stage3-control-v2 --out reports/comparisons --run-id B1-v2-to-stage3-offline
node dist/src/cli.js compare --before reports/B1-stage3-control-v2 --after reports/B1-stage3-repeat-v2 --out reports/comparisons --run-id stage3-offline-repeat
```

The benchmark was exported with eight historical and four new code-only runs; the full list is saved in summary.json. The IDs above are already used: choose new ones for reproduction. A clean clone and final UI verification remain part of stage 5; the existing demo UI from another task does not mean the full MVP is ready.

## Handoff and Open Items

**The next continuation is to complete stage 3 after the user confirms the key.** First run Sol extraction on 12 development rows, then analyze actual errors and run the full 220-row pipeline with 41 selected request rows. After that, perform replay, B1→B2 comparison, and the acceptance decision. The separate Sol/Astra matching experiment uses the same two B1 review pairs; because their labels are unknown, recommendations require human evaluation and do not automatically increase matching TP.

Do not expand the dictionary or change rules based on the holdout. Do not accept weaker safeguards for completeness. If narrow code checks withhold most Sol proposals, measure this and document the limitation; do not present passing JSON Schema as evidence of semantic support. Recheck pricing before live; model access is unconfirmed. Human verification of all labels/semantic-checks remains open.

The future stage 4 receives immutable raw rows, offers, facts/evidence/conditions, reconciled facts, review, and the AiProvider contract. After B2 is accepted, the generator must use only allowed facts, and the verifier must check the entire text and source rows in a separate step. Astra is only a candidate here. Descriptions/claims/approved text and the verifier are currently absent; their implementation was not started automatically.

Code work began at approximately 11:40 UTC; about 25 minutes elapsed on implementation, verification, artifacts, and documentation, excluding prior planning. No exact focused-time counter was maintained. Time waiting for the model API and user during implementation was 0. The Codex session cost was not measured separately. No commits, pushes, or submissions to the organizers were performed.
