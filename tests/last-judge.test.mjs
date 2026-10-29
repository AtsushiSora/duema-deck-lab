import test from 'node:test';
import assert from 'node:assert/strict';
import {e,data,setup,give,inst,act} from './target-fixture.mjs';
import {manualModel} from '../dist/manual-ui.js';

const JUDGE='dm24ex4-012',BLOCKER='dm01-076',OTHER='dm01-108';
const pick=(s,value)=>{const a=e.getLegalActions(s).find(a=>a.kind==='extended'&&(typeof value==='function'?value(s.decision.choices[a.choice].value):JSON.stringify(s.decision.choices[a.choice].value)===JSON.stringify(value)));assert.ok(a,JSON.stringify(s.decision));e.step(s,a);};
const drain=s=>{for(let n=0;s.decision&&s.winner===null;n++){assert.ok(n<200,JSON.stringify(s.decision));e.step(s,e.chooseAI(s));}};
const start=(s,p=0)=>{s.active=1-p;s.phase='attack';act(s,'endTurn');};
const fixture=(n=1,hand=[BLOCKER])=>{const s=setup();give(s,0,'battle',[JUDGE,...Array(n-1).fill(BLOCKER)]);give(s,0,'hand',hand);give(s,0,'mana',[]);return s;};
const physical=s=>{const xs=e.physicalCards(s);assert.equal(new Set(xs.map(x=>x.uid)).size,xs.length);return xs.length;};

test('Final End is offered at own turn start, before drawing, and deploys chosen physical hand blockers without mana',()=>{
 const s=fixture(1,[BLOCKER,OTHER,BLOCKER]),uids=s.players[0].hand.map(x=>x.uid),n=physical(s),deck=s.players[0].deck.length;
 assert.ok(!e.getLegalActions(s).some(a=>a.label?.includes('ファイナル')));
 start(s);assert.equal(s.phase,'start');assert.equal(s.players[0].deck.length,deck);assert.match(s.decision.title,/ファイナル・エンド/);assert.match(manualModel(s).help,/ゲーム中1回/);
 pick(s,true);assert.equal(s.g7TerminalUsed[0],true);assert.equal(s.decision.task.op,'g34_Select');assert.equal(s.decision.choices.filter(c=>c.cardId===BLOCKER).length,2);assert.ok(!s.decision.choices.some(c=>c.cardId===OTHER));assert.match(manualModel(s).help,/0体/);
 pick(s,v=>v?.uid===uids[0]);assert.ok(s.players[0].hand.some(x=>x.uid===uids[0]),'selection waits for confirmation');pick(s,null);drain(s);
 assert.ok(s.players[0].battle.some(x=>x.uid===uids[0]));assert.ok(s.players[0].hand.some(x=>x.uid===uids[2]));assert.equal(s.players[0].mana.length,0);assert.equal(s.players[0].deck.length,deck-1);assert.equal(s.phase,'charge');assert.equal(physical(s),n);assert.ok(!s.extraTurns?.length);assert.ok(!s.metrics[0].played[BLOCKER]);
});

test('Final End can deploy multiple blockers and checks 11 versus12 after putting them',()=>{
 for(const total of[11,12]){const s=fixture(total-2,[BLOCKER,BLOCKER]);const ids=s.players[0].hand.map(x=>x.uid);start(s);pick(s,true);for(const uid of ids)pick(s,v=>v?.uid===uid);drain(s);assert.equal(s.players[0].battle.length,total);assert.equal(s.extraTurns?.length||0,total===12?1:0);assert.match(s.log.at(-2)?.text||s.log.map(x=>x.text).join(' '),new RegExp('ブロッカー'+total+'体'));}
});

test('Final End may put zero blockers, including an empty hand, and grants an already qualified extra turn',()=>{
 for(const hand of[[],[BLOCKER]]){const s=fixture(12,hand);start(s);pick(s,true);if(s.decision?.task.op==='g34_Select')pick(s,null);drain(s);assert.equal(s.extraTurns.length,1);assert.equal(s.players[0].battle.length,12);assert.equal(s.g7TerminalUsed[0],true);}
});

test('declining Final End preserves the declaration and offers it on the next own turn',()=>{
 const s=fixture();start(s);pick(s,null);assert.ok(!s.g7TerminalUsed?.[0]);start(s);assert.equal(s.decision.task.name,'terminal');
});

test('Final End is not offered on the opposing turn or when source abilities are ignored',()=>{
 const s=fixture();s.phase='attack';act(s,'endTurn');assert.equal(s.active,1);assert.notEqual(s.decision?.task?.name,'terminal');
 const t=fixture();give(t,1,'battle',['dmrp18-km3']);t.extLimits=[{kind:'g34Mute',player:0,expires:'start',who:1}];assert.equal(e.abilitiesIgnored(t,t.players[0].battle[0]),true);start(t);assert.notEqual(t.decision?.task?.name,'terminal');
});

