import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-622.json',import.meta.url)));
const GT='dm25rp3-008', LISA='dm30-037', DELIGHT='dm23rp1-031';
const LIGHT='dm01-075', FIRE='dm01-097', NATURE='dm01-108', LARGE='dm23ex2-016';

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(16).fill(NATURE));
 return s;
}
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,value)=>act(s,'extended',a=>{
 const selected=s.decision.choices[a.choice].value;
 return (selected?.uid??selected)===value;
});

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:622}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:621}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

for(const destination of ['hand','mana'])test('GT adds the top card to '+destination+' then untaps mana after a battle win',()=>{
 const s=field(),ally=put(s,0,'battle',LIGHT),enemy=put(s,1,'battle',FIRE);
 const gt=put(s,0,'hand',GT),top=s.players[0].deck[0];
 top.cardId=LARGE;
 const before=physical(s);
 enemy.tapped=true;
 attack(s,ally.uid,enemy.uid);act(s,'declareDDD');
 act(s,'summonDDD',a=>a.uid===gt.uid&&a.baseUid===ally.uid&&a.cost===4);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,4);
 assert.equal(s.attack.attacker,gt.uid);
 act(s,'noBlock');
 assert.ok(s.players[1].grave.includes(enemy));
 assert.equal(s.decision.source,GT);
 assert.equal(s.decision.task.chosen[0],top.uid);
 pick(s,destination);
 assert.ok(s.players[0][destination].includes(top));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
 assert.deepEqual(physical(s),before);
});

test('GT also rewards another ally’s win when defending, but ignores an opposing win',()=>{
 const s=field(1),gt=put(s,0,'battle',GT),attacker=put(s,1,'battle',FIRE);
 const lisa=put(s,0,'battle',LISA),loser=put(s,0,'battle',FIRE);
 put(s,1,'battle',LARGE);
 const enemy=s.players[1].battle.at(-1);
 attack(s,attacker.uid);act(s,'block',a=>a.uid===lisa.uid);
 act(s,'battleWinOrder',a=>a.cardId===GT);
 const top=s.players[0].deck[0];
 assert.equal(s.decision.task.chosen[0],top.uid);pick(s,'hand');
 drain(s);
 assert.ok(s.players[0].hand.includes(top)&&s.players[0].battle.includes(gt));
 loser.tapped=true;
 attack(s,enemy.uid,loser.uid);act(s,'noBlock');drain(s);
 assert.equal(s.players[0].hand.length,1);
});

test('Lisa can untap after each winning block and may decline the last untap',()=>{
 const s=field(1),lisa=put(s,0,'battle',LISA);
 const attackers=[0,1,2].map(()=>put(s,1,'battle',FIRE));
 for(const [i,attacker] of attackers.entries()){
  attack(s,attacker.uid);act(s,'block',a=>a.uid===lisa.uid);
  assert.ok(lisa.tapped);
  pick(s,i===2?null:true);drain(s);
  assert.equal(lisa.tapped,i===2);
  assert.ok(s.players[1].grave.includes(attacker));
 }
});

for(const plus of [false,true])test('Delight grants blockers until the next own turn and applies battle wins only with the plus condition '+plus,()=>{
 const s=field(1),ally=put(s,0,'battle',LIGHT);
 ally.tapped=true;
 const breaker=put(s,1,'battle',plus?LARGE:FIRE),next=put(s,1,'battle',LARGE);
 give(s,0,'shields',plus?[DELIGHT,NATURE]:[DELIGHT]);
 attack(s,breaker.uid);act(s,'noBlock');act(s,'useTrigger');drain(s);
 assert.ok(!ally.tapped);
 assert.ok(e.effectiveCard(ally,s).blocker);
 assert.equal(!!e.effectiveCard(ally,s).g34AlwaysWin,plus);
 if(plus){
  attack(s,next.uid);act(s,'block',a=>a.uid===ally.uid);drain(s);
  assert.ok(s.players[0].battle.includes(ally));
  assert.ok(s.players[1].grave.includes(next));
 }
 act(s,'endTurn');drain(s);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(ally,s).blocker&&!e.effectiveCard(ally,s).g34AlwaysWin);
});

test('the CPU keeps its last combat response in hand when another card supplies the needed color',()=>{
 const s=field();
 s.phase='charge';
 give(s,0,'mana',[]);
 const delight=put(s,0,'hand',DELIGHT),light=put(s,0,'hand',LIGHT);
 const action=e.chooseHeuristicAI(s);
 assert.equal(action.kind,'charge');
 assert.equal(action.uid,light.uid);
 e.step(s,action);
 assert.ok(s.players[0].hand.includes(delight));
});
