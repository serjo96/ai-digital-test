# Ollama: experimental development baseline

Provisional labels; no holdout evaluation. Cold load is included in latency. Local compute cost and unavailable cache usage: N/A.

| Model | Extraction valid | Proposed correct / extra / missing | Accepted correct / extra / missing | Citations | Matching valid | Dangerous / unconfirmed merge | Median / p95 ms | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| qwen3-4b | 2/12 | 11/38/0 | 3/0/8 | 0 | 0/8 | 0/0 | 15591.6/18492.4 | fail |
| gemma4-12b | 0/12 | 0/0/11 | 0/0/11 | 0 | N/A | N/A/N/A | 1701.0/1968.9 | fail |

Full experiment: not permitted: strict development threshold not met. Accepted product baseline: B1-v2. Matching remains shadow.

Detailed validation denominators, per-request timings, rejected additions, scope/condition reasons, review counts and replay checks are in comparison.json and each run’s experiment-metrics.json.
