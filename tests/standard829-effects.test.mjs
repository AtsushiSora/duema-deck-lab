import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-829.json',import.meta.url)));
const ANDRAJE='dm35-040',EDGAR='dm34-033',ROMANOV='dm35-012';
const WATER='dm01-083',LAND='dm01-108',BOUNCE='dm01-086',WATER_SPELL_FACE='dm24bd4-007';
const ORIGIN='dm34-024',DREAM='dm34-052',NEO='dmrp01-087',EVO='dm02-033';
const GAIA='dmrp16-s05',STRATO='dm22rp2-048',THUNDER='dmx18-032';
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const resume=s=>JSON.parse(JSON.stringify(s));

test('Phase 829 matches the official full text and resolves both Romanov reprints to one ID',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.deepEqual(cards.map(x=>x.id),[ANDRAJE,EDGAR,ROMANOV]);
 for(const row of cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(row.spec,standardCardSpec(d,{phase:829}));
  assert.throws(()=>standardCardSpec(d,{phase:828}));
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:829}));
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue??1,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.deepEqual(printAliases.map(x=>x.id),['dmc66-035','dm23ex2-049']);
 for(const print of printAliases){
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:829}),cards.at(-1).spec);
  assert.equal(registry.resolveRows([{id:print.id,count:1}])[0].id,ROMANOV);
  assert.equal(refs.find(x=>x.id===print.id).image,print.image);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
 for(const row of [...cards,...printAliases])assert.equal(regulationVerification.limits[row.id],4);
});

for(const mode of ['accept','decline','deck-out'])test('Andraje evolves before the optional fixed draw and discard: '+mode,()=>{
 let s=setup();
 const [and,wrongBody,wrongSpell,wrongFace]=give(s,0,'hand',[ANDRAJE,LAND,BOUNCE,WATER_SPELL_FACE]);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===and.uid));
 const base=put(s,0,'hand',WATER);
 const drawn=give(s,0,'deck',mode==='deck-out'?[WATER,LAND]:[WATER,LAND,BOUNCE]);
 act(s,'play',a=>a.uid===and.uid);
 assert.deepEqual(values(s),[base.uid]);
 s=resume(s);
 pick(s,base.uid);
 const entered=s.players[0].battle.find(x=>x.uid===and.uid);
 assert.deepEqual(entered.under.map(x=>x.uid),[base.uid]);
 assert.ok(e.isEvolution(entered));
 assert.deepEqual(values(s),[true,null]);
 pick(s,mode==='decline'?null:true);
 if(mode==='deck-out'){assert.equal(s.winner,1);return;}
 if(mode==='accept'){
  assert.ok(values(s).includes(drawn[0].uid)&&values(s).includes(drawn[1].uid));
  pick(s,drawn[0].uid);
  assert.ok(has(s,0,'hand',drawn[0]));
  s=resume(s);
  pick(s,wrongSpell.uid);
  assert.ok(has(s,0,'grave',drawn[0])&&has(s,0,'grave',wrongSpell));
  assert.ok(has(s,0,'hand',drawn[1]));
 }else{
  assert.ok(has(s,0,'deck',drawn[0])&&has(s,0,'deck',drawn[1]));
  assert.ok(has(s,0,'hand',wrongSpell));
 }
 assert.ok(has(s,0,'hand',wrongBody)&&has(s,0,'hand',wrongFace));
});

test('Gaia sends both Andraje and its chosen hand material to mana without the entry trigger',()=>{
 let s=setup();
 const [and,base,unused]=give(s,0,'hand',[ANDRAJE,WATER,WATER]);
 put(s,1,'battle',GAIA);
 const count=e.physicalCards(s).length;
 act(s,'play',a=>a.uid===and.uid);
 s=resume(s);
 pick(s,base.uid);
 assert.ok(has(s,0,'mana',and)&&has(s,0,'mana',base));
 assert.ok(has(s,0,'hand',unused));
 assert.ok(!has(s,0,'battle',and));
 assert.equal(s.players[0].enteredThisTurn||0,0);
 assert.equal(e.physicalCards(s).length,count);
 assert.equal(s.decision,null);
});

