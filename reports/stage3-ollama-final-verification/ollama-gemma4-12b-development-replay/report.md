# ollama-gemma4-12b-development-replay — B2-v1

Status: partial; mode: replay; matching labels: **provisional**; development only. Holdout not evaluated.

| Metric | Value | Numerator | Denominator | Scope | Status |
|---|---|---|---|---|---|
| accounting.coverage | 1 | 220 | 220 | full_input | not_applicable; measured |
| accounting.duplicate_assignments | 0 | N/A | N/A | full_input | not_applicable; measured |
| accounting.lost_rows | 0 | N/A | N/A | full_input | not_applicable; measured |
| ai.failed_jobs | 12 | N/A | N/A | run | not_applicable; measured |
| ai.target_rows | 12 | N/A | N/A | run | not_applicable; measured |
| api.cache_hits | 0 | N/A | N/A | run | not_applicable; measured |
| api.calls | 0 | N/A | N/A | run | not_applicable; measured |
| api.cost | 0 | N/A | N/A | run | not_applicable; measured |
| api.errors | 0 | N/A | N/A | run | not_applicable; measured |
| api.input_tokens | 0 | N/A | N/A | run | not_applicable; measured |
| api.output_tokens | 0 | N/A | N/A | run | not_applicable; measured |
| api.retries | 0 | N/A | N/A | run | not_applicable; measured |
| api.tokens | 0 | N/A | N/A | run | not_applicable; measured |
| categories.check_accuracy | 1 | 18 | 18 | development | provisional; measured |
| errors.execution | 1 | N/A | N/A | run | not_applicable; measured |
| errors.matching | 0 | N/A | N/A | development | provisional; measured |
| errors.non_product | 0 | N/A | N/A | development | provisional; measured |
| errors.quality_checks | 0 | N/A | N/A | development | provisional; measured |
| facts.accepted_attributes | 392 | N/A | N/A | full_input | not_applicable; measured |
| facts.check_accuracy | 1 | 30 | 30 | development | provisional; measured |
| facts.conflicts | 0 | N/A | N/A | full_input | not_applicable; measured |
| facts.extracted | 545 | N/A | N/A | full_input | not_applicable; measured |
| facts.incomparable | 1 | N/A | N/A | full_input | not_applicable; measured |
| facts.unparsed_fragments | 43 | N/A | N/A | full_input | not_applicable; measured |
| generation.quality | N/A | N/A | N/A | development | provisional; not_implemented |
| input.rows | 220 | N/A | N/A | full_input | not_applicable; measured |
| matching.candidate_recall | 1 | 17 | 17 | development | provisional; measured |
| matching.false_merge | 0 | N/A | N/A | development | provisional; measured |
| matching.hard_negative_false_merges | 0 | N/A | N/A | development | provisional; measured |
| matching.hard_negative_specificity | 1 | 170 | 170 | development | provisional; measured |
| matching.missed_pair | 0 | N/A | N/A | development | provisional; measured |
| matching.negative_specificity | 1 | 1692 | 1692 | development | provisional; measured |
| matching.precision | 1 | 17 | 17 | development | provisional; measured |
| matching.recall | 1 | 17 | 17 | development | provisional; measured |
| matching.true_negative | 1692 | N/A | N/A | development | provisional; measured |
| matching.true_positive | 17 | N/A | N/A | development | provisional; measured |
| matching.unevaluated_attached_pairs | 0 | N/A | N/A | development | provisional; measured |
| matching.unknown_pairs | 2 | N/A | N/A | development | provisional; measured |
| non_product.accuracy | 1 | 59 | 59 | development | provisional; measured |
| non_product.false_rejection | 0 | N/A | N/A | development | provisional; measured |
| non_product.missed_trash | 0 | N/A | N/A | development | provisional; measured |
| non_product.precision | 1 | 4 | 4 | development | provisional; measured |
| non_product.recall | 1 | 4 | 4 | development | provisional; measured |
| non_product.rejected_rows | 4 | N/A | N/A | full_input | not_applicable; measured |
| non_product.true_negative | 55 | N/A | N/A | development | provisional; measured |
| non_product.true_positive | 4 | N/A | N/A | development | provisional; measured |
| non_product.valid_product_retention | 1 | 55 | 55 | development | provisional; measured |
| products.count | 156 | N/A | N/A | full_input | not_applicable; measured |
| reconciliation.check_accuracy | 1 | 4 | 4 | development | provisional; measured |
| review.category_items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.conflict_items | 0 | N/A | N/A | full_input | not_applicable; measured |
| review.extraction_items | 38 | N/A | N/A | full_input | not_applicable; measured |
| review.identity_items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.incomparable_items | 1 | N/A | N/A | full_input | not_applicable; measured |
| review.items | 76 | N/A | N/A | full_input | not_applicable; measured |
| review.missing_specs_items | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.product_rate | 0.3269230769230769 | 51 | 156 | full_input | not_applicable; measured |
| review.products | 51 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.ai_error:server.items | 12 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.ai_error:server.rows | 12 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.fact_incomparable:power.items | 1 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.fact_incomparable:power.rows | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.identity:incomplete_type_or_variant.items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.identity:incomplete_type_or_variant.rows | 3 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.missing_specs.items | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.missing_specs.rows | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.uncertain_category.items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.uncertain_category.rows | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.unparsed_specs.items | 38 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.unparsed_specs.rows | 38 | N/A | N/A | full_input | not_applicable; measured |
| review.row_rate | 0.2909090909090909 | 64 | 220 | full_input | not_applicable; measured |
| review.rows | 64 | N/A | N/A | full_input | not_applicable; measured |
| semantic.categories | 1 | 12 | 12 | development | provisional; measured |
| semantic.correct_additions | 0 | N/A | N/A | development | provisional; measured |
| semantic.missed_additions | 11 | N/A | N/A | development | provisional; measured |
| semantic.precision | N/A | 0 | 0 | development | provisional; no_denominator |
| semantic.recall | 0 | 0 | 11 | development | provisional; measured |
| semantic.types | 1 | 12 | 12 | development | provisional; measured |
| semantic.unexpected_additions | 0 | N/A | N/A | development | provisional; measured |
| timing.pipeline | 54.13158400000009 | N/A | N/A | run | not_applicable; measured |
| timing.wall | 103.98599999999999 | N/A | N/A | run | not_applicable; measured |
| verifier.quality | N/A | N/A | N/A | development | provisional; not_implemented |

