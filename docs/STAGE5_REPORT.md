# Stage 5 — complete: UI, holdout, and compact matching audit

Original implementation date: 2026-09-10 (Asia/Bangkok); updated 2026-09-14. **Stage 5 and the subsequent minimal stage 6 stabilization are complete.** B1/B3 UI, full-input, holdout, and the compact human matching audit are saved. Final audit metric: 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 `unknown`, 0 disagreements ([matching-audit-metrics.json](../eval/matching-audit-metrics.json)). B1-v2 remains the accepted product baseline. The current runtime and backward-compatible UI projection also give both identity-review products a source-grounded draft while keeping `publishedText = null` and routing them to review.

## Actual basis and changes

ROADMAP, TASK_ANALYSIS, stage 1–3 reports, BENCHMARKS, and the code were read; both pages of the source PDF were reviewed during planning. The original UI defaulted to three clearly labeled demo listings, six offer columns, search/review, raw rows, and expandable facts. The build and 42 tests passed. There were no B2/B3 artifacts, descriptions/claims/verifier; the ListingView contract contained only UI placeholders. Uncommitted stage 3 changes were used as the starting state; the user saved them during the work, and the agent made no commits.

Added:
    10|
- `web:prepare -- --run-dir DIR`: validation of result structure and relationships, agreement with the report on decisionsHash and row count; an atomic snapshot with selected run metadata. Test-origin and results containing generation/verifier are rejected. Old reports are not changed.
- Shared validation of nested fields, unique IDs, product/offer/review references, and exact citations with offsets. Integrity validation is not repeated matching or a semantic verifier.
- A real snapshot by default; damaged/missing JSON produces a clear error with the preparation command. URL override also supports the old raw ProductResult, with explicit absence of metadata. Demo fixtures are imported only by tests.
- Provenance, counters, all 220 row outcomes, and a separate section for the four non-products with originals/reasons. `review: 0` in row outcomes does not mean an empty review: 51 grouped products have review flags.
- Source price and stock in raw rows; offer-scope facts in offers; links from SKU/evidence/review to the source row. Related review rows from another product are included so links remain functional. The UI shows extraction rules, scope, conditions, confidence, and reconciliation reasons.
- A responsive table with local scrolling, nonbreaking numeric prices, wrapping of long IDs, a bounded product list, keyboard focus, and aria-expanded. The existing light/dark theme and two-column structure are preserved.

Public backend APIs, pipeline rules, labels, and source JSON/PDF were unchanged. No presumed future claims contract was introduced: it must appear in stage 4.

    20|## Cross-check against the PDF and roadmap

The PDF does not specify a design or product-table columns. The table on the second page is a sample for `LLM_ROLES.md`, while Show it requires one screen with the product, sources, text, and flags. Therefore, visual evaluation concerns readability and content completeness, not a pixel-perfect layout.

The following table records the state of the initial UI iteration on 2026-09-10. The later P0.1–P0.3 additions below are the current continuation and close the B3/human-review gaps noted here.

| Requirement | Before | Now / remaining gap |
|---|---|---|
| Canonical product and sources | 3 demo listings; manual URL to B1 | Prepared B1 by default: 156 products and all 220 rows |
| Offers table | Supplier, SKU, price, currency, stock, condition | Preserved, with offer facts and links added; prices/currencies are not merged |
    30|| Raw rows | Title/specs, supplier/SKU/ID | Also source price/stock and related review rows |
