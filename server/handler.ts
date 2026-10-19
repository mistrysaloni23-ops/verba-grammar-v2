import { MAX_CHARS } from '../src/shared.ts';
import { ApiError, generate } from './gemini.ts';
import { positiveInt, reserve, visitorHash } from './limits.ts';
export interface Env {
 GEMINI_THINKING_LEVEL?: string; GEMINI_API_KEY?: string; GEMINI_MODEL?: string; APPROVED_FREE_MODELS?: string; FREE_TIER_CONFIRMED?: string;
 VISITOR_HASH_SECRET?: string; DAILY_BUDGET?: string; VISITOR_PER_MINUTE?: string; DB: D1Database;
 TURNSTILE_SECRET_KEY?: string; TURNSTILE_SITE_KEY?: string; REQUIRE_TURNSTILE?: string;
}
export function json(data: unknown, status = 200, extra: Record<string,string> = {}) {
 return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
export function configured(env: Env) {
 return Boolean((env.GEMINI_THINKING_LEVEL === undefined || ['low','medium','high'].includes(env.GEMINI_THINKING_LEVEL)) && env.GEMINI_API_KEY && env.GEMINI_MODEL && /^[a-z0-9.-]+$/.test(env.GEMINI_MODEL) && env.FREE_TIER_CONFIRMED === 'true' && env.APPROVED_FREE_MODELS?.split(',').map(x=>x.trim()).includes(env.GEMINI_MODEL) && env.VISITOR_HASH_SECRET && env.VISITOR_HASH_SECRET.length >= 32 && env.DB && (env.REQUIRE_TURNSTILE === 'false' || (env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY)));
}
async function readBody(request: Request) {
 if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'INPUT', 'Please send text in the supported format.');
 if (!request.body) throw new ApiError(400, 'INPUT', 'Add some English text first.');
 const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
 while (true) { const {value, done} = await reader.read(); if (done) break; size += value.length; if (size > 30000) { await reader.cancel(); throw new ApiError(413, 'INPUT', `Please keep your text under ${MAX_CHARS} characters.`); } chunks.push(value); }
 const all = new Uint8Array(size); let offset=0; for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
 try { return JSON.parse(new TextDecoder().decode(all)); } catch { throw new ApiError(400, 'INPUT', 'The request could not be read.'); }
}
export async function handleCorrection(request: Request, env: Env, waitUntil: (p: Promise<unknown>) => void = () => {}, fetcher: typeof fetch = fetch) {
 try {
  if (request.method !== 'POST') return json({error:'Use POST for corrections.'},405,{Allow:'POST'});
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403,'ORIGIN','Please use the editor on this website.');
  const body = await readBody(request);
  if (!body || typeof body.text !== 'string' || !['correct','natural'].includes(body.mode)) throw new ApiError(400,'INPUT','Please enter text and choose a correction mode.');
  const text = body.text.trim();
  if (!text) throw new ApiError(400,'INPUT','Add some English text first.');
  if (body.text.length > MAX_CHARS) throw new ApiError(413,'INPUT',`Please keep your text under ${MAX_CHARS} characters.`);
  if (!configured(env)) throw new ApiError(503,'NOT_CONFIGURED','The AI editor is being set up. Please come back shortly.');
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) throw new ApiError(503,'IDENTITY','The editor could not verify this connection. Please try again.');
  if (env.REQUIRE_TURNSTILE !== 'false') {
   if (typeof body.token !== 'string' || !body.token || body.token.length > 2048) throw new ApiError(403,'BOT_CHECK','Please complete the security check and try again.');
   let verification: {success?: boolean; hostname?: string; action?: string};
   try { const r = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY!,response:body.token,remoteip:ip}),signal:AbortSignal.timeout(5000)}); if (!r.ok) throw new Error('Verification unavailable'); verification = await r.json(); }
   catch { throw new ApiError(503,'BOT_CHECK','The security check is unavailable. Please try again.'); }
   if (!verification || verification.success !== true || verification.hostname !== new URL(request.url).hostname || verification.action !== 'correct') throw new ApiError(403,'BOT_CHECK','Please complete the security check again.');
  }
  const now = Date.now(); const day = new Date(now).toISOString().slice(0,10);
  const visitor = await visitorHash(ip,env.VISITOR_HASH_SECRET!,day);
  const daily = positiveInt(env.DAILY_BUDGET,100,10000); const perMinute=positiveInt(env.VISITOR_PER_MINUTE,4,30);
  const result = await generate(text,body.mode,env.GEMINI_API_KEY!,env.GEMINI_MODEL!,()=>reserve(env.DB,visitor,daily,perMinute),fetcher,request.signal,env.GEMINI_THINKING_LEVEL as 'low'|'medium'|'high'|undefined);
  waitUntil(env.DB.prepare('DELETE FROM usage_reservations WHERE day < ?').bind(day).run().catch(()=>{}));
  return json({text:result,elapsedMs:Date.now()-now});
 } catch(e) {
  if(e instanceof ApiError) return json({error:e.message,code:e.code},e.status,e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});
  return json({error:'The editor is temporarily unavailable. Please try again.',code:'UNAVAILABLE'},503);
 }
}
