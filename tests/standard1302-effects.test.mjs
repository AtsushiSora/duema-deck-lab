import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const ZET='dmx21-021',GAIA='dm16-002',POKORURU='dm05-010';
const VANILLA='dm01-108',HEAVY='dmex17-033',METAL='dmex17-059',DARK_MANA='dm01-090';
const SPARK='dm01-015',TWIN='dmex04-016',ANCIENT='dm10-058',DEMON='dm01-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(VANILLA));
 return s;
}
const uid=({value})=>value?.uid??value;
const pick=(s,x)=>act(s,'extended',a=>uid(s.decision.choices[a.choice])===x.uid);

test('three official prints use unique canonical IDs and validate in saved decks',()=>{
 const m=read('tools/support-phase-1302.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[ZET,GAIA,POKORURU]);
 assert.equal(m.printAliases.length,0);
 for(const {id,name,image,source,faces,spec} of m.cards){
  const c=e.card(id),f=faces[0];
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1302}));
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.limit],
   [f.typeText==='呪文'?'spell':'creature',f.cost,parseInt(f.powerText,10)||0,f.civilizations,f.race,4]);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId:id,name,image,source});
  assert.equal(CARD_IMAGES[id],image);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

test('God of Zet takes up to two matching creature cards from hand, excluding the other zones and unrelated names',()=>{
 for(const n of [0,1,2]){
  const s=field();
  const heavy=add(s,0,'hand',HEAVY),metal=add(s,0,'hand',METAL),third=add(s,0,'hand',METAL);
  const wrong=add(s,0,'hand',VANILLA),buried=add(s,0,'grave',HEAVY);
  cast(s,ZET);
  assert.deepEqual(s.decision.choices.map(uid),[heavy.uid,metal.uid,third.uid,null]);
  for(const card of [heavy,metal].slice(0,n))pick(s,card);
  if(n<2)act(s,'extended',a=>s.decision.choices[a.choice].value===null);
  drain(s);
  const battlefield=s.players[0].battle.flatMap(x=>[x,...(x.godLinks||[])]);
  assert.equal(battlefield.filter(x=>[heavy.uid,metal.uid].includes(x.uid)).length,n);
  assert.ok(has(s,0,'hand',third)&&has(s,0,'hand',wrong)&&has(s,0,'grave',buried));
 }
});

test('Gaia Crash prevents both players from untapping spell mana at turn start, including twinpacts',()=>{
 for(const active of [0,1]){
  const s=field(),p=1-active;
  s.active=active;
  const gaia=add(s,active,'battle',GAIA);
  const spell=add(s,p,'mana',SPARK,{tapped:true}),twin=add(s,p,'mana',TWIN,{tapped:true});
  const ordinary=add(s,p,'mana',VANILLA,{tapped:true}),hidden=add(s,p,'mana',SPARK,{tapped:true,faceDown:true});
  assert.equal(e.effectiveCard(gaia,s).breaker,2);
  s.phase='attack';act(s,'endTurn');drain(s);
  assert.equal(s.active,p);
  assert.deepEqual([spell.tapped,twin.tapped,ordinary.tapped,hidden.tapped],[true,true,false,false]);
 }
});

test('Gaia Crash applies to effect untaps and stops applying while its abilities are ignored',()=>{
 for(const suppressed of [false,true]){
  const s=field();
  add(s,1,'battle',GAIA,suppressed?{g35Ignored:s.turn}:{});
  const spell=add(s,0,'mana',SPARK,{tapped:true}),creature=add(s,0,'mana',DARK_MANA,{tapped:true});
  cast(s,ANCIENT);drain(s);
  assert.equal(spell.tapped,!suppressed);
  assert.equal(creature.tapped,false);
 }
});

test('Pokoruru offers to untap after Holy Spark has resolved (QA 35070)',()=>{
 const s=field(),pokoruru=add(s,0,'battle',POKORURU),ally=add(s,0,'battle',VANILLA);
 give(s,1,'shields',[SPARK]);
 attack(s,pokoruru.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(ally.tapped&&pokoruru.tapped);
 const restored=JSON.parse(JSON.stringify(s));
 act(restored,'extended',a=>restored.decision.choices[a.choice].value===true);
 assert.equal(restored.players[0].battle.find(x=>x.uid===pokoruru.uid).tapped,false);
 act(s,'extended',a=>!s.decision.choices[a.choice].value);
 assert.equal(pokoruru.tapped,true);
});

test('Pokoruru stays tapped when the trigger is declined or the trigger removes it',()=>{
 for(const trigger of [SPARK,DEMON]){
  const s=field(),pokoruru=add(s,0,'battle',POKORURU);
  give(s,1,'shields',[trigger]);
  attack(s,pokoruru.uid);act(s,'noBlock');act(s,trigger===SPARK?'skipTrigger':'useTrigger');
  if(trigger===DEMON)act(s,'effect',a=>a.targets[0].uid===pokoruru.uid);
  drain(s);
  assert.equal(s.decision,null);
  if(trigger===SPARK)assert.ok(pokoruru.tapped&&has(s,0,'battle',pokoruru));
  else assert.ok(has(s,0,'grave',pokoruru));
 }
});

test('Pokoruru does not untap when another creature breaks a shield with an S-Trigger',()=>{
 const s=field(),pokoruru=add(s,0,'battle',POKORURU,{tapped:true}),ally=add(s,0,'battle',VANILLA);
 give(s,1,'shields',[SPARK]);
 attack(s,ally.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.equal(s.decision,null);
 assert.equal(pokoruru.tapped,true);
});
