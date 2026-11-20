import test from 'node:test';
import assert from 'node:assert/strict';
import {e,setup,inst,act,cast,drain,data} from './target-fixture.mjs';
const GR='dmsd11-014',PAI='dmrp09-093';
function pick(s,uid){const a=e.getLegalActions(s).find(a=>{const v=s.decision?.choices?.[a.choice]?.value;return uid===null?v===null:(v?.uid||v)===uid;});assert.ok(a,JSON.stringify(s.decision));e.step(s,a);drain(s);}
for(const choice of ['self','decline','indestructible','blocked'])test('PAIPAI・ピンナポー handles '+choice+' using the voluntary destruction attempt, including QA36427',()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR);s.players[0].gr=[top];if(choice==='blocked')s.extLimits=[{kind:'summon',player:0,max:2}];const safe=inst('dmd03-002');if(choice==='indestructible')s.players[0].battle=[safe];cast(s,PAI);const self=s.players[0].battle.find(x=>x.cardId===PAI);assert.ok(self);pick(s,choice==='decline'?null:choice==='indestructible'?safe.uid:self.uid);
 assert.equal(s.players[0].battle.includes(top),!['decline','blocked'].includes(choice));
 if(choice==='self'||choice==='blocked')assert.ok(s.players[0].grave.includes(self));else assert.ok(s.players[0].battle.includes(self));
 if(choice==='indestructible')assert.ok(s.players[0].battle.includes(safe));
});
for(const blocked of [false,true])test('TEKUTEKU・ボンバヘイ summons for its owner when destroyed on the opposing turn, blocked='+blocked,()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR);s.players[0].gr=[top];cast(s,'dmrp09-094');drain(s);assert.equal(s.players[0].gr[0],top);const source=s.players[0].battle.find(x=>x.cardId==='dmrp09-094');s.active=1;if(blocked)s.extLimits=[{kind:'summon',player:0,max:2}];cast(s,'dm01-027');drain(s);assert.ok(s.players[0].grave.includes(source));assert.equal(s.players[0].battle.includes(top),!blocked);assert.equal(s.players[1].gr?.length||0,0);
});
for(const blocked of [false,true])test('サイバー a.k.a. 獅子 draws three then discards two independently of GR availability '+blocked,()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR);s.players[0].gr=[top];if(blocked)s.extLimits=[{kind:'summon',player:0,max:2}];const deck=s.players[0].deck.length;cast(s,'dmrp10-077');drain(s);assert.equal(s.players[0].deck.length,deck-3);assert.equal(s.players[0].hand.length,1);assert.equal(s.players[0].grave.length,3);assert.equal(s.players[0].battle.includes(top),!blocked);
});
for(const eligible of [false,true])test('ドトシオール・タバローチェ recovers only a spell and still GR summons with no eligible recovery '+eligible,()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR),creature=inst('dm01-108'),spell=inst('dm06-110');s.players[0].gr=[top];s.players[0].grave=[creature,...eligible?[spell]:[]];cast(s,'dmbd11-a05');drain(s);assert.ok(s.players[0].battle.includes(top));assert.ok(s.players[0].grave.includes(creature));assert.equal(s.players[0].hand.includes(spell),eligible);
});
for(const targetGR of [false,true])test('マン・オブ・すて～る sends a creature to its owner mana or super GR and then summons its own GR '+targetGR,()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst(GR),enemy=inst(targetGR?GR:'dm01-108');enemy.cardOwner=1;s.players[0].gr=[top];s.players[1].gr=[inst('dmsd08-016')];s.players[1].battle=[enemy];const mana=s.players[1].mana.length;cast(s,'dmrp09-028');drain(s);assert.ok(!s.players[1].battle.includes(enemy));assert.ok(s.players[0].battle.includes(top));assert.equal(s.players[1].mana.length,mana+(targetGR?0:1));assert.equal(targetGR?s.players[1].gr.at(-1):s.players[1].mana.at(-1),enemy);
});
test('マン・オブ・すて～る uses S trigger without mana and GR summons for the shield owner',()=>{const s=setup();s.active=0;s.format='advance';s.players[0].battle=[inst('dm01-108')];s.players[1].battle=[];s.players[1].mana=[];s.players[1].shields=[inst('dmrp09-028')];const top=inst(GR);s.players[1].gr=[top];s.phase='attack';act(s,'attack',a=>a.target==='player');act(s,'noBlock');act(s,'useTrigger');drain(s);assert.ok(s.players[1].battle.includes(top));assert.equal(s.players[1].mana.length,0);assert.equal(s.winner,null);});
