# Ollama: experimental development baseline

Provisional labels; no holdout evaluation. Cold load is included in latency. Local compute cost and unavailable cache usage: N/A.

| Model | Extraction valid | Proposed correct / extra / missing | Accepted correct / extra / missing | Citations | Matching valid | Dangerous / unconfirmed merge | Median / p95 ms | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| gemma4-12b | 0/12 | 7/6/4 | 0/0/11 | 17 | N/A | N/A/N/A | 18835.4/242268.8 | fail |

Full experiment: not permitted: strict development threshold not met. Accepted product baseline: B1-v2. Matching remains shadow.

Detailed validation denominators, per-request timings, rejected additions, scope/condition reasons, review counts and replay checks are in comparison.json and each run’s experiment-metrics.json.
