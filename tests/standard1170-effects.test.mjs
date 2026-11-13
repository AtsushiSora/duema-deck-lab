import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const BERAND='dm26ex4-076',MANBOBO='dmrp04s-065',LEO='promoy11-058';
const FIRE='dm01-097',NATURE='dm01-108',ANGEL='dm01-s01',BLOCKER='dm01-076';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
function field(){
 const s=setup();
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(NATURE));
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function pick(s,value){
 act(s,'extended',a=>{
  const v=s.decision.choices[a.choice].value;
  return (v?.uid??v)===value;
 });
}
function invoke(s,p,def){
 s.extTasks=[{p,source:FIRE,...def}];
 s.phase='main';
 act(s,'toAttack');
}
function move(s,p,x,to='grave'){
 invoke(s,p,{op:'g34_ExactMove',owner:p,target:x.uid,to});
}
function destroyAll(s){
 invoke(s,s.active,{op:'g34_Sweep',both:true,to:'grave',filter:{creature:true}});
}
const choices=s=>s.decision?.choices?.map(x=>x.value);

test('phase 1170 verifies the three full definitions, images and canonical IDs',()=>{
 const m=read('tools/support-phase-1170.json'),registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[BERAND,MANBOBO,LEO]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,f=row.faces[0],c=e.card(id),d=details.cards.find(x=>x.id===id);
  assert.deepEqual(d.faces,row.faces);
  assert.deepEqual(standardCardSpec(d,{phase:1170}),row.spec);
  assert.deepEqual([c.type,c.cost,c.civilizations,c.race,c.power,c.manaValue,c.limit],
   [id===BERAND?'field':'creature',f.cost,f.civilizations,f.race,Number(f.powerText),1,4]);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  if(id===LEO){
   assert.equal(row.errata.source,row.image);
   assert.match(c.text,/W・ブレイカー/);
   assert.equal(c.breaker,2);
  }
  assert.equal(registry.get(id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.ok(read('tools/image-reference-prints.json').prints.some(x=>x.id===id&&x.image===row.image));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'\n未知の能力。'}]},{phase:1170}));
 }
});

test('Berand deploys as a field and each mode can be chosen once during simultaneous deaths',()=>{
 let s=field();
 const own=s.players[0],enemy=s.players[1],top=own.deck[0];
 const a=put(s,1,'hand',FIRE),b=put(s,1,'hand',ANGEL);
 const d2=put(s,0,'battle','dmr21-033');
 cast(s,BERAND);
 const berand=own.battle.find(x=>x.cardId===BERAND);
 assert.ok(berand&&!e.isCreature(s,berand)&&own.battle.includes(d2));
 assert.equal(own.mana.filter(x=>x.tapped).length,2);
 for(let i=0;i<3;i++)put(s,0,'battle',FIRE);
 put(s,1,'battle',FIRE);
 destroyAll(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.cardId===BERAND||a.source===BERAND||a.label.includes(e.card(BERAND).name));
 assert.deepEqual(choices(s),[0,1]);
 pick(s,1);
 assert.equal(s.decision.task.op,'g34_BlindDiscard773');
 assert.ok(s.decision.choices.every(o=>!o.cardId&&o.label.startsWith('裏向き')));
 pick(s,1);
 assert.ok(enemy.grave.includes(b));
 assert.ok(enemy.hand.includes(a));
 s=JSON.parse(JSON.stringify(s));
 act(s,'orderEffect');
 assert.deepEqual(choices(s),[0]);
 pick(s,0);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].mana.at(-1).uid,top.uid);
 assert.ok(s.players[0].battle.some(x=>x.uid===berand.uid));
 assert.equal(s.players[0].grave.length,3);
});

test('Berand choices are independent per copy and reset at the next turn even if a mode had no target',()=>{
 const s=field();
 cast(s,BERAND);
 cast(s,BERAND);
 const copy=s.players[0].battle.find(x=>x.cardId===BERAND);
 move(s,0,put(s,0,'battle',FIRE));
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 pick(s,1);
 assert.deepEqual(choices(s),[0,1]);
 pick(s,1);
 move(s,0,put(s,0,'battle',FIRE));
 act(s,'orderEffect');
 assert.deepEqual(choices(s),[0]);
 pick(s,0);
 assert.deepEqual(choices(s),[0]);
 pick(s,0);
 assert.equal(s.decision,null);
 act(s,'endTurn');
 assert.equal(s.active,1);
 move(s,0,put(s,0,'battle',FIRE));
 act(s,'orderEffect');
 assert.equal(s.decision.player,0);
 assert.deepEqual(choices(s),[0,1]);
 assert.ok(s.players[0].battle.includes(copy));
});

