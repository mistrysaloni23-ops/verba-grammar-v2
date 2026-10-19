# Model selection and live evaluation

## Verified documentation — 19 October 2026

Official model, pricing, thinking and data-use pages were retrieved in English by [the documentation workflow](https://github.com/mistrysaloni23-ops/verba-grammar-v2/actions/runs/39208438885). The complete source pages and retrieval timestamps are saved as a workflow artifact. The workspace proxy remains unavailable, but GitHub Actions could retrieve the official sources.

| Candidate | Official status | Standard free-tier text pricing | English-editing quality | Actual latency/reliability |
| --- | --- | --- | --- | --- |
| `gemini-3.8-flash` | Stable; updated September 2026; described as Google's most intelligent Flash model | Input and output, including thinking tokens: free of charge | Baseline samples reviewed; see LIVE-RESULTS.md | Measured baseline; includes timeouts |
| `gemini-3.6-flash` | Stable; updated July 2026; described as the previous generation balancing speed and capability | Input and output, including thinking tokens: free of charge | Baseline samples reviewed; one JSON-format failure | Measured baseline; incomplete due to limiter |

Both requested names are valid documented model IDs. Both support text output, a 1,048,576-token input context, and up to 65,536 output tokens. These are provider specifications, not measurements from Verba. Authenticated requests succeeded for both candidates on the owner's attested unbilled project. Exact account quotas remain unverified; the owner's subsequent production request received HTTP 429.

The quality-first candidate is **gemini-3.8-flash**, with **gemini-3.6-flash** as the comparison candidate. This is provisional based on Google's model descriptions; it is not an assertion that 3.8 produces better corrections or meets the latency target. No automatic fallback is implemented, and production AI stays disabled until the selected model and unbilled project are configured.

Google documents `low`, `medium`, and `high` thinking for 3.8; `minimal` is explicitly unsupported and returns an error. The thinking guide lists 3.6 as also supporting `minimal`. Both currently default to medium. Verba currently leaves thinking at the model default; any tuning should be measured for accuracy as well as speed. Structured output support is documented for both models, but Verba uses validated plain text until structured behavior is tested live.

## Official sources retrieved

- [Model catalog](https://ai.google.dev/gemini-api/docs/models?hl=en)
- [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash?hl=en)
- [Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash?hl=en)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en)
- [Thinking](https://ai.google.dev/gemini-api/docs/thinking?hl=en)
- [Data-use terms](https://ai.google.dev/gemini-api/terms?hl=en)

The standard free-tier pricing table marks both input and output as free and marks product-improvement use as **Yes**. The terms explicitly describe human review of unpaid API inputs/outputs and warn against submitting sensitive, confidential or personal information. The UI reflects this. The terms provide a regional exception for the EEA, Switzerland and UK. The owner still needs to confirm project billing status and regional availability; Verba cannot infer these from public pricing.

## Evaluation protocol

1. Confirm the project has no billing enabled and the model is eligible for free API usage. Set server-only model variables and an explicit evaluation request cap.
2. Start with a 10-case smoke run; the runner defaults to 15 seconds between cases. Stop on quota exhaustion or configuration failure. Schedule the full corpus across free-quota windows as needed; no paid fallback.
3. Evaluate all 120 cases, then repeat representative difficult cases in both modes and a reliability subset. Include the long example from the owner's request, the `multiple_errors` category, already correct sentences, negation, numbers, ambiguity, paragraph breaks, and prompt-like submitted text.
4. The runner records outputs, reference matches, number token preservation, unchanged behavior, errors, and actual round-trip latency (including retry). It reports p50/p95 latency only for real successful calls. Browser end-to-end latency also includes the 2.5-second typing delay and optional Turnstile time; report this separately.
5. Human-review grammar and naturalness on a 1–5 scale and meaning preservation as pass/fail. References are high-quality examples, but alternative valid edits are allowed. Do not equate exact-reference match or number preservation with semantic accuracy. Review names, dates, modality, negation, and ambiguity explicitly.
6. Prioritize meaning and grammatical completeness, then naturalness, then latency/reliability. The 2–5 second target is for short-sentence response time under normal conditions, not a guarantee.

`npm run eval:live` uses the same prompts and Gemini client as production, requires the free-tier configuration guard, and writes ignored `reports/live-*.json` files. Optional `EVAL_CATEGORY`, `EVAL_MAX_REQUESTS`, and `EVAL_INTERVAL_MS` permit a capped subset. Human-review fields are deliberately null until reviewed. Live calls never run in CI.

## Prompt and output choices

Both modes share constraints for whole-text editing, no invented facts, preservation of names/numbers/negation, and treating the source as data. Correct English explicitly leaves already correct sentences unchanged. Make It Natural permits clearer phrasing without excessive formality. Temperature is 0.15, maximum output 4,096 tokens, with a 4,000-character input limit. These settings are provisional until measured against the selected model; thinking defaults can affect latency and token limits.

Plain text avoids depending on unverified structured-output support. The response must be nonempty, bounded, unfenced, and have finish reason `STOP`. This catches many transport and truncation failures but cannot guarantee semantic quality. The application never labels response validation as an accuracy test.

## Actual results and tuning status

See [live results](LIVE-RESULTS.md) for actual requests, outputs, error counts and measured response times. Gemini 3.8 remains selected after the qualitative comparison; it is not consistently within the latency target. The `GEMINI_THINKING_LEVEL` server variable supports `low`, `medium` or `high`; omitting it retains the provider default. Lower-thinking testing is queued and production has not been tuned without evidence. The dedicated evaluation workflow is manual-only, defaults to two attempts and stops all testing when a provider quota response arrives.
