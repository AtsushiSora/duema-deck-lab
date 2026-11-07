import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-615.json',import.meta.url)));
const REDOUT='dm25ex2-007', NITRO='dmr17-024', BLASTER='dmrp14-044';
const FIRE='dm01-097', WATER='dm01-083';
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}
function place(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:615}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:614}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Redout invades onto a Fire attacker without paying and carries the attack through',()=>{
 const s=field(),base=place(s,0,'battle',FIRE),redout=place(s,0,'hand',REDOUT);
 attack(s,base.uid);
 assert.equal(s.decision.task.op,'g23_Declare');
 pick(s,true);
 assert.equal(s.decision.task.op,'g23_Invade');
 pick(s,true);
 drain(s);
 assert.ok(redout.under.includes(base));
 assert.ok(s.players[0].battle.includes(redout));
 assert.equal(s.players[1].shields.length,3);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));

 const other=field(),water=place(other,0,'battle',WATER);
 place(other,0,'hand',REDOUT);
 attack(other,water.uid);
 assert.notEqual(other.decision?.task?.op,'g23_Declare');
});

test('Redout can be summoned without a base, gives Fire allies speed, and watches other Fire attackers only',()=>{
 const s=field(),redout=play(s,REDOUT);
 act(s,'evolve',a=>!a.baseUid);
 assert.ok(s.players[0].battle.includes(redout));
 assert.ok(!e.isEvolution(redout));
 assert.ok(e.effectiveCard(redout,s).speedAttacker);
 const fire=place(s,0,'battle',FIRE),water=place(s,0,'battle',WATER);
 fire.entered=s.turn;
 const discard=place(s,0,'hand',WATER);
 assert.ok(e.effectiveCard(fire,s).speedAttacker);
 assert.ok(!e.effectiveCard(water,s).speedAttacker);
 attack(s,redout.uid);
 assert.notEqual(s.decision?.task?.op,'g34_DiscardDraw');
 drain(s);
 attack(s,water.uid);
 assert.notEqual(s.decision?.task?.op,'g34_DiscardDraw');
 drain(s);
 attack(s,fire.uid);
 assert.equal(s.decision.task.op,'g34_DiscardDraw');
 pick(s,discard.uid);
 drain(s);
 assert.ok(s.players[0].grave.includes(discard));
 assert.equal(s.players[0].hand.length,1);
});

test('Nitroflag activates dynamically at two opposing shields and applies to itself and other Fire creatures only',()=>{
 const s=field(),nitro=place(s,0,'battle',NITRO),fire=place(s,0,'battle',FIRE),water=place(s,0,'battle',WATER);
 const enemy=place(s,1,'battle',FIRE);
 give(s,1,'shields',Array(3).fill(WATER));
 assert.ok(!e.effectiveCard(nitro,s).speedAttacker);
 s.players[1].shields.pop();
 assert.ok(e.effectiveCard(nitro,s).speedAttacker);
 assert.ok(e.effectiveCard(fire,s).speedAttacker);
 assert.ok(!e.effectiveCard(water,s).speedAttacker);
 assert.ok(!e.effectiveCard(enemy,s).speedAttacker);
 assert.equal(e.power(nitro,true,s)-e.power(nitro,false,s),2000);
 s.players[1].shields.push(inst(WATER));
 assert.ok(!e.effectiveCard(nitro,s).speedAttacker);
 assert.ok(!e.effectiveCard(fire,s).speedAttacker);
});

test('Blaster stacks attack power, adds speed across civilizations and breaks extra shields that turn',()=>{
 const s=field(),nitro=place(s,0,'battle',NITRO),water=place(s,0,'battle',WATER),enemy=place(s,1,'battle',FIRE);
 nitro.entered=water.entered=s.turn;
 play(s,BLASTER);
 const late=place(s,0,'battle',WATER);
 assert.ok(!e.effectiveCard(late,s).speedAttacker);
 assert.ok(e.effectiveCard(water,s).speedAttacker);
 assert.ok(!e.effectiveCard(enemy,s).poweredBreaker);
 assert.equal(e.power(nitro,true,s),9000);
 play(s,BLASTER);
 assert.equal(e.power(nitro,false,s),3000);
 assert.equal(e.power(nitro,true,s),13000);
 attack(s,nitro.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,2);
 s.turn++;
 assert.ok(!e.effectiveCard(water,s).speedAttacker);
 assert.ok(!e.effectiveCard(nitro,s).poweredBreaker);
 assert.equal(e.power(nitro,true,s),5000);
});

test('the CPU uses Blaster with a board that can attack immediately and holds it without creatures',()=>{
 for(const hasBoard of [false,true]){
  const s=field(),blaster=place(s,0,'hand',BLASTER);
  if(hasBoard)for(let i=0;i<3;i++)place(s,0,'battle',WATER).entered=s.turn;
  assert.equal(e.chooseAI(s).uid===blaster.uid,hasBoard);
 }
});
