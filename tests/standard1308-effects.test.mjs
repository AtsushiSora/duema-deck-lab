import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const NELZA='dmex18-013',IMEN='dmex08-016',SKULL='dm24-094',CRISDO='dmex18-s05';
const BASIC='dm01-108',BEAST='dmx13-004',EVO='dm02-s05',FISH='dm01-083';
const BRAIN='dm01-052',HAND='dm01-087',TEN='dmex15-b017',ELEVEN='dm24rp4-046';
const NATIVE='dmrp17-025',TWIN='dm22ex1-030',CAMBERO='dmrp19-005';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(30).fill(BASIC));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

test('six official prints resolve to three canonical cards with the same rules',()=>{
 const m=read('tools/support-phase-1308.json');
 const {prints}=read('tools/image-reference-prints.json');
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[NELZA,IMEN,SKULL]);
 assert.deepEqual(m.printAliases.map(c=>c.id),['dm24bd6-021','dmex13-019','dmex16-035']);
 for(const {id,canonicalId=id,name,image,source,faces,spec} of [...m.cards,...m.printAliases]){
  assert.deepEqual(spec,standardCardSpec({id,name,faces,status:'complete'},{phase:1308}));
  assert.deepEqual(prints.find(x=>x.id===id),{id,canonicalId,name,image,source});
  assert.deepEqual(registry.resolveRows([{id,count:1}]),[{id:canonicalId,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).map(x=>x.id),[canonicalId]);
  const c=e.card(canonicalId),f=faces[0];
  assert.deepEqual([c.type,c.cost,c.power,c.race,c.limit,e.manaValue(c)],
   [f.typeText==='呪文'?'spell':'creature',f.cost,Number(f.powerText),f.race,4,1]);
  for(const [key,value] of Object.entries(spec))assert.deepEqual(c[key],value);
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
 }
});

test('Nelza makes an EX Life shield, can attack immediately and breaks three shields',()=>{
 const s=field(),top=s.players[0].deck[0];
 cast(s,NELZA);
 const source=s.players[0].battle.find(x=>x.cardId===NELZA);
 assert.ok(e.exLifeShields(s,0,source).some(x=>x.uid===top.uid));
 attack(s,source.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 drain(s);
 assert.equal(s.players[1].shields.length,2);
});

test('Nelza can cast its own cost-ten spell for free and returns it to the deck bottom',()=>{
 const s=field(),nelza=add(s,0,'battle',NELZA),ten=add(s,0,'grave',TEN);
 const tooExpensive=add(s,0,'grave',ELEVEN),opponents=add(s,1,'grave',BRAIN);
 const paid=s.players[0].mana.filter(x=>x.tapped).length;
 attack(s,nelza.uid);
 assert.deepEqual(choices(s),[ten.uid,null]);
 pick(s,ten.uid);
 drain(s);
 assert.equal(s.players[0].deck.at(-1).uid,ten.uid);
 assert.ok(has(s,0,'grave',tooExpensive)&&has(s,1,'grave',opponents));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,paid);
});

test('Crisdo bars the lower-cost graveyard spell and leaves it in the grave (QA 40833)',()=>{
 const s=field(),nelza=add(s,0,'battle',NELZA),blocked=add(s,0,'grave',BRAIN),allowed=add(s,0,'grave',TEN);
 add(s,1,'battle',CRISDO);
 give(s,1,'hand',Array(5).fill(BASIC));
 attack(s,nelza.uid);
 assert.deepEqual(choices(s),[allowed.uid,null]);
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'grave',blocked)&&has(s,0,'grave',allowed));
});

for(const [shield,count,copies] of [[BASIC,1,1],[NATIVE,2,1],[BASIC,2,2],[TWIN,2,1]]){
 test('Nelza grants '+count+' G Strikes for '+shield+' with '+copies+' source(s)',()=>{
  let s=field();
  const attacker=add(s,0,'battle',BASIC);
  const targets=Array.from({length:count},()=>add(s,0,'battle',BASIC));
  give(s,1,'battle',Array(copies).fill(NELZA));
  give(s,1,'shields',[shield]);
  attack(s,attacker.uid);
  act(s,'noBlock');
  for(let i=0;i<count;i++){
   assert.equal(s.decision.task.op,'gsDeclare');
   pick(s,true);
  }
  s=JSON.parse(JSON.stringify(s));
  for(const target of targets){
   assert.equal(s.decision.task.op,'gsTarget');
   pick(s,target.uid);
   assert.equal(e.attackLocked(s,0,s.players[0].battle.find(x=>x.uid===target.uid)),true);
  }
  assert.equal(s.decision,null);
  assert.deepEqual(s.players[1].hand.map(x=>x.cardId),[shield]);
 });
}

