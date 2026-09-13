# Shelf Ready — MVP roadmap

Updated: 2026-09-13. Status: stages 1–5 are complete; B1-v2 is accepted. Stage 3 was a completed experiment with a negative B2 decision (local Ollama extraction/shadow matching did not pass the quality gate; the prepared OpenAI B2 path was not run live). A separate B3 uses OpenAI only for publication generation and claim verification on top of ready B1 supports. P0.1/P0.2 produced a human-verified development gate: controlled 12/12, generated sample 20/20, factual/non-atomic errors 0/0. Full-input B3 is complete: 154/156 ready, 2 identity review, 0 withheld, 213 covered rows and 390 atomic claims; offline replay has the same hashes. Holdout replay was performed without network access. A compact post-holdout matching audit is saved in the repository: 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 unknown, 0 disagreements ([matching-audit-metrics.json](../eval/matching-audit-metrics.json)). Stage 6 modular refactoring is not started and is optional. Details: [STAGE4_REPORT.md](STAGE4_REPORT.md); [STAGE3_REPORT.md](STAGE3_REPORT.md); [STAGE5_REPORT.md](STAGE5_REPORT.md); [metrics history](BENCHMARKS.md).

This document is the entry point for development in separate chats. The current short handoff and next executable block: [NEXT_STEPS.md](NEXT_STEPS.md). The roadmap defines stages, priorities, assumptions, and evaluation rules. Initial analysis and data examples: [TASK_ANALYSIS.md](TASK_ANALYSIS.md). Where it differs from open questions in the initial analysis, apply the MVP decisions from this roadmap; the PDF requirements remain in force.

## 1. Goal and scope

Produce canonical products from 220 supplier rows, each with one category, normalized offers, traceable attributes, short verified descriptions, and a queue of uncertain cases. Demonstrate quality on a small human-verified sample and explain which work is performed by code and which by models.

First, create a working code foundation and a measurable baseline. Then choose AI approaches based on specific errors. The code baseline is an intermediate result, not a substitute for the required AI component: the final result must include real model calls and justification of their roles.

Not included in the MVP: auth, deployment, multi-tenant, exchange rates, an external product catalog, vector database, distributed queues, a universal parser for arbitrary supplier feeds, or a full admin interface. One local process/application, file-based inputs, and saved results are sufficient. Choose and record the stack at the beginning of stage 1 based on familiarity and implementation speed; a separate stack investigation is unnecessary. For stage 3, the user selected OpenAI Sol and Astra; the working OpenAI adapter is separated from the pipeline by a shared contract. Ollama is connected through the same contract as an experimental development provider; rules and schemas are shared.

### Priorities

- **P0 — required:** account for every row; preserve originals; separate product and offer; protect against false merges; evidence; withhold disputed and unsupported claims; eval; real AI calls; required documents; minimal screen.
- **P1 — improve after a working P0:** merge completeness, boundary-classification quality, reduction of unnecessary review, ease of inspecting errors.
- **P2 — only when measured need warrants it:** embeddings, additional models, multi-stage text correction, expanded UI editing.

The PDF constraint is approximately 5–6 hours of focused work. Implementation guideline: stage 1 — 70 minutes, 2 — 65, 3 — 65, 4 — 65, 5 — 65; 330 minutes total and up to 30 minutes of reserve. This is a guideline, not a promise: track actual time, including labeling. If time runs short, reduce P2/P1 and honestly describe unfinished work; do not conceal the absence of verification or AI. Account for waiting on the API/user response separately.

## 2. Initial MVP decisions

