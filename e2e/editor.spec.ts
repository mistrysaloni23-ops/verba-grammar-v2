import { test, expect } from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{ready:true,requireTurnstile:false,siteKey:null}}));
 await page.route('**/api/correct',r=>r.fulfill({json:{text:"She doesn't know.",elapsedMs:540}}));
 await page.goto('/');
});
test('manual correction, unchanged cache, copy, comparison, clear and undo/redo',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 let requests=0;await page.route('**/api/correct',r=>{requests++;return r.fulfill({json:{text:"She doesn't know.",elapsedMs:540}});});
 await page.getByRole('checkbox',{name:'Automatic correction'}).uncheck();
 await page.getByRole('textbox',{name:'Original text'}).fill("She don't know.");
 await page.getByRole('button',{name:'Correct English',exact:true}).last().click();
 await expect(page.locator('.result-text')).toHaveText("She doesn't know.");
 await page.getByRole('button',{name:'Copy',exact:true}).click();
 await expect(page.getByRole('button',{name:'Copied',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe("She doesn't know.");
 await page.getByRole('button',{name:'Compare changes'}).click();await expect(page.locator('.comparison p ins')).toHaveCount(1);
 const comparedResult=await page.locator('.comparison p').evaluate(element=>{const copy=element.cloneNode(true) as HTMLElement;copy.querySelectorAll('del').forEach(node=>node.remove());return copy.textContent;});
 expect(comparedResult).toBe("She doesn't know.");
 await page.getByRole('button',{name:'Correct English',exact:true}).last().click();expect(requests).toBe(1);
 await page.getByRole('button',{name:'Clear text'}).click();await expect(page.getByRole('textbox')).toHaveValue('');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByRole('textbox')).toHaveValue("She don't know.");
 await page.getByRole('button',{name:'Redo',exact:true}).click();await expect(page.getByRole('textbox')).toHaveValue('');
});
test('automatic correction waits for idle and never overwrites input',async({page})=>{
 let calls=0;await page.route('**/api/correct',r=>{calls++;return r.fulfill({json:{text:"She doesn't know.",elapsedMs:20}});});
 await page.clock.install();await page.getByRole('textbox').fill("She don't");await page.clock.fastForward(2000);expect(calls).toBe(0);
 await page.getByRole('textbox').fill("She don't know.");await page.clock.fastForward(2400);expect(calls).toBe(0);
 await page.clock.fastForward(200);await expect(page.locator('.result-text')).toHaveText("She doesn't know.");expect(calls).toBe(1);
 await expect(page.getByRole('textbox')).toHaveValue("She don't know.");await page.clock.fastForward(10000);expect(calls).toBe(1);
});
test('composition pauses automatic correction',async({page})=>{
 let calls=0;await page.route('**/api/correct',r=>{calls++;return r.fulfill({json:{text:'Hello.',elapsedMs:20}});});
 await page.clock.install();const input=page.getByRole('textbox');await input.dispatchEvent('compositionstart');await input.fill('Hello');await page.clock.fastForward(4000);expect(calls).toBe(0);
 await input.dispatchEvent('compositionend');await page.clock.fastForward(2600);await expect(page.locator('.result-text')).toHaveText('Hello.');
});
test('disabled auto makes no requests; modes send the intended mode',async({page})=>{
 let mode='';await page.route('**/api/correct',r=>{mode=r.request().postDataJSON().mode;return r.fulfill({json:{text:'Natural text.',elapsedMs:20}});});
 await page.clock.install();await page.getByRole('checkbox').uncheck();await page.getByRole('textbox').fill('Some text.');await page.clock.fastForward(5000);expect(mode).toBe('');
 await page.getByRole('button',{name:'Make It Natural',exact:true}).first().click();await page.getByRole('button',{name:'Make It Natural',exact:true}).last().click();await expect(page.locator('.result-text')).toHaveText('Natural text.');expect(mode).toBe('natural');
});
test('old request results cannot replace a newer correction',async({page})=>{
 let release:(()=>void)|undefined;
 await page.route('**/api/correct',async r=>{if(r.request().postDataJSON().text==='Old text.'){await new Promise<void>(resolve=>{release=resolve;});await r.fulfill({json:{text:'Old result.',elapsedMs:20}}).catch(()=>{});}else await r.fulfill({json:{text:'New result.',elapsedMs:20}});});
 await page.getByRole('checkbox').uncheck();await page.getByRole('textbox').fill('Old text.');await page.getByRole('button',{name:'Correct English',exact:true}).last().click();await expect.poll(()=>!!release).toBe(true);
 await page.getByRole('textbox').fill('New text.');await page.getByRole('button',{name:'Correct English',exact:true}).last().click();await expect(page.locator('.result-text')).toHaveText('New result.');release!();await expect(page.locator('.result-text')).toHaveText('New result.');
});
test('quota failure is shown as error, never success',async({page})=>{
 await page.route('**/api/correct',r=>r.fulfill({status:429,json:{error:'Our free AI allowance is exhausted.'}}));
 await page.getByRole('checkbox').uncheck();await page.getByRole('textbox').fill('Hello.');await page.getByRole('button',{name:'Correct English',exact:true}).last().click();
 await expect(page.getByRole('alert')).toContainText('allowance is exhausted');await expect(page.locator('.result-text')).toHaveCount(0);await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
});
test('input length, theme, privacy and responsive layout',async({page})=>{
 await page.getByRole('textbox').fill('a'.repeat(4001));await expect(page.getByRole('button',{name:'Correct English',exact:true}).last()).toBeDisabled();await expect(page.getByRole('alert')).toContainText('4,000');
 await page.getByRole('button',{name:'Use dark theme'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'Privacy',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('review by humans');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('example and character/word counts',async({page})=>{await page.getByRole('checkbox').uncheck();await page.getByRole('button',{name:'Try an example'}).click();await expect(page.getByRole('textbox')).not.toHaveValue('');await expect(page.locator('.original .panel-footer')).toContainText('words');});

test('capture light and dark editor layouts for visual review',async({page},testInfo)=>{
 await page.getByRole('checkbox').uncheck();
 await page.screenshot({path:testInfo.outputPath('editor-light.png'),fullPage:true});
 await page.getByRole('button',{name:'Use dark theme'}).click();
 await page.getByRole('textbox').fill("She don't know.");
 await page.getByRole('button',{name:'Correct English',exact:true}).last().click();
 await expect(page.locator('.result-text')).toHaveText("She doesn't know.");
 await page.getByRole('button',{name:'Compare changes'}).click();
 await page.screenshot({path:testInfo.outputPath('editor-dark.png'),fullPage:true});
});
