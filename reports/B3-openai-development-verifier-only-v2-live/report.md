# B3-openai-development-verifier-only-v2-live — B3-v1

Status: success; mode: live; matching labels: **provisional**; development only. Holdout not evaluated.

| Metric | Value | Numerator | Denominator | Scope | Status |
|---|---|---|---|---|---|
| accounting.coverage | 1 | 220 | 220 | full_input | not_applicable; measured |
| accounting.duplicate_assignments | 0 | N/A | N/A | full_input | not_applicable; measured |
| accounting.lost_rows | 0 | N/A | N/A | full_input | not_applicable; measured |
| ai.failed_jobs | 0 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.calls | 12 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.cost | 0.4572725 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.errors | 0 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.jobs | 12 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.median_wall | 6087.085792000002 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.p95_wall | 7499.262959 | N/A | N/A | run | not_applicable; measured |
| ai.role.controlled_verification.tokens | 28612 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.calls | 37 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.cost | 1.9329724999999993 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.errors | 0 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.jobs | 37 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.median_wall | 8665.12041599999 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.p95_wall | 15721.711165999994 | N/A | N/A | run | not_applicable; measured |
| ai.role.verification.tokens | 96721 | N/A | N/A | run | not_applicable; measured |
| ai.target_rows | 39 | N/A | N/A | run | not_applicable; measured |
| api.cache_hits | 0 | N/A | N/A | run | not_applicable; measured |
| api.calls | 49 | N/A | N/A | run | not_applicable; measured |
| api.cost | 2.3902450000000006 | N/A | N/A | run | not_applicable; measured |
| api.errors | 0 | N/A | N/A | run | not_applicable; measured |
| api.input_tokens | 103361 | N/A | N/A | run | not_applicable; measured |
| api.output_tokens | 21972 | N/A | N/A | run | not_applicable; measured |
| api.retries | 0 | N/A | N/A | run | not_applicable; measured |
| api.tokens | 125333 | N/A | N/A | run | not_applicable; measured |
| categories.check_accuracy | 1 | 18 | 18 | development | provisional; measured |
| errors.execution | 0 | N/A | N/A | run | not_applicable; measured |
| errors.matching | 0 | N/A | N/A | development | provisional; measured |
| errors.non_product | 0 | N/A | N/A | development | provisional; measured |
| errors.quality_checks | 0 | N/A | N/A | development | provisional; measured |
| facts.accepted_attributes | 392 | N/A | N/A | full_input | not_applicable; measured |
| facts.check_accuracy | 1 | 30 | 30 | development | provisional; measured |
| facts.conflicts | 0 | N/A | N/A | full_input | not_applicable; measured |
| facts.extracted | 545 | N/A | N/A | full_input | not_applicable; measured |
| facts.incomparable | 1 | N/A | N/A | full_input | not_applicable; measured |
| facts.unparsed_fragments | 43 | N/A | N/A | full_input | not_applicable; measured |
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
| publication.covered_rows | 52 | N/A | N/A | development | not_applicable; measured |
| publication.drafts | 37 | N/A | N/A | development | not_applicable; measured |
| publication.products | 39 | N/A | N/A | development | not_applicable; measured |
| publication.ready | 37 | N/A | N/A | development | not_applicable; measured |
| publication.ready_rate | 0.9487179487179487 | 37 | 39 | development | not_applicable; measured |
| publication.reason.identity:incomplete_type_or_variant | 4 | N/A | N/A | development | not_applicable; measured |
| publication.repair_attempted | 0 | N/A | N/A | development | not_applicable; measured |
| publication.repair_succeeded | 0 | N/A | N/A | development | not_applicable; measured |
| publication.review | 2 | N/A | N/A | development | not_applicable; measured |
| publication.withheld | 0 | N/A | N/A | development | not_applicable; measured |
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
| timing.pipeline | 434194.562291 | N/A | N/A | run | not_applicable; measured |
| timing.wall | 434259.96175 | N/A | N/A | run | not_applicable; measured |
| verifier.controlled.disputed_leakage | 0 | 0 | 1 | development | human_verified; measured |
| verifier.controlled.errors | 0 | N/A | N/A | development | human_verified; measured |
| verifier.controlled.false_block_rate | 0 | 0 | 7 | development | human_verified; measured |
| verifier.controlled.unsupported_detection_recall | 1 | 4 | 4 | development | human_verified; measured |
| verifier.generated.checked_published_claims | 0 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.completed_sample_products | 0 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.fully_checked_products | 0 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.non_atomic_issue_claims | 0 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.published_claim_error_rate | N/A | 0 | 0 | development | not_evaluated; no_denominator |
| verifier.generated.required_sample_products | 0 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.total_published_claims | 99 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.total_published_products | 37 | N/A | N/A | development | not_evaluated; measured |
| verifier.generated.unclear_copy_issue_claims | 0 | N/A | N/A | development | not_evaluated; measured |

