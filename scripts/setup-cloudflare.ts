import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { generate } from '../server/gemini.ts';
import { isRecord } from '../src/shared.ts';

// Owner-triggered provisioning only. No billing endpoints, destructive operations,
// secret logging, or writes to unrelated projects are used.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const geminiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
const projectName = 'verba-grammar-v2';
const approvedModels = ['gemini-3.8-flash', 'gemini-3.6-flash'];
if (!account || !token || !geminiKey || !model || !approvedModels.includes(model)) {
  throw new Error('Configure the required Cloudflare and Gemini repository secrets, then run setup again.');
}
if (process.env.FREE_TIER_CONFIRMED !== 'true') {
  throw new Error('Setup requires confirmation that the Gemini project has no paid billing. No changes were made.');
}
const accountPath = `/accounts/${encodeURIComponent(account)}`;

async function cloudflare(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(data) || data.success !== true) {
    // Do not echo provider payloads: configuration responses can contain secrets.
    const codes = isRecord(data) && Array.isArray(data.errors)
      ? data.errors.filter(isRecord).map(error => String(error.code)).join(',') : 'unknown';
    throw new Error(`Cloudflare ${method} ${path} failed (HTTP ${response.status}, code ${codes}). Check the token permissions and account.`);
  }
  return data.result;
}

