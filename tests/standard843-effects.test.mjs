import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const FATHER='dmr02-005',MAMORU='dmr03-021',WORM='dmr02-041';
const LAND='dm01-108',DARK='dm01-090',FIRE='dm01-097',ALIEN='dmr02-054';
const BIG='dm10-006',GENMU='dmrp15-km1',FUUJIN='dmrp22-037',HAND='dm01-027';
const JENNY='dm16-044',VICE='promoy5-013',LOST='dm02-029',JAO='dm24rp4-DM1';
const field=(active=0)=>Object.assign(setup(),{active});
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

test('Phase 843 verifies the official faces and preserves each unique original ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-843.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[FATHER,MAMORU,WORM]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id);
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:843}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  const [face]=row.faces;
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations],[face.cost,parseInt(face.powerText||'0',10),face.race,face.civilizations]);
  assert.equal(c.limit,4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  assert.deepEqual(snapshot.cards.filter(x=>x.name===c.name).map(x=>x.id),[row.id]);
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:843}));
 }
});

test('Father grants haste and Slayer only to its other Aliens while it remains in battle',()=>{
 const s=field(),father=play(s,FATHER),ally=play(s,ALIEN),other=play(s,LAND);
 const enemy=put(s,1,'battle',ALIEN);
 for(const unit of [father,other,enemy]){
  assert.ok(!e.effectiveCard(unit,s).speedAttacker);
  assert.ok(!e.effectiveCard(unit,s).slayer);
 }
 assert.ok(e.effectiveCard(ally,s).speedAttacker&&e.effectiveCard(ally,s).slayer);
 const big=put(s,1,'battle',BIG,{tapped:true});
 attack(s,ally.uid,big.uid);drain(s);
 assert.ok(has(s,0,'grave',ally)&&has(s,1,'grave',big));
 s.active=1;s.phase='main';
 play(s,HAND);act(s,'effect',a=>a.targets.some(t=>t.uid===father.uid));drain(s);
 const later=put(s,0,'battle',ALIEN,{entered:s.turn});
 assert.ok(!e.effectiveCard(later,s).speedAttacker&&!e.effectiveCard(later,s).slayer);
});

test('Father enters mana tapped when charged',()=>{
 const s=field(),father=put(s,0,'hand',FATHER);
 s.phase='charge';act(s,'charge',a=>a.uid===father.uid);
 assert.ok(has(s,0,'mana',father)&&father.tapped);
});

for(const accept of [true,false])test('Father may replace an opponent spell discard chosen by its owner '+accept+' (QA36368)',()=>{
 let s=field(),father=put(s,1,'hand',FATHER),other=put(s,1,'hand',LAND);
 play(s,VICE);
 pick(s,father.uid);pick(s,other.uid);
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.title.includes('マナゾーン'));s=restore(s);
 pick(s,accept);drain(s);
 assert.equal(has(s,1,'mana',father),accept);
 assert.equal(has(s,1,'grave',father),!accept);
 if(accept)assert.ok(s.players[1].mana.find(x=>x.uid===father.uid).tapped);
 assert.ok(has(s,1,'grave',other));
 assert.ok(!has(s,1,'battle',father));
});

test('Father may replace discards caused by a creature and a full-hand spell',()=>{
 for(const id of [JENNY,LOST]){
  const s=field(),father=put(s,1,'hand',FATHER);
  play(s,id);
  if(id===JENNY)pick(s,father.uid);
  assert.ok(s.decision.title.includes('マナゾーン'));
  pick(s,true);drain(s);
  assert.ok(has(s,1,'mana',father)&&father.tapped&&!s.players[1].discardedThisTurn);
 }
});

test('Father may replace a discard planned by Jao before the simultaneous removals',()=>{
 let s=field(),father=put(s,1,'hand',FATHER);
 const keep=[put(s,1,'hand',LAND).uid,put(s,1,'hand',DARK).uid];
 give(s,1,'shields',[LAND,LAND,LAND]);
 play(s,JAO);
 for(const uid of keep)pick(s,uid);
 assert.equal(s.decision.task.op,'g394_DiscardPlans');
 assert.ok(s.decision.title.includes('マナ'));s=restore(s);
 pick(s,father.uid);drain(s);
 assert.ok(has(s,1,'mana',father)&&s.players[1].mana.find(x=>x.uid===father.uid).tapped);
 assert.deepEqual(s.players[1].hand.map(x=>x.uid),keep);
});

