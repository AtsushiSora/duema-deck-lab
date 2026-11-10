import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const STEINER='dm37-011',SHIRANUI='dm39-033',ANTARES='dm39-012';
const LAND='dm01-108',FIRE='dm01-097',SPELL='dm01-086',TWIN='dm24bd4-007';
const BOUNDARY='dmx22b-007',OVER='dm38-019',CUBE='dmr09-039',SEED='dm22ex1-086';
const TRIGGER='dm36-073',EVO='dm02-033';
function put(s,p,z,id){
 const x=inst(id);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function end(s){s.phase='attack';act(s,'endTurn');}
function deploy(s,p,...rows){
 s.phase='main';
 s.extTasks=rows.map(x=>({op:'g34_Put',source:STEINER,p,target:x.uid,origin:'hand',execution:false}));
 act(s,'toAttack');
}

test('Phase 835 pins the three complete official definitions and unique names',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-835.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[STEINER,SHIRANUI,ANTARES]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:835}),row.spec);
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],[f.name,f.cost,Number(f.powerText),f.race,1,4]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:835}));
 }
});

for(const target of [BOUNDARY,TWIN,null])test('Steiner may revive a creature up to 7000 after summoning '+target,()=>{
 let s=setup();
 give(s,0,'grave',[BOUNDARY,OVER,TWIN,SPELL]);
 const [at,above,twin,spell]=s.players[0].grave;
 cast(s,STEINER);
 assert.deepEqual(choices(s),[at.uid,twin.uid,null]);
 const before=physical(s);
 s=JSON.parse(JSON.stringify(s));
 const chosen=target===BOUNDARY?at:target===TWIN?twin:null;
 pick(s,chosen?.uid??null);
 drain(s);
 if(chosen)assert.ok(has(s,0,'battle',chosen));
 assert.ok(has(s,0,'grave',above)&&has(s,0,'grave',spell));
 assert.equal(s.players[0].grave.length,chosen?3:4);
 assert.deepEqual(physical(s),before);
});

test('Steiner placed by Mystery Cube has no summon trigger and still breaks two shields',()=>{
 const s=setup();
 give(s,0,'deck',[STEINER,LAND,LAND]);
 const recruit=put(s,0,'grave',BOUNDARY),steiner=s.players[0].deck[0];
 cast(s,CUBE);drain(s);
 assert.ok(has(s,0,'battle',steiner)&&has(s,0,'grave',recruit));
 steiner.entered=0;attack(s,steiner.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Steiner cannot revive through a graveyard move lock',()=>{
 const s=setup();put(s,1,'battle','dmrp22-042');
 const recruit=put(s,0,'grave',BOUNDARY);
 cast(s,STEINER);assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',recruit));
});

test('Shiranui stacks three attack boosts and breaks four shields on its own turn',()=>{
 const s=setup(),shiranui=put(s,0,'battle',SHIRANUI);
 deploy(s,0,...[LAND,LAND,LAND].map(id=>put(s,0,'hand',id)));drain(s);
 assert.equal(e.power(shiranui,false,s),4000);
 assert.equal(e.power(shiranui,true,s),22000);
 attack(s,shiranui.uid);drain(s);
 assert.equal(s.players[1].shields.length,1);
 end(s);drain(s);
 assert.equal(e.power(shiranui,true,s),4000);
});

test('Shiranui counts an opposing Shield Trigger creature on its turn',()=>{
 const s=setup(),shiranui=put(s,0,'battle',SHIRANUI),attacker=put(s,0,'battle',LAND);
 give(s,1,'shields',[TRIGGER]);
 const trigger=s.players[1].shields[0];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(has(s,1,'battle',trigger));
 assert.equal(e.power(shiranui,true,s),10000);
});

test('Shiranui ignores its own entry and entries on the opposing turn',()=>{
 const s=setup();
 cast(s,SHIRANUI);drain(s);
 const shiranui=s.players[0].battle[0];
 assert.equal(e.power(shiranui,true,s),4000);
 end(s);drain(s);
 deploy(s,1,put(s,1,'hand',FIRE));drain(s);
 assert.equal(e.power(shiranui,true,s),4000);
});

test('Shiranui counts one evolution entry even with a base underneath',()=>{
 const s=setup(),shiranui=put(s,0,'battle',SHIRANUI),base=put(s,0,'battle',LAND);
 cast(s,EVO);act(s,'evolve',a=>a.baseUid===base.uid);drain(s);
 assert.equal(e.power(shiranui,true,s),10000);
});

test('Antares uses only the creature half cost and destroys only a cheaper opposing creature',()=>{
 let s=setup();put(s,0,'battle',ANTARES);
 const own=put(s,0,'battle',LAND),discard=put(s,0,'hand',TWIN);
 const spell=put(s,0,'hand',SPELL),low=put(s,1,'battle',FIRE);
 const equal=put(s,1,'battle',TWIN),seed=put(s,1,'battle',SEED);
 end(s);assert.deepEqual(choices(s),[discard.uid,null]);
 const before=physical(s);
 pick(s,discard.uid);s=JSON.parse(JSON.stringify(s));
 assert.deepEqual(choices(s),[low.uid]);pick(s,low.uid);drain(s);
 assert.ok(has(s,0,'grave',discard)&&has(s,1,'grave',low));
 assert.ok(has(s,0,'hand',spell)&&has(s,0,'battle',own)&&has(s,1,'battle',equal)&&has(s,1,'battle',seed));
 assert.deepEqual(physical(s),before);
});

for(const mode of ['decline','opponent-turn','no-target'])test('Antares handles '+mode,()=>{
 const s=setup();put(s,0,'battle',ANTARES);
 const card=put(s,0,'hand',LAND);
 const equal=put(s,1,'battle',FIRE);
 if(mode==='opponent-turn')s.active=1;
 end(s);
 if(mode!=='opponent-turn')pick(s,mode==='decline'?null:card.uid);
 assert.equal(s.decision,null);
 assert.equal(has(s,0,'grave',card),mode==='no-target');
 assert.ok(has(s,1,'battle',equal));
});