| Topic | Decision |
|---|---|
| Source | Process JSON. The PDF example with a matching row_id is not an additional source of facts. Do not overwrite original files. |
| Product | The canonical entity is a model and a distinguishable variant. Do not erase explicit differences in Pro designation, generation, capacity, color, switches, or bundle. Do not automatically treat a missing value as either a match or a contradiction. |
| Offer | Supplier, SKU, price, stock, condition, and seller terms are stored separately. OPEN BOX is not a new model. Do not automatically sum stock. |
| Prices | Amount + currency, with the original string preserved. Treat `$` as USD—an explicit assumption. Store monetary values without binary arithmetic errors. No FX and no single “best price” across currencies. |
| Sources | No supplier is privileged. A majority, minimum, or average does not prove the truth of a disputed attribute. |
| Conflicts | Withhold the disputed attribute, preserving observations and the reason. Other facts may pass if product identity is sufficiently certain. An unresolved merge blocks publication of the merged card. |
| Incompleteness | Unknown remains unknown. Empty specs do not make a product trash. The title is also a source; the first word is not automatically the brand. |
| Units | Normalize compatible quantities; preserve meaning, conditions, and qualifiers. Define rounding tolerance explicitly for supported fields; do not introduce one universal percentage for everything. |
| Categories | Only the 12 taxonomy values. Ear tips, tablet cases, and laptop sleeves → other; ordinary mice without gaming indicators → other; USB-C hubs → chargers_cables. These are working boundary rules, not the client’s ground truth. Non-products receive a separate status, not other. |
| Description | Short, neutral English text, generally 1–3 sentences with no required minimum number of specs. Do not supplement information with external knowledge. |
| Publication | Local readiness status and allowed text, without external publication. Draft and allowed versions are distinct. A verification error does not permit publication. |
| Review | A queue with reasons and evidence is sufficient; manual editing/approve workflow is not required. Confidence is tied to a specific decision; begin with high/medium/low and reasons, without presenting it as a probability. |
| Labeling | About 20 meaningful matching cases and related claim examples. An AI draft becomes ground truth only after human review. |
| API | Per the PDF, the organizer provides the key. Request it before stage 3 if it has not yet been received. Earlier code stages are not blocked; do not store secrets in the repository. |

## 3. Minimal data model and division of responsibility

Entities are needed for traceability, not to build a universal framework:

- **SourceRow / Offer:** original record, normalization results, processing state, and diagnostic reasons.
- **Fact:** attribute, value, unit, qualifiers/conditions, product or offer ownership, row_id, field, and source quote. A derived normalized value preserves the original observation and transformation rule.
- **CanonicalProduct:** ID, source row_ids, identity signals, category, confidence, and decision reasons.
- **ReconciledFact:** all observations, reconciliation status, allowed value, or withholding reason.
- **Listing / Claim / ReviewItem:** draft, verified claims and evidence, final text/status, review reasons.
- **RunReport:** input and configuration versions, metrics, errors, time; later, model, prompt, calls, and cost.

Code is responsible for the schema, identifiers, parsing unambiguous values, arithmetic, checking quote presence, explicit incompatibilities, applying publication policy, and calculating metrics. The model later assists with semantic extraction, ambiguous matching/categories, generation, and semantic verification. The presence of a verbatim quote does not prove entailment: the model and evaluation must account for the subject and conditions being discussed.

## 4. Stages — one stage per separate chat

| Stage | Result | Dependency | Status |
|---|---|---|---|
| 1. Code foundation and measurable baseline | Runnable project: load → normalize → simple matching → report; eval path | Source files | Completed |
| 2. Reliable product and fact decisions | Reconciliation, categories, evidence, review, and improved code baseline | Stage 1 | Completed; B1-v2 accepted |
| 3. AI for identified semantic errors | Real structured extraction/matching and comparison with baseline | Stage 2, API | Completed experiment with a negative B2 decision; B1-v2 retained; see STAGE3_REPORT |
| 4. Publication generation and verification | Full pipeline with measured verifier and allowed text | Stage 3 | Completed: development gate and full-input live/replay saved |
| 5. Screen, final evaluation, and handoff | Verifiable local MVP, final benchmark, and documents | Stage 4 | Completed: UI, gates, holdout, and repo-backed matching audit/metrics |
| 6. Modular architecture and development efficiency | Explicit module boundaries, thin orchestration, independent artifact and UI contracts | Completed required results from stages 4–5 | Not started / optional refactoring |

### Stage 1. Code foundation and measurable baseline

**Objective:** obtain the first working pass over all data and the ability to measure changes. Creating the project structure is included here but is not a standalone result.

