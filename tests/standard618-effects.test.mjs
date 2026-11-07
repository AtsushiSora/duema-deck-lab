import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,inst,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-618.json',import.meta.url)));
const BWM='dmrp18-s07', BOLMETEUS='dmsp02-002', HARPOON='dm33-033';
const WATER='dm01-083', CLOCK='dmr09-021', ENERGY='dm06-085', SAVER='dmrp14-062';
const MUTE='dm23rp2-015';
function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(20).fill(WATER));
  s.players[p].turns=2;
 }
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
 assert.deepEqual(standardCardSpec(detail,{phase:618}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:617}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('BWM adds EX Life and gains 3000 for each own spell before replacing a three-shield break',()=>{
 const s=field(),top=s.players[0].deck[0];
 const bwm=play(s,BWM);
 assert.ok(s.players[0].shields.includes(top));
 assert.equal(bwm.exLifeShieldUid,top.uid);
 assert.equal(e.power(bwm,false,s),6000);
 play(s,ENERGY);
 play(s,ENERGY);
 drain(s);
 assert.equal(e.power(bwm,false,s),12000);
 give(s,1,'shields',[CLOCK,BOLMETEUS,WATER]);
 bwm.entered=s.turn-1;
 attack(s,bwm.uid);
 act(s,'noBlock');
 assert.equal(s.decision,null);
 assert.equal(s.players[1].grave.length,3);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].brokenThisTurn||0,0);
 assert.equal(s.metrics[0].breaks,0);
});

test('Bolmeteus GS sends both shield groups to the grave without Shield Saver or a later Trigger Plus bonus',()=>{
 const s=field(),dragon=place(s,0,'battle',BOLMETEUS),attacker=place(s,0,'battle',WATER);
 const saver=place(s,1,'battle',SAVER);
 give(s,1,'shields',[CLOCK,WATER,MUTE]);
 const [first,second,mute]=s.players[1].shields;
 first.shieldStack=[inst(BOLMETEUS)];
 attack(s,dragon.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.includes(first.uid)&&a.shields.includes(second.uid));
 assert.equal(s.decision,null);
 assert.equal(s.players[1].grave.length,3);
 assert.ok(s.players[1].battle.includes(saver));
 assert.equal(s.players[1].brokenThisTurn||0,0);
 attack(s,attacker.uid);
 act(s,'noBlock');
 if(s.decision?.type==='shieldGuard')act(s,'finishShieldGuards');
 assert.equal(s.players[1].brokenThisTurn,1);
 assert.equal(s.decision?.type,'trigger');
 assert.equal(s.decision.uid,mute.uid);
 assert.equal(mute.triggerPlus,false);
});

test('Harpoon keeps three selected shield groups and sends the rest directly to the grave',()=>{
 const s=field(1);
 const added=s.players[1].deck[0];
 play(s,BWM);
 assert.ok(s.players[1].shields.includes(added));
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
 s.phase='main';
 const [a,b,c]=s.players[1].shields;
 const stack=inst(CLOCK);
 added.shieldStack=[stack];
 const harpoon=place(s,0,'hand',HARPOON);
 const physical=e.physicalCards(s).map(x=>x.uid).sort();
 act(s,'play',a=>a.uid===harpoon.uid);
 assert.equal(s.decision.task.op,'g34_Harpoon618');
 pick(s,a.uid);
 pick(s,b.uid);
 pick(s,c.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].shields,[a,b,c]);
 assert.ok(s.players[1].grave.includes(added)&&s.players[1].grave.includes(stack));
 assert.equal(s.players[1].hand.length,0);
 assert.equal(s.players[1].brokenThisTurn||0,0);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),physical);
});

test('Harpoon ignores shields gained outside their owner’s own turn or earlier than the last one',()=>{
 for(const offTurn of [true,false]){
  const s=field(offTurn?0:1);
  s.extTasks=[{op:'g34_ShieldTop',p:1,source:BWM,n:1}];
  act(s,'toAttack');
  assert.equal(s.players[1].shields.length,6);
  if(!offTurn){
   s.active=0;
   s.players[1].turns++;
  }
  s.phase='main';
  play(s,HARPOON);
  assert.equal(s.decision,null);
  assert.equal(s.players[1].shields.length,6);
 }
});
