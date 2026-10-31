import test from 'node:test';import assert from 'node:assert/strict';
import {e,data,setup,give,act,drain} from './target-fixture.mjs';
import {hyperModeModel} from '../dist/manual-ui.js';
const YABA='dm24rp1-S05',N='dm01-108';
const pick=(s,uid)=>act(s,'extended',a=>s.decision.choices[a.choice].value===uid);

test('all twelve registered Hyper creatures activate through a legal action, including newly entered or tapped sources',()=>{
 const cards=data.cards.filter(c=>c.hyperTap);assert.equal(cards.length,12);
 for(const c of cards)for(const tapped of[false,true]){const s=setup();give(s,0,'battle',[c.id,N,N]);const [source,a,b]=s.players[0].battle;source.entered=s.turn;source.tapped=tapped;a.entered=s.turn;b.entered=s.turn;
  const before=e.physicalCards(s).map(x=>x.uid).sort(),mana=s.players[0].mana.filter(x=>x.tapped).length;
  assert.ok(hyperModeModel(s,0,source.uid).action);act(s,'hyper',a=>a.uid===source.uid);pick(s,a.uid);if(Number(c.hyperTap)===2){assert.equal(a.tapped,false);pick(s,b.uid);}
  assert.equal(source.hyperActive,true,c.name);assert.equal(source.tapped,tapped);assert.equal(e.power(source,false,s),c.hyper.power);assert.equal(a.tapped,true);assert.equal(b.tapped,Number(c.hyperTap)===2);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana);assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);assert.ok(!hyperModeModel(s,0,source.uid).action);
 }
});

test('Yabadan activation unlocks its actual attack revival and the revived creature can attack the player this turn',()=>{
 const s=setup();give(s,0,'battle',[YABA,N]);give(s,0,'grave',['dm03-s03','dmrp03-s03']);const [source,ally]=s.players[0].battle,revive=s.players[0].grave[0],illegal=s.players[0].grave[1];
 act(s,'hyper',a=>a.uid===source.uid);pick(s,ally.uid);act(s,'toAttack');act(s,'attack',a=>a.uid===source.uid&&a.target==='player');assert.equal(s.decision.task.op,'g34_Select');assert.ok(s.decision.choices.some(c=>c.value?.uid===revive.uid));assert.ok(!s.decision.choices.some(c=>c.value?.uid===illegal.uid));act(s,'extended',a=>s.decision.choices[a.choice].value?.uid===revive.uid);drain(s);assert.ok(s.players[0].battle.some(x=>x.uid===revive.uid));assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===revive.uid&&a.target==='player'));
});

test('Hyper mode remains during the opponent turn and expires only on the next own turn',()=>{
 const s=setup();give(s,0,'battle',[YABA,N]);const [source,ally]=s.players[0].battle;act(s,'hyper',a=>a.uid===source.uid);pick(s,ally.uid);act(s,'toAttack');act(s,'endTurn');drain(s);assert.equal(s.active,1);assert.equal(e.power(source,false,s),9000);assert.ok(source.hyperActive);act(s,'skipCharge');act(s,'toAttack');act(s,'endTurn');drain(s);assert.equal(s.active,0);assert.equal(e.power(source,false,s),5000);assert.ok(!source.hyperActive);
});
