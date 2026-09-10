# ollama-qwen3-4b-development-live — B2-v1

Status: partial; mode: live; matching labels: **provisional**; development only. Holdout not evaluated.

| Metric | Value | Numerator | Denominator | Scope | Status |
|---|---|---|---|---|---|
| accounting.coverage | 1 | 220 | 220 | full_input | not_applicable; measured |
| accounting.duplicate_assignments | 0 | N/A | N/A | full_input | not_applicable; measured |
| accounting.lost_rows | 0 | N/A | N/A | full_input | not_applicable; measured |
| ai.failed_jobs | 10 | N/A | N/A | run | not_applicable; measured |
| ai.target_rows | 12 | N/A | N/A | run | not_applicable; measured |
| api.cache_hits | 0 | N/A | N/A | run | not_applicable; measured |
| api.calls | 12 | N/A | N/A | run | not_applicable; measured |
| api.cost | N/A | N/A | N/A | run | not_applicable; unavailable |
| api.errors | 10 | N/A | N/A | run | not_applicable; measured |
| api.input_tokens | 11020 | N/A | N/A | run | not_applicable; measured |
| api.output_tokens | 5405 | N/A | N/A | run | not_applicable; measured |
| api.retries | 0 | N/A | N/A | run | not_applicable; measured |
| api.tokens | 16425 | N/A | N/A | run | not_applicable; measured |
| categories.check_accuracy | 1 | 18 | 18 | development | provisional; measured |
| errors.execution | 1 | N/A | N/A | run | not_applicable; measured |
| errors.matching | 0 | N/A | N/A | development | provisional; measured |
| errors.non_product | 0 | N/A | N/A | development | provisional; measured |
| errors.quality_checks | 0 | N/A | N/A | development | provisional; measured |
| facts.accepted_attributes | 395 | N/A | N/A | full_input | not_applicable; measured |
| facts.check_accuracy | 1 | 30 | 30 | development | provisional; measured |
| facts.conflicts | 0 | N/A | N/A | full_input | not_applicable; measured |
| facts.extracted | 548 | N/A | N/A | full_input | not_applicable; measured |
| facts.incomparable | 1 | N/A | N/A | full_input | not_applicable; measured |
| facts.unparsed_fragments | 41 | N/A | N/A | full_input | not_applicable; measured |
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
| review.extraction_items | 36 | N/A | N/A | full_input | not_applicable; measured |
| review.identity_items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.incomparable_items | 1 | N/A | N/A | full_input | not_applicable; measured |
| review.items | 73 | N/A | N/A | full_input | not_applicable; measured |
| review.missing_specs_items | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.product_rate | 0.32051282051282054 | 50 | 156 | full_input | not_applicable; measured |
| review.products | 50 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.ai_category_withheld.items | 1 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.ai_category_withheld.rows | 1 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.ai_error:invalid_response.items | 10 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.ai_error:invalid_response.rows | 10 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.fact_incomparable:power.items | 1 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.fact_incomparable:power.rows | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.identity:incomplete_type_or_variant.items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.identity:incomplete_type_or_variant.rows | 3 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.missing_specs.items | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.missing_specs.rows | 21 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.uncertain_category.items | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.uncertain_category.rows | 2 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.unparsed_specs.items | 36 | N/A | N/A | full_input | not_applicable; measured |
| review.reason.unparsed_specs.rows | 36 | N/A | N/A | full_input | not_applicable; measured |
| review.row_rate | 0.2863636363636364 | 63 | 220 | full_input | not_applicable; measured |
| review.rows | 63 | N/A | N/A | full_input | not_applicable; measured |
| semantic.categories | 1 | 12 | 12 | development | provisional; measured |
| semantic.correct_additions | 3 | N/A | N/A | development | provisional; measured |
| semantic.missed_additions | 8 | N/A | N/A | development | provisional; measured |
| semantic.precision | 1 | 3 | 3 | development | provisional; measured |
| semantic.recall | 0.2727272727272727 | 3 | 11 | development | provisional; measured |
| semantic.types | 1 | 12 | 12 | development | provisional; measured |
| semantic.unexpected_additions | 0 | N/A | N/A | development | provisional; measured |
| timing.pipeline | 174585.693917 | N/A | N/A | run | not_applicable; measured |
| timing.wall | 174655.445375 | N/A | N/A | run | not_applicable; measured |
| verifier.quality | N/A | N/A | N/A | development | provisional; not_implemented |