**Scope:**

1. Choose a simple familiar stack; create the structure, lockfile, run/check commands, `.gitignore`, and a safe configuration example without keys. Start README and AI_USAGE with actual actions.
2. Load both JSON files, validate schema and identifiers, and preserve originals. Normalize whitespace/case for comparison and known price formats; identify obvious trash by content, not by row_id or stock=0 alone.
3. Implement baseline B0: grouping by conservatively normalized title; ambiguous rows remain separate/in review. This is a diagnostic reference with known omissions, not a claim of correct matching.
4. Prepare about 20 evaluation cases with row_ids, expected groups, similar negative examples, and a short explanation. Split cases by product family: approximately 14 development and 6 holdout; do not split related variants between them. Prepare the data for human review. Clearly mark unverified labels as provisional.
5. Build eval that saves a JSON result and a readable report: input audit, matching, error list, and time. Record the first baseline; while there are no verified labels, quality is provisional/N/A, not invented zeros.

**Output:** a run over 220 rows without API; normalized records, B0 groups, draft/confirmed labels, first report, and README commands.

**Completion criterion:** 220/220 rows accounted for without loss or duplicate assignment; a repeated code run gives the same decisions/metrics; eval detects a known false merge and missed pair on a small control example; prices and dangerous cases have meaningful checks. Generation and verifier are N/A for now. Human-unverified labels remain an explicit open item and do not block independent code work.

### Stage 2. Reliable product and fact decisions

**Objective:** build domain rules and observable handling of uncertainty before AI.

**Scope:**

1. Introduce product, offer, and fact entities; extract by code only supported unambiguous formats. Do not write a universal multilingual parser. Preserve unparsed text for the next stage.
2. Add simple candidate search by name/model and checks for explicit incompatibilities. Similarity is a reason to consider a pair, not permission to merge. Check group compatibility so A≈B and B≈C do not join incompatible A and C.
3. Normalize supported units and define rounding rules using Nimbus/LedgerLite examples; distinguish missing values from conflicts and incomparable conditions. Preserve the “up to” qualifier, speed type, “with case,” and offer scope.
4. Classify obvious types by rules into the closed taxonomy; mark the rest for review with other as an allowed category. Add fact reconciliation, confidence with reasons, and a review list.
5. Save B1 and compare it with B0 on development. Add checks for Nimbus/Pro, AeroBuds/ear tips, OPEN BOX, empty specs, and identical templated specs for different models.

**Output:** the code pipeline produces products, offers, facts, categories, conflicts, and review. It is clear which errors require semantic parsing.

**Completion criterion:** key cases are reproducible through individual checks; missing data does not become invented facts; incompatibilities are not lost during merging; B0→B1 metrics and explanations of regressions, if any, are saved. Unresolved semantics are allowed and explicitly listed.

### Stage 3. AI for identified semantic errors

**Objective:** determine what measurable value models add on top of the code foundation.

**Scope:**

1. From B1 errors, determine the needed roles: structured extraction of signals/facts, ambiguous pairs, and categories. Briefly compare suitable available models by quality, response format, and latency. Check current official documentation when choosing; do not choose based only on price. Limit research to 1–2 candidates and one shared small development sample.
2. Connect a real API. Strict output: values + row_id + field + quote, and unknown when data is insufficient. Validate the schema and source existence in code; do not accept unsupported output.
3. Add timeout, limited retries, and handling of invalid responses as review/error. Cache by input, schema version, model, parameters, and prompt. An input/prompt change must not silently use an old response.
4. Pass extracted information through the existing grouping, conflict, and publication rules. Do not let the model bypass explicit constraints or assign supplier authority.
5. Compare B2 with B1; measure extraction errors, candidate recall, and matching. Fill in actual roles in LLM_ROLES, including non-model steps, errors, cost/latency.

**Output:** a reproducible run with a real model, cache, comparative report, and justified allocation of roles.

