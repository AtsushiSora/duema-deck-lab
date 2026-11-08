import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-625.json',import.meta.url)));
const NIJE='dm24rp2-031', K491='dm23rp2-029', LOST='dmrp20-017', JENNY='dmr01-056';
const TYPHOON='dm11-043', FIRE='dm01-097', LARGE='dm23ex2-016', CLOCK='dmr09-021';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(FIRE));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:625}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:624}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

for(const id of [NIJE,K491])test(id+' blocks opposing spells and creature discard but allows its own discard',()=>{
 const s=field(1),guard=play(s,id),protectedCard=put(s,1,'hand',FIRE);
 s.active=0;
 play(s,LOST);drain(s);
 play(s,JENNY);drain(s);
 assert.deepEqual(s.players[1].hand,[protectedCard]);
 assert.ok(s.players[1].battle.includes(guard));
 s.active=1;
 play(s,TYPHOON);drain(s);
 assert.equal(s.players[1].hand.length,2);
 assert.equal(s.players[1].grave.length,2);
});

test('Nije cannot be chosen by an enemy but remains a legal attack target',()=>{
 const s=field(1),nije=play(s,NIJE);
 s.active=0;
 play(s,'dm01-027');
 drain(s);
 assert.ok(s.players[1].battle.includes(nije));
 const attacker=put(s,0,'battle',FIRE);
 nije.tapped=true;
 assert.equal(e.effectiveCard(nije,s).untargetable,true);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===attacker.uid&&a.target===nije.uid));
});

for(const plus of [false,true])test('k491 applies its bonus only after at least two shield breaks '+plus,()=>{
 const s=field(),attacker=put(s,0,'battle',plus?LARGE:FIRE);
 give(s,1,'shields',plus?[K491,FIRE,FIRE]:[K491]);
 const k491=s.players[1].shields[0],top=s.players[1].deck[0],before=physical(s);
 top.cardId=CLOCK;
 attack(s,attacker.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.uids?.includes(k491.uid)||a.shields?.includes(k491.uid));
 act(s,'useTrigger',a=>a.uid===k491.uid);
 drain(s);
 assert.ok(s.players[1].battle.includes(k491));
 assert.equal(e.effectiveCard(k491,s).blocker,true);
 assert.equal(s.players[1].shields.includes(top),plus);
 assert.equal((s.g537Delays||[]).length,plus?1:0);
 if(plus){
  // The delayed break still resolves if its source has already left.
  s.players[1].grave.push(s.players[1].battle.splice(s.players[1].battle.indexOf(k491),1)[0]);
 }
 act(s,'endTurn');
 if(plus){
  assert.equal(s.decision.player,1);
  assert.match(s.decision.title,/自分のシールド/);
  pick(s,top.uid);
  act(s,'useTrigger',a=>a.uid===top.uid);drain(s);
  assert.ok(s.players[1].battle.includes(top));
 }
 assert.equal(s.players[1].shields.includes(top),false);
 assert.deepEqual(physical(s),before);
});


test('CPU skips the trigger plus when its mandatory shield would exhaust the deck',()=>{
 const s=field(),attacker=put(s,0,'battle',LARGE);
 give(s,1,'shields',[K491,FIRE,FIRE]);
 give(s,1,'deck',[FIRE]);
 attack(s,attacker.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice'){
  const k491=s.players[1].shields[0];
  act(s,'breakShields',a=>a.uids?.includes(k491.uid)||a.shields?.includes(k491.uid));
 }
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
 assert.equal(e.chooseHeuristicAI(s).kind,'skipTrigger');
});
