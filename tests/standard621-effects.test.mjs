import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-621.json',import.meta.url)));
const FROZEN='dm25rp2-002', STEAM='dm25rp1-014', DORAN='dm25rp1-012';
const RADIO='dm22ex1-037', CLOCK='dmr09-021', ONI='dmrp01-041';
const FIRE='dm01-097', WATER='dm01-083', LIGHT='dm01-075', NATURE='dm01-108';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(NATURE));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);s.players[p][zone].push(x);return x;
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,value)=>act(s,'extended',a=>{
 const selected=s.decision.choices[a.choice].value;
 return (selected?.uid??selected)===value;
});
function play(s,id,base){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 if(e.card(id).neoEvolution)act(s,'evolve',a=>a.baseUid===base?.uid);
 return x;
}

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:621}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:620}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('Frozen Time can end the opposing turn after ASM Radio resolves or let it continue',()=>{
 for(const accept of [true,false]){
  const s=field(1);
  put(s,0,'battle',FROZEN);
  const radio=put(s,1,'hand',RADIO),[first,second]=s.players[1].deck,before=physical(s);
  act(s,'play',a=>a.uid===radio.uid);
  pick(s,first.uid);pick(s,second.uid);
  while(s.decision?.task?.op==='g28_Order')act(s,'extended');
  assert.ok(s.players[1].battle.includes(first)&&s.players[1].battle.includes(second));
  assert.ok(s.players[1].grave.includes(radio));
  if(s.decision.type==='effectOrder')act(s,'orderEffect',a=>a.cardId===FROZEN);
  assert.equal(s.decision.source,FROZEN);
  assert.equal(s.decision.player,0);
  pick(s,accept?true:null);
  if(!accept&&s.decision)pick(s,null);
  assert.equal(s.active,accept?0:1);
  assert.equal(s.log.some(entry=>entry.type==='skipTurn'&&entry.cardId===FROZEN),accept);
  assert.deepEqual(physical(s),before);
 }
});

test('Frozen Time may also skip its controller’s turn after an opposing effect deployment',()=>{
 const s=field();
 put(s,0,'battle',FROZEN);
 const entrant=put(s,1,'hand',WATER);
 s.extTasks=[{op:'putCreature',p:1,source:FROZEN,uid:entrant.uid,origin:'hand'}];
 act(s,'toAttack');
 assert.ok(s.players[1].battle.includes(entrant));
 assert.equal(s.decision.player,0);
 pick(s,true);
 assert.equal(s.active,1);
});

test('Frozen Time and Doran leave free Shield Trigger summons alone',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE);
 put(s,1,'battle',FROZEN);put(s,1,'battle',DORAN);
 give(s,0,'shields',[CLOCK]);
 const shield=s.players[0].shields[0];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(s.players[0].battle.includes(shield));
 assert.equal(s.log.filter(entry=>entry.type==='skipTurn').at(-1)?.cardId,CLOCK);
});

test('Doran sends a non-summoned creature to the bottom without choosing it',()=>{
 const s=field();
 put(s,1,'battle',DORAN);
 const entrant=put(s,0,'hand',ONI),before=physical(s);
 s.extTasks=[{op:'putCreature',p:0,source:DORAN,uid:entrant.uid,origin:'hand'}];
 act(s,'toAttack');
 assert.equal(s.decision,null);
 assert.equal(s.players[0].deck.at(-1),entrant);
 assert.deepEqual(physical(s),before);
});

test('Doran untaps its evolved allies at the end of the turn',()=>{
 const s=field(),base=put(s,0,'battle',LIGHT),ordinary=put(s,0,'battle',LIGHT);
 const doran=play(s,DORAN,base);
 const evolved=play(s,STEAM,ordinary);
 const nonevolved=put(s,0,'battle',LIGHT),enemy=put(s,1,'battle',FIRE);
 doran.tapped=evolved.tapped=nonevolved.tapped=enemy.tapped=true;
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(s.active,1);
 assert.ok(!doran.tapped&&!evolved.tapped&&nonevolved.tapped);
});

test('Steam Battery bounces up to two enemies and can draw for each opposing creature that enters',()=>{
 const s=field(),base=put(s,0,'battle',WATER);
 const enemies=[0,1,2].map(()=>put(s,1,'battle',FIRE));
 const steam=play(s,STEAM,base),before=physical(s);
 pick(s,enemies[0].uid);pick(s,enemies[1].uid);
 assert.ok(s.players[1].hand.includes(enemies[0])&&s.players[1].hand.includes(enemies[1]));
 assert.ok(s.players[1].battle.includes(enemies[2]));
 assert.ok(e.isEvolution(steam));
 s.active=1;s.phase='main';
 act(s,'play',a=>a.uid===enemies[0].uid);
 assert.equal(s.decision.player,0);pick(s,0);
 const next=s.players[0].deck[0];
 act(s,'play',a=>a.uid===enemies[1].uid);
 assert.equal(s.decision.player,0);pick(s,1);
 assert.ok(s.players[0].hand.includes(next));
 assert.deepEqual(physical(s),before);
});
