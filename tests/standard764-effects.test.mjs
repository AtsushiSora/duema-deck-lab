import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-764.json',import.meta.url)));
const ANGE='dm24rp4-068',FAIRY='dm23rp2-073',MONDO='dm23rp2-014';
const BODY='dm01-108',SIX='dm36-048',SPELL='dmrp17-073',TRIGGER_SPELL='dm01-052';
const TRIGGER_CREATURE='dmrp13-059',MAGIC_EIGHT='dm23ex1-003',MAGIC_NINE='dm25rp4-055';
const TWIN='dm23rp2-013',QX='dm25ex1-049';
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const find=(s,p,zone,uid)=>s.players[p][zone].find(x=>x.uid===uid);
const pick=(s,value,face)=>act(s,'extended',a=>{
 const option=s.decision.choices[a.choice].value;
 return (option?.uid??option)===value&&(face===undefined||option.face===face);
});
const end=s=>{s.phase='attack';act(s,'endTurn');};
const unblocked=s=>{if(s.decision?.type==='block')act(s,'noBlock');};

test('three complete official cards and two print aliases use the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:764}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:764}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const print=printAliases.find(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:print?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  if(print){
   assert.deepEqual(print.faces,row.faces);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

test('Angeros counts only a friendly cost-six or greater declaration and remembers it across saves',()=>{
 let s=setup();
 put(s,0,'battle',ANGE);
 const low=put(s,0,'battle',BODY),first=put(s,0,'battle',SIX),later=put(s,0,'battle',SIX);
 const targets=Array.from({length:3},()=>put(s,1,'battle',BODY,{tapped:true}));
 attack(s,low.uid,targets[0].uid);
 unblocked(s);
 assert.ok(find(s,0,'battle',low.uid)?.tapped||find(s,0,'grave',low.uid));
 attack(s,first.uid,targets[1].uid);
 unblocked(s);
 assert.equal(find(s,0,'battle',first.uid).tapped,false);
 s=restore(s);
 attack(s,later.uid,targets[2].uid);
 unblocked(s);
 assert.equal(find(s,0,'battle',later.uid).tapped,true);
 s.turn++;
 const target=put(s,1,'battle',BODY,{tapped:true});
 attack(s,first.uid,target.uid);
 unblocked(s);
 assert.equal(find(s,0,'battle',first.uid).tapped,false);
});

test('a qualifying attack before Angeros arrives consumes that turn’s opportunity',()=>{
 const s=setup();
 const first=put(s,0,'battle',SIX),later=put(s,0,'battle',SIX);
 const target=put(s,1,'battle',BODY,{tapped:true});
 attack(s,first.uid,target.uid);
 unblocked(s);
 assert.equal(first.tapped,true);
 put(s,0,'battle',ANGE);
 const other=put(s,1,'battle',BODY,{tapped:true});
 attack(s,later.uid,other.uid);
 unblocked(s);
 assert.equal(later.tapped,true);
});

test('Angeros untaps before blocking, including when two copies trigger from the same attack',()=>{
 const s=setup();
 put(s,0,'battle',ANGE);
 put(s,0,'battle',ANGE);
 const a=put(s,0,'battle',SIX);
 put(s,1,'battle','dm01-001');
 attack(s,a.uid);
 assert.equal(s.decision?.type,'effectOrder');
 drainEffectsUntilBlock(s);
 assert.equal(s.decision?.type,'block');
 assert.equal(a.tapped,false);
 unblocked(s);
});
function drainEffectsUntilBlock(s){
 for(let i=0;s.decision&&s.decision.type!=='block';i++){
  assert.ok(i<20);
  e.step(s,e.chooseAI(s));
 }
}

test('Makuma moves itself to mana and ends its player attack before shield breaking',()=>{
 const s=setup(),a=put(s,0,'battle',FAIRY);
 const shields=s.players[1].shields.map(x=>x.uid);
 attack(s,a.uid);
 assert.ok(!find(s,0,'battle',a.uid));
 assert.equal(find(s,0,'mana',a.uid).tapped,false);
 assert.deepEqual(s.players[1].shields.map(x=>x.uid),shields);
});

test('Makuma stays in battle when it attacks a creature',()=>{
 const s=setup(),a=put(s,0,'battle',FAIRY),target=put(s,1,'battle',BODY,{tapped:true});
 attack(s,a.uid,target.uid);
 unblocked(s);
 assert.equal(find(s,0,'battle',a.uid).tapped,true);
 assert.equal(find(s,0,'mana',a.uid),undefined);
 assert.ok(find(s,1,'grave',target.uid));
});

test('Mondo enters with Just Diver and its start draw can be accepted or declined',()=>{
 for(const n of [0,1]){
  const s=setup();
  cast(s,MONDO);
  const x=s.players[0].battle.find(y=>y.cardId===MONDO);
  assert.ok(x.justDiverActive);
  end(s);
  put(s,1,'battle',BODY);
  x.tapped=true;
  s.phase='attack';
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.target===x.uid));
  const before=s.players[0].hand.length;
  end(s);
  assert.equal(s.decision?.task?.op,'g34_Draw');
  assert.equal(s.decision.player,0);
  pick(s,n);
  assert.equal(s.players[0].hand.length,before+n+1);
  assert.ok(!x.justDiverActive);
 }
});

