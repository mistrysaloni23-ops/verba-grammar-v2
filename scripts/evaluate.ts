import { mkdir, writeFile } from 'node:fs/promises';
import { cases } from '../tests/cases.ts';
import { generate, ApiError } from '../server/gemini.ts';
// Manual opt-in only. CI never runs live calls or consumes the free-tier allowance.
const key=process.env.GEMINI_API_KEY;
const model=process.env.GEMINI_MODEL;
const approved=process.env.APPROVED_FREE_MODELS?.split(',').map(x=>x.trim());
if(!key||!model||process.env.FREE_TIER_CONFIRMED!=='true'||!approved?.includes(model)){
 console.error('Live evaluation is blocked: configure the API key, a verified free-tier model, APPROVED_FREE_MODELS, and FREE_TIER_CONFIRMED. No request was sent.');
 process.exit(1);
}
const budget=Number(process.env.EVAL_MAX_REQUESTS??'10');
const interval=Number(process.env.EVAL_INTERVAL_MS??'15000');
if(!Number.isSafeInteger(budget)||budget<1||budget>240||!Number.isSafeInteger(interval)||interval<1000){throw new Error('Invalid evaluation budget or interval.');}
const category=process.env.EVAL_CATEGORY;
const selected=cases.filter(c=>!category||c.category===category);
const rows:Record<string,unknown>[]=[];let attempts=0;
for(const item of selected){
 if(attempts>=budget)break;
 const started=performance.now();
 try{
  const output=await generate(item.input,item.mode,key,model,async()=>{if(attempts>=budget)throw new ApiError(429,'EVAL_LIMIT','Evaluation budget reached.');attempts++;});
  const numbers=(s:string)=>s.match(/\d+(?:[.,]\d+)*/g)?.join('|')??'';
  rows.push({...item,output,latencyMs:Math.round(performance.now()-started),exactReferenceMatch:output===item.reference,unchanged:output===item.input,numberTokensPreserved:numbers(output)===numbers(item.input),humanReview:{grammar:null,naturalness:null,meaningPreservation:null,notes:''}});
 }catch(e){rows.push({id:item.id,error:e instanceof ApiError?e.code:'UNKNOWN',latencyMs:Math.round(performance.now()-started)});if(e instanceof ApiError&&['QUOTA','API_KEY','MODEL_CONFIG','EVAL_LIMIT'].includes(e.code))break;}
 if(attempts<budget)await new Promise(r=>setTimeout(r,interval));
}
const timings=rows.filter(r=>typeof r.output==='string').map(r=>r.latencyMs as number).sort((a,b)=>a-b);
const percentile=(p:number)=>timings.length?timings[Math.min(timings.length-1,Math.ceil(timings.length*p)-1)]:null;
const report={model,date:new Date().toISOString(),attempts,corpusSize:cases.length,evaluated:rows.length,successful:timings.length,p50Ms:percentile(.5),p95Ms:percentile(.95),note:'Exact matches and token checks are diagnostic signals, not grammatical accuracy scores. Human review is required for grammar, fluency and meaning preservation.',rows};
await mkdir('reports',{recursive:true});const file=`reports/live-${model}-${Date.now()}.json`;await writeFile(file,JSON.stringify(report,null,2));
console.log(JSON.stringify({file,attempts,evaluated:rows.length,successful:timings.length,p50Ms:report.p50Ms,p95Ms:report.p95Ms}));
