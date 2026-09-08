# B0 — B0

Status: success; mode: code-only; matching labels: **provisional**; split: development. Holdout not evaluated.

| Metric | Value |
|---|---|
| Accounted rows | 220/220 |
| Lost / double assignments | 0 / 0 |
| Diagnostic groups / grouped rows | 165 / 216 |
| Repeated groups | 48 |
| Non-products / missing-title review | 4 / 0 |
| Matching precision (provisional) | 100.00% (7/7) |
| Matching recall (provisional) | 41.18% (7/17) |
| TP / FP / FN | 7 / 0 / 10 |
| Cases / evaluated rows | 14 / 59 |
| Unknown / unevaluated attached pairs | 2 / 0 |
| Non-product decisions correct | 59/59 |
| Generation / verifier / category quality | N/A / N/A / N/A |
| API calls / tokens / cost | 0 / 0 / 0 |
| Wall time (CLI bootstrap through result/diagnostic writes) | 43.058 ms |

These are exact-title diagnostic groups, not publication-ready products. Price warnings are recorded per row; the stage-2 review metric is not implemented.

## Matching errors

- missed_pair: row_05e5d126cb ↔ row_1e60b0a9dc
- missed_pair: row_05e5d126cb ↔ row_7f3f1b14c3
- missed_pair: row_11bb99b2fa ↔ row_bdbc045131
- missed_pair: row_1d1bdffe92 ↔ row_83da10f114
- missed_pair: row_1e60b0a9dc ↔ row_7f3f1b14c3
- missed_pair: row_22e59912ad ↔ row_fbe753d7cc
- missed_pair: row_3e2dd6416e ↔ row_94d9860adf
- missed_pair: row_64543589fc ↔ row_a386736693
- missed_pair: row_87ace126d4 ↔ row_92da044aa3
- missed_pair: row_c2467f5304 ↔ row_f3873a8816

## Provenance

- Commit: 939f7fa5df26790f69dfac8b896a133f4d6b2820; dirty: true
- Implementation SHA-256: f135691eda19b8240ffa53a8805fe46a3d0af480a339e8191376ffa1f63063d8
- Feed: 6b6ebc7a54ab90abae315abf5b145b22d9ef11d2c673f8feeeb245ee2808d6b6
- Taxonomy: f5bff72b7e07c270a3acd6dcc3c3d0ef8e6237710f270de1874ebcebe9ae70aa
- Labels: 74a194210658f908dcee23f4d000d27b345f242bba9c583e808a1383b9665989
- Config: 20c347d7d5bba036565dd269079723db7c79bc61fc88eae853eb57e9f39e0ea6
- Decisions: 25daa7d7325b01ee62f3ad7496708080fa31aa609eb6b1ebd2ec2559965ebee0
- Rules: B0-v1; schema: 1

Human verification is required before calling the provisional labels ground truth. Unknown relations are excluded; relations between distinct labelled groups/cases are explicit negatives by annotation policy.
