import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,inst,e,RS} from './target-fixture.mjs';
import {projectRoom} from '../server/duel-core.mjs';
import {onlineScreenHTML,onlineDialogContent,onlineWaitStatus} from '../dist/online-ui.js';
import {creatureStatusModel} from '../dist/battle-insights.js';
const users=[{uid:'host',name:'自分'},{uid:'guest',name:'友達'}];
const roomFor=s=>({hostUid:'host',guestUid:'guest',profiles:users,code:'1234567890ABCDEF',phase:'playing',revision:3,engineVersion:e.ENGINE_VERSION,expiresAt:Date.now()+60000,updatedAt:Date.now(),events:[],game:s});
const art=id=>`<span data-art="${id}"></span>`;
for(const seat of [0,1])test('online mana and unavailable hand reasons use the canonical engine for seat '+seat+' without changing saves or opponent privacy',()=>{
 const s=setup();s.active=seat;s.players[seat].mana=[inst('dm01-097'),{...inst('dm01-097'),tapped:true}];s.players[seat].hand=[inst(RS)];s.players[1-seat].hand=[{...inst('dm01-108'),uid:'private-opponent-uid'}];
 const before=structuredClone(s),actions=e.getLegalActions(s),r=projectRoom(roomFor(s),users[seat]),own=r.game.players[seat];
 assert.equal(own.manaSummary.available,e.manaValueAt(s,seat,s.players[seat].mana[0]));assert.match(own.hand[0].unavailableReason,/マナ|文明/);
 assert.doesNotMatch(JSON.stringify(r),/private-opponent-uid/);assert.deepEqual(r.game.players[1-seat].hand,[]);
 assert.deepEqual(r.game.actions.map(a=>a.id),actions.map(a=>a.id));assert.deepEqual(s,before);
 const html=onlineScreenHTML({room:r,connected:true},{user:users[seat],selected:own.hand[0].uid,actionsOpen:true});assert.match(html,/使用可能 1マナ/);assert.match(html,/online-card-reason/);assert.match(html,/マナが不足/);
});
test('normal mana summary respects zero-value and boosted mana rather than counting untapped cards',()=>{
 const s=setup();s.players[0].mana=[inst('dm01-097')];s.g35ZeroMana=[{p:0}];
 assert.equal(projectRoom(roomFor(s),users[0]).game.players[0].manaSummary.available,0);
 delete s.g35ZeroMana;s.players[0].battle=[inst('dm22rp2-S7'),...Array.from({length:4},()=>inst('dm01-108'))];
 assert.equal(e.manaValueAt(s,0,s.players[0].mana[0]),2);
 assert.equal(projectRoom(roomFor(s),users[0]).game.players[0].manaSummary.available,2);
});
test('opponent decision status reveals only that a choice is pending, never its title or private candidates',()=>{
 const s=setup();s.players[0].hand=[{...inst(RS),uid:'secret-choice-uid'}];s.decision={type:'extended',player:0,title:'PRIVATE TITLE',source:RS,task:{op:'g27_HandTop',p:0},choices:[{label:'PRIVATE LABEL',value:s.players[0].hand[0].uid,cardId:RS}]};
 const r=projectRoom(roomFor(s),users[1]);assert.equal(r.game.waitingForChoice,true);assert.equal(r.game.decision,null);assert.equal(onlineWaitStatus({room:r,connected:true}),'相手が効果・支払いを選択中');assert.doesNotMatch(JSON.stringify(r),/PRIVATE|secret-choice-uid/);
 assert.match(onlineWaitStatus({room:r,connected:true,busy:true}),/送信/);assert.match(onlineWaitStatus({room:r,connected:false,retry:{automatic:true}}),/再接続中/);assert.equal(onlineWaitStatus({room:r,connected:false,retry:{automatic:false}}),'再接続してください');
});
for(const viewer of [0,1])test('public battle status and effect expiry use viewer-relative ownership at seat '+viewer,()=>{
 const s=setup(),x=inst('dm01-097');x.powerModifiers=[{amount:3000,expires:'start',who:1}];s.players[0].battle=[x];s.phase='attack';const before=structuredClone(s),r=projectRoom(roomFor(s),users[viewer]),c=r.game.players[0].battle[0];
 assert.ok(c.status.effects.some(x=>x.name==='パワー +3,000'&&x.until==='次の'+(viewer===1?'自分':'相手')+'のターン開始まで'));
 const html=onlineScreenHTML({room:r,connected:true},{user:users[viewer],selected:c.uid,actionsOpen:true,art});assert.match(html,/適用中の効果と期限/);assert.match(html,/パワー \+3,000/);assert.deepEqual(s,before);
 x.faceDown=true;const other=projectRoom(roomFor(s),users[1]).game.players[0].battle[0];assert.equal(other.status,undefined);assert.equal(other.id,undefined);
});
test('power effect labels distinguish fixed, multiplied, battle-only and negative infinite changes',()=>{
 const s=setup(),x=inst('dm01-097');s.players[0].battle=[x];x.powerModifiers=[{fixedPower:5000},{multiplier:2},{amount:3000,attackOnly:true,expires:'end',who:s.active},{amount:'-infinity',g1237BattleToken:'battle'}];
 const m=creatureStatusModel(s,0,x.uid);assert.ok(m.effects.some(x=>x.name==='パワー固定 5,000'));assert.ok(m.effects.some(x=>x.name==='パワー ×2'));assert.ok(m.effects.some(x=>x.name==='攻撃中のみ：パワー +3,000'));assert.ok(m.effects.some(x=>x.name==='パワー -∞'&&x.until==='このバトル終了まで'));assert.doesNotMatch(JSON.stringify(m),/NaN|undefined/);
});
test('image zone browsing prioritizes legal own summons and list mode survives re-render without exposing hidden art',()=>{
 const s=setup(),r=projectRoom(roomFor(s),users[0]),g=r.game;g.players[0].grave=[{uid:'not-ready',id:'x',name:'その他'},{uid:'ready',id:'y',name:'使えるカード'},{uid:'hidden',hidden:true,id:'SECRET',name:'SECRET'}];g.actions=[{id:5,kind:'play',uid:'ready'}];
 const scope={kind:'zone',player:0,zone:'grave'},before=structuredClone(r),images=onlineDialogContent(r,scope,{art}).html;
 assert.ok(images.indexOf('data-uid="ready"')<images.indexOf('data-uid="not-ready"'));assert.match(images,/使用可能/);assert.match(images,/data-art="y"/);assert.doesNotMatch(images,/SECRET/);
 const list=onlineDialogContent(r,{...scope,displayMode:'list'},{art}).html;assert.match(list,/is-list/);assert.doesNotMatch(list,/data-art=/);assert.deepEqual(r,before);
 g.players[1].extra=g.players[0].grave;assert.doesNotMatch(onlineDialogContent(r,{kind:'zone',player:1,zone:'extra'},{art}).html,/使用可能|SECRET/);
});
test('folding the hand leaves the board and primary action intact and is purely presentation state',()=>{
 const r=projectRoom(roomFor(setup()),users[0]),state={room:r,connected:true},before=structuredClone(state),html=onlineScreenHTML(state,{user:users[0],handCollapsed:true});
 assert.match(html,/is-hand-collapsed/);assert.match(html,/data-action="online-hand-toggle"[^>]*aria-expanded="false"/);assert.match(html,/id="online-hand-cards"[^>]*hidden/);assert.match(html,/data-action="online-primary"/);assert.match(html,/opponent-field/);assert.deepEqual(state,before);
});
test('attack permission overriding a printed prohibition is reflected in the shared explanation',()=>{
 const s=setup(),x=inst('dm01-048');s.phase='attack';s.turn=8;s.players[0].battle=[x];
 s.extLimits=[{kind:'g521Grant',ref:{uid:x.uid,incarnation:0},grant:{g1739AttackFreedom:'all'},expires:'end',who:0}];
 assert.equal(e.canCreatureAttack(s,0,x),true);assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===x.uid));
 assert.equal(creatureStatusModel(s,0,x.uid).rows.find(([label])=>label==='攻撃')[1],'攻撃可能');
});