**Completion criterion:** there is a real successful model run, evidence passes structural checks, and failures are not accepted as success; B1→B2 and decisions based on observed errors are saved. If added complexity does not help, retain the simpler option and document the experiment. Clarification of the agreed plan dated 2026-09-10: architectural integration is complete when real live calls, validation, persistence, replay, and metrics work; the product threshold is evaluated separately. Ollama provided such real calls; the absence of an OpenAI key blocks only the Sol/Astra comparison. Mocks do not replace real results.

### Stage 4. Publication generation and verification

**Objective:** produce short text and verify every claim in it, including context and conflicts.

**Scope:**

1. Generate from allowed facts, not from an uncontrolled merge of raw text. With insufficient data, minimal title-based text or withholding with a reason is allowed.
2. In a separate step, verify the entire generated text against source rows and conflict decisions, not only against the generator’s summary. Atomic claims must cover the entire text; an embedded unsupported adjective is also a claim. A separate call may use the same model but does not guarantee independent verification.
3. Code applies the result: supported may be allowed; disputed/unsupported are withheld; unknown/error blocks the relevant text. After changing text, recheck it in full. At most one repair attempt; then review, without an infinite loop.
4. Prepare and human-check a set of supported claims and controlled distortions on the same product cases: a different number, another product’s attribute, a removed qualifier, wrong scope, conflict. Do not present these synthetic errors as the natural hallucination rate.
5. Measure the verifier and full B3 pipeline result. In addition to fixed distortions, check a small sample of actually generated text; report the two evaluations separately.

**Output:** draft, claims with evidence and verdicts, allowed text or withholding reason, and full B3 benchmark.

**Completion criterion:** verification ran on real text; supported examples are also included; there are no known missed dangerous claims in the accepted verified sample; if there are, repair or explicitly withhold them rather than hiding metrics. Every card receives text/draft or an explainable status. Review and useful output are measured: blocking everything is not success.

### Stage 5. Screen, final evaluation, and handoff

**Objective:** make the result inspectable and reproducible from a clean clone.

**Scope:**

1. One screen: product selection/list and review filter; a card with category/confidence, offers, raw rows, facts/conflicts, draft, and allowed text. A claim links to its source and allowance reason. The screen reads the same saved pipeline result and contains no separate demo logic.
2. Run the final version on 220 rows and evaluate holdout once after fixing rules/prompts. Report development and holdout separately, with absolute errors, matching, verifier, coverage, and time/cost.
3. Complete README, LLM_ROLES.md, one-page WRITEUP.md, and AI_USAGE.md. Record 2–3 trade-offs, actual failures, scope reductions, and a one-week continuation plan. Take AI error stories from the log; do not invent them.
4. Verify installation from a clean clone/environment and run pipeline, eval, and UI. Distinguish replay of saved responses from live API. Without a key, a saved result can be shown, but a new AI run cannot be claimed.

**Output:** local MVP and submission package. Actually sending the repository/ZIP to the organizers is a separate user action.

**Completion criterion:** key screens have been inspected, README commands executed, documents reflect the actual implementation, and the final report is saved. Any gaps relative to the PDF are listed explicitly. If a decision was changed after seeing holdout errors, note that the sample has already been used for development; do not call the repeated result an independent test.

### Stage 6. Modular architecture and development efficiency

**Objective:** after final behavior is fixed, remove coupling between pipeline stages and make changes to one part safe, local, and verifiable. This is stabilization on top of the completed MVP, not a reason to change matching, prompts, publication policy, or the evaluation sample again.

**Observed debt:** `PipelineService` is simultaneously responsible for file I/O, B0–B3 selection, orchestration, human gates, AI runtime, evaluation, metrics, and report persistence; stage-specific behavior is expanding through conditional branches. Domain types are split between `types.ts` and `domain.ts` and are shared coupling points. Web imports internal backend types and a runtime Zod schema through `../../../src`, making the application boundary implicit and including server validation in the browser bundle. Experimental Ollama entrypoints partially duplicate orchestration. The `reports/` directory stores both authoritative results and numerous intermediate/cache artifacts without an explicit retention policy.

**Target boundaries:**

