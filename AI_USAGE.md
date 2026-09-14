# AI usage

## Tools used

I used **Codex in the desktop application** as the primary implementation assistant and **Cursor Agent** for an early version of the React results screen. They helped inspect the repository and supplier data, propose implementation plans, edit TypeScript/React/Markdown, add tests, run local commands, review failures, and exercise the UI in a browser.

I also used model APIs inside the product as controlled experiments:

- Local **Ollama** models (`qwen3:4b` and `gemma4:12b`) were evaluated for semantic extraction and advisory matching. They did not meet the acceptance gate and do not affect the final catalog.
- OpenAI **`gpt-5.6-sol`** was used for constrained listing generation and a later development-only extraction check.
- OpenAI **`gpt-6-astra`** was used as the independent claim verifier. Its responses still pass deterministic schema, citation, coverage, and evidence checks before any text can be published.

Supporting tools included TypeScript, NestJS, React, npm, `node:test`, shell commands, local browser automation, and official product documentation. These tools were used for implementation and verification, not as sources of product facts. Runtime prompts treat supplier rows as untrusted data and prohibit external product knowledge. API keys were read only from the local environment and were not committed or copied into browser data or saved run artifacts.

## What I delegated and what I retained

I delegated repository inspection, implementation drafts, mechanical refactors, test generation, documentation editing, command execution, and browser smoke checks to the coding agents. The agents also helped prepare provisional evaluation fixtures and diagnose failures. No subagents were used; all agent work stayed in the main working session.

I retained control over scope and acceptance: I chose the TypeScript/NestJS and React direction, approved the B1/B2/B3 boundaries, selected which model experiments could run, and explicitly authorized external model calls. I reviewed the proposed behavior and test results, decided not to promote B2 after it failed its quality gate, and required B1 catalog decisions to remain the safety baseline. I also completed the final 20-item matching review myself; the agent validated the exported structure and calculated agreement but did not answer the review questions on my behalf.

The agents produced most of the code changes under these constraints. I treated their output as untrusted until it passed source inspection, automated tests, deterministic replay, artifact validation, and—where required—human review. Generated model confidence was never used as automatic permission to merge products or publish text.

## Representative prompts

The following are abridged examples of instructions I gave the coding agents:

1. “Implement a deterministic TypeScript/NestJS baseline that accounts for every supplier row, preserves exact source data, reports measurable matching results, and does not automatically proceed beyond the agreed stage.”

2. “Run a limited Ollama experiment with fixed smoke, development, and shadow-matching samples. Preserve raw responses and replay them offline. Do not allow model recommendations to change B1 decisions unless every acceptance threshold passes.”

3. “Add listing generation and an independent claim verifier. Generate only from approved supports, verify the complete text against source rows, and fail closed: unsupported, incomplete, or technically invalid claims must be withheld or routed to review rather than published.”

These prompts were followed by narrower corrections and review requests, but the examples capture the main delegation pattern: explicit scope, preserved evidence, measurable acceptance criteria, and no silent expansion after a failed check.

## One place the AI was wrong and how I caught it

During the early matching analysis, the agent stated that a German AeroBuds row did not specify a color. That was incorrect: the source title contains **“schwarz”**, meaning black. I caught the error while re-reading the original supplier row during the next-stage review rather than trusting the earlier summary.

The correction was handled conservatively. The original source was preserved, the German token was added to the explicit normalization vocabulary, and a regression check was added. The affected provisional unknown labels were not silently rewritten to improve the reported score; their status was retained by explicit decision and later exposed to human review. This incident reinforced two project rules: every semantic assertion must remain traceable to an exact source span, and AI-prepared labels or summaries are not ground truth until independently checked.

The same principle governs the final system. Model-based B2 extraction remained rejected when its measured output contained unsupported additions, while B3 text can be published only after independent verification and deterministic validation. Detailed model roles, costs, latency, and measured results are recorded separately in [LLM_ROLES.md](LLM_ROLES.md) and [the benchmark documentation](docs/BENCHMARKS.md).
