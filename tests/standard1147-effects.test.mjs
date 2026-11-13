import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SHIDEN='dm26rp1-005',PALLAS='dm26rp2-038',BAKI='dmex17-071';
const N='dm01-108',F='dm01-097',W='dm01-083',HAND='dm01-027';
function field(){
 const s=setup();
 for(const p of [0,1]){give(s,p,'deck',Array(16).fill(N));give(s,p,'grave',[]);}
 return s;
}
function add(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const values=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>values(s)[a.choice]===v);
const play=(s,x,face=0)=>act(s,'play',a=>a.uid===x.uid&&(a.face??0)===face);
function charge(s,id){
 s.phase='charge';
 const x=add(s,s.active,'hand',id);
 act(s,'charge',a=>a.uid===x.uid);
 return x;
}
function end(s){s.phase='attack';act(s,'endTurn');}

test('three canonical cards and two Baki reprints retain their official faces, images and deck limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1147.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[SHIDEN,PALLAS,BAKI]);
 assert.deepEqual(m.printAliases.map(x=>x.id),['dm23bd4-040','dm23bd6-040']);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1147}),row.spec);
  assert.deepEqual(e.playFaces(c).map(f=>[f.name,f.cost,f.type,f.civilizations]),row.faces.map(f=>[
   f.name,f.cost,f.typeText==='呪文'?'spell':'creature',f.civilizations
  ]));
  assert.equal(c.power,Number.parseInt(row.faces[0].powerText));
  assert.equal(c.limit,4);
  assert.equal(c.manaValue,1);
  assert.equal(catalogue.get(row.id).id,id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,id);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Shiden chooses its entry state and doubles on each untap through the first attack only',()=>{
 const s=field(),x=add(s,0,'hand',SHIDEN);
 play(s,x);pick(s,true);
 assert.equal(x.tapped,true);
 assert.equal(e.power(x,false,s),4000);
 end(s);end(s);
 assert.equal(e.power(x,false,s),8000);
 assert.equal(x.tapped,false);
 attack(s,x.uid);act(s,'noBlock');act(s,'breakShields');
 assert.equal(s.players[1].shields.length,3);
 assert.equal(x.tapped,false);
 assert.equal(e.power(x,false,s),16000);
 const restored=JSON.parse(JSON.stringify(s));
 assert.equal(e.power(restored.players[0].battle[0],false,restored),16000);
 attack(s,x.uid);act(s,'noBlock');
 assert.equal(x.tapped,true);
 assert.equal(s.players[1].shields.length,0);
 end(s);
 assert.equal(e.power(x,false,s),4000);
});

test('Shiden applies minus 4000 before doubling in the royal heir ruling and can loot when leaving',()=>{
 for(const accept of [false,true]){
  const s=field(),own=s.players[0],x=add(s,0,'hand',SHIDEN);
  play(s,x);pick(s,true);end(s);end(s);
  const before=own.hand.slice(),expected=own.deck.slice(0,3);
  give(s,1,'shields',['dm25rp1-048',N]);
  const trigger=s.players[1].shields[0];
  attack(s,x.uid);act(s,'noBlock');
  act(s,'useTrigger',a=>a.uid===trigger.uid);
  pick(s,x.uid);
  assert.ok(own.grave.includes(x));
  assert.equal(s.decision.task.op,'g34_DiscardAll244');
  pick(s,accept?true:null);
  assert.deepEqual(own.hand,accept?expected:before);
  assert.equal(before.every(y=>own.grave.includes(y)),accept);
 }
});

test('Pallas can decline, selects only its own shields, and one use blocks its own Nature ramp trigger',()=>{
 const s=field(),own=s.players[0];
 add(s,0,'battle',PALLAS);add(s,1,'battle',PALLAS);
 give(s,0,'shields',[N,N]);give(s,1,'shields',[N,N]);
 charge(s,F);assert.equal(s.decision,null);
 charge(s,N);assert.deepEqual(values(s),[...own.shields.map(x=>x.uid),null]);pick(s,null);
 charge(s,N);
 const shield=own.shields[1];
 pick(s,shield.uid);
 assert.ok(own.mana.includes(shield));
 assert.equal(s.decision,null);
 charge(s,N);assert.equal(s.decision,null);
 end(s);end(s);
 charge(s,N);assert.equal(s.decision.task.op,'g34_ShieldToMana980');
});

test('Pallas observes simultaneous Nature mana on the opponent turn and each copy may move a shield',()=>{
 const s=field(),own=s.players[0];
 add(s,0,'battle',PALLAS);add(s,0,'battle',PALLAS);
 give(s,0,'shields',[N,N,N]);s.active=1;
 s.extTasks=[{op:'g34_Ramp',n:2,g809Together:true,p:0,source:BAKI}];
 act(s,'toAttack');
 let used=0;
 for(let n=0;s.decision;n++){
  assert.ok(n<12);
  if(s.decision.task?.op==='g34_ShieldToMana980'){
   assert.equal(s.decision.player,0);
   pick(s,own.shields[0].uid);used++;
  }else e.step(s,e.chooseAI(s));
 }
 assert.equal(used,2);
 assert.equal(own.shields.length,1);
});

test('Pallas has G Strike and can stop the targeted second attacker',()=>{
 const s=field(),first=add(s,1,'battle',N),second=add(s,1,'battle',N);
 give(s,0,'shields',[PALLAS]);s.active=1;
 attack(s,first.uid);act(s,'noBlock');pick(s,true);
 pick(s,second.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===second.uid));
});

test('Baki sends only the third and later creatures to the graveyard and resets each turn',()=>{
 const s=field(),own=s.players[0];
 assert.equal(own.battle.length,0);
 const source=add(s,1,'battle',BAKI);
 for(let i=0;i<4;i++)play(s,add(s,0,'hand',N,i===2?{cardOwner:1}:{}));
 assert.equal(own.enteredThisTurn,2);
 assert.equal(own.battle.length,2);
 assert.equal(own.grave.length,1);
 assert.equal(s.players[1].grave.length,1);
 end(s);end(s);s.phase='main';
 const next=add(s,0,'hand',N);play(s,next);
 assert.ok(own.battle.includes(next)&&s.players[1].battle.includes(source));
});

test('Baki spell puts exactly the first three cards into mana tapped',()=>{
 const s=field(),own=s.players[0],x=add(s,0,'hand',BAKI);
 const before=own.deck.slice(0,3),mana=own.mana.length;
 play(s,x,1);
 assert.ok(own.grave.includes(x));
 assert.equal(own.mana.length,mana+3);
 assert.deepEqual(own.mana.slice(-3),before);
 assert.ok(before.every(y=>y.tapped));
});

test('Baki replaces two of Gachirobo’s three equal-cost entrants, including the Mk II interaction',()=>{
 for(const [id,onAttack] of [['dmr17-s04',false],['dm26rp2-008',true]]){
  const s=field(),own=s.players[0];
  add(s,1,'battle',BAKI);
  give(s,0,'deck',[N,F,W,...Array(8).fill(N)]);
  const [a,b,c]=own.deck;
  const robo=add(s,0,'hand',id);play(s,robo);
  if(onAttack)attack(s,robo.uid);
  assert.equal(s.decision.task.op,'g10_Next');
  pick(s,b.uid);pick(s,c.uid);
  assert.deepEqual(own.battle,[robo,b]);
  assert.deepEqual(own.grave,[c,a]);
  assert.equal(own.enteredThisTurn,2);
 }
});