test('all Final End copies share the once-per-game declaration with other terminal abilities',()=>{
 const s=fixture();s.g7TerminalUsed=[true,false];start(s);assert.notEqual(s.decision?.task?.name,'terminal');
 const t=fixture(2,[]);t.players[0].battle[1].cardId=JUDGE;start(t);assert.equal(t.decision.type,'effectOrder');act(t,'orderEffect');pick(t,true);drain(t);assert.equal(t.log.filter(x=>x.text?.includes('ファイナル・エンド（終極宣言）を使用')).length,1);assert.equal(t.g7TerminalUsed[0],true);
 for(const c of data.cards.filter(c=>c.voljaak||c.giantTerminal||c.g34Role==='engels')){const u=fixture(1,[]);u.players[0].battle.push(inst(c.id));u.g7TerminalUsed=[true,false];start(u);drain(u);assert.ok(!u.pendingEffects?.some(x=>x.source===c.id));assert.notEqual(u.decision?.task?.name,'terminal');}
});

test('Final End selections survive serialization and cannot pick the same physical card twice',()=>{
 let s=fixture(10,[BLOCKER,BLOCKER]);start(s);pick(s,true);const first=s.players[0].hand[0].uid;pick(s,v=>v?.uid===first);s=JSON.parse(JSON.stringify(s));assert.ok(!s.decision.choices.some(c=>c.value?.uid===first));pick(s,v=>v?.uid===s.players[0].hand[1].uid);drain(s);assert.equal(s.players[0].battle.length,12);assert.equal(s.extraTurns.length,1);assert.deepEqual(e.getLegalActions(JSON.parse(JSON.stringify(s))),e.getLegalActions(s));physical(s);
});

test('the extra turn remains after Last Judge and other blockers leave the battlefield',()=>{
 const s=fixture(12,[]);start(s);pick(s,true);drain(s);give(s,0,'battle',[]);s.phase='attack';act(s,'endTurn');drain(s);assert.equal(s.active,0);assert.equal(s.extraTurns.length,0);
});

test('CPU uses Final End to deploy legal hand blockers and does not waste it on an empty board gain',()=>{
 const s=fixture(10,[BLOCKER,BLOCKER]);start(s);drain(s);assert.equal(s.players[0].battle.length,12);assert.equal(s.extraTurns.length,1);
 const t=fixture(1,[]);start(t);drain(t);assert.ok(!t.g7TerminalUsed?.[0]);
});

test('Final End follows deployment prohibitions and entry replacements, rather than summoning',()=>{
 const s=fixture(11,[BLOCKER]);give(s,1,'battle',['dm26rp1-S008']);start(s);pick(s,true);drain(s);assert.equal(s.players[0].battle.length,11);assert.ok(!s.extraTurns?.length);
 const t=fixture(11,[JUDGE]);give(t,1,'battle',['dmx13-s02']);const uid=t.players[0].hand[0].uid;start(t);pick(t,true);pick(t,v=>v?.uid===uid);drain(t);assert.ok(t.players[0].grave.some(x=>x.uid===uid));assert.equal(t.players[0].battle.length,11);assert.ok(!t.extraTurns?.length);
 const u=fixture(1,['dm01-084']);give(u,1,'battle',['dmsp02-003']);start(u);pick(u,true);drain(u);assert.ok(u.players[0].battle.some(x=>x.cardId==='dm01-084'),'a summon-only prohibition does not block putting a creature');
});

test('Final End counts before entry-triggered abilities resolve and respects extra-turn prohibition',()=>{
 const s=fixture(10,[JUDGE,JUDGE]);give(s,1,'battle',[OTHER,OTHER]);const ids=s.players[0].hand.map(x=>x.uid);start(s);pick(s,true);for(const uid of ids)pick(s,v=>v?.uid===uid);assert.equal(s.extraTurns.length,1);assert.equal(s.decision.type,'effectOrder');assert.ok(s.players[1].battle.every(x=>!x.tapped));drain(s);assert.ok(s.players[1].battle.every(x=>x.tapped));
 const t=fixture(12,[]);give(t,1,'battle',['dm25ex1-054']);start(t);pick(t,true);drain(t);assert.ok(!t.extraTurns?.length);assert.equal(t.g7TerminalUsed[0],true);
});

test('Final End allows evolution blockers only with a legal base and keeps its physical evolution sources',()=>{
 const id='dm02-s01',s=fixture(1,[id]),base=inst(BLOCKER);s.players[0].battle.push(base);start(s);pick(s,true);pick(s,v=>v?.uid===s.players[0].hand[0].uid);assert.equal(s.decision.title,'出すクリーチャーの進化元を選ぶ');pick(s,base.uid);drain(s);assert.equal(s.players[0].battle.find(x=>x.cardId===id).under[0].uid,base.uid);
 const t=fixture(1,[id]);start(t);pick(t,true);drain(t);assert.ok(t.players[0].hand.some(x=>x.cardId===id));
});

test('using Final End blocks other queued terminal declarations and works for player1 too',()=>{
 const s=fixture(1,[]);start(s);pick(s,true);drain(s);
 for(const [op,source,name] of [['g7Terminal','dm23rp4-S05'],['g17_Terminal','dm23rp4-S07'],['g34_Custom','dm23rp4-OR1','engelsTerminal']]){const t=structuredClone(s);t.phase='main';t.extTasks=[{op,p:0,source,name}];act(t,'toAttack');assert.equal(t.decision,null);}
 const t=setup();give(t,1,'battle',[JUDGE,...Array(9).fill(BLOCKER)]);give(t,1,'hand',[BLOCKER,BLOCKER]);start(t,1);drain(t);assert.equal(t.players[1].battle.length,12);assert.deepEqual(t.g7TerminalUsed,[false,true]);assert.equal(t.extraTurns[0].player,1);
});
