import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { cases } from '../tests/cases.ts';
import { generate, ApiError } from '../server/gemini.ts';
import { RESERVE_SQL, positiveInt } from '../server/limits.ts';
import { isRecord } from '../src/shared.ts';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const key = process.env.GEMINI_API_KEY;
if (!account || !token || !key) throw new Error('Required credentials are missing.');
const origin = 'https://verba-grammar-v2.pages.dev';
const models = ['gemini-3.8-flash', 'gemini-3.6-flash'];
const cap = 34;
let attempts = 0;
const rows: Record<string, unknown>[] = [];
const report: Record<string, unknown> = { startedAt: new Date().toISOString(), origin, cap, rows };
async function cf(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const data: unknown = await response.json();
  if (!response.ok || !isRecord(data) || data.success !== true) throw new Error(`Cloudflare verification request failed: HTTP ${response.status}`);
  return data.result;
}
async function save() {
  await mkdir('reports/live', {recursive:true});
  report.attempts = attempts;
  await writeFile('reports/live/verification.json', JSON.stringify(report, null, 2));
}
try {
  const project = await cf('/pages/projects/verba-grammar-v2');
  assert.ok(isRecord(project) && isRecord(project.deployment_configs));
  const production = project.deployment_configs.production;
  assert.ok(isRecord(production) && isRecord(production.env_vars));
  const vars = production.env_vars;
  const value = (name: string) => isRecord(vars[name]) && typeof vars[name].value === 'string' ? vars[name].value : undefined;
  // Use the owner attestation stored by the explicitly invoked setup workflow.
  report.runtimeFields = Object.fromEntries(['GEMINI_API_KEY','GEMINI_MODEL','FREE_TIER_CONFIRMED','APPROVED_FREE_MODELS','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','VISITOR_HASH_SECRET'].map(name=>[name,Boolean(vars[name])]));
  report.freeTierConfirmed = value('FREE_TIER_CONFIRMED') === 'true';
  console.log(JSON.stringify({runtimeFields:report.runtimeFields,freeTierConfirmed:report.freeTierConfirmed}));
  assert.equal(value('FREE_TIER_CONFIRMED'), 'true', 'Production free-tier attestation is required');
  assert.ok(isRecord(production.d1_databases) && isRecord(production.d1_databases.DB));
  const database = production.d1_databases.DB.id;
  assert.equal(typeof database, 'string');
  const allowed = value('APPROVED_FREE_MODELS')?.split(',').map(x=>x.trim());
  assert.ok(models.every(model=>allowed?.includes(model)), 'Only approved free models may be evaluated');
  const daily = positiveInt(value('DAILY_BUDGET'),100,10000);
  const perMinute = positiveInt(value('VISITOR_PER_MINUTE'),4,30);
  const visitor = `synthetic-evaluation:${process.env.GITHUB_RUN_ID ?? randomUUID()}`;
  async function reserve() {
    if (attempts >= cap) throw new ApiError(429,'EVAL_LIMIT','Evaluation attempt cap reached');
    const now = Date.now(); const day = new Date(now).toISOString().slice(0,10);
    const result = await cf(`/d1/database/${database}/query`, {sql:RESERVE_SQL,params:[randomUUID(),day,visitor,now,day,daily,visitor,now-60000,perMinute]});
    assert.ok(Array.isArray(result) && isRecord(result[0]) && result[0].success === true && isRecord(result[0].meta));
    if (result[0].meta.changes !== 1) throw new ApiError(429,'LIMIT','Shared production usage limit reached');
    attempts++;
  }
  let config: unknown;
  for (let i=0;i<18;i++) {
    const response = await fetch(`${origin}/api/config`, {signal:AbortSignal.timeout(10000)});
    config = await response.json();
    if (response.ok && isRecord(config) && config.ready === true) break;
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  assert.ok(isRecord(config) && config.ready === true, 'Production API must become ready');
  assert.equal(config.requireTurnstile,true);
  assert.equal(typeof config.siteKey,'string');
  const home=await fetch(origin);assert.equal(home.status,200);assert.match(await home.text(),/Verba/);
  const blocked = await fetch(`${origin}/api/correct`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({text:'She go home.',mode:'correct'})});
  const blockedBody: unknown=await blocked.json();
  assert.equal(blocked.status,403);assert.ok(isRecord(blockedBody));assert.equal(blockedBody.code,'BOT_CHECK');
  report.production = { homepage:200,ready:true,turnstileRequired:true,missingTokenRejected:true };
  console.log('Production homepage, readiness and missing-token protection verified.');
  // One reference per category covers both modes; an extra long example covers the owner's request.
  const categories = new Set<string>();
  const selected = cases.filter(item=>{if(categories.has(item.category))return false;categories.add(item.category);return true;});
  selected.push({id:'owner-example',category:'multiple_errors',mode:'natural',input:"I was trying to explain him about the problem but he didn't understood what I am saying and that's why the things got more complicated.",reference:"I tried to explain the problem to him, but he didn't understand what I was saying, which made things more complicated."});
  for (const model of models) {
    for (const item of selected) {
      const started=performance.now();
      try {
        const output=await generate(item.input,item.mode,key,model,reserve);
        rows.push({...item,model,output,latencyMs:Math.round(performance.now()-started),exactReferenceMatch:output===item.reference,unchanged:output===item.input});
        console.log(`${model}: ${item.id} completed`);
      } catch (error) {
        const code=error instanceof ApiError?error.code:'VERIFICATION_ERROR';
        rows.push({id:item.id,model,error:code,latencyMs:Math.round(performance.now()-started)});
        console.log(`${model}: ${item.id} ${code}`);
        if (['QUOTA','API_KEY','MODEL_CONFIG'].includes(code)) break;
        if (['LIMIT','EVAL_LIMIT','VERIFICATION_ERROR'].includes(code)) throw error;
      }
      await save();
      await new Promise(resolve=>setTimeout(resolve,16000));
    }
  }
  report.models=models.map(model=>{
    const results=rows.filter(row=>row.model===model);const times=results.filter(row=>typeof row.output==='string').map(row=>row.latencyMs as number).sort((a,b)=>a-b);
    const percentile=(p:number)=>times.length?times[Math.ceil(times.length*p)-1]:null;
    return {model,evaluated:results.length,successful:times.length,p50Ms:percentile(.5),p95Ms:percentile(.95)};
  });
  report.note='Real Gemini calls with synthetic writing, counted against the shared production budget. Model timings include D1 reservation and any retry. Reference matches are not accuracy scores. Browser corrections and human quality review are separate.';
  console.log(JSON.stringify(report.models));
} catch (error) {
  report.failure=error instanceof ApiError?error.code:error instanceof Error?error.message:'UNKNOWN';
  throw error;
} finally { await save(); }