async function setup() {
  const project = await cloudflare(`${accountPath}/pages/projects/${projectName}`);
  if (!isRecord(project) || project.name !== projectName || typeof project.subdomain !== 'string') {
    throw new Error('The expected Pages project was not found. No project was created or replaced.');
  }
  const productionHost = project.subdomain;
  if (!productionHost.endsWith('.pages.dev') || productionHost.includes('/')) {
    throw new Error('Unexpected Pages hostname. Setup stopped.');
  }

  // Validate the selected, documented free model using synthetic writing only.
  let attempts = 0;
  const started = Date.now();
  const sample = "She don't have a informations about project.";
  const corrected = await generate(sample, 'correct', geminiKey!, model!, async () => {
    if (++attempts > 2) throw new Error('Setup API attempt cap reached.');
  });
  const geminiElapsedMs = Date.now() - started;
  console.log('The selected Gemini model returned a complete response. Human quality review remains required.');

  const databases = await cloudflare(`${accountPath}/d1/database?name=${encodeURIComponent('verba-usage')}&per_page=100`);
  if (!Array.isArray(databases)) throw new Error('Unexpected D1 database listing.');
  const matches = databases.filter(isRecord).filter(database => database.name === 'verba-usage');
  if (matches.length > 1) throw new Error('More than one matching D1 database exists. Setup stopped.');
  const database = matches[0] ?? await cloudflare(`${accountPath}/d1/database`, 'POST', { name: 'verba-usage' });
  if (!isRecord(database) || typeof database.uuid !== 'string' || !/^[a-f0-9-]{36}$/i.test(database.uuid)) {
    throw new Error('Cloudflare did not return a valid D1 database ID.');
  }
  const schema = await readFile(new URL('../migrations/0001_usage.sql', import.meta.url), 'utf8');
  const migration = await cloudflare(`${accountPath}/d1/database/${database.uuid}/query`, 'POST', { sql: schema });
  if (!Array.isArray(migration) || migration.some(item => !isRecord(item) || item.success !== true)) {
    throw new Error('D1 schema initialization did not succeed. AI remains disabled.');
  }
  console.log('Free D1 usage database and schema are ready.');

  const widgets = await cloudflare(`${accountPath}/challenges/widgets?per_page=100`);
  if (!Array.isArray(widgets)) throw new Error('Unexpected Turnstile widget listing.');
  const existingWidgets = widgets.filter(isRecord).filter(widget => widget.name === projectName);
  if (existingWidgets.length > 1) throw new Error('Multiple Verba Turnstile widgets exist. Setup stopped.');
  const existing = existingWidgets[0];
  let widget: unknown;
  if (existing) {
    if (typeof existing.sitekey !== 'string') throw new Error('Existing widget has no valid site key.');
    widget = await cloudflare(`${accountPath}/challenges/widgets/${encodeURIComponent(existing.sitekey)}`);
    if (!isRecord(widget) || !Array.isArray(widget.domains) || !widget.domains.includes(productionHost)) {
      throw new Error('The existing Verba widget does not cover this Pages hostname. Setup stopped without changing it.');
    }
  } else {
    widget = await cloudflare(`${accountPath}/challenges/widgets`, 'POST', {
      name: projectName, domains: [productionHost], mode: 'managed',
    });
  }
  if (!isRecord(widget) || typeof widget.sitekey !== 'string' || typeof widget.secret_key !== 'string') {
    throw new Error('Turnstile did not return the widget keys. Setup stopped without rotating keys.');
  }
  console.log('Turnstile protection is ready for the production hostname.');

  const configs = isRecord(project.deployment_configs) ? project.deployment_configs : {};
  const production = isRecord(configs.production) ? configs.production : {};
  const previousVars = isRecord(production.env_vars) ? production.env_vars : {};
  const previousBindings = isRecord(production.d1_databases) ? production.d1_databases : {};
  const managed = new Set(['GEMINI_API_KEY','GEMINI_MODEL','APPROVED_FREE_MODELS','FREE_TIER_CONFIRMED','VISITOR_HASH_SECRET','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY','DAILY_BUDGET','VISITOR_PER_MINUTE','REQUIRE_TURNSTILE']);
  for (const [name, value] of Object.entries(previousVars)) {
    if (!managed.has(name) && isRecord(value) && value.type === 'secret_text') {
      throw new Error('Unrelated project secrets exist. Setup stopped to avoid overwriting them.');
    }
  }
  if (isRecord(previousBindings.DB) && previousBindings.DB.id !== database.uuid) {
    throw new Error('The project already uses a different DB binding. Setup stopped.');
  }
  const secret = (value: string) => ({ type: 'secret_text', value });
  const variable = (value: string) => ({ type: 'plain_text', value });
  await cloudflare(`${accountPath}/pages/projects/${projectName}`, 'PATCH', {
    deployment_configs: {
      production: {
        env_vars: {
          ...previousVars,
          GEMINI_API_KEY: secret(geminiKey!),
          GEMINI_MODEL: variable(model!),
          APPROVED_FREE_MODELS: variable(approvedModels.join(',')),
          // The owner attested to an unbilled project before this workflow could run.
          FREE_TIER_CONFIRMED: variable('true'),
          VISITOR_HASH_SECRET: secret(randomBytes(32).toString('hex')),
          TURNSTILE_SECRET_KEY: secret(widget.secret_key),
          TURNSTILE_SITE_KEY: variable(widget.sitekey),
          DAILY_BUDGET: variable('100'),
          VISITOR_PER_MINUTE: variable('4'),
          REQUIRE_TURNSTILE: variable('true'),
        },
        d1_databases: { ...previousBindings, DB: { id: database.uuid } },
      },
    },
  });

  await mkdir('reports/setup', { recursive: true });
  const config = `name = "${projectName}"\npages_build_output_dir = "dist"\ncompatibility_date = "2025-10-01"\n\n# Runtime settings and encrypted secrets are managed in Cloudflare.\n# The setup workflow requires an unbilled-project attestation.\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "verba-usage"\ndatabase_id = "${database.uuid}"\nmigrations_dir = "migrations"\n`;
  await writeFile('reports/setup/wrangler.toml', config);
  await writeFile('reports/setup/result.json', JSON.stringify({
    project: projectName, website: `https://${productionHost}`, databaseId: database.uuid,
    selectedModel: model, setupCompletedAt: new Date().toISOString(),
    smoke: { input: sample, corrected, attempts, elapsedMs: geminiElapsedMs, note: 'Synthetic writing; not an accuracy score. Time covers Gemini attempts and any retry delay only.' },
    state: 'Secrets configured; final source binding, deployment and live verification remain required.',
  }, null, 2));
  console.log('Encrypted production secrets configured. Download the nonsecret setup artifact for the final DB binding. Final deployment and verification remain required.');
}

await setup();
