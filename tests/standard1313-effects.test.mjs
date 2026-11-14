import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const SINGER='dmrp03-048',ELEVEN='dm38-s01',SAVE='dmbd06-002',TWIN='dm25ex1-021';
const BASIC='dm01-108',WATER='dm01-083',WATER_BLOCK='dm01-084',DARK_BLOCK='dm01-089',WATER_EVOLUTION='dm10-017';
const STACK_RECOVERY='dmrp01-023',SPOON='dm22rp1-062',BREAKER='promoy4-002',SHIELD_GO='dmr11-025';
const read=f=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url)));
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(25).fill(BASIC));
 return s;
}
function add(s,p,z,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function breakShields(s,attacker,ids){
 attack(s,attacker.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>ids.every(id=>a.shields.includes(id)));
}
function order(s,op){
 if(s.decision?.type==='effectOrder'){
  const item=s.pendingEffects.find(x=>x.effect===op||x.task?.defs?.some(d=>d.op===op)||x.task?.op===op);
  assert.ok(item,JSON.stringify(s.pendingEffects));
  act(s,'orderEffect',a=>a.effectId===item.effectId);
 }
}

test('five official prints resolve to three unique playable names and the twin remains separate',()=>{
 const m=read('tools/support-phase-1313.json'),registry=createCatalogue(snapshot,data.cards,details);
 const {prints}=read('tools/image-reference-prints.json');
 assert.deepEqual(m.cards.map(c=>c.id),[SINGER,ELEVEN,SAVE]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dmex08-269','dm23ex3-TF04']);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual(standardCardSpec({id,name,faces,status:'complete'},{phase:1313}),spec);
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.limit,e.manaValue(c)],
   [f.cost,Number(f.powerText),f.race,f.civilizations,4,1]);
  for(const [key,v]of Object.entries(spec))assert.deepEqual(c[key],v);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
 assert.ok(registry.get(TWIN).spellFace);
 assert.equal(registry.get(ELEVEN).spellFace,undefined);
});

for(const accept of [true,false])test('Singer can deploy after two opposing shields reach hand this turn and can decline '+accept,()=>{
 let s=field(),attacker=add(s,0,'battle',BREAKER),singer=add(s,0,'hand',SINGER);
 const targets=s.players[1].shields.slice(0,2);
 breakShields(s,attacker,targets.map(x=>x.uid));
 assert.ok(targets.every(x=>has(s,1,'hand',x)));
 assert.equal(s.g1313ShieldHand?.count,2);
 const before=s.players[0].mana.filter(x=>x.tapped).length;
 end(s);
 assert.equal(s.decision?.task?.source,SINGER);
 s=JSON.parse(JSON.stringify(s));
 pick(s,accept?true:null);
 drain(s);
 assert.equal(has(s,0,'battle',singer),accept);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,before);
});

test('Singer counts whole shields taken by an effect, including a stacked shield once',()=>{
 const s=field(),singer=add(s,0,'hand',SINGER);
 const [root,second]=s.players[0].shields;
 const child=inst(BASIC);
 root.shieldStack=[child];
 cast(s,STACK_RECOVERY);
 pick(s,root.uid);
 pick(s,second.uid);
 assert.deepEqual(s.g1313ShieldHand,{turn:s.turn,count:2});
 assert.ok(has(s,0,'hand',child));
 end(s);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'battle',singer));
});

test('Singer does not count a physical card lifted from a surviving shield group',()=>{
 const s=field(),singer=add(s,0,'hand',SINGER);
 const root=s.players[0].shields[0],child=inst(BASIC);
 root.shieldStack=[child];
 cast(s,SPOON);
 pick(s,child.uid);
 assert.ok(has(s,0,'shields',root)&&has(s,0,'hand',child));
 assert.equal(s.g1313ShieldHand,undefined);
 end(s);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'hand',singer));
});

