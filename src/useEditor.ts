import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheKey, DEBOUNCE_MS, MAX_CHARS, type Mode, type Correction } from './shared.ts';
export type Config = { ready: boolean; siteKey: string | null; requireTurnstile: boolean };
export function useEditor(getToken: () => Promise<string>, config: Config | null) {
 const [history,setHistory]=useState(['']); const [position,setPosition]=useState(0);
 const text=history[position]; const [mode,setMode]=useState<Mode>('correct'); const [automatic,setAutomatic]=useState(true);
 const [composing,setComposing]=useState(false); const [result,setResult]=useState<Correction|null>(null);
 const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 const cache=useRef<Correction|null>(null); const attempted=useRef(''); const active=useRef<AbortController|null>(null); const revision=useRef(0);
 const cancel=useCallback(()=>{revision.current++;active.current?.abort();active.current=null;setLoading(false);},[]);
 const change=useCallback((value:string)=>{cancel();setError('');if(!value)setResult(null);setHistory(h=>[...h.slice(0,position+1),value].slice(-150));setPosition(Math.min(position+1,149));},[position,cancel]);
 const undo=()=>{cancel();setError('');setPosition(p=>Math.max(0,p-1));};
 const redo=()=>{cancel();setError('');setPosition(p=>Math.min(history.length-1,p+1));};
 const selectMode=(value:Mode)=>{if(value===mode)return;cancel();setError('');setMode(value);};
 const run=useCallback(async (manual=false)=>{
  if(!text.trim()||text.length>MAX_CHARS||composing)return;
  const key=cacheKey(text,mode);
  if(cache.current && cacheKey(cache.current.source,cache.current.mode)===key){setResult(cache.current);setError('');return;}
  if(!manual && attempted.current===key)return;
  cancel();const id=revision.current;attempted.current=key;setError('');
  if(!config?.ready){setError('The AI editor is being set up. Please come back shortly.');return;}
  const controller=new AbortController();active.current=controller;setLoading(true);
  const timer=setTimeout(()=>controller.abort(),30000);
  try {
   const token=config.requireTurnstile?await getToken():'';
   if(id!==revision.current)return;
   const response=await fetch('/api/correct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,mode,token}),signal:controller.signal});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(typeof data?.error==='string'?data.error:'The editor is unavailable. Please try again.');
   if(typeof data?.text!=='string'||!data.text.trim())throw new Error('The editor returned an unexpected response. Please try again.');
   if(id!==revision.current)return;
   const correction={source:text,mode,text:data.text,elapsedMs:typeof data.elapsedMs==='number'?data.elapsedMs:0};cache.current=correction;setResult(correction);
  } catch(e){if(id===revision.current)setError(controller.signal.aborted?'The request timed out. Please try again.':e instanceof Error?e.message:'Could not connect. Check your connection and try again.');}
  finally{clearTimeout(timer);if(id===revision.current){setLoading(false);active.current=null;}}
 },[text,mode,composing,config,getToken,cancel]);
 useEffect(()=>{if(!automatic||composing||!text.trim()||text.length>MAX_CHARS||!config?.ready)return;const timer=setTimeout(()=>void run(),DEBOUNCE_MS);return()=>clearTimeout(timer);},[text,mode,automatic,composing,config,run]);
 useEffect(()=>()=>{revision.current++;active.current?.abort();},[]);
 const toggleAutomatic=()=>{cancel();setAutomatic(v=>!v);};
 const compositionStart=()=>{cancel();setComposing(true);};
 const current=result?.source===text&&result.mode===mode;
 return {text,change,mode,selectMode,automatic,toggleAutomatic,compositionStart,compositionEnd:()=>setComposing(false),result,current,loading,error,run,undo,redo,canUndo:position>0,canRedo:position<history.length-1};
}
