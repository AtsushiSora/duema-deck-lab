import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,cast} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const truth=read('tools/fixtures/grasper-haikyu.json'),registry=createCatalogue(snapshot,data.cards,details);
const deck={id:'photo-grasper-haikyu',name:truth.name,format:'original',cards:truth.groups.map(g=>({id:g.id,count:g.positions.length}))};
test('the supplied screenshot retains sixteen identities and all forty supported copies',()=>{
 assert.equal(deck.cards.length,16);assert.equal(deck.cards.reduce((n,x)=>n+x.count,0),40);
 assert.deepEqual(truth.groups.flatMap(g=>g.positions).sort((a,b)=>a-b),Array.from({length:40},(_,i)=>i+1));
 for(const g of truth.groups){assert.equal(registry.get(g.id).name,g.name);assert.equal(registry.get(g.id).supported,true);}
 assert.deepEqual(registry.validate(deck),[]);assert.deepEqual(e.validateDeck(deck),[]);
 assert.equal(deck.cards.find(r=>r.id==='dm23rp1-070').count,3);
 assert.equal(deck.cards.find(r=>r.id==='dmex06-026').count,4);
 assert.equal(deck.cards.find(r=>r.id==='dm25ex1-065').count,2);
});
test('Haikyu enters as a triple breaker and moves the chosen opposing creature to mana',()=>{
 const s=setup();give(s,1,'battle',['dm01-108','dm01-075']);const chosen=s.players[1].battle[1].uid,unselected=s.players[1].battle[0].uid,n=s.players[1].mana.length;
 cast(s,'dm23rp1-070');act(s,'effect',a=>a.targets?.[0]?.uid===chosen);assert.equal(s.players[1].mana.length,n+1);assert.ok(s.players[1].mana.some(x=>x.uid===chosen));assert.ok(s.players[1].battle.some(x=>x.uid===unselected));assert.equal(e.effectiveCard(s.players[0].battle[0],s).breaker,3);
});
test('the two-cost spell face ramps one physical card and does not summon Haikyu',()=>{
 const s=setup();give(s,0,'hand',['dm23rp1-070']);const uid=s.players[0].deck[0].uid,n=s.players[0].mana.length;
 act(s,'play',a=>a.face===1);assert.equal(s.players[0].mana.length,n+1);assert.ok(s.players[0].mana.some(x=>x.uid===uid));assert.equal(s.players[0].battle.length,0);assert.ok(s.players[0].grave.some(x=>x.cardId==='dm23rp1-070'));
});
test('the official Haikyu image is indexed and all screenshot variants match every slot',()=>{
 const refs=read('tools/image-reference-prints.json'),index=read('dist/image-index.json'),report=read('tools/fixtures/grasper-haikyu-verification.json');
 const ref=refs.prints.find(x=>x.id==='dm23rp1-070');assert.equal(ref.canonicalId,'dm23rp1-070');assert.equal(ref.image,'https://dm.takaratomy.co.jp/wp-content/card/cardimage/dm23rp1-070a.jpg');assert.ok(index.entries.some(x=>x[0]===ref.canonicalId&&x[2]===ref.id));
 for(const v of report.variants){assert.equal(v.correct,40);assert.equal(v.wrongConfirmed,0);assert.equal(v.rows,16);assert.equal(v.total,40);}assert.equal(report.withheldConfirmed,0);assert.equal(report.blankConfirmed,0);
});
test('the exact screenshot deck completes from both initiatives with eighty unique physical cards',()=>{
 for(const first of [0,1]){const s=e.runGame([deck,PRESETS[0]],{seed:660100+first,first});assert.notEqual(s.winner,null,s.reason);const physical=e.physicalCards(s);assert.equal(physical.length,80);assert.equal(new Set(physical.map(x=>x.uid)).size,80);assert.deepEqual(e.runSummary(JSON.parse(JSON.stringify(s))),e.runSummary(s));}
});
test('the production worker accepts the exact forty cards and completes its match',async()=>{
 const messages=[];globalThis.self={};globalThis.postMessage=x=>messages.push(structuredClone(x));
 try{await import('../dist/worker.js?haikyu');await self.onmessage({data:{cards:data.cards,deck,opponents:[PRESETS[0]],count:1,first:'first',seed:660900}});assert.deepEqual(messages.filter(x=>x.type==='error'),[]);const result=messages.find(x=>x.type==='done');assert.equal(result.results[0].stats.completed,1);assert.equal(result.results[0].stats.unresolved,0);}finally{delete globalThis.self;delete globalThis.postMessage;}
});
