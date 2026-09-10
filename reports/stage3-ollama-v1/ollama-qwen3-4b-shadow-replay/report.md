# ollama-qwen3-4b-shadow-replay — B2-v1

Status: partial; mode: replay; matching labels: **provisional**; development only. Holdout not evaluated.

| Metric | Value | Numerator | Denominator | Scope | Status |
|---|---|---|---|---|---|
| accounting.coverage | 1 | 220 | 220 | full_input | not_applicable; measured |
| accounting.duplicate_assignments | 0 | N/A | N/A | full_input | not_applicable; measured |
| accounting.lost_rows | 0 | N/A | N/A | full_input | not_applicable; measured |
| ai.failed_jobs | 8 | N/A | N/A | run | not_applicable; measured |
| ai.target_rows | 3 | N/A | N/A | run | not_applicable; measured |
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
| timing.pipeline | 42.03670900000725 | N/A | N/A | run | not_applicable; measured |
| timing.wall | 103.35099999999511 | N/A | N/A | run | not_applicable; measured |
| verifier.quality | N/A | N/A | N/A | development | provisional; not_implemented |

Matching errors: none.

Quality check errors: [].

Semantic check errors: [{"rowId":"row_11462769c5","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_74b8f7797a","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_74b8f7797a","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_a1bb1ad2e9","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_b82f7fcc2a","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"size_count","conditions":[],"scope":"product","unit":null,"value":3},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"compatible_model","conditions":["compatible_device"],"scope":"product","unit":null,"value":"AeroBuds Pro"},"actual":null}].

AI: {"targetRows":3,"jobs":8,"failedJobs":8,"origin":"real","requestHashes":["41548783ff9bc16acea649329fd343125465acfb722e32ff8b65aad501f3cecc","9b24aa56fc1cc7cc42543c3fb385358d8e514ae9a9156b944ff84f669af56a54","9da2c16b8a2493f66a907be0261d6254e15079f5aa310a5ff407cf5fe2e7633f","a328ed3fb161dae10371f054474e64e666d723cddd78c7d0c17bddf90f506c60","1ea3017dc16f72a1000f450b51464d6ce62d42474fe653081264290940134d6b","3bb4a0b985466e35fcbf6fc566172979f026b2c73c40a038a8880d38e1468178","52f0b5512dcd48cd9351d40818b60b859cfab5767779d9f0e22e60409bf4171a","7e0fd6e70f0559e2cd2b92a5a07cc0fbea912988a82441c3f4af8a9004f1157b"]}; usage: {"calls":0,"errors":0,"retries":0,"cacheHits":0,"inputTokens":0,"outputTokens":0,"tokens":0,"cost":0}. Test fixtures are not real AI quality. Missing pricing/usage is N/A.

Sources/config: {"feed":"6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6","taxonomy":"f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa","labels":"74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989","config":"368f10086b78e75c24880e921b38696a53625dca106d6d2351102f0b08927234","checks":"3b1f1003325b434e024376f3e4901f11ad8d925878b5957508bbad8789bb20ca","semanticChecks":"b926db5a80acf0c0888816388e24fd7064e89fe76272bd1605e5be6bd6b81b61"}

Code: {"commit":"61d740c9bcea3fc037145f1111b07c731e227f44","dirty":true,"implementationHash":"82333fb2b9b232d80de3ed85209108761f316e7238f13f5e6e0700343da89fd9"}

Timing: {"protocol":"cli-through-result-v1","node":"v24.14.1","platform":"darwin","arch":"arm64","pipelineMs":42.03670900000725}. Wall measurement ends after result/diagnostics, before metric/report serialization.

No generation, verifier, or publication readiness. Counts over all inputs are diagnostics; quality is measured only on the provisional development labels/checks. Unknown relations are excluded.
