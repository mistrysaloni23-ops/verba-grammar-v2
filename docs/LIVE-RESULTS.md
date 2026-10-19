# Actual live verification — 19 October 2026

Website: https://verba-grammar-v2.pages.dev

The owner explicitly confirmed an unbilled Gemini project. The live run used real API requests with synthetic writing, separate from regular mocked CI. Every comparison attempt was reserved against the production D1 quota. No paid billing or paid fallback was enabled.

## Baseline comparison

[Run 39241024812](https://github.com/mistrysaloni23-ops/verba-grammar-v2/actions/runs/39241024812), with provider-default thinking. [Full synthetic inputs, references, outputs and errors](results/baseline-2026-10-19.json).

| Measurement | Gemini 3.8 Flash | Gemini 3.6 Flash |
| --- | --- | --- |
| Cases sent to provider | 16 | 11 |
| Complete text responses | 13 | 9, including one incorrect JSON wrapper |
| Timeouts | 3 | 1 |
| Other provider failure | 0 | 1 unavailable response |
| Median of complete-response times | 5.138 s | 5.475 s |
| p95 of complete-response times | 11.956 s | 11.650 s |
| Sample already-correct sentence | Left unchanged | Left unchanged |

Latency includes D1 reservation and a possible provider retry. Complete-response statistics exclude failures, so they must not be read as overall availability. The JSON-wrapped 3.6 response is counted in the table's transport completions, not as acceptable corrected English. The run made 30 outbound attempts including retries. It stopped when a shared-limit reservation was refused before sending the next case; it did not exhaustively evaluate either model.

Qualitative review by the AI assistant found the completed 3.8 examples grammatically sound and consistent with the references' meaning. This included fixing multiple simultaneous errors, natural rewriting, preserving negation and the name/quantity in `Dr. Rao has not approved the 15 mg dose.`, and preserving a correct sentence unchanged. Valid alternative wording is allowed: exact-reference matching is not an accuracy score. These observations are not independent human review or a population-level accuracy estimate.

The baseline does **not** consistently meet the 2–5 second target. A supported lower-thinking configuration is being tested before any production tuning decision. Production continues to use Gemini 3.8; no automatic model switching exists.

## Production checks

- Real homepage returns HTTP 200.
- Public `/api/config` reports ready with Turnstile required.
- A correction request without a Turnstile token is rejected with HTTP 403 / `BOT_CHECK`.
- Real desktop and Pixel 7 emulation layouts have no horizontal overflow. Production light/dark screenshots were captured; desktop light and mobile dark were visually reviewed.
- Automated Chromium could not complete the production Turnstile challenge on either viewport. No corrected output was shown. This is **not** a successful end-to-end correction test, even though the diagnostic workflow finished successfully and produced its report.
- The owner subsequently reported the exact production message `Our free AI allowance is temporarily busy or exhausted. Please try again later.` This message is emitted only after Turnstile passes and Gemini returns HTTP 429, confirming the real-user request reached Gemini. A successful corrected output in the user’s browser remains unverified. Bot protection has not been bypassed.

## Remaining limits

The authored corpus contains 120 cases across 15 categories; most have not yet been sent to either live model. Longer multi-paragraph and ambiguity coverage, additional unchanged-text cases, full free-tier quota characterization, independent human quality review, and a real-user end-to-end browser correction remain open. Further evaluation must respect the shared daily budget and provider quotas.

## Current provider and testing blockers

The owner’s real-browser request received Gemini HTTP 429. This establishes free-tier quota refusal, but the generic message alone does not distinguish a daily limit from a temporary request/token rate limit. Bulk live evaluation is paused. The diagnostic runner defaults to at most two attempts, stops all models on a quota response, and records only sanitized quota metric/limit/retry fields. Live tests are now manual-only and never run automatically on source pushes. No quota increase or paid billing was enabled.

At 16:30 UTC, GitHub’s official status page reported an active Actions/Webhooks/Pages disruption with delayed workflow processing. The new CI and diagnostic runs were queued. This delays verification; it is separate from the website’s Gemini quota error. See https://www.githubstatus.com/.