1. Split the system by capability: `catalog` (ingestion, normalization, matching, facts/reconciliation), `publication` (supports, generation, verification, claims), `evaluation` (labels, quality, metrics), `ai` (runtime and provider adapters), `runs` (use cases, gates, persistence/reporting), `contracts` (versioned artifact DTO/schema), and thin entrypoints/composition root.
2. Replace the single conditional `PipelineService.run` with separate B0/B1/B2/B3 use cases or strategies under a shared contract. The CLI should only parse and validate a command, call a use case, and display the outcome; the Nest composition root should only assemble dependencies.
3. Move run file storage, hash/provenance, and reports outside the application/domain boundary. AI and pipeline depend on ports, while OpenAI/Ollama, filesystem, and clock are infrastructure adapters.
4. Create a browser-safe catalog/listing contract as a separate public module or package. Web does not import backend internals; adapters convert B1 and B3 into one versioned view contract. Runtime validation remains at the loading boundary and does not drag unnecessary server dependencies into the UI.
5. Consolidate experimental scripts around the same use cases and persistence API. Define which reports are frozen evidence and which are local cache/diagnostics, and do not inflate Git with repeated heavy results that add no distinct value.
6. Perform the migration in small vertical steps: characterization tests → contracts → run storage → B1 orchestration → B3 orchestration → web adapter. Do not perform a big-bang rewrite or change domain decisions while moving code.

**Completion criterion:** 63 backend and 5 web tests (or an expanded replacement), typecheck, and production build pass; dependency rules prohibit reverse imports and web→backend internals; B1 `decisionsHash` and B3 replay `publicationHash` match the fixed references; CLI commands and fail-closed gates remain compatible or the migration is documented; before/after comparison shows no product regressions. Coverage is no lower than the current diagnostic baseline: 92.27% lines / 85.02% branches for backend. Explicit tests of ports and storage errors are added for key use cases.

**Expected effect:** adding a new provider, publication version, or view does not require changing a central monolith; domain logic is tested without Nest/filesystem/network; the UI receives only a stable contract; authoritative benchmark artifacts are easier to distinguish from temporary experiments.

## 7. Metrics and comparison protocol

### What is currently known

220 rows; 5 suppliers; 12 categories; 23 empty raw_specs; 4 explicitly problematic rows; 169 titles after trim + casefold. These are input statistics, not ground truth. B1-v2: 220/220, 156 products; development TP/FP/FN 17/0/0 provisional on extended family labels. The B2 quality gate was not accepted, so B3 is built on B1-v2. Current OpenAI B3 development gate: controlled human-verified 12/12; generated review v2 human-verified 76/99 claims, sample 20/20. Full-input B3: 154/156 ready, 2 identity review, 390 claims. Holdout replay was saved without API calls. Expanded matching labels cover 108 rows / 70 groups and remain provisional. A separate post-holdout audit is saved in the repository: 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 unknown, 0 disagreements ([matching-audit-metrics.json](../eval/matching-audit-metrics.json)). Artifacts: [STAGE5_REPORT.md](STAGE5_REPORT.md), [STAGE4_REPORT.md](STAGE4_REPORT.md), [BENCHMARKS.md](BENCHMARKS.md).

### Primary metrics

| Metric | Definition and denominator | Introduced |
|---|---|---|
| Row accounting | Number of unique input row_ids with one outcome / 220; lost and duplicate assignments separately | Stage 1 |
| Matching precision | TP / (TP + FP), where pairs are predicted from membership in one final group | Stage 1 |
| Matching recall | TP / (TP + FN), with ground-truth positive pairs being rows of one labeled product | Stage 1 |
| Candidate recall | Found positive ground-truth pairs / all positive pairs; before the merge decision | Stage 2 |
| Unsupported detection recall | Blocked unsupported claims / all labeled unsupported claims | Stage 4 |
| False block rate | Blocked supported claims / all labeled supported claims | Stage 4 |
| Disputed leakage | Allowed disputed claims / all labeled disputed claims | Stage 4 |
| Published claim errors | Unsupported or disputed claims among human-reviewed allowed claims / all reviewed allowed claims | Stage 4 |
| Ready card rate | Ready / all formed canonical cards; show the absolute count and number of rows behind them alongside it | Stage 4 |
| Review | Unique rows affected by review / all input rows; separately, cards in review / all cards and a breakdown of reasons | Stage 2 |
| Performance | Wall time of a full run; separately API errors/calls, tokens and estimated cost, cache hits | Stage 1, expanded in 3 |

