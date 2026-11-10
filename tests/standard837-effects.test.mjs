import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const BANANA='dmr03-036',GOKEEN='dmr01-057',TROLL='dm38-047',SWORD='dm37-034';
const LAND='dm01-108',WATER='dm01-083',SPELL='dm01-086',HUNTER='dmd05-003',LOCK='dmrp08-014',CHANGE='dmr23-025';
function put(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const resume=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){s.phase='attack';act(s,'endTurn');}

test('Phase 837 pins four full official definitions and the same-name DMEX-04 print',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-837.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BANANA,GOKEEN,TROLL,SWORD]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['dmex04-014',GOKEEN]]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:837}),row.spec);
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:837}));
 }
 const reprint=m.printAliases[0];
 assert.deepEqual(standardCardSpec({...reprint,status:'complete'},{phase:837}),m.cards[1].spec);
 assert.deepEqual(catalogue.resolveRows([{id:reprint.id,count:1},{id:GOKEEN,count:3}]),[{id:GOKEEN,count:4}]);
 assert.equal(m.regulationVerification.limits[reprint.id],4);
});

test('Banana taps once with no Hunter and ignores enemy Hunters',()=>{
 const s=setup(),target=put(s,1,'battle',HUNTER);
 const other=put(s,1,'battle',LAND);
 cast(s,BANANA);pick(s,target.uid);
 assert.equal(s.decision,null);
 assert.ok(target.tapped);assert.ok(!other.tapped);
});

test('Banana repeats the tap for each allied Hunter and allows reselecting an already tapped creature',()=>{
 let s=setup();
 for(const id of [HUNTER,HUNTER,LAND])put(s,0,'battle',id);
 const first=put(s,1,'battle',LAND),second=put(s,1,'battle',LAND),third=put(s,1,'battle',LAND);
 cast(s,BANANA);pick(s,first.uid);assert.ok(first.tapped);
 s=resume(s);assert.ok(choices(s).includes(first.uid));
 pick(s,first.uid);pick(s,second.uid);drain(s);
 assert.deepEqual(s.players[1].battle.map(x=>!!x.tapped),[true,true,false]);
 assert.ok(has(s,1,'battle',third));
});

test('Banana is a real Shield Trigger and can tap another attacker during the opposing turn',()=>{
 const s=setup();
 give(s,0,'shields',[BANANA,LAND]);
 const attacker=put(s,1,'battle',LAND),next=put(s,1,'battle',LAND);
 s.active=1;attack(s,attacker.uid);act(s,'noBlock');
 act(s,'useTrigger');pick(s,next.uid);drain(s);
 assert.ok(next.tapped);
});

for(const [owner,side] of [[0,'deckTop'],[0,'deck'],[1,'deckTop'],[1,'deck']])
 test('Gokeen can move either graveyard card to its owner’s chosen library end '+owner+' '+side,()=>{
  let s=setup();
  const yours=put(s,0,'grave',LAND),theirs=put(s,1,'grave',SPELL);
  const target=owner?theirs:yours;
  cast(s,GOKEEN);assert.deepEqual(choices(s),[theirs.uid,yours.uid,null]);
  const before=physical(s);
  pick(s,target.uid);s=resume(s);assert.deepEqual(choices(s),['deckTop','deck']);
  pick(s,side);drain(s);
  assert.equal(s.players[owner].deck.at(side==='deckTop'?0:-1).uid,target.uid);
  assert.ok(has(s,1-owner,'grave',owner?yours:theirs));
  assert.deepEqual(physical(s),before);
 });

test('Gokeen may decline and a graveyard movement lock affects only the protected graveyard',()=>{
 const s=setup();
 const own=put(s,0,'grave',LAND),opp=put(s,1,'grave',SPELL);
 put(s,1,'battle',LOCK);
 cast(s,GOKEEN);assert.deepEqual(choices(s),[opp.uid,null]);
 pick(s,null);assert.ok(has(s,0,'grave',own)&&has(s,1,'grave',opp));
});

for(const mode of ['pay','decline','empty','locked'])test('Troll resolves an optional Reikon before a blind discard '+mode,()=>{
 const s=setup(),troll=put(s,0,'battle',TROLL);
 const paid=mode==='empty'?null:put(s,0,'grave',LAND);
 const left=put(s,1,'hand',LAND),discard=put(s,1,'hand',WATER);
 if(mode==='locked')put(s,1,'battle',LOCK);
 attack(s,troll.uid);
 if(mode!=='empty')pick(s,mode==='decline'?null:paid.uid);
 if(mode==='pay'||mode==='locked'){
  assert.equal(s.decision.task.op,'g34_BlindDiscard773');
  assert.deepEqual(choices(s),[0,1]);
  assert.ok(s.decision.choices.every(o=>!o.cardId&&o.label.startsWith('裏向き')));
  pick(s,1);assert.ok(has(s,1,'grave',discard));
 }else assert.ok(has(s,1,'hand',discard));
 assert.ok(has(s,1,'hand',left));
 assert.equal(s.players[0].deck.at(-1).uid===paid?.uid,mode==='pay');
 if(mode==='locked')assert.ok(has(s,0,'grave',paid));
 drain(s);
});

test('Troll can resolve Reikon after a Revolution Change fills an initially empty graveyard',()=>{
 const s=setup(),troll=put(s,0,'battle',TROLL),change=put(s,0,'hand',CHANGE);
 give(s,0,'deck',[LAND,WATER,SPELL,LAND,LAND]);
 const top=s.players[0].deck[0],discard=put(s,1,'hand',LAND);
 attack(s,troll.uid);pick(s,true);
 act(s,'orderEffect',a=>a.uid===change.uid);pick(s,troll.uid);
 assert.ok(has(s,0,'battle',change));
 if(s.decision?.type==='effectOrder'||s.decision?.type==='entryOrder')
  act(s,s.decision.type==='entryOrder'?'orderEntry':'orderEffect',a=>a.uid===change.uid);
 pick(s,true);
 if(s.decision?.type==='effectOrder')act(s,'orderEffect',a=>a.uid===troll.uid);
 pick(s,top.uid);pick(s,0);drain(s);
 assert.ok(has(s,0,'hand',troll)&&has(s,1,'grave',discard));
 assert.equal(s.players[0].deck.at(-1).uid,top.uid);
});

for(const mode of ['none','charge','ramp','grave','opponent','following-turn'])
 test('Kamakiri checks actual own-turn mana placement and returns only from battle '+mode,()=>{
  let s=setup();
  const sword=put(s,0,mode==='grave'?'grave':'battle',SWORD);
  if(mode==='charge'){
   const charge=put(s,0,'hand',LAND);
   s.phase='charge';act(s,'charge',a=>a.uid===charge.uid);
  }
  if(mode==='ramp'||mode==='following-turn'){cast(s,'dm01-106');drain(s);}
  if(mode==='opponent')s.active=1;
  s=resume(s);end(s);drain(s);
  if(mode==='following-turn'){end(s);drain(s);end(s);drain(s);}
  assert.equal(has(s,0,'hand',sword),mode==='none'||mode==='following-turn');
  if(mode==='grave')assert.ok(has(s,0,'grave',sword));
  else if(mode!=='none'&&mode!=='following-turn')assert.ok(has(s,0,'battle',sword));
 });

test('Kamakiri breaks two shields before its mandatory return',()=>{
 const s=setup(),sword=put(s,0,'battle',SWORD);
 attack(s,sword.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 end(s);assert.ok(has(s,0,'hand',sword));
});
