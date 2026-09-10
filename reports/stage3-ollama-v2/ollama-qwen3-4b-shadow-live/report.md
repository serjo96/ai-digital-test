# ollama-qwen3-4b-shadow-live — B2-v1

Status: partial; mode: live; matching labels: **provisional**; development only. Holdout not evaluated.

| Metric | Value | Numerator | Denominator | Scope | Status |
|---|---|---|---|---|---|
| accounting.coverage | 1 | 220 | 220 | full_input | not_applicable; measured |
| accounting.duplicate_assignments | 0 | N/A | N/A | full_input | not_applicable; measured |
| accounting.lost_rows | 0 | N/A | N/A | full_input | not_applicable; measured |
| ai.failed_jobs | 7 | N/A | N/A | run | not_applicable; measured |
| ai.target_rows | 3 | N/A | N/A | run | not_applicable; measured |
| api.cache_hits | 0 | N/A | N/A | run | not_applicable; measured |
| api.calls | 8 | N/A | N/A | run | not_applicable; measured |
| api.cost | N/A | N/A | N/A | run | not_applicable; unavailable |
| api.errors | 7 | N/A | N/A | run | not_applicable; measured |
| api.input_tokens | 2238 | N/A | N/A | run | not_applicable; measured |
| api.output_tokens | 2473 | N/A | N/A | run | not_applicable; measured |
| api.retries | 0 | N/A | N/A | run | not_applicable; measured |
| api.tokens | 4711 | N/A | N/A | run | not_applicable; measured |
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
| review.items | 64 | N/A | N/A | full_input | not_applicable; measured |
| review.missing_specs_items | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.product_rate | 0.3269230769230769 | 51 | 156 | full_input | not_applicable; measured |
| review.products | 51 | N/A | N/A | full_input | not_applicable; measured |
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
| timing.pipeline | 70075.247459 | N/A | N/A | run | not_applicable; measured |
| timing.wall | 70305.195708 | N/A | N/A | run | not_applicable; measured |
| verifier.quality | N/A | N/A | N/A | development | provisional; not_implemented |

Matching errors: none.

Quality check errors: [].

Semantic check errors: [{"rowId":"row_11462769c5","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_74b8f7797a","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_74b8f7797a","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_a1bb1ad2e9","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_b82f7fcc2a","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"size_count","conditions":[],"scope":"product","unit":null,"value":3},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"compatible_model","conditions":["compatible_device"],"scope":"product","unit":null,"value":"AeroBuds Pro"},"actual":null}].

AI: {"targetRows":3,"jobs":8,"failedJobs":7,"origin":"real","requestHashes":["013c53af8576699acab931a31f8adbc15b672814c6b1dc74bb7dfc91fd1bdf67","de80740306596cb6fb4a16f7de493af7f5c753aa7e36f18441300c659b891bce","a9fc840141f5436fca2b9c28552ad237d0dd576c53edc306db2da5f8593d9ad7","6e24a9c911d2ad8a3a12adbe593f3ef1b720716b3e96dfb20b04fdb231422523","3e5bc5bc9cf20364d6c5697672546dcbde2e8878d68a4d9b18adf471c95ec2e1","c6615ed4faa5fca40561949cac2dc66e44c52ecf6140f6c854fa68d61eda5b06","e76658ac1dfea5a21a44602ef3bca3dbed65e2bbb4d6fe571cce4c76be2b9ec7","dab661b5b101a4c8977b49b7d1e5d026ebba9b03640b2fad91a3091692aa2447"]}; usage: {"calls":8,"errors":7,"retries":0,"cacheHits":0,"inputTokens":2238,"outputTokens":2473,"tokens":4711,"cost":null}. Test fixtures are not real AI quality. Missing pricing/usage is N/A.

Sources/config: {"feed":"6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6","taxonomy":"f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa","labels":"74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989","config":"368f10086b78e75c24880e921b38696a53625dca106d6d2351102f0b08927234","checks":"3b1f1003325b434e024376f3e4901f11ad8d925878b5957508bbad8789bb20ca","semanticChecks":"b926db5a80acf0c0888816388e24fd7064e89fe76272bd1605e5be6bd6b81b61"}

Code: {"commit":"61d740c9bcea3fc037145f1111b07c731e227f44","dirty":true,"implementationHash":"c649b0bb5d9d09238b3804585f74209ba0cc6f207b4768f09bb81bc60476a3b5"}

Timing: {"protocol":"cli-through-result-v1","node":"v24.14.1","platform":"darwin","arch":"arm64","pipelineMs":70075.247459}. Wall measurement ends after result/diagnostics, before metric/report serialization.

No generation, verifier, or publication readiness. Counts over all inputs are diagnostics; quality is measured only on the provisional development labels/checks. Unknown relations are excluded.
