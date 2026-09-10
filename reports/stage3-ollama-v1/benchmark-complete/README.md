# Benchmark history

One JSON object per run/metric in observations.jsonl. Null means unavailable, never zero. Compare quality within metricCohort only; keep provisional and human_verified separate. Timing is a single local observation, not a statistical speedup estimate. Failed attempts have no quality scores.

- B1-control-code: success; B1-v2; wall 50.11587500000002 ms
- ollama-qwen3-4b-smoke-live: partial; B2-v1; wall 37979.766417 ms
- ollama-qwen3-4b-smoke-replay: partial; B2-v1; wall 147.54595800000243 ms
- ollama-qwen3-4b-development-live: partial; B2-v1; wall 174655.445375 ms
- ollama-qwen3-4b-development-replay: partial; B2-v1; wall 142.49237499997253 ms
- ollama-gemma4-12b-development-live: partial; B2-v1; wall 20815.72433299999 ms
- ollama-gemma4-12b-development-replay: partial; B2-v1; wall 107.57808300000033 ms
- ollama-qwen3-4b-shadow-live: partial; B2-v1; wall 10430.004041999986 ms
- ollama-qwen3-4b-shadow-replay: partial; B2-v1; wall 103.35099999999511 ms
