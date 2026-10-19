# Deployment and account authorization

## Current status

No Cloudflare account/API token, Gemini API key, D1 database, Turnstile widget, or verified model was provided in this session. The GitHub connector can access the account `mistrysaloni23-ops`, but cannot create repositories; the CLI credential is not usable. A repository creation/access request has been sent to the owner. Do not deploy with the placeholder D1 ID.

## Owner actions that require account access

The engineer should do the configuration and commands once authorized. The owner should not edit code or upload individual files.

1. **GitHub:** Open https://github.com/new, use `verba-grammar-v2`, leave it empty, and select **Create repository**. In GitHub **Settings → Applications → Installed GitHub Apps**, locate the ChatGPT/OpenAI connection, select **Configure**, and include this repository in repository access. The exact app label can vary.
2. **Gemini:** Open https://aistudio.google.com/api-keys. Select **Create API key** for a project without paid billing. Do not select a billing upgrade. Provide the key through the environment's secret configuration or Cloudflare's encrypted secrets interface; never paste it into committed files or frontend variables.
3. **Cloudflare authorization:** Use a scoped Cloudflare API token granting Pages edit, D1 edit, and account read for the intended account if automation is available. Store `CLOUDFLARE_API_TOKEN` as a workspace secret, alongside a non-secret `CLOUDFLARE_ACCOUNT_ID`. Turnstile setup may need its own account permission or dashboard action. Do not enable a paid Workers plan.

## Engineering deployment steps

1. Restore workspace network access. Install dependencies; commit the generated lockfile; switch CI to `npm ci`; run all checks and desktop/mobile tests. Read current official Gemini models, pricing, and terms. Confirm the selected model exists and is available on the owner's free project. Run live evaluations before selecting a production model.
2. Create a free D1 database named `verba-usage` (`wrangler d1 create verba-usage`). Replace `database_id` in `wrangler.toml` with its returned ID. Apply `wrangler d1 migrations apply verba-usage --remote`. This schema contains only quota reservations.
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

## Known limitation until installation

The Pages configuration and function source are prepared but not yet compiled or deployed. The D1 ID is deliberately a visible placeholder, not a fabricated working database. The dependency lockfile must be generated and committed once the registry is reachable.
