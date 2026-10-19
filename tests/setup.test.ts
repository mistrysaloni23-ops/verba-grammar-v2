import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/setup-cloudflare.ts', import.meta.url));
const mock = `
import assert from 'node:assert/strict';
let mutations = 0;
globalThis.fetch = async (url, options = {}) => {
  if (process.env.TEST_GUARD === 'true') throw new Error('Guard allowed an external request');
  const path = String(url);
  if (path.includes('generativelanguage')) return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'She does not have any information about the project.'}]}}]});
  const method = options.method || 'GET';
  const ok = result => Response.json({success:true,result});
  if (method !== 'GET') mutations++;
  if (method === 'GET' && path.endsWith('/pages/projects/verba-grammar-v2')) return ok({name:'verba-grammar-v2',subdomain:'verba-grammar-v2.pages.dev',deployment_configs:{production:{}}});
  if (method === 'GET' && path.includes('/d1/database?')) return ok([]);
  if (method === 'POST' && path.endsWith('/d1/database')) return ok({uuid:'12345678-1234-1234-1234-123456789abc'});
  if (path.endsWith('/query')) return ok([{success:true}]);
  if (method === 'GET' && path.includes('/challenges/widgets?')) return ok(process.env.TEST_EXISTING === 'true' ? [{name:'verba-grammar-v2',sitekey:'public-site-key'}] : []);
  if (method === 'GET' && path.endsWith('/challenges/widgets/public-site-key')) return ok({sitekey:'public-site-key',secret:'private-turnstile-fixture',domains:['verba-grammar-v2.pages.dev']});
  if (method === 'POST' && path.endsWith('/challenges/widgets')) return ok({sitekey:'public-site-key',secret:'private-turnstile-fixture'});
  if (method === 'PATCH' && path.endsWith('/pages/projects/verba-grammar-v2')) {
    const config = JSON.parse(options.body).deployment_configs;
    assert.equal(config.preview, undefined);
    assert.equal(config.production.env_vars.GEMINI_API_KEY.type, 'secret_text');
    assert.equal(config.production.env_vars.TURNSTILE_SECRET_KEY.type, 'secret_text');
    assert.equal(config.production.env_vars.TURNSTILE_SECRET_KEY.value, 'private-turnstile-fixture');
    assert.equal(config.production.env_vars.VISITOR_HASH_SECRET.type, 'secret_text');
    assert.equal(config.production.env_vars.FREE_TIER_CONFIRMED.value, 'true');
    assert.equal(config.production.d1_databases.DB.id, '12345678-1234-1234-1234-123456789abc');
    return ok({});
  }
  throw new Error('Unexpected request: ' + method + ' ' + path);
};
process.on('exit', () => { if (process.env.TEST_GUARD !== 'true') assert.equal(mutations, process.env.TEST_EXISTING === 'true' ? 3 : 4); });
`;
function execute(confirmed: boolean, existing = false) {
  const directory = mkdtempSync(join(tmpdir(), 'verba-setup-'));
  const preload = join(directory, 'mock.mjs');
  writeFileSync(preload, mock);
  const run = spawnSync(process.execPath, ['--import', preload, script], {
    cwd: directory, encoding: 'utf8', timeout: 10000,
    env: { PATH: process.env.PATH, CLOUDFLARE_ACCOUNT_ID: 'test-account', CLOUDFLARE_API_TOKEN: 'private-token-fixture', GEMINI_API_KEY: 'private-gemini-fixture', GEMINI_MODEL: 'gemini-3.8-flash', FREE_TIER_CONFIRMED: String(confirmed), TEST_GUARD: String(!confirmed), TEST_EXISTING: String(existing) },
  });
  return { directory, run };
}
test('account setup refuses to call any provider without unbilled-project attestation', () => {
  const {directory, run} = execute(false);
  try {
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /requires confirmation/);
    assert.doesNotMatch(run.stderr, /Guard allowed/);
  } finally { rmSync(directory, {recursive:true,force:true}); }
});
test('account setup uses encrypted production secrets and emits only nonsecret artifacts (mocked providers)', () => {
  const {directory, run} = execute(true);
  try {
    assert.equal(run.status, 0, run.stderr);
    const report = readFileSync(join(directory,'reports/setup/result.json'),'utf8');
    const config = readFileSync(join(directory,'reports/setup/wrangler.local.toml'),'utf8');
    assert.doesNotMatch(report + config + run.stdout + run.stderr, /private-(token|gemini|turnstile)-fixture/);
    assert.match(config, /database_id = "12345678-1234-1234-1234-123456789abc"/);
    assert.equal(JSON.parse(report).smoke.attempts, 1);
    assert.match(JSON.parse(report).smoke.corrected, /does not have any information/);
  } finally { rmSync(directory, {recursive:true,force:true}); }
});

test('account setup reuses an existing Turnstile widget using its documented secret field', () => {
  const {directory, run} = execute(true, true);
  try { assert.equal(run.status, 0, run.stderr); }
  finally { rmSync(directory, {recursive:true,force:true}); }
});