| Category, confidence, uncertainty | Already shown for demo/projection | Real B1 values and reasons; filter for 51/156 products |
| Facts, discrepancies, evidence | Expandable observations | Exact citations and source navigation, scope/conditions/rule; B1 has no real conflict, synthetic conflict tested separately |
| Generated copy and verifier | Demonstration text | Explicitly absent on real data; stage 4 not completed |
| Claim → source and admission reason | Claims absent | Blocked by stage 4 contract/implementation; fact evidence is not presented as claim verification |
| About 20 hand-labelled items | Provisional 14 development / 6 holdout | UI ready; human review open; holdout already revealed offline |
| Matching and verifier quality | Code-based development metrics | Stored B1 comparisons; verifier, natural text errors, useful B3 output: N/A |
| LLM_ROLES table | Four columns with details below | Six PDF columns; implemented, unrun, and future roles distinguished |
| README, WRITEUP, AI_USAGE | README/AI_USAGE and roles; WRITEUP absent | Instructions updated, one-page writeup created, real errors entered in the log |
| Clean checkout / local demonstration | Final check absent | Clean copy of sources, npm ci, pipeline/eval/build, and browser preview checked; this is not a git clone of the published final commit |
    40|
## Metrics before and after

All quality estimates are provisional development. The full input is used for accounting but is not claimed to be labeled ground truth.

| Metric | B1-v2 | Stage 3 control-v2 | Stage 5 control | Stage 5 repeat |
|---|---|---|---|---|
| Row accounting | 220/220 | 220/220 | 220/220 | 220/220 |
| Losses / duplicate assignments | 0/0 | 0/0 | 0/0 | 0/0 |
| Products / non-products | 156/4 | 156/4 | 156/4 | 156/4 |
    50|| TP / FP / FN | 17/0/0 | 17/0/0 | 17/0/0 | 17/0/0 |
| Precision / recall | 17/17 / 17/17 | 17/17 / 17/17 | 17/17 / 17/17 | 17/17 / 17/17 |
| Candidate recall | 17/17 | 17/17 | 17/17 | 17/17 |
| Review: messages / rows / products | 64/64/51 | 64/64/51 | 64/64/51 | 64/64/51 |
| Categories / facts / reconciliation | 18/18; 30/30; 4/4 | 18/18; 30/30; 4/4 | 18/18; 30/30; 4/4 | 18/18; 30/30; 4/4 |
| Semantic recall | N/A | 0/11 | 0/11 | 0/11 |
| Wall, ms | 72.445 | 71.505 | 81.957 | 80.121 |
| Pipeline, ms | 36.770 | 36.999 | 37.224 | 38.409 |
| API calls / tokens / USD | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| Generation / verifier | N/A | N/A | N/A | N/A |
    60|
All three comparisons are comparable, decisionsEqual=true, changedRowIds is empty, and there are no mandatory violations. Comparable non-timing values are unchanged. Times are separate observations on Node 24.14.1, darwin arm64, with no claim of acceleration; UI build/browser loading is excluded from pipeline timing. Semantic precision is N/A (0/0); zero useful B3 output was not measured because there was no generation.

Artifacts:

- [Control](../reports/B1-stage5-control/report.md) and [repeat](../reports/B1-stage5-repeat/report.md), with result/report/metrics/diagnostics JSON alongside.
- [B1-v2 → stage 5](../reports/comparisons/B1-v2-to-stage5/comparison.md), [stage 3 → stage 5](../reports/comparisons/stage3-to-stage5/comparison.md), [repeat](../reports/comparisons/stage5-repeat/comparison.md), with comparison.json alongside.
- [History](../reports/benchmarks/stage5-offline/summary.json): 14 runs, 963 observations; [JSONL](../reports/benchmarks/stage5-offline/observations.jsonl). Previous runs were exported from the stage3-offline list and preserved without overwriting.

Commands for stored runs (IDs are already taken; select new ones for reproduction):
    70|
```sh
npm run typecheck
npm test
npm run web:test
npm run web:build
node dist/src/cli.js pipeline --baseline b1 --semantic-checks eval/stage3-checks.json --out reports --run-id B1-stage5-control
node dist/src/cli.js eval --baseline b1 --semantic-checks eval/stage3-checks.json --out reports --run-id B1-stage5-repeat
node dist/src/cli.js compare --before reports/B1-v2 --after reports/B1-stage5-control --out reports/comparisons --run-id B1-v2-to-stage5
node dist/src/cli.js compare --before reports/B1-stage3-control-v2 --after reports/B1-stage5-control --out reports/comparisons --run-id stage3-to-stage5
    80|node dist/src/cli.js compare --before reports/B1-stage5-control --after reports/B1-stage5-repeat --out reports/comparisons --run-id stage5-repeat
npm run web:prepare -- --run-dir reports/B1-stage5-control
```