Matching errors: none.

Quality check errors: [].

Semantic check errors: [{"rowId":"row_11462769c5","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_74b8f7797a","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_74b8f7797a","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_a1bb1ad2e9","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_b82f7fcc2a","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"size_count","conditions":[],"scope":"product","unit":null,"value":3},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"compatible_model","conditions":["compatible_device"],"scope":"product","unit":null,"value":"AeroBuds Pro"},"actual":null}].

AI: {"targetRows":12,"jobs":12,"failedJobs":12,"origin":"real","requestHashes":["30d4e2d3d7e4b3379335c9e683406627b04e76c33ce97a015ec728402bc7a7a1","2264115595785d0c9b3170d234804b1ad10dedd4e83f2f602c2db649b36d458e","c973103443b9faeae36c83c550848cfc237a6d82fa418b077322d5545207c572","1941198a1541d42eade9d06b8a0bf6e40ca6f197009f94c0e87ff8b26b002b17","9865bdc15f8ead8d41c36fc14edaffc946fb049e24626f5a5ace3e669c73ed4f","0ee3506f83a0804d0824aa7b0fd5990efd90a785f76849e393c53dfb1916fcf0","0ed13dc50eb7267e7e85161f487c1d0c4176106fffe84dc808e33026509ee66d","5981d3ab988df6edf1def883ba28bc7c8f8a7abc16fc4ca71c0cf40a40357f29","b906e8978e158ea31984ce98b26afffb7bfaaecb16db0d1fdc746d0a9289b948","f35a881939c4fee67057752c7a485a7be5c46a36e248329aead23f987b3e7b7c","5bc17e9f0d7543100ed3cb07861126bce1bb360b5e96bbe4a08ad6c491aeb423","2d0d590e5ead6cb83ac8d1d4327405bc8fd310b87463c3267c1877a15bb4e319"]}; usage: {"calls":0,"errors":0,"retries":0,"cacheHits":0,"inputTokens":0,"outputTokens":0,"tokens":0,"cost":0}. Test fixtures are not real AI quality. Missing pricing/usage is N/A.

Sources/config: {"feed":"6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6","taxonomy":"f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa","labels":"74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989","config":"2e3c24170ead254952449acd4e6c00436bc280d44e4e61ea964a025081c130a3","checks":"3b1f1003325b434e024376f3e4901f11ad8d925878b5957508bbad8789bb20ca","semanticChecks":"b926db5a80acf0c0888816388e24fd7064e89fe76272bd1605e5be6bd6b81b61"}

Code: {"commit":"61d740c9bcea3fc037145f1111b07c731e227f44","dirty":true,"implementationHash":"140d0bfa2e4d9ec3c95ea4a15e8a6857144aac575fe72e1c36d70745595aec5f"}

Timing: {"protocol":"cli-through-result-v1","node":"v24.14.1","platform":"darwin","arch":"arm64","pipelineMs":54.13158400000009}. Wall measurement ends after result/diagnostics, before metric/report serialization.

No generation, verifier, or publication readiness. Counts over all inputs are diagnostics; quality is measured only on the provisional development labels/checks. Unknown relations are excluded.
