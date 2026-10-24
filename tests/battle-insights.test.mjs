import test from 'node:test';import assert from 'node:assert/strict';
import {e,setup,give,inst,act,attack,data,PRESETS,RS} from './target-fixture.mjs';
import {creatureStatusModel,creatureStatusHTML,effectExpiry,paymentReviewModel,paymentReviewHTML,recordBattleAction,createBattleReport,encodeBattleData,decodeBattleData} from '../dist/battle-insights.js';
const N='dm01-108',GS='dmsd17-014';const art=id=>`<i data-art="${id}"></i>`;
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
function guarded(){const s=setup();give(s,0,'shields',[GS]);give(s,1,'battle',[N,N]);s.active=1;attack(s);act(s,'noBlock');pick(s,true);pick(s,s.players[1].battle[1].uid);return s;}
test('card status combines real tap state, attack restrictions and correct G Strike expiry, and refreshes at turn end',()=>{
 const s=guarded(),x=s.players[1].battle[1],before=structuredClone(s),m=creatureStatusModel(s,1,x.uid);
 assert.ok(m.rows.some(r=>r[0]==='状態'&&r[1]==='アンタップ'));assert.match(m.rows.find(r=>r[0]==='攻撃')[1],/カードの効果/);assert.ok(m.effects.some(e=>e.name==='G・ストライク：攻撃不可'&&e.until==='このターン終了まで'));assert.match(creatureStatusHTML(s,1,x.uid,{art}),/適用中の効果と期限/);assert.deepEqual(s,before);
 act(s,'endTurn');assert.ok(!creatureStatusModel(s,1,x.uid).effects.some(e=>e.name.includes('攻撃不可')));
});
test('ready and tapped creatures explain the actual phase, player and legal attack availability',()=>{
 const s=setup();give(s,0,'battle',[N]);const x=s.players[0].battle[0];let m=creatureStatusModel(s,0,x.uid);assert.match(m.rows.find(r=>r[0]==='攻撃')[1],/自分の攻撃ステップ/);
 s.phase='attack';m=creatureStatusModel(s,0,x.uid);assert.equal(m.rows.find(r=>r[0]==='攻撃')[1],'攻撃可能');x.tapped=true;assert.match(creatureStatusModel(s,0,x.uid).rows.find(r=>r[0]==='攻撃')[1],/タップ中/);
 give(s,1,'battle',[N]);assert.match(creatureStatusModel(s,1,s.players[1].battle[0].uid).rows.find(r=>r[0]==='攻撃')[1],/現在は自分のターン/);
});
test('nested evolution sources and EX Life shields are public and counted from current physical cards',()=>{
 const id=data.cards.find(c=>c.exLife).id,s=setup();give(s,0,'battle',[id]);const x=s.players[0].battle[0];x.under=[{...inst(N),under:[inst(N)]}];x.exLifeShieldUid=s.players[0].shields[2].uid;
 let m=creatureStatusModel(s,0,x.uid);assert.equal(m.sources.length,2);assert.ok(m.rows.some(r=>r[0]==='EXライフ'&&r[1].includes('シールド3')));
 s.players[0].shields.splice(2,1);m=creatureStatusModel(s,0,x.uid);assert.ok(m.rows.some(r=>r[0]==='EXライフ'&&r[1]==='対応するシールドなし'));
});
test('sealed and facedown cards and facedown sources do not expose names or artwork',()=>{
 const s=setup();give(s,1,'battle',[N]);const x=s.players[1].battle[0];x.sealed=true;let html=creatureStatusHTML(s,1,x.uid,{art});assert.ok(!html.includes(e.card(N).name));assert.ok(!html.includes('data-art'));
 delete x.sealed;x.under=[{...inst('PRIVATE_CARD_ID'),faceDown:true}];html=creatureStatusHTML(s,1,x.uid,{art});assert.ok(!html.includes('PRIVATE_CARD_ID'));assert.match(html,/裏向きのカード/);assert.equal(creatureStatusModel(s,9,x.uid),null);assert.equal(creatureStatusModel(s,1,'gone'),null);
});
test('temporary power, untap locks and skipped untap show their own durations without changing state',()=>{
 const s=setup();give(s,0,'battle',[N]);const x=s.players[0].battle[0];x.powerModifiers=[{amount:2000,expires:'end',who:s.active}];x.tapLocks=[1];x.skipUntap=true;const before=structuredClone(s),m=creatureStatusModel(s,0,x.uid);
 assert.ok(m.effects.some(e=>e.name==='パワー +2,000'&&e.until==='このターン終了まで'));assert.ok(m.effects.some(e=>e.name==='アンタップ制限'&&e.until==='次の相手のターン開始まで'));assert.ok(m.effects.some(e=>e.name.includes('アンタップしない')));assert.deepEqual(s,before);
 assert.equal(effectExpiry(s,{expires:'start',who:0}),'次の自分のターン開始まで');
});
test('attack status ignores stale incarnations and restrictions ignored by the active board',()=>{
 const s=guarded(),x=s.players[1].battle[1];x.incarnation=(x.incarnation||0)+1;assert.ok(!creatureStatusModel(s,1,x.uid).effects.some(e=>e.name.includes('攻撃不可')));
 x.incarnation--;s.players[1].battle.push(inst('dm25rp3-DM1'));assert.ok(!creatureStatusModel(s,1,x.uid).effects.some(e=>e.name.includes('攻撃不可')));
});
test('payment review uses the actual spell face and shows only explicitly selected mana',()=>{
 const s=setup();give(s,0,'hand',[RS]);const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.face===1);e.step(s,a,{manualMana:true});assert.equal(s.decision.type,'manaPayment');
 const d=s.decision,before=structuredClone(s);let m=paymentReviewModel(s);assert.equal(m.name,e.playFaces(e.card(RS))[1].name);assert.equal(m.method,'呪文を唱える');assert.equal(m.selected.length,0);assert.match(paymentReviewHTML(s),/未選択/);assert.deepEqual(s,before);
 e.step(s,e.getLegalActions(s).find(a=>a.kind==='selectMana'));m=paymentReviewModel(s);assert.equal(m.selected.length,1);assert.equal(m.selected[0].uid,d.selected[0]);assert.match(paymentReviewHTML(s),/実行する内容/);
});
test('payment review retains the chosen physical NEO base and names no-base summons correctly',()=>{
 for(const index of [null,0,1]){const s=setup();give(s,0,'hand',['dm25rp4-050']);give(s,0,'battle',[N,N]);const a=e.getLegalActions(s).find(a=>a.alternative==='golgy'&&a.baseUid===(index===null?null:s.players[0].battle[index].uid));e.step(s,a,{manualMana:true});const m=paymentReviewModel(s);assert.equal(m.cost,2);
  if(index===null)assert.equal(m.context,'進化元なしで召喚');else{assert.match(m.method,/進化/);assert.ok(m.context.includes('場'+(index+1)+' '+e.card(N).name));}
 }
});
test('multi-base grave evolution review keeps every selected base through the deferred payment',()=>{
 const s=setup();give(s,0,'grave',[N,'dmbd16-008']);give(s,0,'hand',['dm22ex1-007']);
 const move=(kind,pred=()=>true)=>{const a=e.getLegalActions(s).find(a=>a.kind===kind&&pred(a));assert.ok(a);e.step(s,a,{manualMana:true});};
 move('play');move('evolve');move('extended',a=>s.decision.choices[a.choice].value===s.players[0].grave[1].uid);move('extended',a=>s.decision.choices[a.choice].value===false);assert.equal(s.decision.type,'manaPayment');const m=paymentReviewModel(s);assert.ok(m.context.includes('墓地1'));assert.ok(m.context.includes('墓地2'));assert.equal(m.cost,10);
});
test('recording human and CPU actions is transparent and a saved report reproduces the last move',()=>{
 const s=setup();give(s,0,'hand',[N]);const owner={state:s,decks:[{...PRESETS[0],accountToken:'NEVER_INCLUDE'}],accountToken:'NEVER_INCLUDE'},a=e.getLegalActions(s).find(a=>a.kind==='play'),expected=structuredClone(s);e.step(expected,a,{manualMana:true});
 recordBattleAction(owner,a,{manualMana:true},e.step);assert.deepEqual(s,expected);assert.equal(owner.recentActions.length,1);
 const before=structuredClone(owner),report=createBattleReport(owner,{appVersion:'0.87.0',engineVersion:e.ENGINE_VERSION,note:'除去の動作を確認',createdAt:'test'});assert.deepEqual(owner,before);assert.ok(!encodeBattleData(report).includes('NEVER_INCLUDE'));assert.equal(report.note,'除去の動作を確認');
 const replay=structuredClone(report.beforeLastAction);e.step(replay,report.recentActions.at(-1).action,{manualMana:true});assert.deepEqual(replay,report.state);
 report.state.phase='changed';assert.notEqual(s.phase,'changed');
});
test('failed moves are recorded without losing the pre-action snapshot and recent action history is bounded',()=>{
 const owner={state:setup()};for(let i=0;i<65;i++)recordBattleAction(owner,{player:0,kind:'test',label:'view'}, {},()=>{});assert.equal(owner.recentActions.length,60);
 const before=structuredClone(owner.state);assert.throws(()=>recordBattleAction(owner,{player:0,kind:'invalid'},{},()=>{throw Error('illegal');}));assert.equal(owner.recentActions.at(-1).error,'illegal');assert.deepEqual(owner.beforeLastAction,before);assert.deepEqual(owner.state,before);
});
test('diagnostic and resume encoding preserves infinity and plain Unicode content',()=>{
 const value={power:Infinity,minus:-Infinity,note:'対戦\n確認',rows:[{id:'a'}]};assert.deepEqual(decodeBattleData(encodeBattleData(value)),value);
});
