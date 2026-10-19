import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { isRecord } from '../src/shared.ts';

const origin = 'http://127.0.0.1:8789';
const server = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'pages', 'dev', 'dist', '--ip', '127.0.0.1', '--port', '8789'], {
  detached: true,
  env: { ...process.env, CLOUDFLARE_SEND_METRICS: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-10000); });
server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-10000); });
try {
  let ready = false;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('Local Pages runtime exited before startup.');
    try {
      const response = await fetch(`${origin}/api/config`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for workerd startup. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Pages runtime must start within 45 seconds');
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Verba/);
  const configResponse = await fetch(`${origin}/api/config`);
  const config: unknown = await configResponse.json();
  assert.ok(isRecord(config));
  assert.equal(config.ready, false, 'CI must never enable live AI');
  assert.equal(configResponse.headers.get('cache-control'), 'no-store');
  const correction = await fetch(`${origin}/api/correct`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'She go home.', mode: 'correct' }),
  });
  assert.equal(correction.status, 503);
  const body: unknown = await correction.json();
  assert.ok(isRecord(body));
  assert.equal(body.code, 'NOT_CONFIGURED');
  assert.equal(body.text, undefined);
  console.log('Pages runtime smoke test passed: production assets, config endpoint, and fail-closed correction endpoint. No live Gemini call.');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (server.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* Already exited. */ }
  }
}
