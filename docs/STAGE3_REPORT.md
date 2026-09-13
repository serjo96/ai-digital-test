# Stage 3 — architectural integration complete, product baseline B1-v2

> Historical B2 outcome. Later B3, human review, and holdout are described in [STAGE4_REPORT.md](STAGE4_REPORT.md), [STAGE5_REPORT.md](STAGE5_REPORT.md), and the current handoff [NEXT_STEPS.md](NEXT_STEPS.md).

Date: 2026-09-10. **Architectural integration is complete:** real local calls, validation, storage of raw responses/failures, repeated JSON parsing during offline replay, and metrics work. **Product quality on development has not been confirmed.** Qwen did not pass the strict threshold; Gemma could not load, so its quality is N/A. A full AI run on 41 problematic rows was not performed. The accepted baseline is **B1-v2**, with matching strictly shadow/advisory.

OpenAI calls: **0**. No key was received, and OpenAI remains disallowed until an explicit user message. Stage 4, descriptions, and the final verifier were not implemented. Labels are provisional, human review remains open, and holdout was neither evaluated nor used for tuning.

## Basis and dependencies
    10|
After the pause, HEAD **61d740c** was rechecked and the working tree was clean. The original plan referenced 63ae872; subsequent user changes, including catalog preparation and stage 5 materials, had already been committed and preserved. The roadmap, TASK_ANALYSIS, stage3/offline, current reports, and B2/provider-neutral/OpenAI/cache/replay/evaluation code were read. A code-based control reproduced the accepted B1-v2 decisionsHash: 220/220 rows, 156 products, 4 non-products, TP/FP/FN 17/0/0, 545 facts. Before expansion, 45 backend tests passed.

Server /api/version and /api/tags confirmed **Ollama 0.9.6**, endpoint **http://127.0.0.1:11434**:

| Exact name | Full digest | Quantization |
|---|---|---|
| qwen3:4b | 359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7 | Q4_K_M |
| gemma4:12b | 4eb23ef187e2c5462566d6a1d3bbbc2f1346d0b4327cbb66d58fffbcc9b2b05c | Q4_K_M |

    20|The presence of the Gemma tag did not confirm that it could load: the server returned HTTP 500 `unable to load model` for every development request. The cause within the local installation was not established; the model and server were neither updated nor reinstalled. No new npm dependencies were added.

## Implementation and boundaries

