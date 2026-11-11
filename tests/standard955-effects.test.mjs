import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AMAZON='dm23-048',UNDERTAKER='dm23-044',NEMU='dm23-038',GARSHA='dm23-042',ARCHEL='dm23-053';
const DRAKE='dm23-051',MECHA_TWIN='dm22ex1-059',DEVIL='dmr12-041',SERAPHIM='dm19-109';
const PLAIN='dm01-108',DRAKE_TWIN='dm23ex2-098',APUL='dmrp22-042';
const entries=[[AMAZON,DRAKE],[UNDERTAKER,DRAKE_TWIN],[NEMU,MECHA_TWIN],[GARSHA,DEVIL],[ARCHEL,SERAPHIM]];
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const deck=s=>s.players[0].deck.map(x=>x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const recover=(s,x)=>act(s,'replaceLGate955',a=>a.uid===x.uid);
const task=(op,p,def)=>({op,p,source:'dm01-046',...def});

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function run(s,...tasks){
 s.extTasks=tasks;
 act(s,'toAttack');
}

function destroy(s,p,x,to='grave'){
 run(s,task('g34_ExactMove',1-p,{owner:p,target:x.uid,to}));
}

function sweep(s,p){
 run(s,task('g34_Sweep',p,{owner:'self',to:'grave',filter:{creature:true}}));
}

test('Phase 955 verifies five complete official single-print definitions',()=>{
 const m=read('tools/support-phase-955.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),entries.map(([id])=>id));
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],card=e.card(id),d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:955}),row.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:955}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(card[key],value);
  assert.deepEqual([card.type,card.cost,card.power,card.race,e.civilizations(card),card.manaValue,card.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(card.supportBatch,'phase-955');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

for(const [id,eligible] of entries)test(id+' recovers exactly one matching creature and replaces the destruction',()=>{
 let s=field();
 cast(s,id);
 const source=s.players[0].battle.find(x=>x.cardId===id);
 const chosen=put(s,0,'grave',eligible),spare=put(s,0,'grave',eligible);
 const unrelated=put(s,0,'grave',PLAIN);
 put(s,1,'grave',eligible);
 put(s,0,'grave',eligible,{faceDown:true});
 const before=physical(s),originalDeck=deck(s);
 destroy(s,0,source);
 assert.equal(s.decision.uid,source.uid);
 assert.deepEqual(legal(s,'replaceLGate955').map(a=>a.uid),[chosen.uid,spare.uid]);
 assert.equal(legal(s,'allowLeave').length,1);
 s=restore(s);
 recover(s,chosen);
 assert.ok(find(s,0,'hand',chosen)&&find(s,0,'grave',spare)&&find(s,0,'grave',unrelated));
 assert.deepEqual(deck(s),[...originalDeck,source.uid]);
 assert.ok(!find(s,0,'grave',source));
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),before);
});

for(const mode of ['decline','noMatch','graveLocked','bounce'])test('L-Gate is optional and requires an eligible destruction and movable grave '+mode,()=>{
 const s=field();
 const source=put(s,0,'battle',AMAZON),target=put(s,0,'grave',mode==='noMatch'?PLAIN:DRAKE);
 if(mode==='graveLocked')put(s,1,'battle',APUL);
 destroy(s,0,source,mode==='bounce'?'hand':'grave');
 if(mode==='decline')act(s,'allowLeave');
 assert.equal(s.decision,null);
 assert.ok(find(s,0,mode==='bounce'?'hand':'grave',source));
 assert.ok(find(s,0,'grave',target));
 assert.ok(!find(s,0,'deck',source));
});

test('A creature being destroyed simultaneously cannot pay for L-Gate',()=>{
 const s=field(),source=put(s,0,'battle',AMAZON),drake=put(s,0,'battle',DRAKE);
 sweep(s,0);
 assert.equal(s.decision,null);
 assert.ok(find(s,0,'grave',source)&&find(s,0,'grave',drake));
});

for(const n of [1,2])test('A simultaneous batch reserves grave choices once and orders multiple bottom cards '+n,()=>{
 let s=field();
 const a=put(s,0,'battle',AMAZON),b=put(s,0,'battle',UNDERTAKER);
 const costs=Array.from({length:n},()=>put(s,0,'grave',DRAKE));
 const before=physical(s),library=deck(s);
 sweep(s,0);
 assert.equal(s.decision.uid,a.uid);
 recover(s,costs[0]);
 if(n===1){
  assert.equal(s.decision,null);
  assert.ok(find(s,0,'grave',b));
  assert.deepEqual(deck(s),[...library,a.uid]);
 }else{
  assert.equal(s.decision.uid,b.uid);
  assert.ok(find(s,0,'grave',costs[0]));
  assert.ok(find(s,0,'battle',a));
  assert.deepEqual(legal(s,'replaceLGate955').map(x=>x.uid),[costs[1].uid]);
  s=restore(s);
  recover(s,costs[1]);
  assert.equal(s.decision.task.op,'g78_BottomOrder');
  s=restore(s);
  act(s,'extended',x=>s.decision.choices[x.choice].value===b.uid);
  assert.deepEqual(deck(s),[...library,b.uid,a.uid]);
 }
 for(const cost of costs)assert.ok(find(s,0,'hand',cost));
 assert.deepEqual(physical(s),before);
});

