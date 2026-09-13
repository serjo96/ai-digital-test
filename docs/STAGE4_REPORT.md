# Stage 4 — generation, claims, and B3

> Historical report on the boundaries of stage 4. The phrase “holdout was not run” refers to the point when this stage was closed; the subsequent holdout and matching audit are described in [STAGE5_REPORT.md](STAGE5_REPORT.md) and [NEXT_STEPS.md](NEXT_STEPS.md).

Updated: 2026-09-12. Status: stage 4 complete. Human review and the P0.2 development safety gate were accepted; full-input B3 was run after separate authorization and is reproducible offline. Holdout was not run.

## Actual starting point

- Product baseline remained B1-v2: 220/220 rows accounted for, 156 products, 4 non-products, TP/FP/FN 17/0/0.
    10|- `decisionsHash` before and after the publication pipeline: `749beaa9a87ba02530fd3db35841780cf6f2816f28d6764906b2f7652d6e461e`.
- Node 24.14.1; after the full-input status fix, 72 backend and 13 web tests, typecheck/build pass.
- OpenAI is integrated through the Responses API and Structured Outputs. The generator is `gpt-5.6-sol`; the verifier is a separate `gpt-6-astra`; reasoning is `low`.
- The secret is loaded from local `.env` through `AppConfig` and is not written to reports, cache keys, or prompts.

## Implemented contract

`--baseline b3` always builds the B1-v2 catalog and then runs the publication pipeline; B2 results are not used. Report schema v4 adds `listings`, a separate `publicationHash`, controlled/generated claim evaluation, and AI metrics broken down by role.

P0.1 added `stage4-generated-review-v2`. Every claim has an explicit `pending/reviewed` status, a separate nullable human verdict, rationale, and independent `non_atomic_claim`/`unclear_copy` flags; the stored model verdict is no longer a human decision. Human review requires a fully reviewed fixed sample of at least 20 published listings and displays exact claims/products/sample denominators. The full-input gate is additionally blocked by factual errors and unresolved `non_atomic_claim`; `unclear_copy` is tracked as a separate metric. All 158 claims remain in the file for hash/key integrity, but reviewing all of them is not required.
    20|
Generation is allowed to use only identity without internal conflicts and `agreed` product-scope facts with `acceptedFactId`, source evidence, units, scope, and conditions. Offer condition/warranty, conflict/incomparable, unparsed text, unsupported category, and B2 additions are not passed as allowed facts.

The verifier receives the full draft, raw rows, allowed supports, reconciliation decisions, and review context. Claims must have exact non-overlapping ranges, full coverage of meaningful text, valid support/decision IDs, and exact source citations. For stable range calculation, `textLength` and deterministic `indexedText` were added to the input; the code still rechecks `text.slice(start,end) === claim.text`. Any ambiguity fails closed as `error`.

Only fully covered text whose claims all have verdict `supported` is published. The first unsafe verdict or error permits one repair attempt by the same Sol and full reverification by Astra; a second failure withholds the entire text. Identity ambiguity blocks the listing; missing specs/uncertain category/a separately withheld fact do not themselves block a minimally safe description.

Configuration [stage4.openai.json](../config/stage4.openai.json): Sol 1024 output tokens, Astra 4096, 60 seconds per attempt, at most two retries only for transient errors, one repair. Prices and their verification date are stored in the configuration. Cache v2 is immutable: each live run uses a new directory, and replay repeats all local checks without network access.

## Controlled suite and development run
    30|
[stage4-claims.json](../eval/stage4-claims.json) contains 12 human-verified development examples: 7 supported, 4 unsupported, and 1 disputed. They cover identity, ANC, battery with case, mass, storage/speed with `up to`, an altered number, another product/accessory, a removed qualifier, offer condition, and incomparable Nimbus power. No holdout exists. The user reviewed the separate Controlled tab and confirmed the suite without changes on 2026-09-11; metadata and report were advanced together by a new replay. Human instructions: [eval/REVIEW.md](../eval/REVIEW.md).

The authoritative live artifact is [B3-openai-development-live-v4](../reports/B3-openai-development-live-v4/report.md). Diagnostic partial runs are preserved before it: a sandbox-network failure, followed by two fail-closed runs that detected inaccurate Astra offsets. The validator was not weakened; an explicit index map was added to verifier input.

| Metric | Result |
|---|---:|
| Controlled unsupported detection recall | 4/4 = 1.0, human-verified |
| Controlled false-block rate | 0/7 = 0.0, human-verified |
| Controlled disputed leakage | 0/1 = 0.0, human-verified |
    40|| Controlled structural errors | 0 |