- OllamaAdapter uses built-in fetch and native /api/chat and is registered in the existing Nest DI. The common JSON Schema is passed in format, with stream=false. The domain pipeline has no Ollama/OpenAI imports. [Official Chat API](https://docs.ollama.com/api/chat), [Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs).
- The contract supports optional reasoning, shared generation parameters, and identity (digest/serverVersion). Existing OpenAI profiles and behavior are preserved. For local models: temperature=0, seed=42, context=8192, maxOutputTokens=2048, topK=20, topP=0.9, repeatPenalty=1, keepAlive=5m. Qwen receives think:false; Gemma receives no think setting. One concurrent request, timeout 120 seconds per attempt, at most one transport retry/429/5xx; smoke has no retries. JSON/schema/evidence errors do not trigger another generation.
- Extraction semantic_extraction_v1, its prompt, and evidence rules were unchanged. 12 rows were taken directly from cases in stage3-checks.json in source order; 11 additions. The feed is not truncated: every stored result accounts for 220 rows. Explicit aiRows/aiPairs are checked by the service.
- Matching stores decision, confidence high/medium/low, reason, and evidence in a separate AI trace/normalized artifact. It does not change deterministic decisions, groups, review, or product confidence even for merge/reject/unknown. Confidence is not treated as a probability.
- Cache-v2 stores the raw response **before validation**, the full request, and every attempt, including HTTP errors and unusable responses. Identity includes endpoint/model/digest/serverVersion/parameters/prompt/schema/input. The old cache-v1 remains readable. Replay does not call discovery/generate; it reparses stored raw JSON, performs schema/evidence validation, and reproduces failures. Invalid data remains unavailable to the pipeline.
- Transport/completion/JSON/schema/citations/semantic diagnostics distinguish checked, passed, failed, and unchecked. Absence of a response is not counted as successful validation. Synthetic responses with origin=test are excluded from the real benchmark.
    30|
## Experiment sequence and version changes

1. **Qwen smoke:** one request for Quill row_11462769c5. JSON/schema/citations passed. The model proposed the expected colour_temperature_count=5 together with four unsupported additions, including Bluetooth for the lamp. The entire response was rejected by the shared semantic rules; replay reproduced the rejection. Request wall time was 37.846 s, including 21.760 s load and 13.732 s generation. Smoke is excluded from development quality.
2. The first runner stopped on the smoke semantic rejection. After checking the agreed condition, continuation was allowed because transport/schema were technically sound, without repeating smoke or changing the prompt, schema, parameters, or labels. The original stop.json is preserved; a separate smoke-continuation.json records the reason and hashes.
3. **Qwen development:** exactly 12 jobs, 12 calls, 0 retries/timeouts. Then **Gemma development:** the same 12 jobs, 24 calls with one retry for each HTTP 500. Every job reached a terminal state; no Gemma model response was received. Its shadow was not run.
4. **First Qwen shadow:** Ollama 0.9.6 rejected the tuple JSON Schema (prefixItems/items:false) before generation. Eight jobs/16 HTTP attempts and their replay are stored in experiment v1. These are integration errors, not model quality.
5. **New matching version:** the tuple was replaced with an equivalent array of exactly two strings; schemaName was increased from ambiguous_matching_v2 to **ambiguous_matching_v3**. A new manifest and separate stage3-ollama-v2 directory were created. Prompt, confidence/reason, pairs, labels, and parameters did not change; extraction was not rerun. Qwen completed 8 shadow jobs, then replay. Gemma was not retried after the load error. Failed v2 schema attempts are not mixed with v3 quality.
6. Final verification reproduced smoke, both development runs, and shadow-v3 from raw caches with a transport that forbids network access. Outcomes, diagnostics, decisions, and quality matched; new model calls: 0.

    40|## Development comparison

| Metric | B1 control | Qwen qwen3:4b | Gemma gemma4:12b |
|---|---:|---:|---:|
| Jobs completed / planned | N/A | 12/12 | 12/12, all server error |
| Model responses received | N/A | 12 | 0 |
| JSON / schema valid | N/A | 12/12 / 12/12 | N/A, checked=0 |
| Citations / semantic valid | N/A | 12/12 / 2/12 | N/A, checked=0 |
| Successful / failed jobs | N/A | 2 / 10 | 0 / 12 |
| Proposed correct / extra / missing | N/A | 11 / 38 / 0 | N/A: no responses |
    50|| Accepted correct / extra / missing | 0 / 0 / 11 | 3 / 0 / 8 | 0 / 0 / 11 (code result) |
| Rejected additions | N/A | 46 of 49 | N/A |
| Nonexistent/foreign/ambiguous citations | N/A | 0 | N/A |
| Additions unsupported by source meaning | N/A | 35 of 49 | N/A |
| Incorrect scope / conditions / unit | N/A | 0 / 0 / 0 of 49 | N/A |
| Incorrect value type | N/A | 4 of 49 | N/A |
| Model unknown messages | N/A | 50 across 12 rows | N/A |
| Review: messages / unique rows | 64 / 64 | 73 / 63 | 76 / 64 |
| AI review messages / affected rows | 0 / 0 | 11 / 12 | 12 / 12 |
| Product matching TP / FP / FN | 17 / 0 / 0 | 17 / 0 / 0 | 17 / 0 / 0 |
    60|| Row accounting / products / non-products | 220 / 156 / 4 | 220 / 156 / 4 | 220 / 156 / 4 |
| Calls / retries | 0 / 0 | 12 / 0 | 24 / 12 |
| Median / p95 job wall time | N/A | 15.592 / 18.492 s | 1.701 / 1.969 s **errors**, not generation |
| Model load / generation, total | N/A | 0.511 / 147.679 s | N/A |
| Input / output tokens | 0 / 0 | 11020 / 5405 | N/A |
| Local compute cost | N/A | N/A | N/A |

Proposing a correct value is not the same as accepting a fact: the entire response is withheld if it contains any error. For Qwen, 14 individual additions pass the narrow source check, but only 11 match the expected target additions; extra repetitions/additions are not counted as a gain. Accepted pipeline facts have precision 3/3 and recall 3/11—this is a narrow provisional development result, not confirmed quality for the entire feed.

Qwen preserved the previous stage2 checks: categories 18/18, facts 30/30, reconciliation 4/4. Semantic type/category 12/12. Groups and row outcomes did not change. Reducing review rows by one while increasing messages is not evidence of improved quality: the counters have different denominators.
    70|
## Shadow matching

Eight pairs are fixed: 2 unknown AeroBuds, 2 positive (English AeroBuds, Onyx Lite), 4 negative (ear tips versus three AeroBuds and Cobalt lamp versus mouse). Model labels were not provided.

Qwen schema-v3: transport/JSON/schema **8/8**; citations **1/8**, semantic checked=1/passed=1/unchecked=7. **1 successful and 7 failed jobs**. The model proposed merge with confidence=high for all eight pairs. Recorded: **4 dangerous merges** contrary to known negative/hard conflict, and **2 unsupported merges** on unknown. There are **4 distorted row_id pairs** and **3 false evidence references**. Unknown recommendations: 0; all eight recommendations are advisory, not automatic actions. A low number of unknown responses does not mean confidently correct matching.

Of the valid recommendations, only one concerns the positive English AeroBuds pair. Dangerous/unsupported proposals are counted even when evidence is invalid: a reference error does not conceal a decision error. ProductResult is entirely identical to B1, including review and confidence. Product review remains 64/64; 7 rejected matching responses affect 8 unique rows and are stored separately.

Qwen shadow: **8 calls, 0 retries**, median/p95 **7.720 / 11.773 s**, total load/generation **0.394 / 65.592 s**. Gemma shadow: **not run**, quality/latency N/A. Comparing the quality of two working local models was not possible because Gemma failed to load.
    80|
## Threshold decision and limitations

Neither model passed the agreed strict threshold of 12/12 valid extraction, 11/11 additions without extras/citation errors, 8/8 valid shadow results without dangerous merges, and matching replay. **The full run was not authorized or performed.** B1-v2 remains the accepted product baseline. Architectural completion confirms a working integration, including withholding errors; it does not constitute acceptance of AI quality.

In total, **61 HTTP inference attempts, 20 retries, and 41 jobs** were actually performed across smoke, development, and two shadow versions. This is not a 41-row full extraction: the breakdown is 1 smoke + 12 Qwen + 24 Gemma + 16 rejected matching-schema + 8 matching-v3. Server metadata is counted separately. Costs from integration errors are not hidden; available token counts are preserved, and unknown values are not replaced with zeros. Cold loading is included in wall time. Local cost and unknown cache breakdown are N/A. Codex session cost was not measured separately.

## Artifacts and checks

- [Final comparison](../reports/stage3-ollama-v2/comparison.md), [JSON](../reports/stage3-ollama-v2/comparison.json).
    90|- [Complete summary and availability](../reports/stage3-ollama-final-verification/summary.json), [JSONL for all live series, including failures](../reports/stage3-ollama-final-verification/observations.jsonl), with reproducible audit-method.mjs and four final replays with verification.json alongside.
- [Manifest v1](../reports/stage3-ollama-v1/manifest.json), [new matching version](../reports/stage3-ollama-v2/manifest.json), with manifest-hash, configs, raw cache/attempts, normalized, ai.json, metrics/report, and replay-comparison alongside.
- [Common benchmark v1](../reports/stage3-ollama-v1/benchmark-complete/summary.json), [current development/shadow-v3 benchmark](../reports/stage3-ollama-v2/benchmark/summary.json), [detailed model JSONL](../reports/stage3-ollama-v2/experiment-benchmark.jsonl).
- [B1-v2 → control](../reports/comparisons/B1-v2-to-ollama-control/comparison.md), [B1 → Qwen](../reports/comparisons/B1-to-ollama-qwen-development/comparison.md), [B1 → Gemma](../reports/comparisons/B1-to-ollama-gemma-development/comparison.md). Both B2 comparisons preserve the mandatory violation “incomplete run” and correctly return exit code 1.
- [Historical offline-part report](STAGE3_OFFLINE_REPORT.md). Previous reports, labels/checks/feed, and stage 5 materials were not rewritten.

Typecheck, **54 backend tests**, and **5 web tests** pass. Tests cover parameter/usage mapping, malformed/truncated/HTTP errors, timeout/retry and raw replay, digest/server isolation, old caches/reports, prohibition of test-origin in benchmarks, 1/12 constraints, all shadow variants without changing B1, the strict full gate, and preservation of catalog preparation. In addition, real raw caches were decoded again without network access; all outcomes/diagnostics/quality/decisions matched.

## Handoff to subsequent work

   100|Shared provider/response contracts, B1 rows/offers/facts/evidence/conditions/review, immutable local experiments, and reproducible replay are handed off. **Do not start stage 4 automatically.** It requires a separate assignment; current AI additions and matching are not an accepted source for final descriptions or proof of verifier quality.

Open: human review of provisional labels (including the two preserved unknown AeroBuds); future OpenAI Sol/Astra after an explicit message that a key is available. Do not change rules/labels based on holdout, and do not proceed to full at the current quality. Stage 5 materials, screen, and catalog preparation are preserved. The agent did not commit, push, submit, or deploy.

## Gemma retry after Ollama update — 2026-09-10

After restart, the local endpoint `http://127.0.0.1:11434` reported version `0.34.0`; the same `gemma4:12b` with the fixed digest loaded successfully. A separate technical profile, `ai.ollama-gemma4-12b-v034-thinkoff.json`, preserves the prompt, schema, 12 rows, evidence rules, and other generation parameters; only `thinking:false` prevents structured output from being consumed by reasoning. Historical runs were not rewritten.

In a [separate directory](../reports/stage3-ollama-gemma4-v034-thinkoff), smoke and development produced 11/12 transport/JSON/schema completions; one request exhausted its timeout and one allowed retry. None of the 12 jobs passed overall acceptance: 7 citation failures, 4 semantic failures, 17 false citations in total; proposed correct/extra/missing 7/6/4, accepted 0/0/11. Median/p95 live latency was 18.835/242.269 s, with 13 calls and 1 retry. Offline replay without network matched validation, quality, and decisions.

   110|Technical stability was not achieved, so shadow matching and the full run were not started. B1-v2 remains the product baseline: the updated run confirms transport, raw cache, validation, and replay, but not Gemma quality.
