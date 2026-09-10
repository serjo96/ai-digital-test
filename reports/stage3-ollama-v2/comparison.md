# Ollama: итог этапа 3

Экспериментальный development baseline, provisional. Принятый продуктовый baseline: B1-v2.

| Модель | Extraction valid | Proposed correct/extra/missing | Accepted correct/extra/missing | Shadow valid | Dangerous/unconfirmed | Median/p95 extraction ms |
|---|---:|---:|---:|---:|---:|---:|
| qwen3:4b | 2/12 | 11/38/0 | 3/0/8 | 1/8 | 4/2 | 15591.6/18492.4 |
| gemma4:12b | 0/12 (server load error) | N/A | 0/0/11 | N/A | N/A | N/A (no generation) |

Architecture complete: true; development quality: not confirmed. Full run: not permitted. Replay matches.

Matching schema v2 transport failures remain in the original experiment; v3 fixes tuple encoding only. No extraction or Gemma rerun. Costs/cache unknown: N/A; cold loads remain included. See comparison.json, manifests, normalized responses, raw cache and benchmark for exact diagnostics and timings.
