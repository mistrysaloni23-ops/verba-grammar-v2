# Verification report — 19 October 2026

## Successful GitHub Actions run

[Verify Verba — run 39208761531](https://github.com/mistrysaloni23-ops/verba-grammar-v2/actions/runs/39208761531) completed successfully for source commit `46f2f29ff294725ccb41abc075c4d0902c4d75c3`.

| Check | Actual result |
| --- | --- |
| Dependency installation | Passed with committed lockfile and `npm ci` |
| Server tests | **53 passed; 0 failed; 0 skipped** |
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

- Cloudflare account provisioning, real D1 binding, encrypted runtime secrets, Turnstile widget and production deployment.
- Automatic production deployment and PR previews via the owner's Cloudflare Git connection.
- Authenticated eligibility and actual quotas for the owner's unbilled Gemini project.
- Real corrections in both modes using Gemini 3.8 Flash and 3.6 Flash, full corpus comparison, human grammar/fluency/meaning review, and actual p50/p95 latency.
- Production distributed quota enforcement and live bot checks.

No public website URL or live AI accuracy percentage is claimed. The local workspace proxy still fails, but GitHub Actions has completed the dependency/build/browser checks independently. GitHub repository installation and source-write access are verified.

## Acceptance status

Source publication, build, automated application tests, and local Pages runtime verification are complete. The owner's overall completion requirements remain open until Cloudflare deployment and live Gemini verification succeed.
