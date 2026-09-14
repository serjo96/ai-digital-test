# Model and code roles — final MVP

Updated: 2026-09-14. B1-v2 remains the accepted product baseline. **The historical measured B2 used local Ollama models** and did not pass the quality gate. A later, explicitly authorized OpenAI development-only extraction check also remained below the existing acceptance criteria: 11 correct, 3 unexpected, and 0 missing semantic additions. It did not alter B1 decisions or run shadow matching. **B3 is a separate OpenAI publication stage**, not a continuation of B2: `gpt-5.6-sol` formulates text from already accepted B1 supports, and a separate `gpt-6-astra` verifies claims. Controlled and generated development gates are human-verified; full-input replay is preserved. The compact matching audit is saved in the repository ([matching-audit-metrics.json](eval/matching-audit-metrics.json)): 20/20 reviewed, 18/18 agreement, 18/20 scored coverage, 2 `unknown`, 0 disagreements. The expanded family labels remain provisional. Stages 1–5 and the minimal stage 6 stabilization are complete.

## B1 / B2 / B3 boundary

| Track | What it decides | Model runtime | Affects the final catalog |
|---|---|---|---|
| B1 | Identity, matching, facts, conflicts, categories | None, deterministic code | Yes, this is the accepted baseline |
| B2 | Experimental extraction and shadow matching | Historical local Ollama runs; later OpenAI development extraction validation | No, the quality gate was not accepted and B1 decisions were unchanged |
| B3 | Listing wording and independent claim verification over B1 supports | OpenAI `gpt-5.6-sol` / `gpt-6-astra` | Yes, only after the fail-closed code gate |

B2 attempted to supplement product data before publication. B3 does not re-extract product truth or decide whether products are identical: it receives the B1 result, writes a safe description, and verifies it against the same preserved sources.

| Step | What the model / code does | Model / level | Why a model rather than code | Consequence of error / safeguard | Approximate cost and latency |
|---|---|---|---|---|---|
| Semantic extraction (B2, development) | Five additional attributes with exact citations | Historical Ollama qwen3:4b / gemma4:12b; supplemental OpenAI run with `gpt-5.6-sol` | Selecting the meaning and subject in fragments the rules do not understand | Wrong subject, number, or scope; schema, local checks, and review | Supplemental OpenAI check: 12 calls, 15897 tokens, $0.105447; 11 correct, 3 unexpected, 0 missing additions; rejected |
| Type / category (within extraction) | Propose a type and one of 12 categories from evidence | Same extraction model and request | Semantic wording missed by rules | An accessory treated as a device; a confident code decision is not overwritten | No additional calls; usage/latency in ai.json |
| Matching (B2, strictly shadow) | Preserve merge/reject/unknown, confidence, reason, and evidence for 8 identical pairs | Local Ollama qwen3:4b / gemma4:12b; supplemental OpenAI validation did not enable matching | Comparing the meaning of names and conditions | False merge; the recommendation does not change decisions, groups, or product confidence at all | 2 positive, 4 negative, 2 unknown; results and latency in the stage 3 report |
| Description generation (B3 development) | Short neutral text based only on conflict-free identity and agreed product facts; code builds a minimal unpublished preview for identity-review items | OpenAI `gpt-5.6-sol`, low; deterministic code for review previews | Formulating coherent publishable text needs a model; an identity-review preview needs only already allowed identity values | Fabricated claim; text is not published without separate complete verification. Review previews always keep `publishedText = null` | 37 model calls; review previews add 0 calls; 28582 tokens; $0.1119028; median/p95 1.937/2.954 s |
| Claim verification (B3 development) | Verify the entire text against raw rows, supports, decisions, and review; return exact spans/citations | OpenAI `gpt-6-astra`, low | A citation alone does not prove entailment | Any unknown/error/incomplete coverage blocks publication; one repair, then withholding | Current verifier-only live: 49 calls, 125333 tokens, $2.390245; controlled 12/12 and generated sample 20/20 human-verified |
| Loading, money, row outcomes | Code validates the schema and preserves exact amounts and originals | Code, no LLM | Unambiguous arithmetic and invariants do not require a model | Losses, incorrect price; accounting and parsing checks | API $0; wall time for full B1 stage 5: 81.957 / 80.121 ms, not a measurement of this step alone |
| Explicit facts, variants, and reconciliation | Code preserves scope/conditions, checks groups, and withholds incompatible data | B1-v2 code | Verifiable rules and rounding intervals | False merge/reconciliation; unknown and review | API $0; B1 pipeline: 37.224 / 38.409 ms |
| Results screen | Code displays preserved decisions and evidence | React, no LLM | Display must not change the original decisions | Mixing demo/live data or losing the source; snapshot validation and explicit provenance | API $0; browser latency was not measured separately |

Why a model: a fragment requires selecting the meaning, subject, and applicable attribute, not merely finding a number. Code keeps narrow, verifiable boundaries for accepting the result. The measured experiments did not demonstrate enough gain over the deterministic rules, so B1-v2 remains accepted.

## Actual v1 scope