| Development products | 39 |
| Drafts / ready / withheld / identity review | 37 / 37 / 0 / 2 |
| Ready rate | 37/39 = 0.9487179487 |
| Rows covered by ready listings | 52 |
| Repair attempted / succeeded | 0 / 0 |
| Claims in generated human-review file | 158 |
| Human-reviewed generated claims | 120/158, human-verified sample |
| Fully reviewed published products | 28/37 |
| Completed required sample | 20/20 |
    50|| Human factual verdicts other than `supported` | 0 |
| Non-atomic / unclear-copy claims | 4 / 2, explicitly accounted |

Live made 86 API calls: 12 controlled verification, 37 generation, 37 verification; 0 errors, 0 retries. Input/output tokens: 123520/28098, total 151618. Estimated cost using stored prices: $2.6475128. Median/p95: controlled Astra 6.245/7.387 s, Sol 1.937/2.954 s, publication Astra 9.014/17.801 s. Repair was not invoked, so its latency/cost is N/A, not a measured zero-quality value.

[Offline replay](../reports/B3-openai-development-replay-v4/report.md) produced 86 cache hits, 0 network calls, and the same `decisionsHash`/`publicationHash` (`e478435a3d39afd21969ec549a47a41fb55dfa6c7f4cd4db48c2a71d01484ce3`). [Live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md) has `publicationEqual=true`, `decisionsEqual=true`, empty changed row IDs, and no violations. [B1-v2→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md) is also comparable without violations: matching, offers, facts, review, and row outcomes are unchanged. History: [stage4-openai-development-v4](../reports/benchmarks/stage4-openai-development-v4/summary.json).

[Human-review replay](../reports/B3-openai-development-human-gate-v2/report.md) reused the same 86 cache entries and made 0 API calls. It preserved `decisionsHash` and `publicationHash`, recorded controlled `human_verified` 12/12 and generated `human_verified`: claims 120/158, products 28/37, sample 20/20, factual errors 0, non-atomic 4, unclear-copy 2. This is the authoritative review artifact after P0.1, but it does not permit the full-input gate: four non-atomic issues remain unresolved.

## Historical human gate and handoff
    60|
Historical [generated-review.json](../reports/B3-openai-development-live-v4/generated-review.json) remains the immutable v1 run template. The user export is preserved as canonical [generated-review-e478435a3d39.json](../eval/generated-review-e478435a3d39.json) v2: 120/158 claims, 28/37 fully reviewed listings, and 20/20 listings in the fixed sample. The Controlled suite has already been human-confirmed and does not require another review. The pipeline validates metadata and hash binding and prohibits holdout in the development suite.

At this historical artifact, manual labeling no longer blocked the stage, but four non-atomic spans remained unresolved structural issues. Their fix and repeated development check are described below. Fully closing stage 4 now requires full-input live/replay, performed only in a separate subsequent assignment.

## P0.2 — offline atomicity fix

The verifier moved to schema name `publication_verification_v2`. The prompt now explicitly prohibits ending a claim with `is a`/`has a` or separating a value from the attribute being measured, and includes correct Quill/Pulse examples. Independently of the model response, the local semantic validator rejects such spans fail-closed. Regression tests cover both patterns.

An audit of the historical 158 claims found six published spans of this class: four already flagged by a human, while `The TaskFlow K2 is a` and `The Cobalt Lite is a` were among pending claims. The controlled response also contained `Onyx Lite is a` and bare `256 GB`. These flags were not automatically applied to canonical human labels; the new live run must resegment the entire class.
    70|
The new verifier prompt changes the cache key, so the old replay could not prove the fix. The first sandboxed attempt, [B3-openai-development-atomic-v2-live](../reports/B3-openai-development-atomic-v2-live/report.md), is preserved as a diagnostic partial run: 49 jobs and 147 transport attempts ended with `network`; tokens/cost are unknown. After explicit network authorization, the [development live](../reports/B3-openai-development-atomic-v2-live-network/report.md) completed successfully: 88 calls, 134019/24398 input/output tokens, $2.619013, 0 errors/retries. One repair removed unsupported `up to` from Nimbus 2 Pro. Result: controlled 12/12 without errors, 37/39 ready, 2 identity review, 0 withheld, and 0 prohibited atomicity patterns among 102 claims.