If the denominator is zero, the result is N/A, not 0% or 100%. Always show the fraction and absolute TP/FP/FN alongside the percentage. Calculate matching only over fully labeled relationships; do not turn unknown relationships into negatives. Check false merges between different labeled cases, not only within each case. Mark attachment of an unlabeled row as unevaluated, not a success. Where possible, include all rows from the selected family in the input case.

Check categories, trash handling, and extraction of key facts on the same labeled cases: correct/checked plus an error list. Taxonomy validity is separate from semantic category correctness. For a small sample, do not create a complex aggregate “quality score” that hides different errors.

### Rules for accepting changes

1. First fix B0 and the version of verified labels. Then compare every significant change with B0 and the latest accepted version on development. Mark evaluations provisional until human review.
2. Safety goals on verified cases: 0 lost/duplicate rows; 0 categories outside taxonomy; 0 accepted facts without sources; 0 known false merges of key distinct models/accessories; 0 known unsupported/disputed claims in allowed text. These are criteria for this sample, not a promise of universal quality.
3. Do not accept improved recall at the cost of a new critical false merge or missed dangerous claim. Do not accept increased safety achieved by a hidden drop in useful output to zero.
4. After B0, fix actual reference points for recall/coverage/review. Do not set a universal 95% threshold before measurement. If a trade-off is needed, record before/after, specific cases, and the reason for the choice.
5. Change one significant factor per experiment. Save the hypothesis, configuration, result, and decision: accept / reject / defer. Do not run many combinations just to rank models.
6. Use cached replay to compare rules; use fresh API for evaluating live behavior and time. Do not mix these modes. A repeated live run is needed when instability is suspected, not automatically for every edit.

### What to save for each run

Run ID; date; code version and uncommitted-changes marker; feed/taxonomy/labels hashes; split; rules/schema version; model/parameters/prompt when present; live/replay mode; metrics and absolute counts; row/group/claim decisions; error list; time and API usage. Do not overwrite the initial baseline. Do not log keys or secret headers. Provide a readable report diff and an exit code for violated mandatory conditions.

## 8. Risk and experiment register

| Problem / signal | First approach | When to add complexity | How to verify |
|---|---|---|---|
| Different languages/spellings are missed | Normalization + model signals | Candidate recall shows misses: extraction, then embeddings if needed | Candidate recall and final matching, not merely similarity |
| Nimbus/Pro or accessories are merged | Explicit type/variant differences, group check | A semantically ambiguous pair remains unresolved: targeted LLM | New FP, hard-negative cases |
| A–B–C form an incorrect group | Compatibility check when adding to a group | Only if rules do not cover observed cases | Separate example with incompatible A and C |
| A quote exists but meaning is wrong | Preserve subject, scope, and qualifiers | Semantic verification of extraction/claim | Wrong object, “up to,” “with case,” read speed |
| Number conflict/rounding | Unit normalization, comparable conditions, withholding | New real cases require another rule | Nimbus, LedgerLite, AeroBuds; do not average a conflict |
| Empty specs/marketing | Unknown, short text, or review | Additional model only with proven benefit on available text | Invented facts and useful output |
| Everything is blocked | Correct positive claims in eval | Revisit rejection reasons, not remove verification | False block rate, ready/review, preserved facts |
| Model returns invalid schema/fails | Validation, limited retries, review | More reliable model/format after measurement | Failure count, time, successful real responses |
| Time and complexity grow | One pass, file-based results, minimum calls | Only if benefit is proven on a fixed sample | Quality, time, cost, and change size |