Matching errors: none.

Quality check errors: [].

Semantic check errors: [{"rowId":"row_11462769c5","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_55a8c9b86d","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_a1bb1ad2e9","kind":"missed_addition","expected":{"attribute":"colour_temperature_count","conditions":[],"scope":"product","unit":null,"value":5},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"bluetooth_supported","conditions":[],"scope":"product","unit":null,"value":true},"actual":null},{"rowId":"row_bb6d2613d4","kind":"missed_addition","expected":{"attribute":"wireless_frequency","conditions":["radio_link"],"scope":"product","unit":"GHz","value":2.4},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"size_count","conditions":[],"scope":"product","unit":null,"value":3},"actual":null},{"rowId":"row_fe3ff4b356","kind":"missed_addition","expected":{"attribute":"compatible_model","conditions":["compatible_device"],"scope":"product","unit":null,"value":"AeroBuds Pro"},"actual":null}].

AI: {"targetRows":12,"jobs":12,"failedJobs":10,"origin":"real","requestHashes":["51440d4b5db1fe542b5578e24a98f45d1687f22eb6ae74b369d2025cd65a43d0","10ef47b3d794eaf53a95fe815491b2faffd2535bdc9ac7a94b23ab6e907fbe86","562be9bc67f40e953e27f7d42f808f13a0c38b9fdceb6bdda2ed3483629ec304","b079fc91d7de140ad5f4bec0396d29264b8623549e3112886147f7656de1d357","89617f6bc559546731e79082b3ef0039c40265f856587e717db55965d73e2176","d42697dc959542c9f9b2e8cb1d7c3d805a21de4da322a35626da2d7c54a96270","16f862608c588a2cbd5a959c443d911c470c611428b0d8d4591b35f571572964","1fa874f7d3699e0004d5db077e7f9da98ddce5d6f65da91be5d69abbb8a94141","a858542bd6c2bfff7bc2230c827b8a8858ca450149bc85966fda41225113c6a8","4d88094d61a10777de3c973f677d9351979a7b1a5473c7266a058ddb971b8bf2","80236f52daf3b593c8234d5e5039c40128666e987cdf14b1f955da0d40b4e9a2","028bf45f54f5b61030e382e69c29f58c16e6e05f712634f172c8838d06f92d4b"]}; usage: {"calls":12,"errors":10,"retries":0,"cacheHits":0,"inputTokens":11020,"outputTokens":5405,"tokens":16425,"cost":null}. Test fixtures are not real AI quality. Missing pricing/usage is N/A.

Sources/config: {"feed":"6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6","taxonomy":"f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa","labels":"74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989","config":"5077c3daa1e07e82d2a02caa10f7fa1f90318bb443c551642c0aa8683f648b6d","checks":"3b1f1003325b434e024376f3e4901f11ad8d925878b5957508bbad8789bb20ca","semanticChecks":"b926db5a80acf0c0888816388e24fd7064e89fe76272bd1605e5be6bd6b81b61"}

Code: {"commit":"61d740c9bcea3fc037145f1111b07c731e227f44","dirty":true,"implementationHash":"82333fb2b9b232d80de3ed85209108761f316e7238f13f5e6e0700343da89fd9"}

Timing: {"protocol":"cli-through-result-v1","node":"v24.14.1","platform":"darwin","arch":"arm64","pipelineMs":174585.693917}. Wall measurement ends after result/diagnostics, before metric/report serialization.

No generation, verifier, or publication readiness. Counts over all inputs are diagnostics; quality is measured only on the provisional development labels/checks. Unknown relations are excluded.