## Checks and reproducibility

**45 backend tests and 3 web tests passed.** New checks: stored B1 passes without object changes; nested defects, duplicates, corrupted citations/references are rejected; disagreement between report and result does not replace the previous snapshot; test/B3 is not presented as a supported run; real projection does not permit publication; HTTP/JSON/schema errors are not replaced with demo; an empty result and synthetic conflict remain correctly marked. The 42 previous tests are preserved.

Browser checks covered: Sony search, OPEN BOX on one offer, USD/EUR without FX; two battery_runtime citations and a link to the PacRim raw row; the filter showing 51 review listings; empty results; Slate with empty specs; and four non-products with reasons. A separate production build from a clean directory showed 156/51/220; a Nimbus search kept Nimbus 2 and Pro separate; no console errors were found.

    90|[Browser-check log](../reports/ui/stage5/browser-checks.json); [UI source hashes](../reports/ui/stage5/source-hashes.json). Expanding a fact with Enter and aria-expanded were checked.

Viewport 1440, 768, 375: scrollWidth matches page width. On mobile, the 620 px-wide table scrolls within its own block. The first fix did not constrain the min-width of grid sections—browser verification found and fixed this; decimal price wrapping was also fixed. PNGs of regular viewports were preserved because the IAB fullPage screenshot produced stitching artifacts:

- [Desktop 1440](../reports/ui/stage5/desktop-1440.png)
- [Tablet 768](../reports/ui/stage5/tablet-768.png)
- [Mobile 375](../reports/ui/stage5/mobile-375.png)
- [Mobile table](../reports/ui/stage5/mobile-offers-375.png)

A temporary clean directory was created from the current tracked/non-ignored sources, without `.git`, `.env`, node_modules, or build. Root and web were installed with `npm ci`; an offline attempt detected that Vite was absent from the cache, and normal installation from the registry completed. Because the shell selected Node 23 in the new directory, installation and all checks were repeated with an explicit PATH to Node 24.14.1. README commands were run: typecheck, test, web:test, pipeline/eval with new my-stage5 IDs, web:prepare, web:build. The production UI was started with `npm --prefix web run preview -- --host 127.0.0.1 --port 4173`; the main development UI with `npm --prefix web run dev -- --host 127.0.0.1`. The decisionsHash values from both clean runs match the stored control. [Machine-readable result](../reports/ui/stage5/clean-environment.json).
   100|
The build passes with two Rollup warnings about comment annotations in the installed Zod; no runtime errors were found. The JS bundle grew from about 204 to 297 kB (gzip ~90 kB) because of shared validation. This is a deliberate local-MVP tradeoff; no new dependencies were added. The clean copy confirms installation of the current sources; a final git clone after all new files are saved remains a user submission procedure.

## Historical handoff from the initial UI iteration — 2026-09-10

The independent part of stage 5 was accepted. The full MVP criterion was not met: there was no live AI/B2, generation/verification of real text, human-verified labels, or final holdout. README, LLM_ROLES, WRITEUP, and AI_USAGE reflect exactly this state; missing metrics are not presented as zero quality.

At that historical handoff, the continuation was to complete stage 3 after the user's message about the key, then implement and measure stage 4. After an accepted B3, the plan was to integrate stored claims/verdicts/permitted text, fix rules/prompts, evaluate holdout once, and update the final deliverable set. The projection at that time deliberately created null draft/published values; this limitation was later removed by the completed B3 integration and the final identity-review draft fallback described at the top of this report. Viewing a snapshot is not AI replay; actual replay still requires a compatible saved cache.