test('Berand does not trigger for opposing destruction, a bounce, or an ignored field',()=>{
 const s=field(),own=s.players[0];
 cast(s,BERAND);
 const [source]=own.battle;
 move(s,1,put(s,1,'battle',FIRE));
 assert.equal(s.decision,null);
 move(s,0,put(s,0,'battle',FIRE),'hand');
 assert.equal(s.decision,null);
 source.g35Ignored=s.turn;
 move(s,0,put(s,0,'battle',FIRE));
 assert.equal(s.decision,null);
});

test('Berand leaving in the same sweep cannot watch another card leave',()=>{
 const s=field(),own=s.players[0];
 cast(s,BERAND);
 put(s,0,'battle',FIRE);
 invoke(s,0,{op:'g34_Sweep',both:true,to:'grave',filter:{element:true}});
 assert.deepEqual(own.grave.map(x=>x.cardId).sort(),[FIRE,BERAND].sort());
 assert.equal(own.deck.length,20);
 assert.equal(s.decision,null);
});

test('Manbobo gains unblockable from a discard and loses it on the next turn',()=>{
 const s=field(),source=put(s,0,'battle',MANBOBO),payment=put(s,0,'hand',FIRE);
 put(s,1,'battle',BLOCKER);
 assert.equal(e.effectiveCard(source,s).unblockable,undefined);
 invoke(s,0,{op:'g34_Discard',owner:'self',n:1});
 pick(s,payment.uid);
 assert.ok(s.players[0].grave.includes(payment));
 assert.equal(e.effectiveCard(source,s).unblockable,true);
 attack(s,source.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 drain(s);
 act(s,'endTurn');
 assert.equal(e.effectiveCard(source,s).unblockable,undefined);
});

test('Manbobo keeps its printed blocker, and an opposing discard does not grant it unblockable',()=>{
 const s=field(),source=put(s,1,'battle',MANBOBO),payment=put(s,0,'hand',FIRE);
 invoke(s,0,{op:'g34_Discard',owner:'self',n:1});
 pick(s,payment.uid);
 assert.equal(e.effectiveCard(source,s).unblockable,undefined);
 attack(s,put(s,0,'battle',FIRE).uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===source.uid));
});

test('Manbobo does not gain unblockable when the discarded card goes to mana instead',()=>{
 const s=field(),source=put(s,0,'battle',MANBOBO);
 const replacement=put(s,0,'hand','dmr02-005');
 s.active=1;
 cast(s,'dm02-029');
 pick(s,true);
 drain(s);
 assert.ok(s.players[0].mana.includes(replacement));
 assert.ok(!s.players[0].grave.includes(replacement));
 assert.equal(e.effectiveCard(source,s).unblockable,undefined);
});

test('Leo offers one optional draw for each other allied Angel Command, including another Leo',()=>{
 const s=field(),own=s.players[0];
 own.mana.push(...Array.from({length:20},()=>inst('dm01-075')));
 cast(s,LEO);
 assert.equal(s.decision,null);
 assert.ok(e.effectiveCard(own.battle[0],s).blocker);
 cast(s,FIRE);
 assert.equal(s.decision,null);
 s.active=1;
 cast(s,ANGEL);
 assert.equal(s.decision,null);
 s.active=0;
 cast(s,LEO);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 assert.equal(own.hand.length,0);
 const drawn=own.deck.slice(0,2);
 cast(s,ANGEL);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect');
 pick(s,1);
 pick(s,1);
 assert.deepEqual(own.hand,drawn);
 assert.equal(s.decision,null);
});

test('Leo breaks two shields as indicated on the official card image',()=>{
 const s=field(),leo=put(s,0,'battle',LEO);
 give(s,1,'shields',[FIRE,FIRE]);
 attack(s,leo.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===2);
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[1].hand.length,2);
});