Matching errors: none.

Quality check errors: [].

Publication: {"products":39,"drafts":37,"ready":37,"withheld":0,"review":2,"coveredRows":52,"repairAttempted":0,"repairSucceeded":0,"reasons":{"identity:incomplete_type_or_variant":4}}.

Verifier: {"controlled":{"status":"human_verified","checked":12,"supported":{"allowed":7,"total":7,"falseBlocks":0},"unsupported":{"blocked":4,"total":4,"leaked":0},"disputed":{"blocked":1,"total":1,"leaked":0},"errors":[]},"generated":{"status":"not_evaluated","checkedPublishedClaims":0,"totalPublishedClaims":99,"fullyCheckedProducts":0,"totalPublishedProducts":37,"completedSampleProducts":0,"requiredSampleProducts":0,"publishedClaimErrors":0,"nonAtomicIssueClaims":0,"unclearCopyIssueClaims":0}}.

AI: {"targetRows":39,"jobs":49,"failedJobs":0,"origin":"real","requestHashes":["4eef526b41888bbc4cbf0fdacb52989d194cd3dc89df56867e4359f0b636d44a","2689004a4645f5c95c93278c52d8f2531178065d570dad99dfedbfa0c3a33569","c639ae9d57c36196036218d94ba0f0fceaeae87270d560338833a5eafbf09566","2116a82f7b6d43feccdc85dcf6c5160baa950dc2cd610e3827b6725a857c73fc","957494058092e813df15114e3478c7ecc442dc25aa4ec6cb011b39ad19bb17a1","72d8dd2b48a55facdcf9a376719806fc7e043e461adab5ef7b86d8782fb2b0a2","092c37a2fa18113ab9c0b6c8cecaa84aa6ce5641faebf1ad1c2c89d7e4a92833","dcd182da87edd9bc7b9bf41890a36f58d901a97c76463372d501494810b76d8a","43b040362ab411671b2d9367008f91351a22c6cf0e7c87474ca99894d5ae7c50","b986f618591baf7df4d3a3932f45ae87ae3266ee0c5e726dd7961bed563e7de5","2e46b768e8500c14fe73ce8a1f8ef2b81e2cef1fa7f06e2997a5e99efa35d0ae","ee7e68d9d910600c42348c69f06d55136ad54b7a2f82b8ece883e8d733c136e4","70a26deb8d97af2bfaf4752a6f58aa345cd5e82d3ff7ea9cb49d9fe037512f3e","de4f2a3ba1de53d04638029d4baaa1fb253b984dbd4c35358a5975561c615c10","d0be70eea40aaa9dbe984ba23b7f491650d26a0cf7ab36b874186a4a2b41dd28","109f797296fe3677581afd2b6483d2480f860c3d8151414587c582e6decd125d","4206edb3265023627b6917aeef9ff1b4f9eab5d1c08256e295c67906f24741c2","6246f3d1e1269a84c368bc136c41d582f67920de2fe931ed5c611a19e2aef480","02b4ff6e47a87e4d414139b91cb770f0a2916dc6ff2cfeed2181ae154a4bf804","92bd9cfd6498a2b85cc706953d87bbcdf8e74d9c567e9c4545cca64532b97933","2fcf2ca1840a0eefc6dd5997f04202301b50ae64b65759da087ae757f46cc9a5","37aaec36b346c20cf625ebe1a1526706875ba2df9501eefcd070af6224ed7e80","f81b5c9af8896157478a7fab5375d3b028509e5b12648eab22a35c82114435cb","1aa49fb0e587817c4d8de0b78015317b8c780cd34f49965c2980d61bf87626bf","1468990631fc14c98a2e114052c31f8e549a96bc995899ed3233f93a29a2d4dd","a7c055662d4301fba77a6cc4951e875bea7c6bc746eaacfebfdc2f709aa48694","2877639d8da6d2b02f3dfbc43d3a44e58723cb234905d12988131da7b5fe32c8","03a10024005fe381b45e73979dc0784d4bc45d7afb0c410276be024c96091fe8","8e9345ea81508ca671fd2feb36ea1dd13de0ae18744aadb448b391ccb495e8fb","2c5dbe8deba818d0deed83e0b9d69572b99b04b36279e4ebdf75861cbd3e677a","9a834d3e0662dbc5c3fefab41e63d996e00d83e6ab3ed1a53c0eeafc7ca0a26a","a72d05e75211b9f78bc0a07a359a5aaacf4c8f31cd4bfa2e4e440daf54cdeda7","6fc89cc1a4bf742f926994306054ed3564d212ebd40b7edebe67394ab89a2e4b","4d65e44082c9883ed2ba17504a517aade3b7cf70af3f2fadbdd8232a7f9434cf","b587e2335195cc2865a38e6d73db17b187ef3e46c39eca1f39a40fcf0790baba","963efc17dde01db52740af5ef5cdfa58f0a5b196caabd856bc5791f491290c87","1faa62197d970b1db0668455c2e060b396ce0da5ca0a1bbf422704b0d55de334","dfb9412a0d8db83db1b4c19bf82f2dabcbb94852d416f32c3e88e8521a586f20","54a4ad4acdbccde9095e2ed57e7d53f1f70478852d85b1158ca04a35c0e7ea85","78efd8694ab5a931613c0d6ba06176129e52dc82d28020d372cabbeb9d2fab65","bd192809cbe45d8120ad11e8ec88074806d26c845b0e109b3b67a1cef4a912ca","3e0ae14570cd54274be495a9b2f980d8e32ae1187ed1eb23e31a30dd2c80fcd6","078d0d1b91e52b754af4fa370d8e42c3109062ce1610d56d0809fcca32c49d67","025d321229bb1aa0e8d1dc43501a6833db71665bdda48ea5f36b782c4e308a09","80eb5cea9ea8b21eb0353ee39176e3c2be3693e4da945ea18e64c53939ae3b43","ad1ffb1b5ef5e64be5de8eb8b041a2dd1058e5b275da6c8612585ceb014744cd","bb44ab7777e09618a44d25bcd2b549d608bb8f203da342447fc9e825292123be","98174435e814a0395283e79e97fcd7e18c8c330aa6e08949babc677d5b61a3f8","9cc057a7ed7f4969109f63a65b1d29d2f7a04df773dd2b222950fb642ae3dbbb"],"roles":{"controlled_verification":{"calls":12,"errors":0,"retries":0,"cacheHits":0,"inputTokens":25953,"outputTokens":2659,"tokens":28612,"cost":0.4572725,"jobs":12,"medianWallMs":6087.085792000002,"p95WallMs":7499.262959},"verification":{"calls":37,"errors":0,"retries":0,"cacheHits":0,"inputTokens":77408,"outputTokens":19313,"tokens":96721,"cost":1.9329724999999993,"jobs":37,"medianWallMs":8665.12041599999,"p95WallMs":15721.711165999994}}}; usage: {"calls":49,"errors":0,"retries":0,"cacheHits":0,"inputTokens":103361,"outputTokens":21972,"tokens":125333,"cost":2.3902450000000006}. Controlled distortions and generated human review are reported separately.

Sources/config: {"feed":"6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6","taxonomy":"f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa","labels":"74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989","config":"65e00cc40b371cb2e679cc83fc9e325e20e9e5041af9450e6e80ea62b11625b9","checks":"3b1f1003325b434e024376f3e4901f11ad8d925878b5957508bbad8789bb20ca","claimChecks":"44cf928c2a8539ee4f915f640a8561f3e7c66d63647cb7db091705860d6f273c","publicationSource":"e478435a3d39afd21969ec549a47a41fb55dfa6c7f4cd4db48c2a71d01484ce3"}

Code: {"commit":"5177d3e98ccbf9b3c87abec811326431f17e6032","dirty":true,"implementationHash":"b12c88650266876d3a2b17e41a7c6f9a49a41c309aceb1919e2de240b1be9252"}

Timing: {"protocol":"cli-through-result-v1","node":"v24.14.1","platform":"darwin","arch":"arm64","pipelineMs":434194.562291}. Wall measurement ends after result/diagnostics, before metric/report serialization.

Publication text is released only after complete claim coverage and supported verdicts. Holdout remains unevaluated.