test('Cambero triggers once per declared G Strike including Nelza’s grant (QA 40943)',()=>{
 const s=field(),attacker=add(s,0,'battle',BASIC);
 const first=add(s,0,'battle','dm01-079'),second=add(s,0,'battle','dm01-079');
 give(s,1,'battle',[NELZA]);
 give(s,1,'shields',[CAMBERO]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 for(let i=0;i<2;i++){
  assert.equal(s.decision.task.op,'gsDeclare');
  pick(s,true);
 }
 for(let i=0;i<2;i++){
  assert.equal(s.decision.task.op,'gsTarget');
  pick(s,null);
 }
 drain(s);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
});

test('Nelza grants G Strike when Lyla picks up her shield during battle',()=>{
 const s=field(),nelza=add(s,0,'battle',NELZA),target=add(s,1,'battle',BASIC);
 give(s,0,'shields',[BASIC]);
 give(s,0,'grave',[BRAIN]);
 const shield=s.players[0].shields[0];
 cast(s,'dm39-031');
 const lyla=s.players[0].battle.find(x=>x.cardId==='dm39-031');
 target.tapped=true;
 attack(s,lyla.uid,target.uid);
 act(s,'noBlock');
 pick(s,shield.uid);
 assert.equal(s.decision.task.op,'gsTarget');
 pick(s,target.uid);
 drain(s);
 assert.ok(has(s,0,'battle',nelza)&&has(s,0,'hand',shield));
});

test('Imen filters by race, creature and non-evolution, then fights with the deployed creature',()=>{
 const s=field(),beast=add(s,0,'hand',BEAST),enemy=add(s,1,'battle',FISH);
 add(s,0,'hand',EVO);
 add(s,0,'hand',FISH);
 cast(s,IMEN);
 assert.deepEqual(choices(s),[beast.uid]);
 pick(s,beast.uid);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 pick(s,enemy.uid);
 drain(s);
 assert.ok(has(s,0,'battle',beast)&&has(s,1,'grave',enemy));
});

test('Imen works as a shield trigger and the fight can be declined',()=>{
 const s=field(),attacker=add(s,0,'battle',BASIC),beast=add(s,1,'hand',BEAST);
 give(s,1,'shields',[IMEN]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===IMEN);
 pick(s,beast.uid);
 pick(s,null);
 drain(s);
 assert.ok(has(s,0,'battle',attacker)&&has(s,1,'battle',beast));
});

test('Imen may choose an enemy without an eligible Beast Folk but no battle occurs',()=>{
 const s=field(),target=add(s,1,'battle',FISH);
 add(s,0,'hand',FISH);
 cast(s,IMEN);
 assert.equal(s.decision.task.op,'g34_FightEnemy240');
 pick(s,target.uid);
 drain(s);
 assert.ok(has(s,1,'battle',target));
 assert.equal(s.players[0].battle.length,0);
});

test('Skull forces the opponent to choose and discard a hand card first (QA 35525)',()=>{
 const s=field(),hand=add(s,1,'hand',HAND),board=add(s,1,'battle',BASIC);
 cast(s,SKULL);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[hand.uid]);
 pick(s,hand.uid);
 drain(s);
 assert.ok(has(s,1,'grave',hand)&&has(s,1,'battle',board));
});

for(const mode of [0,1])test('Skull’s empty-hand fallback is chosen by the opponent: mode '+mode,()=>{
 const s=field(),own=add(s,0,'battle',BASIC),enemy=add(s,1,'battle',BASIC);
 give(s,1,'mana',[FISH,BRAIN]);
 const mana=s.players[1].mana[1];
 cast(s,SKULL);
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[0,1]);
 pick(s,mode);
 assert.equal(s.decision.player,1);
 if(mode===0)assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,mode===0?enemy.uid:mana.uid);
 drain(s);
 assert.ok(has(s,0,'battle',own)&&has(s,1,'grave',mode===0?enemy:mana));
});
