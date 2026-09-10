# Benchmark history

One JSON object per run/metric in observations.jsonl. Null means unavailable, never zero. Compare quality within metricCohort only; keep provisional and human_verified separate. Timing is a single local observation, not a statistical speedup estimate. Failed attempts have no quality scores.

- B1-control-code: success; B1-v2; wall 56.75679200000002 ms
- ollama-gemma4-12b-smoke-live: partial; B2-v1; wall 120334.981791 ms
- ollama-gemma4-12b-smoke-replay: partial; B2-v1; wall 379.32079100000556 ms
