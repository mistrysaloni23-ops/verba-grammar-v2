import { chromium, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { isRecord } from '../src/shared.ts';

const origin='https://verba-grammar-v2.pages.dev';
const results: Record<string,unknown>[]=[];
await mkdir('reports/live-browser',{recursive:true});
const browser=await chromium.launch();
try {
 for(const device of ['desktop','mobile']) {
  const context=await browser.newContext(device==='mobile'?devices['Pixel 7']:{viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const ready=await context.request.get(`${origin}/api/config`);const config:unknown=await ready.json();
  if(!isRecord(config)||config.ready!==true)throw new Error('Live API is not ready for browser verification.');
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.getByRole('checkbox',{name:'Automatic correction'}).uncheck();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  await page.screenshot({path:`reports/live-browser/${device}-light.png`,fullPage:true});
  results.push({device,check:'layout',noHorizontalOverflow:!overflow});
  if(overflow)throw new Error(`${device} has horizontal overflow`);
  await page.waitForFunction(()=>Boolean(window.turnstile),{},{timeout:15000}).catch(()=>{});
  const samples=[{mode:'correct',label:'Correct English',input:"He didn't explained me a reasons for delay."},{mode:'natural',label:'Make It Natural',input:'I am writing this message to let you know that I am not able to join the meeting today because I have another meeting at the same time.'}];
  for(const sample of samples) {
   await page.getByRole('button',{name:sample.label,exact:true}).first().click();
   await page.getByRole('textbox',{name:'Original text'}).fill(sample.input);
   const started=Date.now();
   await page.getByRole('button',{name:sample.label,exact:true}).last().click();
   await page.waitForFunction(()=>Boolean(document.querySelector('.result-text')||document.querySelector('.error-result')),{},{timeout:55000});
   const error=await page.locator('.error-result').count()?await page.locator('.error-result').textContent():null;
   const output=await page.locator('.result-text').count()?await page.locator('.result-text').textContent():null;
   results.push({device,check:'correction',mode:sample.mode,input:sample.input,output,error,elapsedMs:Date.now()-started,inputPreserved:await page.getByRole('textbox',{name:'Original text'}).inputValue()===sample.input});
   if(error)break; // Never bypass Turnstile or repeatedly retry a blocked automated browser.
   await page.getByRole('button',{name:'Compare changes',exact:true}).click();
   await page.screenshot({path:`reports/live-browser/${device}-${sample.mode}.png`,fullPage:true});
   await page.getByRole('button',{name:'Compare changes',exact:true}).click();
   await page.waitForTimeout(18000);
  }
  await page.getByRole('button',{name:'Use dark theme'}).click();
  await page.screenshot({path:`reports/live-browser/${device}-dark.png`,fullPage:true});
  await context.close();
 }
} finally {
 await browser.close();
 await writeFile('reports/live-browser/results.json',JSON.stringify({date:new Date().toISOString(),origin,mocked:false,automatedBrowser:true,results},null,2));
}
console.log(JSON.stringify(results.map(({device,check,mode,error,output,...rest})=>({device,check,mode,successful:typeof output==='string'&&!error,error,...rest}))));
