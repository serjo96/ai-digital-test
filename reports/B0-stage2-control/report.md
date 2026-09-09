# B0-stage2-control — B0-v1

Status: success; matching labels: **provisional**; development only. Holdout not evaluated.

| Metric | Value | Numerator | Denominator | Scope | Status |
|---|---|---|---|---|---|
| accounting.coverage | 1 | 220 | 220 | full_input | not_applicable; measured |
| accounting.duplicate_assignments | 0 | N/A | N/A | full_input | not_applicable; measured |
| accounting.lost_rows | 0 | N/A | N/A | full_input | not_applicable; measured |
| api.calls | 0 | N/A | N/A | run | not_applicable; measured |
| categories.check_accuracy | N/A | N/A | N/A | development | provisional; not_implemented |
| errors.execution | 0 | N/A | N/A | run | not_applicable; measured |
| errors.matching | 10 | N/A | N/A | development | provisional; measured |
| errors.non_product | 0 | N/A | N/A | development | provisional; measured |
| errors.quality_checks | N/A | N/A | N/A | development | provisional; not_implemented |
| facts.accepted_attributes | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| facts.check_accuracy | N/A | N/A | N/A | development | provisional; not_implemented |
| facts.conflicts | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| facts.extracted | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| facts.incomparable | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| facts.unparsed_fragments | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| generation.quality | N/A | N/A | N/A | development | provisional; not_implemented |
| input.rows | 220 | N/A | N/A | full_input | not_applicable; measured |
| matching.candidate_recall | N/A | N/A | N/A | development | provisional; not_implemented |
| matching.false_merge | 0 | N/A | N/A | development | provisional; measured |
| matching.hard_negative_false_merges | 0 | N/A | N/A | development | provisional; measured |
| matching.hard_negative_specificity | 1 | 170 | 170 | development | provisional; measured |
| matching.missed_pair | 10 | N/A | N/A | development | provisional; measured |
| matching.negative_specificity | 1 | 1692 | 1692 | development | provisional; measured |
| matching.precision | 1 | 7 | 7 | development | provisional; measured |
| matching.recall | 0.4117647058823529 | 7 | 17 | development | provisional; measured |
| matching.true_negative | 1692 | N/A | N/A | development | provisional; measured |
| matching.true_positive | 7 | N/A | N/A | development | provisional; measured |
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
| products.count | 165 | N/A | N/A | full_input | not_applicable; measured |
| reconciliation.check_accuracy | N/A | N/A | N/A | development | provisional; not_implemented |
| review.category_items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.conflict_items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.extraction_items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.identity_items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.incomparable_items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.missing_specs_items | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.product_rate | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.products | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.row_rate | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| review.rows | N/A | N/A | N/A | full_input | not_applicable; not_implemented |
| timing.pipeline | 2.1916249999999877 | N/A | N/A | run | not_applicable; measured |
| timing.wall | 32.804040999999984 | N/A | N/A | run | not_applicable; measured |
| verifier.quality | N/A | N/A | N/A | development | provisional; not_implemented |

Matching errors: [{"kind":"missed_pair","pair":["row_05e5d126cb","row_1e60b0a9dc"]},{"kind":"missed_pair","pair":["row_05e5d126cb","row_7f3f1b14c3"]},{"kind":"missed_pair","pair":["row_11bb99b2fa","row_bdbc045131"]},{"kind":"missed_pair","pair":["row_1d1bdffe92","row_83da10f114"]},{"kind":"missed_pair","pair":["row_1e60b0a9dc","row_7f3f1b14c3"]},{"kind":"missed_pair","pair":["row_22e59912ad","row_fbe753d7cc"]},{"kind":"missed_pair","pair":["row_3e2dd6416e","row_94d9860adf"]},{"kind":"missed_pair","pair":["row_64543589fc","row_a386736693"]},{"kind":"missed_pair","pair":["row_87ace126d4","row_92da044aa3"]},{"kind":"missed_pair","pair":["row_c2467f5304","row_f3873a8816"]}].

Quality check errors: N/A.

Sources/config: {"feed":"6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6","taxonomy":"f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa","labels":"74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989","config":"cb6461e284296710e4e189051f7ccd597ebd9e02dc53142fa413997ab528946f"}

Code: {"commit":"6099ce2e494665026857c6d06d62e2ad8325d2e5","dirty":true,"implementationHash":"1680def45a30f59af3e0813285ea1ef1b9d5917b9b973c3582948549d14ebbcb"}

Timing: {"protocol":"cli-through-result-v1","node":"v24.14.1","platform":"darwin","arch":"arm64","pipelineMs":2.1916249999999877}. Wall measurement ends after result/diagnostics, before metric/report serialization.

No generation, verifier, or publication readiness. Counts over all inputs are diagnostics; quality is measured only on the provisional development labels/checks. Unknown relations are excluded.
