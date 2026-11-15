import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const ZIEG='dmrp16-s01',NELZA='dmex18-013',PARANORMAL='dmr10-013',SPIRAL='dm01-086';
const RAIL='dmd09-007',FIRE='dm01-097',DOKINDAM='dmr19-fl01';
const add=(s,p,z,id,props={})=>{const x=Object.assign(inst(id),props);s.players[p][z].push(x);return x;};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>{
 const choice=s.decision.choices[a.choice].value;
 return (choice?.uid??choice)===value;
});

test('Zieg has one official print with the canonical ID and both printed combat stats',()=>{
 const {cards:[row],printAliases}=JSON.parse(readFileSync(new URL('../tools/support-phase-1343.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details),c=e.card(ZIEG);
 assert.equal(row.id,ZIEG);
 assert.deepEqual(printAliases,[]);
 assert.deepEqual(registry.resolveRows([{id:ZIEG,count:1}]),[{id:ZIEG,count:1}]);
 assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[ZIEG]);
 assert.deepEqual([c.cost,c.power,c.race,c.civ,c.limit,c.breaker,c.blocker],[7,11000,'バーサーカー・ドラゴン/暴拳王国','光',4,2,true]);
 assert.equal(CARD_IMAGES[ZIEG],row.image);
});

test('face-up Paranormals leave Zieg untouched when it enters (QA39110)',()=>{
 const s=setup();
 give(s,1,'shields',Array(4).fill(PARANORMAL));
 for(const x of s.players[1].shields)x.faceUp=true;
 cast(s,ZIEG);
 const zieg=s.players[0].battle.find(x=>x.cardId===ZIEG);
 assert.ok(zieg);
 assert.equal(e.power(zieg,false,s),11000);
 zieg.g35Ignored=s.turn;
 assert.equal(e.power(zieg,false,s),-1000);
});

for(const faceUp of [true,false]){
 test('Nelza retains G Strike and Zieg restricts Spell Trigger on a '+(faceUp?'face-up':'face-down')+' shield (QA40941)',()=>{
  const s=setup(),attacker=add(s,0,'battle',RAIL);
  add(s,0,'battle',ZIEG);add(s,1,'battle',NELZA);
  const target=add(s,1,'battle',FIRE);
  give(s,1,'shields',[SPIRAL]);
  const shield=s.players[1].shields[0];
  shield.faceUp=faceUp;
  s.phase='attack';
  act(s,'attack',a=>a.uid===attacker.uid&&a.shield===shield.uid);
  pick(s,target.uid);
  act(s,'noBlock');
  assert.deepEqual(s.triggers.undeclared,faceUp?[]:[shield.uid]);
  assert.deepEqual(s.triggers.gsUndeclared,[shield.uid]);
  assert.ok(has(s,1,'hand',shield));
  if(faceUp){
   assert.equal(s.decision.task.op,'gsDeclare');
   pick(s,true);
   assert.equal(s.decision.task.op,'gsTarget');
   pick(s,attacker.uid);
   assert.ok(e.attackLocked(s,0,attacker));
  }
 });
}

test('the first attack shields an opposing creature face up for its owner',()=>{
 const s=setup(),zieg=add(s,0,'battle',ZIEG),second=add(s,0,'battle',RAIL);
 const chosen=add(s,1,'battle',FIRE),untouched=add(s,1,'battle',FIRE);
 attack(s,zieg.uid);
 assert.equal(s.decision.task.op,'g34_Target');
 pick(s,chosen.uid);
 assert.equal(s.players[1].shields.find(x=>x.uid===chosen.uid)?.faceUp,true);
 act(s,'noBlock');drain(s);
 attack(s,second.uid);
 assert.notEqual(s.decision?.task?.op,'g34_Target');
 assert.ok(has(s,1,'battle',untouched));
});

test('a released Dokindam remains in a face-up shield until Zieg leaves (QA39113)',()=>{
 const s=setup();
 s.format='advance';
 const zieg=add(s,0,'battle',ZIEG),attacker=add(s,0,'battle',RAIL);
 const dokindam=add(s,1,'battle',DOKINDAM,{cardOwner:1,startFlipped:true});
 attack(s,attacker.uid);
 pick(s,dokindam.uid);
 assert.equal(s.winner,null);
 assert.equal(s.players[1].shields.find(x=>x.uid===dokindam.uid)?.faceUp,true);
 if(s.decision?.type==='block')act(s,'noBlock');
 drain(s);
 assert.equal(s.winner,null);
 s.phase='main';
 cast(s,SPIRAL);
 act(s,'effect',a=>a.targets[0]?.uid===zieg.uid);
 drain(s);
 assert.equal(s.winner,0);
});
