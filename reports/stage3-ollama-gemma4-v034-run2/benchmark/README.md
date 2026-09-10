# Benchmark history

One JSON object per run/metric in observations.jsonl. Null means unavailable, never zero. Compare quality within metricCohort only; keep provisional and human_verified separate. Timing is a single local observation, not a statistical speedup estimate. Failed attempts have no quality scores.

- B1-control-code: success; B1-v2; wall 65.87020899999993 ms
- ollama-gemma4-12b-smoke-live: partial; B2-v1; wall 120332.52808399999 ms
- ollama-gemma4-12b-smoke-replay: partial; B2-v1; wall 186.96866700000828 ms