Rules/prompts were not tuned on holdout. Stages 3–4 were not run automatically, the API was not called, and there was no publication/deployment/submission or agent commit/push. Exact focused time was not recorded; the work crossed a user pause, so elapsed time cannot be presented as focused implementation time.
   110|
## Handoff from stage 4 — 2026-09-10

This entry supplements the historical status above; the stage 5 UI was not changed as part of stage 4. The B3-v1 contract and development artifacts are ready: [live](../reports/B3-openai-development-live-v4/report.md), [offline replay](../reports/B3-openai-development-replay-v4/report.md), [B1→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md), [live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md), and the complete [stage 4 report](STAGE4_REPORT.md).

Development: 37/39 ready, 2 identity review, 0 withheld; controlled verifier human-verified—unsupported 4/4, false block 0/7, disputed leakage 0/1, errors 0. B1 `decisionsHash` is unchanged; replay has the same `publicationHash`. OpenAI live: 86 calls, 151618 tokens, $2.6475128, 0 errors/retries; replay: 86 cache hits, 0 calls.

The historical blocker at the time of this handoff was generated human review; the user confirmed the controlled suite of 12 cases on 2026-09-11. The review sample was later accepted in P0.1, and P0.2 eliminated four non-atomic spans and fixed a new [human-gate replay](../reports/B3-openai-development-verifier-only-v2-human-gate-replay/report.md). The development safety gate was accepted; full-input B3, holdout, and final evaluation remain separate steps. Historically, `web:prepare` rejected schema 4/B3; this limitation was removed in a separate stage 5 assignment.

## Narrow addition: B3 claim review — 2026-09-11
   120|
In a separate assignment, only display and human labeling of stored B3 were integrated. `web:prepare` now builds a validated B3 review bundle; the existing screen received a Catalog / Claim review switch. Generated view groups 158 claims by 37 published products, highlights exact ranges, and shows verifier reason, supports, and source evidence. Controlled view shows 12 fixed cases, expected verdict, and actual atomic claims.

The generated verdict/rationale draft is stored only in `localStorage`, bound to `publicationHash`; the source run is not modified, and the UI does not call models or network. The real development bundle, both tabs, and draft restoration after reload were checked. The user confirmed all 12 controlled cases; the generated human gate was later completed in P0.1. At the time of this historical addition, full-input B3, holdout, final evaluation, and deployment had not yet been performed.

After user review, terminology was clarified: the screen is called **Check listing text** and explicitly limits the task to fidelity review. Generated wording is shown beside the supplier statement; supplier specs are labeled as an unverified input feed, while external truth is unavailable without an authoritative manufacturer URL. Verdict buttons describe agreement with supplied data, and the 12 QA fixtures were moved to an explained **Verifier test cases** screen and do not require human labeling.

The next narrow UX revision removed the need to keep the screen structure in memory: a three-step onboarding guide was added at the top, and each card repeats the current product and sentence number. The system sentence and source supplier text now form one numbered pair, immediately followed by the decision question. The automatic verifier response is hidden in an optional expandable section until needed as an explanation; pipeline, claims, and stored verdicts were unchanged.

## P0.1: final generated-review workflow — 2026-09-11
   130|
The review UI moved to `stage4-generated-review-v2`: the automatic verdict no longer looks human-selected, and a claim becomes `reviewed` only after separate confirmation with both a human verdict and rationale. Atomicity and copy-quality problems are flagged independently of the factual verdict. Progress shows exact claims/products/sample denominators; export receives `human_verified` after completion of the fixed sample of 20 listings and entry of a reviewer, rather than after all 158 claims.

The historical canonical file `eval/generated-review-e478435a3d39.json` contains 120/158 claims, 28/37 listings, sample 20/20, and status `human_verified`; it is preserved without overwriting. Old localStorage is migrated by `productId + attempt + claimId`, but cannot overwrite repository-backed reviewed decisions. A discrepancy/issues filter and explicit human/AI verdict comparison were added to the UI. `web:prepare --generated-checks` attaches the file without changing the stored run.

