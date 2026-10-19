# One-time secure account setup

The website has deployed at https://verba-grammar-v2.pages.dev. Its AI endpoint stays disabled until the real database, encrypted secrets and free-tier confirmation are present.

The owner only needs to authorize accounts and provide secrets through their secure dashboards. The engineer handles code, migration and final binding.

## Required secrets

In GitHub, open this repository's **Settings → Secrets and variables → Actions → New repository secret**.

- `CLOUDFLARE_API_TOKEN`: a scoped Cloudflare API token for account `c521e3f1a7e4896141c63556142e9d79`, with **Account → Cloudflare Pages → Edit**, **Account → D1 → Edit**, and **Account → Turnstile → Edit**. Scope account resources to this one account. No DNS, domain, billing or zone permissions are needed. No IP restriction is specified because GitHub-hosted runner IPs vary.
- `GEMINI_API_KEY`: a Google AI Studio key for a project with no paid billing enabled. Never paste it into chat or a source file.

Cloudflare token creation: **My Profile → API Tokens → Create Token → Create Custom Token**. The owner reviews the requested permissions, selects the account, and creates the token. Do not use the global API key. This token never goes into the frontend or the deployed application.

## Workflow

Open the repository's **Actions → Set up Verba securely → Run workflow**. Use `main`; choose a documented model (initial candidate: `gemini-3.8-flash`); confirm that the Gemini project has no paid billing, then run.

The workflow has read-only GitHub permissions. It:

1. Checks the exact existing Pages project.
2. Makes at most two selected-model API attempts with one synthetic grammar example, including a possible 503 retry.
3. Creates/reuses the dedicated `verba-usage` D1 database and applies only the idempotent usage schema.
4. Creates/reuses the dedicated production Turnstile widget. It does not rotate existing Turnstile keys or change unrelated widgets.
5. Stores Gemini, visitor hashing and Turnstile secrets as encrypted `secret_text` Cloudflare production variables. It sets the production free-tier attestation only after the owner confirms an unbilled project and the selected model responds. The current source configuration still requires the final DB binding and redeployment.
6. Produces a nonsecret artifact with the real D1 configuration and synthetic smoke result. No credentials are included.

It never calls billing endpoints, deletes resources, creates a new Pages project, or configures preview AI. It stops if unrelated project secrets or a conflicting DB binding would be overwritten. A repeated successful setup rotates only the application's visitor hash; the shared daily budget remains in the same D1 database.

## Engineer completion

Read the returned smoke result, commit the artifact's real `wrangler.toml` binding, and verify the new native Pages deployment. The workflow already stores the owner’s free-tier attestation in production; the generated configuration removes the initial disabled placeholder variables. Configure/verify the production Turnstile widget, evaluate both modes live, and complete the capped model comparison. Delete the one-time Cloudflare repository secret after setup if no further authorized provisioning is needed; native Cloudflare Git deployments do not require that repository secret.

The setup workflow itself is prepared but has not been run against the owner's account. No live Gemini quality or latency statistics are available yet.
