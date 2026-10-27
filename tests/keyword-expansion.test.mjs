import {physicalCards} from '../dist/engine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setCards,card,createGame,step,getLegalActions,chooseAI,validateDeck,runGame,observation} from '../dist/engine.js';
import {PRESETS} from '../dist/decks.js';
import {keywordSpec} from '../tools/keyword-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {resolveEnvironmentDecks} from '../dist/environment.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const [data,details,manifest,snapshot]=await Promise.all(['dist/cards.json','dist/details.json','tools/support-phase-2.json','dist/catalogue.json'].map(read));
setCards(data.cards);
let serial=0;const inst=id=>({cardId:id,uid:'keyword-'+serial++,tapped:false,entered:0,buff:0,unblocked:false});
const give=(s,p,z,ids)=>s.players[p][z]=ids.map(inst);
const act=(s,kind,predicate=()=>true)=>{const a=getLegalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind+' '+JSON.stringify(s.decision));step(s,a);};
const attackSetup=(id='dm05-015',shields=['dm01-075','dm01-075','dm01-075','dm01-075','dm01-075'])=>{const s=createGame([PRESETS[0],PRESETS[1]],{seed:21});s.phase='attack';give(s,0,'battle',[id]);give(s,1,'battle',[]);give(s,1,'shields',shields);return s;};

