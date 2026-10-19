# Verification report — 19 October 2026

## Executed

Command: `node tests/server.test.ts` on Node 24.19.0.

**53 tests passed; 0 failed; 0 skipped.** The standard `npm test` process also exited successfully. In this environment the child-process test reporter groups output by file; running the file directly exposes the 53 individual cases.

Coverage includes:

- Real SQLite migration, atomic shared daily limits, rolling visitor limit, concurrent reservation attempts, UTC reset, and fail-closed database errors.
- Missing credentials, disallowed models, free-tier attestation, invalid configuration bounds.
- Origin, HTTP method, JSON format, empty/invalid/long input, and streamed-body cap.
- Turnstile host/action verification with mocked provider responses.
- Gemini 400/401/403/404/429/500, persistent/transient 503, malformed output, truncation, blocked output, and thrown network/timeout errors with mocked HTTP.
- One retry maximum, counting every attempt, no retry on quota errors.
- Rotating HMAC visitor identity, mode-aware cache keys, word counts and prompt constraints.
- Corpus integrity: 120 unique references across 15 categories, including unchanged cases.

These tests use mocked Gemini/Turnstile responses and local SQLite, not live Gemini, Cloudflare D1 production, or actual timeout wall-clock waits. The concurrency test exercises SQL admission semantics on one local database; distributed deployment behavior still requires Cloudflare verification.

All 17 TypeScript/TSX source files also passed parsing with the locally installed Playwright Babel parser. This checks syntax only, not types, dependency resolution, or production bundling.

Additional regression coverage verifies that cancellation avoids new quota reservations and provider calls, provider keys remain in headers, malformed response parts are rejected, and invalid Turnstile responses fail closed.

## Prepared but not executed

- TypeScript check, Vite production build, Cloudflare Pages Functions compilation.
- Playwright desktop Chromium and Pixel 7 viewport tests: correction, copy, comparisons, cache, undo/redo, auto debounce, composition, disabled auto, mode switching, obsolete responses, errors, input cap, themes, privacy and responsive overflow.
- GitHub Actions execution and Cloudflare Git integration / previews.
- Live Gemini evaluation of both requested models, full 120-case reference comparisons, human semantic review, real latency benchmarks, and free-tier quota verification.

## Blocking evidence

`curl --max-time 10` to the npm registry and official Gemini docs failed immediately with `Failed to connect to proxy port 8080`. The managed environment status reports an enforced unrestricted HTTP policy, but this does not establish proxy connectivity. Requests for additional network access did not complete and were interrupted. The proxy failure was rechecked on 19 October and remains reproducible. No proxy bypass was attempted.

The npm packages are not installed and no dependency lockfile exists yet. No production build, browser screenshot, public URL, live model quality percentage, or provider latency is claimed. Deployment credentials and a verified free-tier Gemini model remain unconfigured.

## Acceptance status

Application implementation and local server verification are complete for this checkpoint. The owner's overall completion requirements remain open until the dependency build, browser QA, GitHub/Cloudflare deployment and live corrections succeed. This is not a finished production launch.
