import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-602.json',import.meta.url)));
const RRR='dm25rp1-011', TRAP='dmbd05-013', WHITE='dm34-008', SPEECH='dm23rp1-035', NINJA='dm23sd2-013';
const WATER='dm01-083', LIGHT='dm01-075', DRAGON='dm01-s08', KNIGHT='dm33-037', DEMON='dm01-027';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const values=s=>s.decision.choices.map(o=>o.value?.uid??o.value);
const pick=(s,value)=>act(s,'extended',a=>values(s)[a.choice]===value);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(WATER));
 return s;
}

function place(s,p,z,id,tapped=false){
 const x=inst(id);
 x.tapped=tapped;
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=place(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function trigger(s,id,double){
 give(s,0,'shields',double?[id,LIGHT]:[id]);
 const attacker=place(s,1,'battle',double?DRAGON:WATER);
 attack(s,attacker.uid);
 act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===id);
}

for(const row of cards)test(row.name+' matches its official printing and compiled effects',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:602}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:601}));
 for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

test('R・R・R sweeps only creatures with the chosen tap state without targeting them',()=>{
 for(const mode of [0,2]){
  const s=field(),untapped=place(s,1,'battle','dmrp01-041'),tapped=place(s,1,'battle',WATER,true);
  const ally=place(s,0,'battle',WATER);
  play(s,RRR);
  pick(s,mode);
  assert.ok(has(s,0,'battle',ally));
  assert.equal(has(s,1,'hand',untapped),mode===0);
  assert.equal(has(s,1,'mana',tapped),mode===2);
  assert.ok(has(s,1,'battle',mode===0?tapped:untapped));
 }
});

test('R・R・R checks the shield count after the first addition',()=>{
 for(const initial of [0,1,2,3]){
  const s=field();
  give(s,0,'shields',Array(initial).fill(LIGHT));
  play(s,RRR);
  pick(s,1);
  assert.equal(s.players[0].shields.length,initial+(initial<=1?2:1));
 }
});

test('the CPU uses R・R・R from a shield and values the shield addition at zero shields',()=>{
 const s=field(1);
 trigger(s,RRR,false);
 assert.equal(s.players[0].shields.length,0);
 const action=e.chooseHeuristicAI(s);
 assert.equal(values(s)[action.choice],1);
 e.step(s,action);
 assert.equal(s.players[0].shields.length,2);
});

test('龍幻 only offers both modes with a Dragon, then removes and taps in order',()=>{
 for(const dragon of [null,DRAGON,'dmrp22-025']){
  const s=field(),victim=place(s,1,'battle',WATER),other=place(s,1,'battle',WATER);
  const hasDragon=!!dragon;
  if(dragon)place(s,0,'battle',dragon);
  play(s,TRAP);
  assert.deepEqual(values(s),hasDragon?[0,1,2]:[0,1]);
  pick(s,hasDragon?2:1);
  if(hasDragon)pick(s,victim.uid);
  assert.equal(has(s,1,'mana',victim),hasDragon);
  assert.equal(other.tapped,true);
 }
});

test('白騎士スパーク taps the enemy and untaps only allied White Knights at the end of the current turn',()=>{
 const s=field(),knight=place(s,0,'battle',KNIGHT,true),ally=place(s,0,'battle',WATER,true),enemy=place(s,1,'battle',WATER);
 play(s,WHITE);
 assert.equal(enemy.tapped,true);
 assert.equal(knight.tapped,true);
 act(s,'toAttack');
 act(s,'endTurn');
 assert.equal(knight.tapped,false);
 assert.equal(ally.tapped,true);
});

test('Uta-Awase lets the owner choose the deck destination and freezes two foes only with Plus',()=>{
 for(const double of [false,true]){
  const s=field(1),victim=place(s,1,'battle',WATER),a=place(s,1,'battle',WATER),b=place(s,1,'battle',WATER);
  trigger(s,SPEECH,double);
  pick(s,victim.uid);
  assert.equal(s.decision.player,1);
  pick(s,'deckTop');
  assert.equal(s.players[1].deck[0].uid,victim.uid);
  if(double){pick(s,a.uid);pick(s,b.uid);}
  for(const x of [a,b])assert.equal((s.extLimits||[]).filter(l=>l.g190Freeze&&l.uid===x.uid).length,double?2:0);
  assert.equal(s.decision,null);
 }
});

test('忍防 only untaps and protects the allied board with Plus, and protection ends with that turn',()=>{
 for(const double of [false,true]){
  const s=field(1),ally=place(s,0,'battle',WATER,true);
  trigger(s,NINJA,double);
  const ninja=s.players[0].battle.find(x=>x.cardId===NINJA);
  assert.ok(e.effectiveCard(ninja,s).blocker);
  assert.equal(ally.tapped,!double);
  s.phase='main';
  play(s,DEMON);
  act(s,'effect',a=>a.targets.some(x=>x.uid===ally.uid));
  assert.equal(has(s,0,'battle',ally),double);
  if(double){
   act(s,'toAttack');
   act(s,'endTurn');
   assert.ok(!(s.extLimits||[]).some(l=>l.effect==='destroySafe'&&l.ref?.uid===ally.uid));
  }
 }
});
