# Benchmark history

One JSON object per run/metric in observations.jsonl. Null means unavailable, never zero. Compare quality within metricCohort only; keep provisional and human_verified separate. Timing is a single local observation, not a statistical speedup estimate. Failed attempts have no quality scores.

- B1-control-code: success; B1-v2; wall 58.36291600000004 ms
- ollama-gemma4-12b-smoke-live: partial; B2-v1; wall 17174.621042 ms
- ollama-gemma4-12b-smoke-replay: partial; B2-v1; wall 149.08687500000087 ms
- ollama-gemma4-12b-development-live: partial; B2-v1; wall 468210.11616700003 ms
- ollama-gemma4-12b-development-replay: partial; B2-v1; wall 197.79354099999182 ms