The first AI experiment is structured extraction with evidence on top of B1. A possible second is targeted resolution of difficult pairs/categories. Embeddings are a conditional third option, not a roadmap commitment. Generation and verifier are required regardless of these experiments.

## 9. Workflow in a new chat

Starting request:

> Read docs/ROADMAP.md, docs/TASK_ANALYSIS.md, and the current reports. Implement stage N within its boundaries. First verify the project’s actual state and the stage dependency. Save the metric comparison, update the status, and record the handoff to the next stage. Do not automatically implement the next stage.

Before starting: read applicable repository instructions and check git status and previous-stage artifacts. Status in the roadmap does not replace code verification. Do not rewrite the initial analysis or repeat previously rejected experiments without a new reason.

After the stage, update the status row and add an entry below: what was done, verification commands, report paths, before/after values, decisions/assumptions, known errors, next step, and blockers. Record actual AI tools and prompts used in AI_USAGE as work proceeds. Perform commits/push within the user’s current authorization; completing a stage does not itself mean sending anything to the organizers.

### Handoff log

| Date / stage | Completed and verified | Reports / metrics | Open / next step |
|---|---|---|---|
| 2026-09-08 / preparation | Studied the PDF and 220 rows, created analysis, local Git main and origin; initial commit accdc95 | Pipeline quality not yet measured | Begin stage 1. Labels, application, and API run are absent. The organizer promised a key; receipt is unconfirmed. |
| 2026-09-08 / stage 1 | TypeScript/NestJS CLI, npm lockfile, B0, exact prices, audit, 20 provisional cases (14/6), eval, README/AI_USAGE. npm ci, typecheck, and 16 tests passed; sources unchanged. About 17 minutes elapsed, including labeling and checks; timing details in STAGE1_REPORT. React deferred to stage 5. | reports/B0 and B0-repeat; reports/comparisons/before-to-B0 and B0-repeat. Before: pipeline N/A. After: 220/220, losses/duplicates 0/0, groups 165, non-products 4, TP/FP/FN 7/0/10 provisional. Repeat: all deltas 0; wall time 43,058 → 40,680 ms. | Stage 2 not started; next step is B1 within its boundaries and comparison with B0. 10 missed pairs saved; human review of labels remains open, holdout was not evaluated. API not required until stage 3. [Handoff and commands](STAGE1_REPORT.md). |
| 2026-09-09 / stage 2 | Expanded code B1-v2: products/offers, evidence, candidates and group compatibility, units, categories, reconciliation, review. Typecheck and 30 tests passed; B0 and labels unchanged. About 25 minutes elapsed for implementation; details in STAGE2_REPORT. | B0 → B1-v2: TP/FP/FN 7/0/10 → 17/0/0 provisional; 220/220, losses/duplicates 0/0; groups 165 → 156. Review 64 messages / 64 rows / 51 products. Wall 43.058 → 72.445 ms; repeated B1-v2 71.196 ms, decisions identical. JSONL history: reports/benchmarks/stage2-v2. | Stage 3 not started. Handed off 43 unparsed fragments, German AeroBuds, and uncertain Nimbus wattage. Human review remains open; the explanation about missing AeroBuds color was incorrect (schwarz), labels were retained by user decision. API required for stage 3. [Handoff](STAGE2_REPORT.md). |
| 2026-09-09 / stage 3, offline portion | AiProvider/DI, OpenAI adapter, B2 extraction, separate Sol/Astra matching profiles, strict schema/evidence, timeout/retry, cache/replay, schema 3, and provisional semantic-checks. Typecheck and 42 tests pass. Existing web changes preserved. | B1-stage3-control-v2 and repeat: B1-v2 decisions unchanged, 220/220, TP/FP/FN 17/0/0, review 64/64/51. Semantic B1: 0/11 additions. Stage3-offline history: 12 runs, 803 observations. Real B2 metrics N/A. | No model requests before the user’s message that the key had been added. Then complete live B2, comparisons, and acceptance. Stage 4 not started; human review remains open. [Report and handoff](STAGE3_REPORT.md). |

## 10. Final MVP readiness criterion