test('Father cannot replace a discard caused by an opponent Tamaseed',()=>{
 const s=field(),father=put(s,1,'hand',FATHER);
 play(s,'dmsd21-011');
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'grave',father)&&!has(s,1,'mana',father));
});

test('Father cannot replace its owners own discard',()=>{
 const s=field(),father=put(s,0,'hand',FATHER);
 put(s,0,'battle','dm39-009');
 s.phase='attack';act(s,'endTurn');pick(s,father.uid);
 assert.equal(s.decision.task.op,'g61_Clock');
 assert.ok(has(s,0,'grave',father));
 assert.ok(!has(s,0,'mana',father));
});

for(const [id,accept] of [[DARK,true],[FIRE,false],[FATHER,true],[LAND,false]])test('Mamoru shields a non-evolution creature and offers draw for dark or fire '+id,()=>{
 const s=field(),target=put(s,0,'battle',id),evolution=put(s,0,'battle','dm32-073');
 const opponent=put(s,1,'battle',DARK),top=s.players[0].deck[0];
 const spell=play(s,MAMORU);
 assert.deepEqual(values(s),[target.uid]);pick(s,target.uid);
 const shield=s.players[0].shields.find(x=>x.uid===target.uid);
 assert.ok(shield&&!shield.faceUp);
 assert.ok(has(s,0,'battle',evolution)&&has(s,1,'battle',opponent));
 if(id!==LAND){
  assert.equal(s.decision.task.op,'g34_Draw');
  pick(s,accept?1:0);
 }else assert.equal(s.decision,null);
 assert.equal(has(s,0,'hand',top),accept);
 assert.ok(has(s,0,'grave',spell));
});

test('Mamoru still resolves as a Shield Trigger during an opposing attack',()=>{
 const s=field(1),target=put(s,0,'battle',DARK),enemy=put(s,1,'battle',LAND);
 give(s,0,'shields',[MAMORU]);const spell=s.players[0].shields[0];
 attack(s,enemy.uid);act(s,'noBlock');
 act(s,'useTrigger',a=>a.uid===spell.uid);pick(s,target.uid);pick(s,0);drain(s);
 assert.ok(has(s,0,'shields',target)&&has(s,0,'grave',spell));
 assert.equal(s.metrics[0].triggers,1);
});

test('Mamoru offers no draw if the shield placement is prohibited',()=>{
 const s=field(),target=put(s,0,'battle',DARK);
 put(s,1,'battle',FUUJIN);
 const spell=play(s,MAMORU);pick(s,target.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'battle',target)&&!has(s,0,'shields',target));
 assert.ok(has(s,0,'grave',spell));
});

test('Rose Worm counts itself and allied tapped creatures, and zero power destroys the target',()=>{
 let s=field(),worm=put(s,0,'battle',WORM);
 put(s,0,'battle',ALIEN,{tapped:true});
 const sealed=put(s,0,'battle',DARK,{tapped:true,sealed:true});
 s.players[0].seals.push({...inst(LAND),sealOf:sealed.uid,faceDown:true});
 put(s,0,'battle',LAND);
 const small=put(s,1,'battle',DARK),big=put(s,1,'battle',BIG,{tapped:true});
 attack(s,worm.uid);
 assert.deepEqual(new Set(values(s)),new Set([small.uid,big.uid]));
 assert.equal(s.decision.task.power,-2000);s=restore(s);
 pick(s,small.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'grave',small)&&has(s,1,'battle',big));
});

test('Rose Worm changes only the chosen creature until the turn ends',()=>{
 const s=field(),worm=put(s,0,'battle',WORM);
 const big=put(s,1,'battle',BIG),other=put(s,1,'battle',LAND);
 attack(s,worm.uid);
 assert.equal(s.decision.task.power,-1000);
 pick(s,big.uid);act(s,'noBlock');drain(s);
 assert.equal(e.power(big,false,s),e.card(BIG).power-1000);
 assert.equal(e.power(other,false,s),e.card(LAND).power);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.power(big,false,s),e.card(BIG).power);
});

test('Rose Worm does not lower power when its attack ability is ignored',()=>{
 const s=field(),worm=put(s,0,'battle',WORM),big=put(s,1,'battle',GENMU);
 attack(s,worm.uid);act(s,'noBlock');drain(s);
 assert.equal(e.power(big,false,s),Infinity);
});
