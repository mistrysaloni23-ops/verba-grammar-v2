# Deployment and account authorization

## Current status

The owner connected GitHub and deployed **https://verba-grammar-v2.pages.dev** through Cloudflare Pages. Production uses branch `main`, framework preset `None`, build command `npm run build`, output `dist`, and Node 24. Cloudflare's deployment check reports success.

The initial deployment has no D1 binding and keeps AI disabled. The remaining prerequisites are the scoped Cloudflare API token and an unbilled Gemini API key. See [secure setup](SECURE-SETUP.md): the owner provides these through GitHub's encrypted repository secrets; the engineer handles migrations and code. No terminal commands or manual source changes are required from the owner.

## Engineering deployment steps

1. Use the committed lockfile and `npm ci`; the GitHub Actions runner is available even while the local proxy is down. Run all checks and desktop/mobile tests. Current official Gemini model, pricing and terms pages have been retrieved; see `docs/MODELS.md`. Confirm the selected model exists and is available on the owner's free project. Run live evaluations before selecting a production model.
2. Create a free D1 database named `verba-usage` (`wrangler d1 create verba-usage`). Add a `[[d1_databases]]` block to `wrangler.toml` with binding `DB`, database name `verba-usage`, its returned database ID, and migrations directory `migrations`. The engineer will make this code change. Apply `wrangler d1 migrations apply verba-usage --remote`. This schema contains only quota reservations.
3. Create a Turnstile widget in **Cloudflare → Turnstile → Add widget**. Add the production `pages.dev` hostname and any chosen custom hostname. Managed mode is appropriate. Configure site key and encrypted secret key. Preview hosts need their own allowed host configuration; otherwise keep preview corrections disabled.
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

`wrangler.toml` is the source of truth for tracked nonsecret configuration when deployed with Wrangler. Set verified nonsecret model values there during final setup, or use the supported Pages runtime variable settings consistently. Never put secrets in this file. Production and preview environments have separate settings; use a separate preview D1 and leave preview AI disabled unless explicitly configured.

6. Push source to `main`. GitHub Actions runs tests and builds. Cloudflare Git integration deploys production changes and, where enabled, creates PR previews. Cloudflare Git integration and GitHub checks are independent: configure GitHub branch protection to require `verify` before merging to `main`; avoid direct unverified pushes. Enabling required checks may depend on repository visibility/account features.
7. Verify `/api/config`, both live modes, no-change behavior, quota/error behavior, Turnstile, desktop/mobile layout, and privacy notice on the deployed URL. Confirm the Pages dashboard reports successful deployment. Record the literal production URL and real latency/quality evaluation results.

## Billing and free-tier boundary

No code switches to a paid model or service. The server rejects models outside the configured free allowlist and refuses corrections until `FREE_TIER_CONFIRMED=true`. This is an operator attestation, not a Google billing-status API check. Never enable paid billing. Cloudflare D1 and Functions have their own free quotas; failures are handled without bypassing enforcement.

## Remaining runtime configuration

The Vite production build and Pages Functions compilation have succeeded in GitHub Actions. The initial deployment to the owner’s Cloudflare account succeeded. The DB binding is deliberately absent until a real free D1 database is provisioned; the API fails closed in the meantime. The generated dependency lockfile is committed and CI uses `npm ci`.
