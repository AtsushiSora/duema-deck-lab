import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,cast,drain} from './target-fixture.mjs';
const GR='dmsd11-014',SYMP='dmsd10-005',POO='dmex08-001',SHAN='dmrp09-034',LION='dmbd11-d01',LAMP='dmsd08-009';
function pick(s,uid){const a=e.getLegalActions(s).find(a=>{const v=s.decision?.choices?.[a.choice]?.value;return uid===null?v===null:(v?.uid||v)===uid;});assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
for(const allies of [0,3,8])test('審絆 パプルガン discounts only its own creature count, with a minimum of one, and GR summons '+allies,()=>{
 const s=setup();s.active=0;s.format='advance';s.players[0].battle=Array.from({length:allies},()=>inst('dm01-108'));s.players[1].battle=[inst('dm01-108')];assert.equal(e.summonCost(s,0,e.card(SYMP)),Math.max(1,6-allies));const gr=inst(GR);s.players[0].gr=[gr];cast(s,SYMP);drain(s);assert.ok(s.players[0].battle.includes(gr));
});
test('最騒音奏 プーーーンギ taxes opposing spells by four and GR summons for each opposing spell, not its own',()=>{
 const s=setup();s.active=0;s.format='advance';const source=inst(POO),first=inst(GR),second=inst('dmsd08-016');s.players[0].battle=[source];s.players[0].gr=[first,second];cast(s,'dm06-110');drain(s);assert.equal(s.players[0].gr.length,2);
 s.active=1;s.players[1].mana=Array.from({length:5},()=>inst('dm06-110'));s.players[1].hand=[inst('dm06-110')];assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.cardId==='dm06-110'));s.players[1].mana.push(inst('dm06-110'));act(s,'play',a=>a.cardId==='dm06-110');drain(s);assert.ok(s.players[0].battle.includes(first));s.players[1].mana.forEach(x=>x.tapped=false);cast(s,'dm06-110');drain(s);assert.ok(s.players[0].battle.includes(second));assert.equal(s.players[0].gr.length,0);
});
test('最騒音奏 プーーーンギ remains a blocker and double breaker',()=>{
 let s=setup();s.active=0;const source=inst(POO);s.players[0].battle=[source];s.phase='attack';act(s,'attack',a=>a.uid===source.uid&&a.target==='player');act(s,'noBlock');drain(s);assert.equal(s.players[1].shields.length,3);
 s=setup();s.active=1;const blocker=inst(POO),enemy=inst('dm01-108');s.players[0].battle=[blocker];s.players[1].battle=[enemy];s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'block',a=>a.uid===blocker.uid);drain(s);assert.equal(s.players[0].shields.length,5);
});
for(const defending of [false,true])test('音奏 シャンヘ GR summons when tapped for '+(defending?'blocking':'attacking')+' and its double breaker stays active',()=>{
 const s=setup();s.active=defending?1:0;s.format='advance';const source=inst(SHAN),gr=inst(GR);s.players[0].battle=[source];s.players[0].gr=[gr];s.phase='attack';
 if(defending){s.players[1].battle=[inst('dm01-108')];act(s,'attack',a=>a.target==='player');act(s,'block',a=>a.uid===source.uid);}else{act(s,'attack',a=>a.uid===source.uid&&a.target==='player');}
 drain(s);assert.ok(s.players[0].battle.includes(gr));assert.equal(s.players[defending?0:1].shields.length,defending?5:3);
});
test('無限剣 リオンザッシュ attacks immediately, breaks two shields and gives its newly summoned GR speed for this turn only',()=>{
 const s=setup();s.active=0;s.format='advance';const gr=inst(GR);s.players[0].gr=[gr];cast(s,LION);drain(s);const source=s.players[0].battle.find(x=>x.cardId===LION);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gr.uid));act(s,'attack',a=>a.uid===source.uid&&a.target==='player');pick(s,gr.uid);drain(s);assert.equal(s.players[1].shields.length,3);assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===gr.uid));act(s,'endTurn');drain(s);assert.ok(!e.effectiveCard(gr,s).speedAttacker);
});
for(const power of [3000,6001])test('行燈どろん uses current power and the total-six-thousand budget then GR summons '+power,()=>{
 const s=setup();s.active=0;s.format='advance';const a=inst('dm01-108'),b=inst('dm01-108'),spare=inst('dm01-108'),gr=inst(GR);a.powerModifiers=[{amount:power-e.power(a,false,s)}];b.powerModifiers=[{amount:3000-e.power(b,false,s)}];spare.powerModifiers=[{amount:1000-e.power(spare,false,s)}];s.players[1].battle=power===3000?[a,b,spare]:[a];s.players[0].gr=[gr];cast(s,LAMP);
 if(power===3000){pick(s,a.uid);pick(s,b.uid);assert.ok(!s.decision?.choices?.some(x=>(x.value?.uid||x.value)===spare.uid));if(s.decision?.choices?.some(x=>x.value===null))pick(s,null);}
 drain(s);assert.ok(s.players[0].battle.includes(gr));assert.equal(s.players[1].grave.includes(a),power===3000);if(power===3000){assert.ok(s.players[1].grave.includes(b));assert.ok(s.players[1].battle.includes(spare));}
});
test('行燈どろん shield trigger destroys an attacking creature within budget and GR summons without mana',()=>{
 const s=setup();s.active=0;s.format='advance';const enemy=inst('dm01-108'),gr=inst(GR);s.players[0].battle=[enemy];s.players[1].battle=[];s.players[1].mana=[];s.players[1].shields=[inst(LAMP)];s.players[1].gr=[gr];s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');pick(s,enemy.uid);if(s.decision?.choices?.some(x=>x.value===null))pick(s,null);drain(s);assert.ok(s.players[0].grave.includes(enemy));assert.ok(s.players[1].battle.includes(gr));assert.equal(s.players[1].mana.length,0);
});
