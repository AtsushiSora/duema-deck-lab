import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,details,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-626.json',import.meta.url)));
const LAUREN='dm22rp2-042', BOND='dm24ex4-058', FIRE='dm01-097', SEED='dmrp21-069';
const GEAR='dm14-110', FIELD='dmrp08-005', EVO='dm02-s02', BIG='dm23ex2-016';

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
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===value;
});
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const row of cards)test(row.name+' matches the verified print and compiler',()=>{
 const detail=details.cards.find(c=>c.id===row.id),c=e.card(row.id);
 assert.deepEqual(detail.faces,row.faces);
 assert.deepEqual(standardCardSpec(detail,{phase:626}),row.spec);
 assert.throws(()=>standardCardSpec(detail,{phase:625}));
 for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
 assert.equal(c.limit,regulationVerification.limits[row.id]);
 assert.equal(CARD_IMAGES[row.id],row.image);
 assert.ok(row.verification.facesMatched);
});

for(const stays of [false,true])test('Lauren resolves removal separately from civil count '+stays,()=>{
 const s=field(),seed=put(s,1,'battle',SEED),gear=put(s,1,'battle',GEAR);
 if(stays){put(s,0,'battle',FIRE);put(s,0,'battle',SEED);}
 const lauren=play(s,LAUREN),before=physical(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.effectId===s.pendingEffects.find(q=>q.label==='シビルカウント3').effectId);
 assert.equal(s.players[0].battle.includes(lauren),stays);
 assert.ok(s.decision.choices.some(q=>q.value.uid===seed.uid));
 assert.ok(!s.decision.choices.some(q=>q.value.uid===gear.uid));
 pick(s,seed.uid);drain(s);
 assert.ok(s.players[1].grave.includes(seed));
 assert.ok(s.players[1].battle.includes(gear));
 assert.deepEqual(physical(s),before);
});

test('Bond triggers from a shield and sweeps only opposing elements that cost two or less',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE),seed=put(s,1,'battle',SEED);
 const gear=put(s,1,'battle',GEAR),magicField=put(s,1,'battle',FIELD),big=put(s,1,'battle',BIG);
 const ally=put(s,0,'battle',SEED);
 give(s,0,'shields',[BOND]);
 const before=physical(s);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 const choice=e.chooseHeuristicAI(s);
 assert.equal(s.decision.choices[choice.choice].value,0);
 pick(s,0);drain(s);
 assert.ok([attacker,seed,gear,magicField].every(x=>s.players[1].grave.includes(x)));
 assert.ok(s.players[1].battle.includes(big)&&s.players[0].battle.includes(ally));
 assert.deepEqual(physical(s),before);
});

for(const recover of [false,true])test('Bond mills four and can return one card of each evolution category '+recover,()=>{
 const s=field();
 give(s,0,'deck',[FIRE,EVO,FIRE,FIRE,...Array(12).fill(FIRE)]);
 const [basic,evo,other]=s.players[0].deck;
 play(s,BOND);
 const before=physical(s);
 pick(s,1);
 assert.ok(s.players[0].grave.includes(evo));
 if(recover){
  pick(s,basic.uid);
  assert.ok(!s.decision.choices.some(q=>q.value?.uid===other.uid));
  pick(s,evo.uid);
  assert.ok(s.players[0].hand.includes(basic)&&s.players[0].hand.includes(evo));
 }else{
  pick(s,null);
  assert.ok(s.players[0].grave.includes(evo)&&s.players[0].grave.includes(basic));
 }
 assert.equal(s.players[0].deck.length,12);
 assert.deepEqual(physical(s),before);
});


test('Bond returns the available category and skips the missing one',()=>{
 const s=field(),top=s.players[0].deck[0];
 play(s,BOND);pick(s,1);pick(s,top.uid);
 assert.equal(s.decision,null);
 assert.ok(s.players[0].hand.includes(top));
 assert.equal(s.players[0].grave.filter(x=>x.cardId===FIRE).length,3);
});

test('CPU avoids Bond’s mill mode when it would exhaust the deck',()=>{
 const s=field();
 give(s,0,'deck',Array(4).fill(FIRE));
 put(s,0,'grave',EVO);
 play(s,BOND);
 const choice=e.chooseHeuristicAI(s);
 assert.equal(s.decision.choices[choice.choice].value,0);
});

test('CPU summons Lauren to remove a Tamaseed when it can meet civil count',()=>{
 const s=field(),seed=put(s,1,'battle',SEED);
 put(s,0,'battle',FIRE);put(s,0,'battle',SEED);
 const lauren=put(s,0,'hand',LAUREN);
 const action=e.chooseHeuristicAI(s);
 assert.equal(action.kind,'play');
 assert.equal(action.uid,lauren.uid);
 e.step(s,action);
 drain(s);
 assert.ok(s.players[0].battle.includes(lauren));
 assert.ok(s.players[1].grave.includes(seed));
});
