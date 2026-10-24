import test from 'node:test';import assert from 'node:assert/strict';
import {e,setup} from './target-fixture.mjs';
import {APP_VERSION,UPDATE_RESUME_KEY,newerVersion,createUpdateController,updateNoticeHTML,saveUpdateResume,readUpdateResume,validateBattleResume} from '../dist/app-updates.js';
const memory=()=>{const entries=new Map();return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};};
const response=(version,engineVersion=e.ENGINE_VERSION)=>({ok:true,json:async()=>({version,engineVersion})});
test('version ordering handles patch and minor changes, ignores rollback and rejects malformed versions',()=>{
 assert.ok(newerVersion('0.87.1','0.87.0'));assert.ok(newerVersion('0.100.0','0.99.0'));assert.ok(!newerVersion('0.86.9','0.87.0'));assert.ok(!newerVersion(APP_VERSION,APP_VERSION));assert.ok(!newerVersion('<img>','0.87.0'));
});
test('update checks are no-store, deduplicated and throttled until the interval or explicit request',async()=>{
 let count=0,clock=100,finish;const events=[],controller=createUpdateController({now:()=>clock,fetcher:async(url,options)=>{count++;assert.match(url,/release.json\?check=/);assert.equal(options.cache,'no-store');await new Promise(resolve=>finish=resolve);return response('0.90.0');},onChange:s=>events.push(s)});
 const a=controller.check(),b=controller.check();assert.equal(a,b);await Promise.resolve();finish();await a;assert.equal(count,1);assert.equal(controller.snapshot().available.version,'0.90.0');assert.equal(controller.snapshot().checking,false);assert.ok(events.length>=2);
 controller.dismiss();assert.equal(updateNoticeHTML(controller.snapshot()),'');await controller.check();assert.equal(count,1);clock+=60000;const next=controller.check();await Promise.resolve();finish();await next;assert.equal(count,2);
 const force=controller.check({force:true});await Promise.resolve();finish();await force;assert.match(updateNoticeHTML(controller.snapshot()),/更新する/);
});
test('network failures, HTTP errors and invalid manifests remain distinguishable from current-version success',async()=>{
 for(const fetcher of [()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,json:async()=>({version:'bad'})})]){const c=createUpdateController({fetcher});await c.check();assert.ok(c.snapshot().error);assert.equal(c.snapshot().checking,false);await c.check({force:true});assert.ok(c.snapshot().error);}
 const c=createUpdateController({fetcher:async()=>response(APP_VERSION)});await c.check();assert.equal(c.snapshot().available,null);assert.equal(c.snapshot().error,null);
});
test('the update notice escapes supplied versions and never forces navigation',()=>{
 const html=updateNoticeHTML({available:{version:'0.90.0'},dismissed:null});assert.match(html,/あとで/);assert.match(html,/data-action="apply-update"/);assert.ok(!html.includes('location'));assert.ok(!updateNoticeHTML({available:{version:'<script>'}}).includes('<script>'));
});
test('the per-tab update backup preserves pending payment, draft edits and infinity without changing the original',()=>{
 const storage=memory(),battle={state:setup()},value={engineVersion:e.ENGINE_VERSION,view:'manual',battle,edit:{name:'編集中',cards:[]},manualUI:{hand:'a'},power:Infinity},before=structuredClone(value);
 saveUpdateResume(storage,value);const restored=readUpdateResume(storage);assert.equal(restored.power,Infinity);assert.deepEqual(restored.battle,battle);assert.deepEqual(restored.edit,value.edit);assert.deepEqual(value,before);validateBattleResume(restored.battle,e.ENGINE_VERSION,e.getLegalActions);assert.ok(storage.getItem(UPDATE_RESUME_KEY));
});
test('unavailable storage and a failed write abort preparation rather than pretending the update is saved',()=>{
 assert.throws(()=>saveUpdateResume({setItem(){throw Error('quota');}},{view:'decks'}));assert.throws(()=>saveUpdateResume({setItem(){},getItem(){return null;}},{view:'decks'}));
});
test('incompatible or malformed restore data is rejected while the backup remains recoverable',()=>{
 const storage=memory();saveUpdateResume(storage,{engineVersion:'old',view:'manual',battle:{state:setup()}});const data=readUpdateResume(storage);assert.throws(()=>validateBattleResume(data.battle,'future',e.getLegalActions));assert.ok(storage.getItem(UPDATE_RESUME_KEY));
 storage.setItem(UPDATE_RESUME_KEY,'{"format":"unexpected"}');assert.throws(()=>readUpdateResume(storage));assert.ok(storage.getItem(UPDATE_RESUME_KEY));assert.equal(readUpdateResume(memory()),null);
});