test('Mondo needs a spell and a summon in the same turn, with the condition captured at turn end',()=>{
 for(const mode of ['spell','summon','previous','both']){
  const s=setup();
  put(s,0,'battle',MONDO);
  give(s,0,'deck',[BODY,BODY,MAGIC_EIGHT,BODY,BODY,BODY,BODY]);
  if(mode!=='spell')cast(s,BODY);
  if(mode==='previous')s.turn++;
  if(mode!=='summon')cast(s,SPELL);
  drain(s);
  end(s);
  assert.equal(s.decision?.task?.op==='g34_RaidPick',mode==='both',mode);
  if(mode==='both'){
   const before=s.players[0].mana.map(x=>x.tapped);
   const chosen=s.players[0].deck.find(x=>x.cardId===MAGIC_EIGHT);
   assert.ok(s.decision.choices.some(x=>x.value?.uid===chosen.uid));
   pick(s,chosen.uid);
   drain(s);
   assert.ok(find(s,0,'battle',chosen.uid));
   assert.deepEqual(s.players[0].mana.map(x=>x.tapped),before);
  }
 }
});

test('Mondo can choose a matching twinpact face and save the private bottom order',()=>{
 let s=setup();
 put(s,0,'battle',MONDO);
 cast(s,BODY);
 cast(s,SPELL);
 drain(s);
 give(s,0,'deck',[TWIN,BODY,MAGIC_NINE,BODY,BODY,BODY]);
 const [twin,plain,high]=s.players[0].deck;
 const start=s.log.length;
 end(s);
 assert.equal(s.decision?.task?.op,'g34_RaidPick');
 assert.ok(s.log.slice(start).every(entry=>entry.type!=='reveal'));
 assert.deepEqual(s.decision.choices.filter(o=>o.value).map(o=>[o.value.uid,o.value.face]),[[twin.uid,0],[twin.uid,1]]);
 s=restore(s);
 pick(s,twin.uid,1);
 assert.deepEqual(s.log.slice(start).filter(entry=>entry.type==='reveal').map(entry=>entry.cardId),[TWIN]);
 while(s.decision?.task?.op!=='g34_Order'&&s.decision)e.step(s,e.chooseAI(s));
 assert.equal(s.decision?.task?.op,'g34_Order');
 s=restore(s);
 pick(s,high.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(x=>x.uid),[high.uid,plain.uid]);
 assert.ok(find(s,0,'grave',twin.uid));
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Mondo keeps the deck order intact if a deck lock prevents the look',()=>{
 const s=setup();
 put(s,0,'battle',MONDO);
 cast(s,BODY);
 cast(s,SPELL);
 drain(s);
 give(s,0,'deck',[MAGIC_EIGHT,TWIN,BODY,BODY]);
 const ids=s.players[0].deck.map(x=>x.uid);
 put(s,1,'battle',QX);
 end(s);
 assert.notEqual(s.decision?.task?.op,'g34_RaidPick');
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),ids);
 assert.ok(!s.players[0].g34Protected?.length);
});

test('Mondo also raids after a real Shield Trigger spell and summon during the rival turn',()=>{
 const s=setup();
 put(s,0,'battle',MONDO);
 give(s,0,'shields',[TRIGGER_CREATURE,TRIGGER_SPELL]);
 s.active=1;
 const attacker=put(s,1,'battle',SIX);
 attack(s,attacker.uid);
 unblocked(s);
 for(let i=0;s.decision;i++){
  assert.ok(i<25);
  const use=e.getLegalActions(s).find(a=>a.kind==='useTrigger');
  e.step(s,use||e.chooseAI(s));
 }
 assert.ok(s.players[0].battle.some(x=>x.cardId===TRIGGER_CREATURE));
 assert.ok(s.players[0].grave.some(x=>x.cardId===TRIGGER_SPELL));
 assert.equal(s.g463Summons[0].turn,s.turn);
 assert.equal(s.g37Spells[0].turn,s.turn);
 give(s,0,'deck',[MAGIC_EIGHT,BODY,BODY,BODY,BODY]);
 end(s);
 assert.equal(s.decision?.task?.op,'g34_RaidPick');
 assert.equal(s.decision.player,0);
});
