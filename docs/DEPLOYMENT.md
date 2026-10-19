# Deployment and account authorization

## Current status

The owner connected GitHub and deployed **https://verba-grammar-v2.pages.dev** through Cloudflare Pages. Production uses branch `main`, framework preset `None`, build command `npm run build`, output `dist`, and Node 24. Cloudflare's deployment check reports success.

The owner supplied the scoped Cloudflare API token and Gemini key using encrypted GitHub repository secrets and explicitly confirmed that paid Gemini billing is disabled. The secure setup workflow successfully created the usage database and Turnstile widget and stored encrypted Cloudflare production secrets. A real Gemini correction succeeded. Final production verification is in progress.

See [secure setup](SECURE-SETUP.md) for the reproducible workflow. The engineer performs migrations and deployment checks. The owner does not need terminal commands or source edits.

## Engineering deployment steps

1. Use the committed lockfile and `npm ci`; the GitHub Actions runner is available even while the local proxy is down. Run all checks and desktop/mobile tests. Current official Gemini model, pricing and terms pages have been retrieved; see `docs/MODELS.md`. Confirm the selected model exists and is available on the owner's free project. Run live evaluations before selecting a production model.
2. The setup workflow creates/reuses the free `verba-usage` D1 database, applies the idempotent migration and sets the production `DB` binding. `wrangler.local.toml` records the binding for local development only.
3. The workflow creates/reuses the managed Turnstile widget for the production hostname and stores its keys securely. Preview corrections remain disabled.
4. In **Cloudflare → Workers & Pages → Create application → Pages → Connect to Git** (labels may appear as “Import an existing Git repository”), authorize GitHub and select `verba-grammar-v2`. Production branch: `main`. Build command: `npm run build`. Output directory: `dist`. Node version: `24`. Cloudflare recognizes the root `functions/` directory. Select the free plan.
5. Configure production runtime values. Keep secrets encrypted:

| Name | Kind | Value |
| --- | --- | --- |
| `GEMINI_API_KEY` | Encrypted secret | Google AI Studio key for the unbilled project |
| `GEMINI_MODEL` | Server variable | Exact independently verified model ID |
| `APPROVED_FREE_MODELS` | Server variable | Comma-separated verified eligible IDs; no automatic fallback |
| `FREE_TIER_CONFIRMED` | Server variable | `true` only after account/model checks |
| `VISITOR_HASH_SECRET` | Encrypted secret | Random value of at least 32 characters |
| `TURNSTILE_SECRET_KEY` | Encrypted secret | Turnstile private secret |
| `TURNSTILE_SITE_KEY` | Public server config | Turnstile public site key |
| `REQUIRE_TURNSTILE` | Server variable | `true` |
| `DAILY_BUDGET` | Server variable | `100` initially; lower to match available Gemini quota |
| `VISITOR_PER_MINUTE` | Server variable | `4` initially; lower if account limits require it |
| `DB` | D1 binding | `verba-usage` |

Cloudflare's production settings are the source of truth for runtime values and bindings. There is deliberately no root `wrangler.toml`: it would override dashboard configuration on deployment. Use `wrangler.local.toml` only with explicit local Wrangler commands. Model changes require updating the secure server environment variable and redeploying, without changing application code. Production and preview settings are separate; preview AI remains disabled.

6. Push source to `main`. GitHub Actions runs tests and builds. Cloudflare Git integration deploys production changes and, where enabled, creates PR previews. Cloudflare Git integration and GitHub checks are independent: configure GitHub branch protection to require `verify` before merging to `main`; avoid direct unverified pushes. Enabling required checks may depend on repository visibility/account features.
7. Verify `/api/config`, both live modes, no-change behavior, quota/error behavior, Turnstile, desktop/mobile layout, and privacy notice on the deployed URL. Confirm the Pages dashboard reports successful deployment. Record the literal production URL and real latency/quality evaluation results.

## Billing and free-tier boundary

No code switches to a paid model or service. The server rejects models outside the configured free allowlist and refuses corrections until `FREE_TIER_CONFIRMED=true`. This is an operator attestation, not a Google billing-status API check. Never enable paid billing. Cloudflare D1 and Functions have their own free quotas; failures are handled without bypassing enforcement.

## Verification status

The Vite production build, Pages Functions compilation, 56 server/setup checks, local Pages runtime check and 18 desktop/mobile browser checks have passed. The initial setup is now complete. Production end-to-end checks and the broader live comparison are recorded separately in `docs/VERIFICATION.md`; mocked results are never represented as live accuracy.