- All 220 rows have an explainable outcome; canonical products are linked to offers and evidence.
- Normalization, classification, conflicts, descriptions, verifier, confidence, and review are implemented, or a specific gap is honestly stated.
- There are real model calls and a meaningful LLM_ROLES with non-model work.
- About 20 cases are human-reviewed; baseline and final metrics are saved, and errors and sample limitations are described.
- The screen shows the source and decision reason; an unsupported draft is not presented as allowed publication.
- The project runs from a clean clone according to README; submission documents match the actual result.

### Handoff: available portion of stage 5 — 2026-09-10

Under the agreed constraint, the independent portion of stage 5 was implemented: the UI reads saved B1, shows provenance, every row outcome, non-products, offers, and evidence/review links. No demo data is substituted; generation/verifier are marked absent. Added web:prepare, snapshot validation, and six checks. The style was preserved; the PDF contains no catalog mockup, and a compliance table is included in [STAGE5_REPORT.md](STAGE5_REPORT.md).

Typecheck, 45 backend tests and 3 web tests, build, and clean installation passed. Control/repeat `reports/B1-stage5-control` and `reports/B1-stage5-repeat` preserved the B1-v2 decisionsHash: 220/220 rows, 156 products, 4 non-products, TP/FP/FN 17/0/0, review 64 messages / 64 rows / 51 products. Wall 81.957 / 80.121 ms; API 0. History `reports/benchmarks/stage5-offline`: 14 runs, 963 observations. Comparisons with B1-v2, stage 3, and the repeat were saved; quality provisional, holdout not evaluated. Detailed commands, visual checks, clean-environment limitations, and screenshots are in the report.

**Historical stage 5 handoff (stage 3 update below; superseded by the 2026-09-13 addendum):** OpenAI awaits an explicit message that the key is available; stage 4 requires a separate assignment; return to stage 5 to display real claims/verdicts/allowed text and perform the single final holdout evaluation after rules are fixed. The current snapshot contract does not replace the future listing contract: web:prepare rejects results containing generation/verifier. Human review of labels remains open. Stages 3–4, live API, final B3, submission to organizers, and deployment were not run automatically. At that historical moment, stage 5 as a whole was not closed.

**Addendum 2026-09-13:** B3 listing/claim review is complete and stored in artifacts; the final UI shows Catalog + one compact Review. The user confirmed controlled 12/12, generated sample 20/20, and answered 20 atomic matching questions. The export and metric are saved as `eval/matching-audit-human-verified.json` and `eval/matching-audit-metrics.json`: 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 unknown, 0 disagreements (post-holdout validation). Stages 1–5 are complete; stage 6 is optional and not started; holdout has already been revealed.

### Handoff: stage 3 / Ollama — 2026-09-10

**Architectural integration is complete; product quality on development is not confirmed.** Qwen qwen3:4b: JSON/schema 12/12, semantic 2/12; proposed correct/extra/missing 11/38/0, accepted 3/0/8. Matching schema-v3: validation 1/8, dangerous merges 4, unsupported unknown merges 2; ProductResult exactly matches B1. Gemma gemma4:12b is present locally, but the server could not load the model (12 tasks / 24 HTTP attempts), so its quality is N/A and shadow did not run.

The full AI run was not admitted. B1-v2 remains the accepted product baseline; Ollama and local models are an experimental development baseline. The initial failed matching-schema-v2 attempts and the new compatible v3 schema were saved in a separate experiment; extraction/prompt/labels did not change. Total: 61 inference attempts / 20 retries; OpenAI 0. Final offline verification of raw JSON, validation, decisions, and quality matched without network access. Typecheck, 54 backend + 5 web tests pass.

[Report and detailed handoff](STAGE3_REPORT.md), [comparison](../reports/stage3-ollama-v2/comparison.md), [complete JSON/JSONL summary](../reports/stage3-ollama-final-verification/summary.json). Human review remains open; holdout was not evaluated. OpenAI remains deferred until an explicit message that the key is available. Stage 4/generation/verifier have not started; proceeding requires a separate assignment. Stage 5 materials and catalog preparation are preserved.