[Offline replay](../reports/B3-openai-development-atomic-v2-replay/report.md) reproduced 88 responses from cache without network and preserved `decisionsHash=749beaa9...` and `publicationHash=15dee06a...`. [Live→replay comparison](../reports/comparisons/B3-openai-development-atomic-v2-live-to-replay/comparison.md) has `decisionsEqual=true`, `publicationEqual=true`, empty changed row IDs, and no violations.

The new live run also regenerated descriptions: 17/37 published texts changed, and the verifier coarsened segmentation from 158 to 102 claims. Therefore, exact transfer by stable keys preserved only 3/120 reviewed keys and no claims in the required sample; the intermediate bundle had 55/55 sample claims pending. This diagnostic result did not become the new human baseline.

After separate authorization, `--publication-source` was implemented: the mode is available only for B3 development, validates compatibility and hashes of a stored successful real run, freezes its published texts and generation records, and calls only the verifier. [Verifier-only live](../reports/B3-openai-development-verifier-only-v2-live/report.md) made 49 calls—12 controlled and 37 publication verification—with no generation role; 103361/21972 input/output tokens, total 125333, $2.390245, 0 errors/retries. All 37 published texts are byte-for-byte identical to the [original human-reviewed run](../reports/B3-openai-development-human-gate-v2/report.md). Result: controlled 12/12, 37/39 ready, 2 identity review, 0 withheld, and 0 prohibited atomicity patterns among 99 claims.

Migration of the new review first uses the exact key `productId + attempt + claimId`. With unchanged published text, it also transfers only `reviewed + supported` decisions where a new claim is fully covered by previous reviewed spans without alphanumeric gaps. If the only old problem was `non_atomic_claim`, the new span clears that flag only after passing the atomic-v2 validator; other issue flags are preserved. The new canonical [generated-review-fdca0138d88f.json](../eval/generated-review-fdca0138d88f.json) has `human_verified`: 76/99 reviewed claims, 28/37 products, sample 20/20, factual errors 0, non-atomic 0, unclear-copy 2. The remaining 23 pending claims are outside the required sample.
    80|
[Human-gate replay](../reports/B3-openai-development-verifier-only-v2-human-gate-replay/report.md) produced 49 cache hits and 0 calls, preserving `decisionsHash=749beaa9...` and `publicationHash=fdca0138...`. [Live→human-gate comparison](../reports/comparisons/B3-openai-development-verifier-only-v2-live-to-human-gate-replay/comparison.md) has `decisionsEqual=true`, `publicationEqual=true`, empty changed row IDs, and no violations. The development gate was accepted; at this point full-input and holdout had not yet been run.

## Full-input B3 — 2026-09-12

After separate authorization, [full-input live](../reports/B3-openai-full-input-atomic-v2-live/report.md) was run: 156 products, 154 drafts/ready, 2 identity review, 0 withheld, and 213 rows covered by ready listings. It produced 390 published claims, with no prohibited atomicity patterns. The Controlled suite again passed 12/12.

Live made 322 calls: 12 controlled verification, 154 generation, 155 verification, and 1 repair; 442677/83772 input/output tokens, total 526449, cost $8.110955, transport retries 0. For Vertex Plus, the first verifier response distorted one support ID; local semantic validation rejected it fail-closed, after which the one allowed repair and full reverification succeeded. The final listing was `ready`; no factual claims were admitted from the invalid response.

The original live report has `status=partial` because the old bookkeeping treated any intermediate error as an incomplete run, even after a safe terminal repair. The status contract was narrowly fixed: B3 can treat such an error as recovered only when there are no controlled errors or withheld listings; fail-closed behavior is preserved for B2 and unrecovered B3 errors. [Offline replay](../reports/B3-openai-full-input-atomic-v2-replay/report.md) revalidated the same cache without network and has `status=success`, 154/156 ready, and the same `decisionsHash=749beaa9...`/`publicationHash=7de47155...`. The [comparison](../reports/comparisons/B3-openai-full-input-atomic-v2-live-to-replay/comparison.md) has `decisionsEqual=true`, `publicationEqual=true`, empty changed row IDs, and no violations.
    90|
After the main stage 4 work, a separately authorized assignment added the human-review UI. `web:prepare` accepts stored schema 4/B3 and verifies `decisionsHash`, `publicationHash`, generated review, the controlled suite, and stored verifier records. Generated/Controlled tabs show exact ranges, verdict, reasons, and evidence; generated labels are saved locally and exported without automatically writing to the repository. The `--generated-source-run` and `--generated-review-out` options support coverage migration and a separate canonical review without rewriting the run. This does not close stage 5: holdout, full-input B3, final evaluation, deployment, commit, and push were not performed.