test('L-Gate puts the entire creature stack on the bottom in the chosen order',()=>{
 const s=field(),source=put(s,0,'battle',AMAZON);
 const base=inst(PLAIN),target=put(s,0,'grave',DRAKE),before=deck(s);
 source.under=[base];
 destroy(s,0,source);
 recover(s,target);
 assert.equal(s.decision.task.op,'g78_BottomOrder');
 act(s,'extended',a=>s.decision.choices[a.choice].value===base.uid);
 assert.deepEqual(deck(s),[...before,base.uid,source.uid]);
 assert.ok(!find(s,0,'grave',base));
});

for(const useGate of [true,false])test('L-Gate competes with another optional destruction replacement '+useGate,()=>{
 const s=field(),source=put(s,0,'battle',AMAZON,{g34Grants:[{turn:s.turn,g846DestroyToTop:true}]});
 const target=put(s,0,'grave',DRAKE);
 destroy(s,0,source);
 assert.equal(legal(s,'replaceDeckTop846').length,1);
 assert.equal(legal(s,'replaceLGate955').length,1);
 if(useGate)recover(s,target);
 else act(s,'replaceDeckTop846');
 assert.equal(s.players[0].deck[useGate?s.players[0].deck.length-1:0].uid,source.uid);
 assert.ok(find(s,0,useGate?'hand':'grave',target));
});

test('L-Gate on a real battle loss creates no destruction draw',()=>{
 const s=field(1);
 const defender=put(s,0,'battle',GARSHA,{tapped:true}),watcher=put(s,0,'battle','dm04-028');
 const attacker=put(s,1,'battle',PLAIN),target=put(s,0,'grave',DEVIL);
 const originalHand=s.players[0].hand.length;
 attack(s,attacker.uid,defender.uid);
 act(s,'noBlock');
 recover(s,target);
 assert.ok(find(s,0,'battle',watcher)&&find(s,1,'battle',attacker));
 assert.equal(s.players[0].hand.length,originalHand+1);
 assert.equal(s.decision,null);
 assert.equal(s.log.filter(row=>row.type==='battle').length,1);
});

test('A creature reserved by L-Gate cannot also pay a later replacement in the same batch',()=>{
 const s=field();
 const a=put(s,0,'battle',AMAZON,{g34Grants:[{turn:s.turn,g571Saver:{filter:{race:'ティラノ・ドレイク'},other:true}}]});
 const b=put(s,0,'battle',UNDERTAKER);
 const first=put(s,0,'grave',DRAKE),second=put(s,0,'grave',DRAKE);
 sweep(s,0);
 recover(s,first);
 assert.equal(s.decision.uid,b.uid);
 assert.equal(legal(s,'replaceUltra').length,0);
 assert.deepEqual(legal(s,'replaceLGate955').map(a=>a.uid),[second.uid]);
 act(s,'allowLeave');
 assert.ok(find(s,0,'deck',a)&&find(s,0,'grave',b));
});

for(const shuffle of [false,true])test('L-Gate shares the deck destination with another replacement '+shuffle,()=>{
 const s=field(),source=put(s,0,'battle',AMAZON),target=put(s,0,'grave',DRAKE);
 const other=put(s,0,'battle',PLAIN,{g34Grants:[{turn:s.turn,...(shuffle?{g731DestroyShuffle:true}:{destroyToDeck:true})}]});
 const before=physical(s),library=deck(s);
 sweep(s,0);
 recover(s,target);
 if(!shuffle){
  assert.equal(s.decision.task.op,'g78_BottomOrder');
  act(s,'extended',a=>s.decision.choices[a.choice].value===other.uid);
  assert.deepEqual(deck(s),[...library,other.uid,source.uid]);
 }else{
  assert.equal(s.decision,null);
  assert.ok(find(s,0,'deck',other)&&find(s,0,'deck',source));
 }
 assert.ok(find(s,0,'hand',target));
 assert.deepEqual(physical(s),before);
});