## P0.2: development safety gate — 2026-09-12

Verifier prompt v2 and the local fail-closed validator prohibit truncated `is a`/`has a` and values without the attribute being measured. After a diagnostic full development live run, a verifier-only run was performed over frozen human-reviewed texts: the generator was not called, 49 verifier calls, 125333 tokens, $2.390245, controlled 12/12, 37/39 ready, and 0 prohibited spans. All 37 published texts are byte-for-byte identical to the original human-reviewed artifact.

The new canonical `eval/generated-review-fdca0138d88f.json` has status `human_verified`: claims 76/99, products 28/37, sample 20/20, factual errors 0, non-atomic 0, unclear-copy 2. The remaining 23 pending claims are outside the required sample and do not block the gate. Offline replay produced 49 cache hits, 0 calls, and the same `decisionsHash`/`publicationHash`; the development gate was accepted.
   140|
After separate authorization, full-input B3 was run: 154/156 ready, 2 identity review, 0 withheld, 213 covered rows, and 390 atomic claims. Live made 322 calls, 526449 tokens, $8.110955; one invalid verifier response was rejected and recovered by the single repair. Offline replay without network reproduces the hashes and has `success`.

## P0.3: holdout and matching-review contract — 2026-09-12

Evaluation and provenance now carry explicit `split=development|holdout`. CLI accepts `--split`; B3 holdout fail-closed is allowed only with `--ai-mode replay --ai-cohort full_input`, making an accidental live/model call impossible. Reports print the selected split, and matching/non-product metrics receive the correct scope.

The first holdout was run from the stored full-input cache without network or new model calls: [report](../reports/B3-openai-full-input-atomic-v2-holdout-replay/report.md). Result: `success`; 6 cases / 49 rows; TP/FP/FN 22/0/0; precision/recall/candidate recall 22/22; true negatives 1154/1154; hard negatives 256/256; non-products 49/49; unknown/unevaluated pairs 0/0. Runtime: 0 calls, 0 tokens, $0, 321 successful cache hits. Publication remains 154/156 ready, 2 identity review, 0 withheld, with the same hashes. Quality honestly remains `provisional`: `eval/labels.json` has not yet been human-confirmed.

`web:prepare` validates extended matching labels against the report hash, as well as a separate `stage5-matching-audit-v1` against the labels hash and stable row IDs. After mobile testing, the final UX screen was reduced to two tabs: Catalog + Review. Review displays 20 independent questions (14 development / 6 holdout), one pair or row per screen, with three explicit answers. The provisional answer is not shown. Export of `matching-audit-human-verified.json` is enabled only at 20/20 with a nonempty reviewer; the draft is bound to the version and `decisionsHash`.
   150|
Holdout has been revealed. Matching rules/prompts must not be changed, and labels must not be silently corrected to improve the evaluation; any such change and rerun must be called post-holdout development. The final UX replaced heavy family partitions with 20 atomic questions and two tabs, Catalog + Review. The user independently completed every question; the `matching-audit-human-verified.json` export has reviewer `Serjo`, a valid ISO date, a matching labels hash, and 20 stable items.

Validation produced 13 `same_product`, 4 `different_product`, 1 `non_product`, and 2 `unknown`. All 18 defined decisions agree with the pipeline; unknown was not counted as success: agreement 18/18, coverage 18/20, disagreements 0. The export and metric are saved as [matching-audit-human-verified.json](../eval/matching-audit-human-verified.json) and [matching-audit-metrics.json](../eval/matching-audit-metrics.json) (`human_verified`, post-holdout validation). The extended 20 family cases (108 rows / 70 groups) remain provisional. Deployment and submission to organizers were not performed by the agent. Stage 5 is closed; the bounded stage 6 modular stabilization was completed on 2026-09-14 without changing product decisions, prompts, or human labels.
