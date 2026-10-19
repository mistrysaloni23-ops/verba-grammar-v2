# Model selection and live evaluation

## Evidence status — 18 October 2026

The owner requested evaluation of `gemini-3.8-flash` and `gemini-3.6-flash`. This session could not retrieve current official Gemini documentation: HTTPS requests failed at the workspace proxy before reaching Google. No Google API credentials are configured. Therefore neither name's existence, availability, free-tier eligibility, quality, latency, or reliability is verified. Do not assume these are valid model IDs.

| Candidate | Documented existence | Free-tier eligibility | Live quality | Live latency | Decision |
| --- | --- | --- | --- | --- | --- |
| `gemini-3.8-flash` | Unverified | Unverified | Not run | Not measured | Blocked pending evidence |
| `gemini-3.6-flash` | Unverified | Unverified | Not run | Not measured | Blocked pending evidence |

The app intentionally has no default model. Selecting a different documented free-tier model requires recording the official evidence and live evaluation, rather than guessing a successor or claiming the requested names work.

## Official sources to verify

- Model catalog: https://ai.google.dev/gemini-api/docs/models
- Pricing and free-tier eligibility: https://ai.google.dev/gemini-api/docs/pricing
- Account rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- GenerateContent API: https://ai.google.dev/api/generate-content
- Data-use terms: https://ai.google.dev/gemini-api/terms

These links are references to check, not claims that their contents were retrieved in this session. Once reachable, record retrieval date and exact model IDs; compare the account's actual available models using the authenticated model-list API. A listed model may still have no free quota for the specific account or region.

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
