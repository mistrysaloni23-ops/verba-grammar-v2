# Verification report — 19 October 2026

## Successful GitHub Actions run

[Verify Verba — run 39241024862](https://github.com/mistrysaloni23-ops/verba-grammar-v2/actions/runs/39241024862) completed successfully for source commit `76a08f396b514a7b602339fcfacab5b4472ed7cd`.

| Check | Actual result |
| --- | --- |
| Dependency installation | Passed with committed lockfile and `npm ci` |
| Server tests | **56 passed; 0 failed; 0 skipped** |
| TypeScript checking | Passed |
| Vite production build | Passed |
| Cloudflare Pages Functions compilation | Passed |
| Local Cloudflare Pages runtime smoke test | Passed: built assets, config endpoint and correction refusal without credentials |
| Desktop Chromium browser checks | **9 passed** against production build |
| Pixel 7 Chromium viewport checks | **9 passed** against production build |
| Total browser checks | **18 passed**, with no retries needed in the successful run |
| Screenshots | Light/dark desktop/mobile captured; desktop light and mobile dark visually reviewed |

Earlier CI failures revealed a Cloudflare tooling peer-dependency conflict, strict typing errors around unknown JSON payloads, and a comparison-test selector that included the legend. These were corrected before the successful run. There is no suppressed failing test.

## What the tests establish

- Real SQLite migration, atomic shared daily limits, rolling visitor limit, concurrent reservation attempts, UTC reset, and fail-closed database errors.
- Missing credentials, disallowed models, free-tier attestation, invalid configuration bounds.
- Origin, HTTP method, JSON format, empty/invalid/long input, and streamed-body cap.
- Turnstile host/action validation, malformed responses and provider failures using mocked HTTP.
- Gemini 400/401/403/404/429/500, transient/persistent 503, malformed output, truncation, blocked output and network/timeout errors using mocked HTTP.
- One retry maximum, counting attempts conservatively, no quota retry, and cancellation before reservation/provider call or retry.
- API key placement in the server header, rotating HMAC visitor identity, mode-aware cache keys and word counts.
- Browser operation of both modes, manual/automatic correction, 2.5-second idle debounce, unchanged-input caching, composition pause, stale-response rejection, copy, comparison, clear, undo/redo, input cap, error presentation, themes, privacy dialog and responsive overflow.
- Corpus integrity: **120 unique human-authored references across 15 categories**, including already correct text, ambiguity, multiple grammar errors, numbers, negation and paragraphs.

## Mocked testing versus live verification

Gemini and Turnstile responses in automated tests are mocked. SQLite enforcement tests run against a real local database, not production D1. The Pages smoke test runs Cloudflare's local workerd runtime against the production assets and actual Functions; it deliberately verifies `NOT_CONFIGURED` and makes no live Gemini call.

Browser checks use real Chromium against the built frontend, with API responses intercepted. Pixel 7 testing is viewport/device emulation, not a physical phone. Safari/iOS and other browser engines have not been tested. Response-time values in mocked UI screenshots are test fixtures, not provider benchmarks.

The [official documentation workflow](https://github.com/mistrysaloni23-ops/verba-grammar-v2/actions/runs/39208438885) successfully retrieved Google's current model, pricing, thinking and terms pages. Both requested model IDs and their standard free-tier text pricing are documented; see [model report](MODELS.md).

## Still unverified / required before launch completion

- A successful real-user browser correction; production readiness and missing-token rejection now pass.
- PR preview behavior via the owner's Cloudflare Git connection.
- Exact quota limits and reset behavior for the owner's unbilled Gemini project; authenticated calls succeeded for both requested models.
- Full live corpus comparison, independent human quality review and completion of lower-thinking latency tests. Both modes and both models have produced real outputs; the baseline p50/p95 measurements and errors are recorded in LIVE-RESULTS.md.
- Broader production concurrency/load testing. The real D1 limiter refused an evaluation attempt; invalid bot requests are rejected and the owner’s request passed Turnstile before Gemini returned 429.

Cloudflare reports a successful production deployment of commit `f36957d7759e16aebfe90a4e8bdf1c0488c68e95` at **https://verba-grammar-v2.pages.dev**, deployment `e42a5d6b-9236-472e-8ccc-556884e1058e`. Native GitHub integration is connected. This confirms deployment, not live correction quality. No live AI accuracy percentage is claimed. The local workspace proxy still fails, but GitHub Actions has completed the dependency/build/browser checks independently. GitHub repository installation and source-write access are verified.

## Acceptance status

Source publication, build, automated application tests, and local Pages runtime verification are complete. The owner's overall completion requirements remain open until secure runtime configuration and live Gemini verification succeed.

## Account setup and first live smoke test

The secure setup workflow succeeded after the owner updated the Cloudflare token validity. A mapping error in the setup script was also fixed: Cloudflare returns a Turnstile widget's `secret` field. Regression tests now cover creation and reuse of that documented response. The deployment configuration was subsequently separated from local Wrangler configuration to preserve dashboard-managed runtime settings.

The setup created/reused the real `verba-usage` D1 database, applied the schema, configured a production Turnstile widget and encrypted runtime secrets. The owner explicitly attested to an unbilled Gemini project. No billing endpoint was called.

One reviewed Gemini 3.8 Flash smoke test returned `She doesn't have any information about the project.` from `She don't have a informations about project.` in **8,869 ms**, with one provider attempt. The correction fixes agreement, the mass noun and articles while preserving intent. This is one real sample, not an accuracy percentage or a latency distribution; it exceeds the 2–5 second target. Broader model and production checks are pending.

Dedicated live verification is separate from regular CI. It uses synthetic cases and reserves every model-evaluation attempt against the real shared D1 budget. Production browser verification makes real requests and never bypasses Turnstile; an automated browser challenge failure must be reported as unverified rather than a successful correction.

## Latest outcome

Production readiness, real synthetic model comparisons and deployed desktop/mobile layout checks are now recorded in [LIVE-RESULTS.md](LIVE-RESULTS.md). The owner’s real-browser request reached Gemini but received HTTP 429. This is a provider quota refusal, not successful correction. The live suite is manual-only and defaults to two attempts; the already queued diagnostic also uses that cap when it starts. No billing changes were made.

The most recent validation hardening rejects a model’s echoed JSON input envelope and supports a server-side thinking-level setting. These changes passed the local test suites; the new full GitHub checks and capped live diagnostic are queued during GitHub’s reported Actions disruption. Production thinking remains at the provider default pending measured tuning results.
