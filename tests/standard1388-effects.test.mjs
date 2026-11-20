import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,cast,drain} from './target-fixture.mjs';
const GR='dmsd11-014';
const select=(s,uid)=>{const a=e.getLegalActions(s).find(a=>{const v=s.decision?.choices?.[a.choice]?.value;return uid===null?v===null:(v?.uid||v)===uid;});assert.ok(a,JSON.stringify(s.decision));e.step(s,a);drain(s);};
for(const id of ['dmsd08-018','dmsd13-018','dmrp10-093'])test(e.card(id).name+' GR summons on entry, but its attack restriction still applies after summoning sickness',()=>{
 const s=setup();s.active=0;s.format='advance';const gr=inst(GR),enemy=inst('dm01-108');enemy.tapped=true;s.players[0].gr=[gr];s.players[1].battle=[enemy];cast(s,id);drain(s);const x=s.players[0].battle.find(x=>x.cardId===id);assert.ok(x&&s.players[0].battle.includes(gr));x.entered=0;s.phase='attack';const actions=e.getLegalActions(s);assert.ok(!actions.some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));assert.equal(actions.some(a=>a.kind==='attack'&&a.uid===x.uid&&a.target===enemy.uid),id!=='dmsd13-018');
 if(id==='dmrp10-093'){assert.equal(e.power(x,false,s),3000);assert.equal(e.power(x,true,s),11000);}
});
test('ウォッシャ幾三 guardman redirects an attack away from another creature and saves that creature',()=>{
 const s=setup();s.active=0;s.format='advance';const gr=inst(GR);s.players[0].gr=[gr];cast(s,'dmsd08-018');drain(s);const guard=s.players[0].battle.find(x=>x.cardId==='dmsd08-018'),enemy=inst('dm01-108');s.players[1].battle=[enemy];gr.tapped=true;s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.target===gr.uid);act(s,'guardman',a=>a.uid===guard.uid);drain(s);assert.ok(s.players[0].battle.includes(gr));assert.ok(s.log.some(x=>x.type==='guardman'&&x.cardId===guard.cardId));
});
test('オケ狭間 寛兵衛 can block even though it cannot attack',()=>{
 const s=setup();s.active=0;s.format='advance';s.players[0].gr=[inst(GR)];cast(s,'dmsd13-018');drain(s);const block=s.players[0].battle.find(x=>x.cardId==='dmsd13-018'),enemy=inst('dm01-108');s.players[1].battle=[enemy];s.active=1;s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.target==='player');act(s,'block',a=>a.uid===block.uid);drain(s);assert.equal(s.players[0].shields.length,5);assert.ok(s.players[0].battle.includes(block));
});
test('タンスかみなりヒゲおやじ uses its attacking bonus to win against 10000 power while normal power remains 3000',()=>{
 const s=setup();s.active=0;s.format='advance';s.players[0].gr=[inst(GR)];cast(s,'dmrp10-093');drain(s);const x=s.players[0].battle.find(x=>x.cardId==='dmrp10-093'),enemy=inst('dm01-108');x.entered=0;enemy.powerModifiers=[{amount:10000-e.power(enemy,false,s)}];enemy.tapped=true;s.players[1].battle=[enemy];s.phase='attack';act(s,'attack',a=>a.uid===x.uid&&a.target===enemy.uid);drain(s);assert.ok(s.players[0].battle.includes(x));assert.ok(s.players[1].grave.includes(enemy));assert.equal(e.power(x,false,s),3000);
});
test('音奏 オカリオ blocks, is destroyed in battle, and GR summons for the defending player',()=>{
 const s=setup();s.active=1;s.format='advance';const source=inst('dmrp09-067'),enemy=inst('dm01-108'),gr=inst(GR);source.cardOwner=0;enemy.powerModifiers=[{amount:3000-e.power(enemy,false,s)}];s.players[0].battle=[source];s.players[0].gr=[gr];s.players[1].battle=[enemy];s.phase='attack';act(s,'attack',a=>a.uid===enemy.uid&&a.target==='player');act(s,'block',a=>a.uid===source.uid);drain(s);assert.ok(s.players[0].grave.includes(source));assert.ok(s.players[0].battle.includes(gr));assert.equal(s.players[0].shields.length,5);
});
for(const mode of ['cast','decline','tooExpensive'])test('♪銀河の裁きに勝てるもの無し resolves GR before optional printed-cost-three-or-less spell '+mode,()=>{
 const s=setup();s.active=0;s.format='advance';const gr=inst(GR),fairy=inst('dm06-110'),high=inst('dm01-027');s.players[0].gr=[gr];s.players[0].hand=mode==='tooExpensive'?[high]:[fairy,high];const originalMana=[...s.players[0].mana];cast(s,'dmrp09-070');assert.ok(s.players[0].battle.includes(gr));
 if(mode==='tooExpensive'){drain(s);assert.ok(s.players[0].hand.includes(high));assert.equal(originalMana.filter(x=>x.tapped).length,3);}
 else{assert.ok(!s.decision.choices.some(x=>(x.value?.uid||x.value)===high.uid));select(s,mode==='cast'?fairy.uid:null);assert.equal(s.players[0].hand.includes(fairy),mode==='decline');assert.equal(originalMana.filter(x=>x.tapped).length,3);if(mode==='cast')assert.ok(s.players[0].grave.includes(fairy));}
 assert.ok(s.players[0].grave.some(x=>x.cardId==='dmrp09-070'));
});
