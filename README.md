# Verba v2

A React + TypeScript + Vite English editor with Google Gemini behind Cloudflare Pages Functions. The app implements minimal correction and natural rewriting, idle correction, mode-aware in-memory caching, cancellation, comparison, copy, clear, history, responsive layouts, and dark/light themes.

**Status:** [source published on GitHub](https://github.com/mistrysaloni23-ops/verba-grammar-v2); 53 server tests pass. Source is published on GitHub. Dependency installation, TypeScript checking, Vite production build and Pages Functions compilation have succeeded in GitHub Actions. **18 desktop/mobile browser tests and the local Pages runtime smoke test pass.** See the [successful CI run](https://github.com/mistrysaloni23-ops/verba-grammar-v2/actions/runs/39208761531). Cloudflare deployment and live Gemini evaluation still require account configuration. No public deployment exists. See [verification report](docs/VERIFICATION.md).

## Architecture

- `src/`: React UI; writing and history remain in tab memory. Only theme is saved to local storage.
- `functions/api/config.ts`: public readiness and Turnstile site key only.
- `functions/api/correct.ts`: same-origin server endpoint; never returns a provider key or raw provider error.
- `server/`: reusable mode-specific prompts, response validation, error mapping, HMAC visitor identity and atomic usage reservations.
- `migrations/`: D1 usage schema. No submitted writing is stored.
- `tests/cases.ts`: 120 human-authored references across 15 categories.
- `tests/server.test.ts`: real SQLite enforcement tests with mocked Gemini and Turnstile HTTP.
- `e2e/`: desktop/mobile browser scenarios with mocked API responses.
- `scripts/evaluate.ts`: opt-in live evaluation with capped API attempts and latency recording.

## Local engineering workflow

Use Node 24. Install with `npm ci`, run `npm run check`, then `npm run pages:build` and `npm run test:e2e`. Install Chromium with `npx playwright install chromium` before browser tests. The dependency lockfile is committed and CI uses `npm ci`.

`npm run dev` serves the UI and forwards `/api` to `http://127.0.0.1:8788`. For a local backend, build first, copy `.env.example` to ignored `.dev.vars`, configure server values, apply the D1 migration locally, then run `npm run pages:dev`. Live local corrections require trustworthy visitor metadata; production expects Cloudflare's `CF-Connecting-IP`. `npm run test:pages` starts a local Pages runtime and verifies that missing configuration fails safely, without a live API call. Browser tests intercept API calls and never require real secrets.

The API remains unavailable until all required configuration is present. It never pretends a mocked or failed response is a live correction. No model name is guessed or silently substituted.

## Hosting and model setup

See [deployment guide](docs/DEPLOYMENT.md) and [model evaluation plan](docs/MODELS.md). The intended host is **Cloudflare Pages**, with Git integration and a free D1 database. No Sites hosting, paid services, or billing changes have been made.

## Safety and privacy properties

- 4,000 UTF-16 code-unit limit; server also caps streamed request bodies at 30 KB.
- 2.5-second idle debounce; no requests during composition; auto toggle; aborts and revision checks prevent stale results.
- One successful correction cached by exact source text and mode; repeated successful submissions use it. Explicit retry after failure is allowed.
- Shared daily API-attempt budget defaults to 100; per-visitor limit defaults to 4 attempts per rolling minute. The single atomic SQL insert checks both limits. A 503 retry consumes its own reservation; failed attempts remain counted conservatively.
- HMAC visitor identifier uses a server secret and UTC day. Raw IPs and submitted text are not stored in D1.
- D1 errors fail closed. Turnstile is required by default and validated for host and action on the server.
- API key is sent only from the server using the `x-goog-api-key` header, never URL parameters or a `VITE_` variable.
- 12-second timeout per Gemini attempt, at most one retry for 503, none for 429. Browser timeout is 30 seconds. Canceling a browser request may not stop an already dispatched provider request or refund quota.
- Plain-text output is accepted only from a completed `STOP` candidate, nonempty and bounded; truncated, blocked, malformed, or fenced outputs fail. This validates structure, not factual correctness.
- No analytics or writing logs are added. Google free-tier processing can include product improvement and human review. The UI has an explicit privacy notice and links to provider policies.

A server allowlist cannot detect whether billing has been enabled on a Google project. Free-only operation requires an **unbilled API project**, independently verified model eligibility, and Cloudflare's free plans. The application cannot ensure perpetual free availability, prevent distributed abuse entirely, or guarantee every correction is correct.
