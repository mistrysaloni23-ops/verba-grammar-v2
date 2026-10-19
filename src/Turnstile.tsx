import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
type TurnstileAPI={render:(element:HTMLElement,options:Record<string,unknown>)=>string;execute:(id:string)=>void;reset:(id:string)=>void;remove:(id:string)=>void};
declare global { interface Window { turnstile?: TurnstileAPI; } }
export type ChallengeHandle={token:()=>Promise<string>};
export const Turnstile=forwardRef<ChallengeHandle,{siteKey:string}>(({siteKey},ref)=>{
 const host=useRef<HTMLDivElement>(null);const id=useRef<string|null>(null);const pending=useRef<{resolve:(s:string)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|null>(null);const [failed,setFailed]=useState(false);
 const fail=()=>{if(pending.current){clearTimeout(pending.current.timer);pending.current.reject(new Error('The security check could not finish. Please try again.'));pending.current=null;}};
 useImperativeHandle(ref,()=>({token:()=>new Promise<string>((resolve,reject)=>{if(!id.current||!window.turnstile){reject(new Error('The security check is loading. Please try again in a moment.'));return;}fail();pending.current={resolve,reject,timer:setTimeout(fail,20000)};try { setFailed(false); window.turnstile.reset(id.current);window.turnstile.execute(id.current); } catch { fail(); setFailed(true); }})}));
 useEffect(()=>{
  let alive=true;const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
  const init=()=>{if(!alive||!host.current||!window.turnstile)return;id.current=window.turnstile.render(host.current,{sitekey:siteKey,action:'correct',execution:'execute',appearance:'interaction-only',callback:(token:string)=>{if(pending.current){clearTimeout(pending.current.timer);pending.current.resolve(token);pending.current=null;}},'error-callback':()=>{fail();setFailed(true);},'expired-callback':fail});};
  if(window.turnstile)init();else{script.onload=init;script.onerror=()=>setFailed(true);document.head.appendChild(script);}
  return()=>{alive=false;fail();if(id.current)window.turnstile?.remove(id.current);id.current=null;script.remove();};
 },[siteKey]);
 return <div className="challenge"><div ref={host}/>{failed&&<span role="status">Security check unavailable. Refresh to try again.</span>}</div>;
});
