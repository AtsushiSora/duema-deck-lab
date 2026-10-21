import test from 'node:test';import assert from 'node:assert/strict';
import {e,DOGI,VEG,GEN,GG,DREAM,ROD,Y,KIRA,RS,inst,give,act,setup,cast,attack,drain} from './target-fixture.mjs';

test('Genmu cannot be summoned for infinite printed mana, but Mugen Crime is offered from hand and grave with four untapped creatures',()=>{
 for(const origin of ['hand','grave']){const s=setup();give(s,0,origin,[GEN]);give(s,0,'battle',Array(4).fill('dm01-108'));s.players[0].battle.forEach(c=>c.entered=s.turn);assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'));act(s,'mugenStart',a=>a.origin===origin);assert.ok(s.players[0].battle.every(c=>!c.tapped));for(let n=0;n<4;n++)act(s,'mugenTap');const c=s.players[0].battle.find(c=>c.cardId===GEN);assert.ok(c);assert.equal(c.tapped,false);assert.equal(s.players[0].battle.filter(c=>c.tapped).length,4);assert.equal(s.players[0].mana.filter(c=>c.tapped).length,4);assert.equal(e.power(c,false,s),Infinity);assert.equal(e.card(c).cost,'∞');assert.equal(s.players[0][origin].length,0);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===c.uid));}
});
test('Mugen Crime requires water and darkness, four distinct ready creatures and entry permission; cancelling pays nothing',()=>{
 const s=setup();give(s,0,'hand',[GEN]);give(s,0,'battle',Array(4).fill('dm01-108'));give(s,0,'mana',Array(5).fill('dm01-108'));assert.ok(!e.getLegalActions(s).some(a=>a.kind==='mugenStart'));give(s,0,'mana',['dm01-083','dm01-090','dm01-108','dm01-108']);s.players[0].battle[0].tapped=true;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='mugenStart'));s.players[0].battle[0].tapped=false;act(s,'mugenStart');act(s,'mugenTap');act(s,'cancelMugen');assert.ok(s.players[0].battle.every(c=>!c.tapped));assert.ok(s.players[0].mana.every(c=>!c.tapped));s.players[0].entryLimitThisTurn=true;s.players[0].enteredThisTurn=1;assert.ok(!e.getLegalActions(s).some(a=>a.kind==='mugenStart'));
});
test('Genmu can be deployed by Dream Dragon, preserves its printed infinity in JSON and defeats finite power',()=>{
 const s=setup();give(s,0,'battle',[DREAM]);give(s,0,'deck',[GEN,'dm01-108']);attack(s);const c=s.players[0].battle.find(x=>x.cardId===GEN);assert.ok(c);drain(s);assert.ok(s.players[0].battle.includes(c));assert.equal(JSON.parse(JSON.stringify(e.card(c))).power,'∞');c.tapped=false;c.entered=0;give(s,1,'battle',[GG]);s.players[1].battle[0].tapped=true;attack(s,c.uid,s.players[1].battle[0].uid);act(s,'noBlock');assert.equal(s.players[1].battle.length,0);assert.ok(s.players[0].battle.includes(c));
});
test('infinite against infinite destroys both simultaneously and never produces NaN in state or logs',()=>{
 const s=setup();give(s,0,'battle',[GEN]);give(s,1,'battle',[GEN]);s.players[1].battle[0].tapped=true;attack(s,s.players[0].battle[0].uid,s.players[1].battle[0].uid);act(s,'noBlock');assert.equal(s.players[0].battle.length,0);assert.equal(s.players[1].battle.length,0);assert.equal(s.players[0].grave.at(-1).cardId,GEN);assert.equal(s.players[1].grave.at(-1).cardId,GEN);assert.ok(!JSON.stringify(s).includes('NaN'));
});
test('Genmu ignores both players low-cost creature keywords and entry effects while printed identity, power and pending effects survive',()=>{
 const s=setup();give(s,1,'battle',[GEN]);cast(s,'dm01-080');assert.equal(s.decision,null);const harcus=s.players[0].battle[0];assert.equal(e.card(harcus).race,'リキッド・ピープル');assert.equal(e.power(harcus,false,s),2000);give(s,0,'battle',['dm01-084']);assert.equal(e.effectiveCard(s.players[0].battle[0],s).blocker,undefined);give(s,1,'battle',[GEN,'dm01-084']);assert.equal(e.effectiveCard(s.players[1].battle[1],s).blocker,undefined);
 const t=setup();cast(t,'dm01-080');assert.equal(t.decision.type,'draw');t.players[1].battle.push(inst(GEN));const before=t.players[0].hand.length;act(t,'draw',a=>a.n===1);assert.equal(t.players[0].hand.length,before+1);
});
test('normal low-cost spells still pay mana and go to grave but their effects, judge and charger are ignored',()=>{
 const s=setup();give(s,1,'battle',[GEN]);give(s,0,'hand',[RS]);act(s,'play',a=>a.face===1);assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);assert.equal(s.players[0].grave.at(-1).cardId,RS);assert.equal(s.players[0].mana.length,50);assert.ok(!s.log.some(x=>x.type==='judgeResult'||x.type==='charger'));const before=s.players[0].mana.length;cast(s,'dm06-110');assert.equal(s.players[0].mana.length,before);assert.ok(s.log.some(x=>x.type==='spellIgnored'));
});
test('a low-cost creature S trigger executes under Genmu, but a low-cost spell is declared and remains in hand',()=>{
 const s=setup();give(s,0,'battle',[GEN]);give(s,1,'shields',['dm04-042','dm01-052']);attack(s);act(s,'noBlock');act(s,'infinityCount',a=>a.n===2);act(s,'infinityShield');act(s,'infinityShield');act(s,'useTrigger');act(s,'useTrigger');assert.ok(s.players[1].battle.some(x=>x.cardId==='dm04-042'));assert.ok(s.players[1].hand.some(x=>x.cardId==='dm01-052'));assert.equal(s.metrics[1].triggers,1);assert.ok(!s.log.some(x=>x.type==='draw'&&x.player===1));
});
test('a high-cost shield trigger can first remove Genmu and then unlock the already declared low-cost spell',()=>{
 const s=setup();give(s,0,'battle',[GEN]);give(s,1,'shields',['dm01-052','dm01-027']);attack(s);act(s,'noBlock');act(s,'infinityCount',a=>a.n===2);act(s,'infinityShield');act(s,'infinityShield');act(s,'useTrigger');act(s,'useTrigger');assert.equal(s.decision.effect,'destroy');act(s,'effect');assert.equal(s.decision.type,'draw');act(s,'draw',a=>a.n===1);assert.equal(s.metrics[1].triggers,2);assert.equal(s.players[0].battle.length,0);
});
test('Chakras Z rush is suppressed dynamically and returns when Genmu leaves; low-cost grants from Dogi are also ignored',()=>{
 const s=setup();give(s,0,'battle',[Y,DOGI,GEN,'dm23bd4-008']);const y=s.players[0].battle[0],multi=s.players[0].battle[3];y.hyperActive=true;assert.equal(e.power(y,false,s),4000);assert.equal(e.effectiveCard(y,s).blocker,undefined);assert.equal(e.effectiveCard(y,s).speedAttacker,undefined);assert.equal(e.canCastSpell(s,1,e.card('dm01-052')),true);s.active=1;cast(s,'dm01-027');act(s,'effect',a=>a.targets[0].uid===s.players[0].battle[2].uid);act(s,'allowLeave');assert.equal(y.hyperActive,true);assert.equal(e.power(y,false,s),7500);assert.equal(e.effectiveCard(y,s).blocker,true);assert.equal(e.effectiveCard(multi,s).speedAttacker,true);assert.equal(e.canCastSpell(s,1,e.card('dm01-052')),false);
});
test('previously resolved small spell buffs and unblock effects are ignored only while Genmu is present',()=>{
 const s=setup();give(s,0,'battle',[GG]);const top=s.players[0].battle[0];cast(s,'dm01-102');act(s,'effect');cast(s,'dm01-077');act(s,'effect');assert.equal(e.power(top,true,s),20000);s.players[1].battle.push(inst(GEN),inst('dm01-084'));assert.equal(e.power(top,true,s),18000);attack(s,top.uid);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'));act(s,'noBlock');if(s.decision)drain(s);s.players[1].battle=s.players[1].battle.filter(x=>x.cardId!==GEN);assert.equal(e.power(top,true,s),20000);
});
test('infinity breaker allows zero, any subset simultaneously and does not turn breaking the last shield into direct damage',()=>{
 for(const n of [0,2,5]){const s=setup();give(s,0,'battle',[GEN]);attack(s);act(s,'noBlock');assert.equal(s.decision.type,'infinityCount');act(s,'infinityCount',a=>a.n===n);for(let i=0;i<n;i++)act(s,'infinityShield');assert.equal(s.players[1].shields.length,5-n);assert.equal(s.metrics[0].breaks,n);assert.equal(s.winner,null);}
});
test('a finite spell or creature cost never beats an infinite judge cost; equal infinity is a judge win',()=>{
 const s=setup();give(s,0,'battle',[RS]);give(s,0,'deck',[GEN,'dm01-108']);give(s,1,'deck',[GEN,'dm01-108']);attack(s);assert.equal(s.decision.type,'judgeContinue');assert.ok(s.log.some(x=>x.type==='judgeResult'&&x.text.includes('∞ 対 ∞、勝ち')));assert.equal(JSON.parse(JSON.stringify(s)).judge.costs[0],'∞');
});
