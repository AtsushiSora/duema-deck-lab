import test from 'node:test';
import assert from 'node:assert/strict';
import {act,attack,cast,drain,e,give,inst,setup} from './target-fixture.mjs';
const CHAOS='dm23rp2-OR01',KAREN='dm25ex1-SP3',DOGI='dm25rp4-DM1',N='dm01-108',W='dm01-083',SPEED='dmrp14-088';
const pick=(s,value)=>act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(attacking,shields){
 const s=setup();s.active=attacking;const defending=1-attacking;
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(N));
 give(s,defending,'battle',[KAREN]);give(s,defending,'hand',[CHAOS]);give(s,defending,'shields',Array(shields).fill(N));
 give(s,attacking,'battle',[N,W]);give(s,attacking,'hand',[DOGI]);
 return {s,defending,attacker:s.players[attacking].battle[0],later:s.players[attacking].battle[1],base:s.players[defending].battle[0]};
}
for(const attacking of [0,1])for(const shields of [0,1])test('photo log: DDD declined, Karen exchanged, Chaos taps all, the already declared attack continues: seat '+attacking+', shields '+shields,()=>{
 const {s,defending,attacker,later,base}=field(attacking,shields),before=physical(s);
 assert.equal(attacker.tapped,false);assert.equal(later.tapped,false);
 assert.ok(!e.effectiveCard(attacker,s).ignoreAttackLocks);
 attack(s,attacker.uid);assert.equal(attacker.tapped,true);
 act(s,'declareDDD');act(s,'skipDDDSummon');pick(s,true);pick(s,base.uid);
 assert.equal(s.players[defending].battle[0].cardId,CHAOS);
 assert.ok(s.players[defending].hand.some(x=>x.uid===base.uid));
 assert.equal(attacker.tapped,true);assert.equal(later.tapped,true);
 assert.equal(s.attack.attacker,attacker.uid);assert.equal(s.decision.type,'block');
 assert.ok(s.log.some(x=>x.text.includes('D・D・Dで実行しない')));
 assert.ok(s.log.some(x=>x.cardId===CHAOS&&x.text.includes('すべてをタップ')));
 const loaded=JSON.parse(JSON.stringify(s));assert.deepEqual(e.getLegalActions(loaded),e.getLegalActions(s));
 act(loaded,'noBlock');drain(loaded);
 assert.deepEqual(physical(loaded),before);
 if(!shields){assert.equal(loaded.winner,attacking);assert.equal(loaded.reason,'ダイレクトアタックが成立');}
 else {assert.equal(loaded.winner,null);assert.equal(loaded.players[defending].shields.length,0);assert.equal(loaded.attack,null);assert.ok(!e.getLegalActions(loaded).some(a=>a.kind==='attack'));}
});
for(const attacking of [0,1])test('Chaos tapping before an attack declaration prevents every ordinary new attack: seat '+attacking,()=>{
 const {s,defending}=field(attacking,1);s.active=defending;cast(s,CHAOS);drain(s);s.active=attacking;s.phase='attack';
 assert.ok(s.players[attacking].battle.every(x=>x.tapped));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));
 for(const x of s.players[attacking].battle)assert.equal(e.canCreatureAttack(s,attacking,x),false);
});
for(const attacking of [0,1])test('Chaos prevents a fresh speed attacker from starting even after it is untapped: seat '+attacking,()=>{
 const {s,defending}=field(attacking,1);give(s,defending,'battle',[CHAOS]);s.phase='attack';
 const x=Object.assign(inst(SPEED),{entered:s.turn});s.players[attacking].battle.push(x);
 assert.equal(e.effectiveCard(x,s).speedAttacker,true);assert.equal(x.tapped,false);
 assert.equal(e.canCreatureAttack(s,attacking,x),false);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
});