test('Singer excludes a shield sent to grave and shields moved on a previous turn',()=>{
 const s=field(),singer=add(s,0,'hand',SINGER),attacker=add(s,0,'battle',BREAKER);
 give(s,1,'shields',[BASIC,SHIELD_GO]);
 s.players[1].shields[1].faceUp=true;
 breakShields(s,attacker,s.players[1].shields.map(x=>x.uid));
 assert.equal(s.g1313ShieldHand?.count,1);
 end(s);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'hand',singer));
 assert.equal(s.active,1);
 assert.equal(s.decision,null);
 end(s);
 drain(s);
 assert.equal(s.active,0);
 end(s);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'hand',singer));
});

for(const n of [9,10])test('Eleven includes itself in the count of own water creatures '+n,()=>{
 const s=field();
 for(let i=0;i<n;i++)add(s,0,'battle',WATER);
 add(s,0,'battle',BASIC);
 add(s,1,'battle',WATER);
 cast(s,ELEVEN);
 assert.equal(s.winner,n===10?0:null);
 if(n===10)assert.match(s.reason,/イレブン/);
});

test('Eleven also wins when the eleventh water creature enters during the opponent’s turn',()=>{
 const s=field(),attacker=add(s,0,'battle',BASIC);
 add(s,1,'battle',ELEVEN);
 for(let i=0;i<9;i++)add(s,1,'battle',WATER);
 give(s,1,'shields',['dm05-024']);
 breakShields(s,attacker,[s.players[1].shields[0].uid]);
 act(s,'useTrigger');
 assert.equal(s.winner,1);
});

test('Eleven wins before a continuous penalty can destroy the eleventh water creature (QA36173)',()=>{
 const s=field(),attacker=add(s,0,'battle','dmx07-003');
 add(s,1,'battle',ELEVEN);
 for(let i=0;i<9;i++)add(s,1,'battle',i%2===0?'dm01-090':'dm01-075');
 give(s,1,'shields',['dm24-047']);
 breakShields(s,attacker,[s.players[1].shields[0].uid]);
 assert.equal(s.winner,null);
 act(s,'useTrigger');
 assert.equal(s.winner,1);
 assert.match(s.reason,/イレブン/);
});

test('Save the Date summons into an independent draw and lets any civilization’s non-evolution blockers enter',()=>{
 const s=field(),water=add(s,0,'hand',WATER_BLOCK),dark=add(s,0,'hand',DARK_BLOCK);
 const normal=add(s,0,'hand',BASIC),evo=add(s,0,'hand',WATER_EVOLUTION);
 s.players[0].battle.push(inst(WATER_BLOCK));
 const top=s.players[0].deck.slice(0,3);
 cast(s,SAVE);
 order(s,'entry');
 assert.ok(s.decision.choices.some(c=>value(c)===water.uid));
 assert.ok(s.decision.choices.some(c=>value(c)===dark.uid));
 assert.ok(s.decision.choices.every(c=>![evo.uid,normal.uid].includes(value(c))));
 pick(s,water.uid);
 pick(s,dark.uid);
 for(let i=0;i<3;i++){
  order(s,'Draw');
  assert.equal(s.decision?.task?.source,SAVE);
  pick(s,1);
 }
 assert.ok(top.every(x=>has(s,0,'hand',x)));
 assert.ok(has(s,0,'battle',water)&&has(s,0,'battle',dark));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,10);
});

test('Save the Date deployed without summoning draws for itself but does not offer deployment',()=>{
 const s=field(),save=add(s,0,'hand',SAVE),other=add(s,0,'hand',WATER_BLOCK);
 s.extTasks=[{op:'g34_Put',p:0,source:SAVE,origin:'hand',target:save.uid}];
 act(s,'toAttack');
 assert.ok(has(s,0,'battle',save));
 assert.equal(s.decision?.task?.op,'g34_Draw');
 pick(s,0);
 assert.ok(has(s,0,'hand',other));
 assert.equal(s.decision,null);
});

test('Save the Date draws for friendly blockers and not for enemy blockers or friendly non-blockers',()=>{
 const s=field();
 add(s,0,'battle',SAVE);
 s.active=1;
 cast(s,DARK_BLOCK);
 assert.equal(s.decision,null);
 s.active=0;
 cast(s,BASIC);
 assert.equal(s.decision,null);
 cast(s,WATER_BLOCK);
 assert.equal(s.decision?.task?.source,SAVE);
 pick(s,1);
});