test('phase 2 freezes 173 complete official keyword cards and retains all previous registration identities',()=>{
 const added=data.cards.filter(c=>c.supportBatch==='phase-2');assert.equal(added.length,173);assert.equal(data.cards.length,1458);assert.equal(new Set(added.map(c=>c.id)).size,173);assert.equal(manifest.cards.length,173);
 const registry=createCatalogue(snapshot,data.cards,details);assert.equal(registry.cards.length,11833);
 for(const c of added){const d=details.cards.find(x=>x.id===c.id),row=manifest.cards.find(x=>x.id===c.id),f=d.faces[0];assert.equal(d.status,'complete');assert.equal(d.faces.length,1);assert.equal(f.typeText,'クリーチャー');assert.equal(f.civilizations.length,1);assert.equal(c.text,f.abilityText);assert.equal(c.cost,f.cost);assert.equal(c.power,Number(f.powerText));assert.deepEqual(keywordSpec(c.text),row.spec);for(const[k,v]of Object.entries(row.spec))assert.equal(c[k],v);assert.equal(registry.get(c.id).supported,true);}
 assert.equal(added.filter(c=>c.breaker).length,56);assert.equal(added.filter(c=>c.breaker===3).length,10);
 for(const d of resolveEnvironmentDecks(registry)){assert.equal(registry.coverage(d).unsupported,0);assert.equal(validateDeck(d).length>0,false);}
});
test('keyword verification rejects extra effects, dual breaker choices, and unsupported breaker values',()=>{
 assert.throws(()=>keywordSpec('W・ブレイカー\n自分はゲームに勝てず、相手はゲームに負けない。'),/未対応/);
 assert.throws(()=>keywordSpec('W・ブレイカー\nT・ブレイカー'),/複数/);
 assert.throws(()=>setCards([{...data.cards[0],breaker:5}]),/未実装/);assert.ok(card('dm05-015'));
});
test('double break selects two distinct shields after blockers and moves both simultaneously',()=>{
 const s=attackSetup(),before=s.players[1].shields.map(c=>c.uid),hand=s.players[1].hand.length;
 act(s,'attack');assert.equal(s.decision.type,'block');act(s,'noBlock');assert.equal(s.decision.type,'breakChoice');assert.equal(s.players[1].shields.length,5);assert.equal(getLegalActions(s).length,10);assert.ok(getLegalActions(s).every(a=>a.shields.length===2&&new Set(a.shields).size===2));
 const selected=[before[1],before[4]],bad={...getLegalActions(s)[0],shields:[before[1],before[1]]};assert.throws(()=>step(s,bad),/選択/);
 act(s,'breakShields',a=>selected.every(x=>a.shields.includes(x)));assert.deepEqual(s.players[1].shields.map(c=>c.uid),[before[0],before[2],before[3]]);assert.deepEqual(s.players[1].hand.slice(hand).map(c=>c.uid),selected);assert.equal(s.metrics[0].breaks,2);assert.equal(s.decision,null);
});
test('a blocked double breaker breaks no shields; unblockable double breakers cannot be blocked',()=>{
 const s=attackSetup();give(s,1,'battle',['dm01-084']);act(s,'attack');act(s,'block');assert.equal(s.players[1].shields.length,5);assert.equal(s.decision,null);
 const t=attackSetup('dm01-s04');give(t,1,'battle',['dm01-084']);act(t,'attack');assert.deepEqual(getLegalActions(t).map(a=>a.kind),['noBlock']);
});
test('triple breaker breaks exactly three, caps at shields left, and never converts excess to a direct attack',()=>{
 const s=attackSetup('dm05-s04');act(s,'attack');act(s,'noBlock');assert.equal(getLegalActions(s).length,10);act(s,'breakShields');assert.equal(s.players[1].shields.length,2);assert.equal(s.metrics[0].breaks,3);
 for(const n of [1,2,3]){const t=attackSetup('dm05-s04',Array(n).fill('dm01-075'));act(t,'attack');act(t,'noBlock');assert.equal(t.players[1].shields.length,0);assert.equal(t.metrics[0].breaks,n);assert.equal(t.winner,null);assert.equal(t.decision,null);}
 const u=attackSetup('dm05-s04',[]);act(u,'attack');act(u,'noBlock');assert.equal(u.winner,0);
});
test('all trigger declarations finish before either spell is executed, then the defender chooses order',()=>{
 const s=attackSetup('dm05-015',['dm06-110','dm01-027']);const mana=s.players[1].mana.length;act(s,'attack');act(s,'noBlock');assert.equal(s.decision.type,'trigger');
 act(s,'useTrigger');assert.equal(s.decision.type,'trigger');assert.equal(s.players[1].mana.length,mana);assert.equal(s.players[0].battle.length,1);act(s,'useTrigger');assert.equal(s.decision.type,'triggerOrder');
 act(s,'orderTrigger',a=>a.cardId==='dm01-027');assert.equal(s.decision.type,'effect');act(s,'effect');assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].mana.length,mana+1);assert.equal(s.metrics[1].triggers,2);assert.equal(s.decision,null);assert.equal(s.players[1].shields.length,0);
});
test('declining a trigger cannot be reversed after the other effect; unused trigger remains in hand',()=>{
 const s=attackSetup('dm05-015',['dm06-110','dm01-027']);act(s,'attack');act(s,'noBlock');act(s,'skipTrigger');act(s,'useTrigger');act(s,'effect');assert.ok(s.players[1].hand.some(c=>c.cardId==='dm06-110'));assert.equal(s.metrics[1].triggers,1);assert.equal(s.triggers,null);
});
test('creature trigger entry effects wait for all declared triggers and may be ordered afterwards',()=>{
 const s=attackSetup('dm05-s04',['dm05-024','dm05-024','dm06-110']);const mana=s.players[1].mana.length;act(s,'attack');act(s,'noBlock');act(s,'useTrigger');act(s,'useTrigger');act(s,'useTrigger');assert.equal(s.decision.type,'triggerOrder');
 act(s,'orderTrigger',a=>a.cardId==='dm05-024');assert.equal(s.players[1].battle.length,1);assert.equal(s.players[0].battle.length,1);assert.equal(s.decision.type,'triggerOrder');
 act(s,'orderTrigger',a=>a.cardId==='dm05-024');assert.equal(s.players[1].battle.length,2);assert.equal(s.players[1].mana.length,mana+1);assert.equal(s.metrics[1].triggers,3);assert.equal(s.decision.type,'entryOrder');
 act(s,'orderEntry');assert.equal(s.decision.type,'effect');act(s,'effect',a=>a.targets?.[0].player===0);assert.equal(s.players[0].battle.length,0);assert.equal(s.decision.type,'effect');act(s,'skipEffect');assert.equal(s.decision,null);assert.equal(s.triggers,null);
});
test('library loss during a trigger stops all remaining trigger and entry effects',()=>{
 const s=attackSetup('dm05-015',['dm06-110','dm01-027']);s.players[1].deck=s.players[1].deck.slice(0,1);act(s,'attack');act(s,'noBlock');act(s,'useTrigger');act(s,'useTrigger');act(s,'orderTrigger',a=>a.cardId==='dm06-110');assert.equal(s.winner,0);assert.equal(s.players[0].battle.length,1);assert.deepEqual(getLegalActions(s),[]);assert.equal(s.metrics[1].triggers,1);
});
test('every added keyword card obeys attack restrictions, summoning sickness, and its exact break count',()=>{
 for(const c of data.cards.filter(c=>c.supportBatch==='phase-2')){
  const s=attackSetup(c.id);give(s,1,'battle',['dm01-075']);s.players[1].battle[0].tapped=true;
  const attacks=getLegalActions(s).filter(a=>a.kind==='attack');assert.equal(attacks.some(a=>a.target==='player'),!c.noAttack&&!c.noPlayerAttack,c.name);assert.equal(attacks.some(a=>a.target!=='player'),!c.noAttack,c.name);
  s.players[0].battle[0].entered=s.turn;assert.equal(getLegalActions(s).some(a=>a.kind==='attack'),!!c.speedAttacker&&!c.noAttack,c.name);
  if(c.breaker&&!c.noAttack&&!c.noPlayerAttack){s.players[0].battle[0].entered=0;act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'breakShields');assert.equal(s.metrics[0].breaks,c.breaker,c.name);}
 }
});
test('AI shield choices never read hidden shield identities or deck order',()=>{
 const s=attackSetup();act(s,'attack');act(s,'noBlock');const chosen=chooseAI(s),v=observation(s,0);assert.equal(v.players[1].shields,5);s.players[1].shields.forEach((c,i)=>c.cardId=i%2?'dm01-027':'dm06-110');s.players[1].deck.reverse();assert.deepEqual(chooseAI(s),chosen);
});
test('mixed keyword decks finish reproducibly and preserve all 80 unique physical cards at every step',()=>{
 const fresh=data.cards.filter(c=>c.supportBatch==='phase-2');const batches=Array.from({length:Math.ceil(fresh.length/10)},(_,i)=>({name:'keyword batch '+i,format:'original',cards:[...fresh.slice(i*10,i*10+10).map(c=>c.id),...PRESETS[0].cards.map(c=>c.id)].slice(0,10).map(id=>({id,count:4}))}));
 for(const deck of batches){assert.deepEqual(validateDeck(deck),[]);for(let seed=1;seed<=6;seed++){
  const s=createGame([deck,seed%2?PRESETS[1]:batches[(seed+4)%batches.length]],{seed,first:seed%2});
  while(s.winner===null&&s.actions<2500&&s.turn<160){const a=chooseAI(s);assert.ok(a);step(s,a);const all=physicalCards(s);assert.equal(all.length,80);assert.equal(new Set(all.map(c=>c.uid)).size,80);}assert.notEqual(s.winner,null);
 }}
 assert.deepEqual(runGame([batches[3],batches[8]],{seed:901}),runGame([batches[3],batches[8]],{seed:901}));
});