for(const mode of ['normal','decline','redirect','empty stack'])test('Edgar ramps once after its optional Meteorburn: '+mode,()=>{
 let s=setup();
 const dream=put(s,0,'battle',DREAM),origin=put(s,0,'battle',ORIGIN);
 put(s,0,'battle',LAND);
 put(s,1,'battle',DREAM);
 const [top]=give(s,0,'deck',[WATER,LAND,BOUNCE]);
 cast(s,EDGAR);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([dream.uid,origin.uid]));
 act(s,'evolve',a=>a.baseUid===origin.uid);
 const edgar=s.players[0].battle.find(x=>x.cardId===EDGAR);
 if(mode==='redirect')put(s,1,'battle',STRATO);
 if(mode==='empty stack'){edgar.under=[];s.players[0].grave.push(origin);}
 if(mode==='normal')origin.faceDown=true;
 attack(s,edgar.uid);
 if(mode==='empty stack')assert.notEqual(s.decision?.task?.op,'g31_Meteor');
 else{
  assert.deepEqual(values(s),[origin.uid,null]);
  if(mode==='normal')assert.ok(!s.decision.choices.find(c=>c.value===origin.uid).cardId);
  pick(s,mode==='decline'?null:origin.uid);
  if(mode==='redirect'){
   assert.equal(s.decision.player,1);
   s=resume(s);
   pick(s,s.players[1].battle.find(x=>x.cardId===STRATO).uid);
   assert.ok(has(s,0,'mana',origin));
  }
 }
 assert.equal(has(s,0,'mana',top),mode==='normal'||mode==='redirect');
 assert.equal(has(s,0,'grave',origin),mode==='normal'||mode==='empty stack');
 assert.equal(s.players[0].battle.find(x=>x.uid===edgar.uid).under.length,mode==='decline'?1:0);
});

for(const n of [0,1,2])test('Romanov examines privately and discards the selected batch: '+n,()=>{
 let s=setup();
 const evolution=put(s,0,'battle',EVO);evolution.under=[inst(LAND)];
 const unevolved=put(s,0,'battle',NEO);
 const neo=put(s,0,'battle',NEO);neo.under=[inst(LAND)];
 put(s,1,'battle',EVO);
 const enemy=give(s,1,'hand',[WATER,LAND,BOUNCE]);
 const own=put(s,0,'hand',BOUNCE);
 cast(s,ROMANOV);
 assert.deepEqual(new Set(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid)),new Set([evolution.uid,neo.uid]));
 act(s,'evolve',a=>a.baseUid===neo.uid);
 assert.equal(s.decision.player,0);
 assert.deepEqual(values(s),[...enemy.map(x=>x.uid),null]);
 assert.ok(e.observation(s,0).players[1].hand.every(x=>x.hidden));
 assert.ok(!JSON.stringify(e.observation(s,0)).includes(enemy[0].uid));
 if(n>0){
  pick(s,enemy[0].uid);
  assert.ok(has(s,1,'hand',enemy[0]));
  assert.deepEqual(values(s),[enemy[1].uid,enemy[2].uid,null]);
  s=resume(s);
 }
 pick(s,n===2?enemy[1].uid:null);
 assert.equal(s.players[1].hand.length,3-n);
 for(const [i,x] of enemy.entries())assert.equal(has(s,1,'grave',x),i<n);
 assert.ok(has(s,0,'hand',own)&&has(s,0,'battle',unevolved));
 const r=s.players[0].battle.find(x=>x.cardId===ROMANOV);
 assert.equal(r.under[0].uid,neo.uid);
 assert.equal(r.under[0].under.length,1);
 assert.equal(e.effectiveCard(r,s).breaker,2);
});

test('Romanov discards a lone card and permits the opponent’s discard replacement',()=>{
 const s=setup();
 const evo=put(s,0,'battle',EVO);evo.under=[inst(LAND)];
 const [thunder]=give(s,1,'hand',[THUNDER]);
 give(s,1,'deck',[LAND,WATER,BOUNCE]);
 cast(s,ROMANOV);
 act(s,'evolve',a=>a.baseUid===evo.uid);
 pick(s,thunder.uid);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'discardChosen');
 pick(s,true);
 drain(s);
 assert.ok(has(s,1,'battle',thunder));
 assert.equal(s.players[1].hand.length,2);
 assert.ok(!has(s,1,'grave',thunder));
});