Five new attributes are allowed: `bluetooth_supported`, `wireless_frequency` (GHz, radio_link), `colour_temperature_count`, `size_count`, `compatible_model` (compatible_device). Code verifies the source, number, and supported conditions. The number `4` is not accepted from `2.4GHz`; `AeroBuds` is not accepted instead of the full `AeroBuds Pro` in compatibility. The remaining B1 characteristics are preserved without rewriting. New unsupported fields/formats, negations, and limits remain unknown/error rather than automatically expanding the dictionary.

Type requires a citation containing a literal type recognized by the existing dictionary. Inferring “AeroBuds means earbuds” from external knowledge is prohibited. A German row without an explicit type name may remain in review; `18h` does not become `20h with case`, and unspecified `12 W` does not become `12 W output`. This conservative boundary and the absence of a general entailment verifier are intentional; having a citation does not guarantee the semantic correctness of any model.

## Adapters and replay

`AiProvider` defines a structured request/response and neutral errors. `ProviderRegistry` is connected through Nest DI. The OpenAI SDK is used only in `OpenAiAdapter`; pricing, eval, schema/evidence, cache, and retry remain outside the adapter. OpenAI uses Responses, strict JSON Schema, `store:false`, no tools, and the standard service tier; SDK retries are disabled, while the shared layer allows up to two retries for transient errors and 60 seconds per attempt.

OllamaAdapter is registered in the same DI. Native /api/chat through fetch passes the shared JSON Schema in format; stream=false. Profiles record the full digest, serverVersion, temperature=0, seed=42, context=8192, maxOutputTokens=2048, topK=20, topP=0.9, repeatPenalty=1, keepAlive=5m. Qwen receives think:false, while Gemma receives no think setting. Locally, each attempt has 120 seconds and at most one transport retry. Ollama has no domain dependencies. Test adapters cannot be selected by the production CLI.

Every live run requires a new cache directory. Replay verifies the key and response integrity, repeats local validation, and does not contact the provider. The v2 key includes the provider/endpoint, model, full digest, server version, parameters, exact input, prompt, and JSON Schema. The old cache-v1 remains readable; new raw responses and every attempt are preserved before validation, including failures. Replay repeats JSON/schema/citations/semantic validation and does not count unchecked results as successful. `ai.json` preserves individual requests by their hashes, responses, usage, validation status, and timing; secret headers and SDK error bodies are not preserved. Synthetic responses have test provenance and are prohibited from real benchmark history.

## Cost and latency

The official [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [pricing](https://developers.openai.com/api/docs/pricing) documentation was checked. Both models support Responses and Structured Outputs; this does not confirm access for a particular account.

Preserved standard prices as of 2026-09-09, USD per million tokens, up to 272000 input tokens:

| Model | Uncached input | Cache read | Cache write | Output |
|---|---|---|---|---|
| Sol | 4 | 0.40 | 5 | 20 |
| Astra | 10 | 1 | 12.50 | 50 |

Example for scale only: 1000 uncached input tokens and 500 output tokens cost $0.014 for Sol and $0.035 for Astra. This is an arithmetic estimate, not the measured cost of a request or the entire feed. Verify current pricing before a live run; the configuration records the date and source. Cache-write is accounted for separately. If usage is missing, the price or cache-write breakdown is unknown, or the supported context is exceeded, cost = N/A. Reasoning is included in output usage. A failed attempt without usage makes total spend unknown, not zero.

Historical development v1 live measured 86 calls, 151618 tokens, and $2.6475128. After P0.2, the current verifier-only development live over frozen texts made 49 calls, used 125333 tokens, and cost $2.390245; human-gate replay produced 49 cache hits and accepted controlled 12/12 and generated sample 20/20. Full-input B3 live measured 322 calls, 526449 tokens, and $8.110955; offline replay reproduced hashes with 0 calls. Holdout was run from the same cache: 321 successful cache hits, 0 calls/tokens/cost. These are individual sequential observations, not a universal model benchmark. Local compute cost for Ollama remains N/A.

## Measured local stage 3 result

Qwen qwen3:4b on 12 development rows: JSON/schema 12/12, semantic 2/12; the model proposed 11 correct and 38 extra additions, while the pipeline accepted 3 correct, 0 extra, and missed 8 expected additions. 12 calls, 0 retries, median/p95 wall 15.592/18.492 s; local compute cost N/A. The strict threshold did not confirm usefulness beyond the accepted B1-v2.

On eight shadow pairs, Qwen had 1/8 validation, 4 dangerous merges, and 2 unconfirmed merges on unknown. All confidence=high; this illustrates why confidence cannot be treated as a probability or permission to act. Median/p95 7.720/11.773 s. The recommendations changed no deterministic decision, group, or product confidence.

Gemma gemma4:12b: initially, 12/12 jobs ended with server load error. After the endpoint was updated to 0.34.0, a separate profile with `thinking:false` produced 11/12 transport/JSON/schema responses, but none passed overall acceptance: 17 false citations, 4 semantic rejections, and 0/11 expected additions accepted; one timeout exhausted retry. Shadow was not run because of technical instability. Details: [Gemma rerun](reports/stage3-ollama-gemma4-v034-thinkoff/comparison.md). This is the historical B2 outcome: the model-based product threshold was not met, so the B1-v2 baseline was retained. The subsequent B3 and human-review stages were completed separately.
