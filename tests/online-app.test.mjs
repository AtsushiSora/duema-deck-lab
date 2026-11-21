import * as appFeatures from './app-features-fixture.mjs';
import * as characterRoster from '../dist/character-roster.js';
import * as extraCharacters from '../dist/character-challenge.js';
import {routeToAction} from './navigation-route-helper.mjs';
import {PHOTO_OCTOBER_DECKS,PHOTO_OCTOBER_28_DECKS,PHOTO_RECENT_DECKS} from '../dist/photo-october-decks.js';
import * as championLibrary from '../dist/champions.js';
import * as opponentProgress from '../dist/opponent-progress.js';
import * as updates from '../dist/app-updates.js';
import {createCardArt} from '../dist/card-art.js';
import test from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import fs from'node:fs';import{e,PRESETS,data,details,snapshot}from'./target-fixture.mjs';import*as info from'../dist/card-info.js';import*as manual from'../dist/manual-ui.js';import*as environment from'../dist/environment.js';import*as starter from'../dist/starter25.js';import{createCatalogue}from'../dist/catalogue.js';import{prepareDeckCopy}from'../dist/deck-copy.js';import{createAccountClient}from'../dist/account.js';import{accountScreenHTML}from'../dist/account-ui.js';import{mergeAccountSnapshot}from'../dist/account-data.js';import{createOnlineClient}from'../dist/online.js';import{onlineScreenHTML,onlinePrimaryAction,onlinePendingMove}from'../dist/online-ui.js';import{createDuelService,DuelError,openRoom,sealRoom}from'../server/duel-core.mjs';import{createDuelHandler}from'../server/duel-handler.mjs';import{randomBytes}from'node:crypto';import{bindFittedBoard}from'../dist/board-fit.js';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href)),tick=()=>new Promise(r=>setImmediate(r));
function harness({origin='https://duema-deck-lab.netlify.app'}={}){const key=randomBytes(32).toString('base64'),root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},listeners={},errors=[],writes=[],copied=[],nodes={},classes=new Set(),registry=createCatalogue(snapshot,data.cards,details),local={decks:[{...structuredClone(PRESETS[0]),id:'mine',name:'自分の40枚'}],friends:[],history:[{id:'existing-result'}],selected:'mine'},rooms=new Map(),sessions=new Map();let version=0,watch;
 const service=createDuelService({key,code:()=> '1122334455667788',seed:()=>42,store:{getRoom:async c=>structuredClone(rooms.get(c)||null),getSession:async uid=>structuredClone(sessions.get(uid)||null),commit:async({doc,previous,session})=>{const old=rooms.get(doc.code);if(old?old.version!==previous:previous!==null)throw new DuelError('room/conflict','競合',409);if(session){const prior=sessions.get(session.uid);if(prior?prior.version!==session.previous:session.previous!==null)throw new DuelError('room/conflict','セッション更新競合',409);}rooms.set(doc.code,{doc:structuredClone(doc),version:String(++version)});if(session)sessions.set(session.uid,{code:session.code,version:String(version)});}}}),handler=createDuelHandler({service,verifyToken:async t=>({uid:t,name:t==='u1'?'自分':'友達',firebase:{sign_in_provider:'google.com'}})}),onlineFactory=options=>createOnlineClient({...options,timer:()=>1,cancel(){},fetcher:(url,opts)=>handler(new Request('https://duema-deck-lab.netlify.app'+url,opts))}),accountFactory=options=>createAccountClient({...options,fetchConfig:async()=>({schemaVersion:1,firebase:{projectId:'duema-example',authDomain:'duema-example.firebaseapp.com',apiKey:'AIza'+'x'.repeat(35),appId:'1:123:web:abc123'}}),createAdapter:async()=>({watch(cb){watch=cb;queueMicrotask(()=>cb(null));return()=>{};},signIn:()=>watch({uid:'u1',name:'自分',email:'u@example.com'}),signOut:()=>watch(null),getIdToken:async()=> 'u1',read:async()=>null})});
 const ctx=vm.createContext({...appFeatures,...characterRoster,...extraCharacters,PHOTO_OCTOBER_DECKS,PHOTO_OCTOBER_28_DECKS,PHOTO_RECENT_DECKS,...championLibrary,...opponentProgress,...updates,createCardArt,...e,...info,...manual,...environment,...starter,bindFittedBoard,createAccountClient:accountFactory,createOnlineClient:onlineFactory,onlineScreenHTML,onlinePrimaryAction,onlinePendingMove,accountScreenHTML,mergeAccountSnapshot,battleCard:e.card,createCatalogue,prepareDeckCopy,PRESETS,fixtureRegistry:registry,fixtureData:data,fixtureSaved:local,console:{error:e=>errors.push(e)},structuredClone,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,URLSearchParams,Intl,Date,fetch:async url=>({ok:true,json:async()=>structuredClone(url.startsWith('cards.json')?data:url.startsWith('catalogue.json')?snapshot:details)}),navigator:{clipboard:{writeText:async s=>copied.push(s)}},localStorage:{getItem:()=>null,setItem:(key,v)=>writes.push({key,value:JSON.parse(v)})},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},document:{querySelector:q=>q==='#app'?root:q==='#dialog'?dialog:q==='#toast'?{textContent:'',classList:{add(){},remove(){}}}:nodes[q]||null,querySelectorAll:()=>[],body:{classList:{toggle(c,value){value?classes.add(c):classes.delete(c);}}},addEventListener:(k,f)=>listeners[k]=f},window:{addEventListener(){},scrollTo(){}},location:{hash:'',pathname:'/',origin,reload(){}},history:{replaceState(){}}});vm.runInContext(source,ctx);vm.runInContext('registry=fixtureRegistry;cards=registry.cards;battleCards=fixtureData.cards;metadata=fixtureData;environmentDecks=resolveEnvironmentDecks(registry);starterDecks=resolveStarter25Decks(registry);saved=fixtureSaved;view="battle";render();',ctx);const read=c=>vm.runInContext(c,ctx),click=async(action,extra={})=>{if(await routeToAction({action,extra,getHTML:()=>dialog.open?dialog.innerHTML:root.innerHTML,fire:(action,extra)=>listeners.click({target:{closest:()=>({dataset:{action,...extra},closest:()=>null})}})}))return;const html=dialog.open?dialog.innerHTML:root.innerHTML;assert.ok([...html.matchAll(/<button\b([^>]*)>/g)].some(m=>m[1].includes(`data-action="${action}"`)&&!/\bdisabled\b/.test(m[1])&&Object.entries(extra).every(([k,v])=>m[1].includes(`data-${k}="${v}"`))),'visible '+action);await listeners.click({target:{closest:()=>({dataset:{action,...extra},closest:()=>null})}});for(let n=0;n<4;n++)await tick();assert.deepEqual(errors,[]);};return{root,dialog,read,click,change:async(id,value)=>{await listeners.change({target:{id,value,matches:()=>false}});assert.deepEqual(errors,[]);},dispatch:async(action,extra={})=>{await listeners.click({target:{closest:()=>({dataset:{action,...extra},closest:()=>null})}});await tick();assert.deepEqual(errors,[]);},writes,copied,nodes,classes,service,game:()=>openRoom(rooms.get(read('onlineState.room.code')).doc,key).game,async editGame(fn){const row=rooms.get(read('onlineState.room.code')),state=openRoom(row.doc,key);fn(state.game);state.revision++;row.doc=sealRoom(state,key);row.version=String(++version);await click('online-refresh');},async login(){await click('nav',{view:'online'});await click('nav',{view:'account'});await click('account-login');await click('nav',{view:'online'});},async friend(){const code=read('onlineState.room.code');await service.join({code,deck:PRESETS[1],requestId:'friend-join-123456789'}, {uid:'u2',name:'友達'},'u2');await click('online-refresh');}};
}
test('actual app offers online entry, Google login, deck-backed room creation and an invitation with no token',async()=>{const h=harness();await h.login();assert.match(h.root.innerHTML,/data-action="online-create"/);await h.click('online-create');assert.match(h.root.innerHTML,/友達を待っています/);assert.equal(h.read('onlineState.room.phase'),'waiting');await h.click('online-copy-link');assert.equal(h.copied[0],'https://duema-deck-lab.netlify.app/?view=online&room=1122334455667788');assert.equal(h.read('saved.history[0].id'),'existing-result');h.read('onlineClient.dispose()');});
test('actual app receives the second player, renders a fixed board, sends legal moves and keeps the persisted room after navigation',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();assert.equal(h.classes.has('online-playing'),true);assert.match(h.root.innerHTML,/online-hand-track/);assert.ok(!h.root.innerHTML.includes('id="online-controls"'));await h.click('online-card',{uid:h.read('onlineState.room.game.players[0].hand[0].uid')});const index=String(h.read('onlineState.room.game.actions[0].id')),revision=h.read('onlineState.room.revision');await h.click('online-move',{index,revision:String(revision)});assert.equal(h.read('onlineState.room.revision'),revision+1);await h.click('online-menu');await h.click('online-leave');assert.equal(h.read('view'),'battle');assert.equal(h.classes.has('online-playing'),false);await h.click('nav',{view:'online'});assert.equal(h.read('onlineState.room.phase'),'playing');h.read('onlineClient.dispose()');});
test('actual app requires resignation confirmation, records the online result separately and preserves AI history',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-confirm-resign');assert.match(h.dialog.innerHTML,/投了しますか/);assert.equal(h.read('onlineState.room.phase'),'playing');await h.click('online-resign');assert.equal(h.read('onlineState.room.phase'),'finished');assert.equal(h.read('saved.onlineHistory[0].result'),'負け');assert.equal(h.read('saved.history[0].id'),'existing-result');assert.equal(h.writes.at(-1).key,'duema-deck-lab-v1');h.read('onlineClient.dispose()');});

test('online card selection and field overview use an overlay without replacing the board or revealing the opposing hand',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();const uid=h.read('onlineState.room.game.players[0].hand[0].uid');assert.ok(!h.root.innerHTML.includes('online-hand-list'));assert.ok(!h.root.innerHTML.includes('手札一覧'));await h.click('online-card',{uid});assert.equal(h.dialog.open,false);assert.equal(h.read('onlineSelected'),uid);assert.match(h.root.innerHTML,/class="online-controls"/);assert.match(h.root.innerHTML,/class="online-board play-board"/);assert.match(h.root.innerHTML,/data-action="card-detail"/);await h.click('online-actions-close');assert.ok(!h.root.innerHTML.includes('id="online-controls"'));await h.click('online-field',{player:'1'});assert.match(h.dialog.innerHTML,/友達のバトルゾーン/);assert.match(h.dialog.innerHTML,/クリーチャーはまだいません/);h.read('onlineClient.dispose()');});

test('online contextual phase button submits one current move and stale revisions are ignored',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();const revision=String(h.read('onlineState.room.revision'));assert.match(h.root.innerHTML,/マナを置かずに進む/);await h.click('online-primary',{revision});assert.equal(h.read('onlineState.room.game.phase'),'main');assert.equal(h.read('onlineState.room.revision'),Number(revision)+1);assert.match(h.root.innerHTML,/攻撃へ進む/);const before=h.read('onlineState.room.revision');await h.dispatch('online-primary',{revision});assert.equal(h.read('onlineState.room.revision'),before);await h.click('online-menu');await h.click('online-all-actions');assert.equal(h.dialog.open,false);assert.match(h.root.innerHTML,/online-action-drawer/);h.read('onlineClient.dispose()');});

test('online end turn reviews remaining attacks, cancels safely and rejects a duplicate confirmation',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.editGame(s=>{s.phase='attack';s.active=0;s.decision=null;s.players[0].battle=[{cardId:'dm01-108',uid:'ready',entered:0,tapped:false}];s.players[1].battle=[];});
 const revision=String(h.read('onlineState.room.revision')),before=h.game().actions;await h.click('online-primary',{revision});assert.equal(h.game().actions,before);assert.match(h.root.innerHTML,/攻撃せずにターンを終了しますか/);await h.click('online-cancel-move');assert.equal(h.game().actions,before);
 await h.click('online-primary',{revision});const index=String(h.read('onlinePending.action.id'));await h.click('online-confirm-move',{index,revision});assert.equal(h.game().actions,before+1);assert.equal(h.game().active,1);await h.dispatch('online-confirm-move',{index,revision});assert.equal(h.game().actions,before+1);h.read('onlineClient.dispose()');
});
test('online attack selection previews its target before the contextual attack button submits it',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.editGame(s=>{s.phase='attack';s.active=0;s.decision=null;s.players[0].battle=[{cardId:'dm01-108',uid:'ready',entered:0,tapped:false}];s.players[1].battle=[];});
 const revision=String(h.read('onlineState.room.revision')),before=h.game().actions;await h.click('online-card',{uid:'ready'});assert.match(h.root.innerHTML,/攻撃先を選ぶ/);const index=String(h.read('onlineState.room.game.actions.find(a=>a.kind==="attack").id'));await h.click('online-move',{index,revision});assert.equal(h.game().actions,before);assert.match(h.root.innerHTML,/攻撃内容を確認/);assert.match(h.root.innerHTML,/>攻撃する<\/button>/);await h.click('online-primary',{revision});assert.equal(h.game().actions,before+1);assert.equal(h.game().attack.attacker,'ready');await h.dispatch('online-primary',{revision});assert.equal(h.game().actions,before+1);h.read('onlineClient.dispose()');
});

test('online result button can reopen the local result panel after connection loss without sending a move',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();const before=h.game().actions;h.read("onlineState.room.phase='finished';onlineState.connected=false;onlineActionsOpen=false;render()");await h.click('online-primary',{revision:String(h.read('onlineState.room.revision'))});assert.match(h.root.innerHTML,/online-controls/);assert.equal(h.game().actions,before);h.read('onlineClient.dispose()');});

test('Pages friend entry keeps only the external room link, forwards invitations and leaves CPU play in home navigation',async()=>{
 const h=harness({origin:'https://atsushisora.github.io'});h.read("onlineCode='1122334455667788';const savedBefore=JSON.stringify(saved)");await h.click('nav',{view:'online'});
 assert.match(h.root.innerHTML,/対戦用ページを開く/);assert.match(h.root.innerHTML,/href="https:\/\/duema-deck-lab.netlify.app\/\?view=online&amp;room=1122334455667788"/);assert.match(h.root.innerHTML,/版が異なる場合/);
 assert.doesNotMatch(h.root.innerHTML,/アカウント・デッキ保存|コンピュータと対戦する|data-view="(?:account|battle)"/);assert.equal(h.read('onlineClient'),null);assert.equal(h.read('JSON.stringify(saved)===savedBefore'),true);
 await h.click('nav',{view:'home'});await h.click('nav',{view:'duel'});await h.click('prepare-match',{mode:'manual'});assert.match(h.root.innerHTML,/start-match/);await h.click('choose-opponent');assert.match(h.dialog.innerHTML,/相手の環境デッキを選ぶ/);
});


test('reorganized lobby joins a friend room with the selected deck and preserves saved decks and AI history',async()=>{
 const h=harness();await h.service.create({deck:PRESETS[0],requestId:'friend-host-123456789'},{uid:'u2',name:'友達'},'u2');await h.login();
 h.read("saved.decks.push({...structuredClone(PRESETS[1]),id:'second',name:'参加用デッキ'});onlineCode='1122334455667788';const savedBefore=JSON.stringify(saved);const originalJoin=onlineClient.join;let joinedDeck;onlineClient.join=(code,deck)=>{joinedDeck=structuredClone(deck);return originalJoin(code,deck)};render()");
 assert.doesNotMatch(h.root.innerHTML,/AI対戦へ/);assert.ok(h.root.innerHTML.indexOf('data-action="online-join"')<h.root.innerHTML.indexOf('data-action="online-create"'));
 await h.change('online-deck','second');h.nodes['#online-code']={value:'1122334455667788'};await h.click('online-join');
 assert.equal(h.read('onlineState.room.phase'),'playing');assert.equal(h.read('onlineState.room.seat'),1);assert.equal(h.read('joinedDeck.id'),'second');
 assert.equal(h.read('JSON.stringify(joinedDeck.cards)===JSON.stringify(saved.decks[1].cards)'),true);assert.equal(h.read('JSON.stringify(saved)===savedBefore'),true);h.read('onlineClient.dispose()');
});

test('account duel pays only chosen mana after confirmation and keeps pending selections private across refresh',async()=>{
 const h=harness();
 await h.login();
 await h.click('online-create');
 await h.friend();
 await h.editGame(s=>{
  s.phase='main';
  s.active=0;
  s.decision=null;
  const card=(cardId,uid)=>({cardId,uid,tapped:false,entered:0});
  s.players[0].hand=[card('dm06-085','spell')];
  s.players[0].mana=[
   card('dm01-083','water-first'),card('dm01-108','nature-a'),
   card('dm01-108','nature-b'),card('dm01-108','nature-c'),card('dm01-083','water-chosen')
  ];
 });
 const revision=()=>String(h.read('onlineState.room.revision'));
 const choose=async(kind,uid)=>{
  const index=String(h.read(`onlineState.room.game.actions.find(a=>a.kind===${JSON.stringify(kind)}${uid?`&&a.uid===${JSON.stringify(uid)}`:''}).id`));
  await h.click('online-pay-mana',{index,revision:revision()});
 };
 const cast=async()=>{
  await h.click('online-card',{uid:'spell'});
  await h.click('online-primary',{revision:revision()});
  assert.match(h.root.innerHTML,/選択 0 \/ 必要 3マナ/);
  assert.ok(h.game().players[0].mana.every(c=>!c.tapped));
  assert.deepEqual(h.game().players[0].hand.map(c=>c.uid),['spell']);
 };
 await cast();
 await choose('selectMana','water-first');
 await choose('cancelMana');
 assert.equal(h.game().decision,null);
 assert.ok(h.game().players[0].mana.every(c=>!c.tapped));
 await cast();
 for(const uid of ['nature-a','nature-b','nature-c'])await choose('selectMana',uid);
 assert.match(h.root.innerHTML,/選択 3 \/ 必要 3マナ/);
 assert.match(h.root.innerHTML,/○ 水/);
 assert.equal(h.read('onlineState.room.game.actions.some(a=>a.kind==="confirmMana")'),false);
 const staleRevision=revision();
 await choose('selectMana','nature-c');
 const waterIndex=String(h.read('onlineState.room.game.actions.find(a=>a.uid==="water-chosen").id'));
 await h.dispatch('online-pay-mana',{index:waterIndex,revision:staleRevision});
 assert.equal(h.read('onlineState.room.game.manaPayment.amount'),2);
 await choose('selectMana','water-chosen');
 await h.click('online-refresh');
 assert.match(h.root.innerHTML,/✓ 水/);
 const hostView=await h.service.get(h.read('onlineState.room.code'),{uid:'u1'},'u1');
 const guestView=await h.service.get(hostView.code,{uid:'u2'},'u2');
 assert.equal(hostView.game.manaPayment.cards.find(c=>c.uid==='water-chosen').selected,true);
 assert.equal(guestView.game.manaPayment,undefined);
 assert.deepEqual(guestView.game.actions,[]);
 assert.deepEqual(guestView.game.players[0].hand,[]);
 assert.ok(!JSON.stringify(hostView.game.manaPayment).includes('randomTape'));
 await choose('confirmMana');
 assert.deepEqual(h.game().players[0].mana.filter(c=>c.tapped).map(c=>c.uid),['nature-a','nature-b','water-chosen']);
 assert.ok(h.game().players[0].grave.some(c=>c.uid==='spell'));
 assert.equal(h.read('onlineState.room.game.manaPayment'),undefined);
 h.read('onlineClient.dispose()');
});

for(const method of['self','granted','abyss'])test('account duel can select a grave card from its actual zone dialog, choose mana, refresh, and summon through encrypted storage '+method,async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 const granted=method==='granted',id=granted?'dm01-083':method==='abyss'?'dm22rp1-060':'dm24rp1-064';
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;const card=(cardId,uid)=>({cardId,uid,tapped:false,entered:0});s.players[0].hand=[];s.players[0].grave=[card(id,'grave-summon')];s.players[0].battle=granted?[card('dm23rp3-016','grave-authority')]:[];s.players[1].battle=[];s.players[0].mana=[card('dm01-090','dark'),card('dm01-083','water'),card('dm01-108','nature')];});
 const code=h.read('onlineState.room.code'),revision=()=>String(h.read('onlineState.room.revision'));
 await h.click('online-zone',{player:'0',zone:'grave'});assert.match(h.dialog.innerHTML,/data-action="online-pick-card"[^>]*data-uid="grave-summon"/);
 await h.click('online-pick-card',{uid:'grave-summon'});assert.equal(h.dialog.open,false);assert.match(h.root.innerHTML,/data-action="online-move"/);
 await h.click('online-primary',{revision:revision()});assert.equal(h.game().decision.type,'manaPayment');assert.ok(h.game().players[0].grave.some(x=>x.uid==='grave-summon'));
 const choose=async(kind,uid)=>{const index=String(h.read(`onlineState.room.game.actions.find(a=>a.kind===${JSON.stringify(kind)}${uid?`&&a.uid===${JSON.stringify(uid)}`:''}).id`));await h.click('online-pay-mana',{index,revision:revision()});};
 await choose('selectMana',granted?'water':'dark');await choose('selectMana','nature');await h.click('online-refresh');
 const guest=await h.service.get(code,{uid:'u2'},'u2');assert.equal(guest.game.manaPayment,undefined);assert.deepEqual(guest.game.actions,[]);
 await choose('confirmMana');const game=h.game();assert.ok(!game.players[0].grave.some(x=>x.uid==='grave-summon'));assert.equal(game.players[0].battle.filter(x=>x.uid==='grave-summon').length,1);assert.deepEqual(game.players[0].mana.filter(x=>x.tapped).map(x=>x.uid),[granted?'water':'dark','nature']);
 const otherView=await h.service.get(code,{uid:'u2'},'u2');assert.ok(otherView.game.players[0].battle.some(x=>x.uid==='grave-summon'));h.read('onlineClient.dispose()');
});

test('an ordinary grave creature without permission stays inspectable but never offers a summon or advances the phase',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;s.players[0].hand=[];s.players[0].battle=[];s.players[1].battle=[];s.players[0].grave=[{cardId:'dm01-083',uid:'no-permission',tapped:false,entered:0}];});
 await h.click('online-zone',{player:'0',zone:'grave'});await h.click('online-pick-card',{uid:'no-permission'});assert.match(h.root.innerHTML,/このカードで選べる操作はありません/);assert.equal(h.read('onlineState.room.game.actions.some(a=>a.kind==="play"&&a.uid==="no-permission")'),false);
 const revision=h.read('onlineState.room.revision');await h.click('online-primary',{revision:String(revision)});assert.equal(h.read('onlineState.room.revision'),revision);assert.equal(h.game().phase,'main');assert.ok(h.game().players[0].grave.some(x=>x.uid==='no-permission'));h.read('onlineClient.dispose()');
});

test('a stale ordinary action button cannot use a different card after the room revision changes',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;const card=(cardId,uid)=>({cardId,uid,tapped:false,entered:0});s.players[0].hand=[card('dm01-083','old-action-card')];s.players[0].mana=[card('dm01-083','water'),card('dm01-108','nature')];s.players[0].battle=[];s.players[1].battle=[];});
 await h.click('online-card',{uid:'old-action-card'});const oldRevision=String(h.read('onlineState.room.revision')),index=String(h.read('onlineState.room.game.actions.find(a=>a.kind==="play"&&a.uid==="old-action-card").id'));
 await h.editGame(s=>{s.players[0].hand=[{cardId:'dm01-083',uid:'different-card',tapped:false,entered:0}];});
 const revision=h.read('onlineState.room.revision');await h.dispatch('online-move',{index,revision:oldRevision});assert.equal(h.read('onlineState.room.revision'),revision);assert.equal(h.game().decision,null);assert.equal(h.game().players[0].hand[0].uid,'different-card');
 await h.dispatch('online-move',{index});assert.equal(h.read('onlineState.room.revision'),revision);h.read('onlineClient.dispose()');
});

for(const [id,face]of[['dm01-027',0],['dmrp07-044',1]])test('an effect target can be selected by tapping its public creature, without losing the server choice '+id,async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;const card=(cardId,uid)=>({cardId,uid,tapped:false,entered:0});s.players[0].battle=[];s.players[1].battle=[card('dm01-004','effect-target'),card('dm01-076','other-target')];s.players[0].hand=[card(id,'effect-source')];s.players[0].mana=['dm01-090','dm01-090','dm01-090','dm01-090','dm01-090','dm01-090','dm01-097','dm01-097'].map((id,i)=>card(id,'pay-'+i));e.step(s,e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid==='effect-source'&&(a.face||0)===face));});
 const index=String(h.read('onlineState.room.game.actions.find(a=>(a.targetUids||[]).includes("effect-target")||a.uid==="effect-target")?.id'));
 await h.click('online-card',{uid:'effect-target'});assert.match(h.root.innerHTML,/data-action="online-move"/);assert.notEqual(index,'undefined');
 await h.click('online-move',{index,revision:String(h.read('onlineState.room.revision'))});assert.ok(h.game().players[1].grave.some(x=>x.uid==='effect-target'));assert.ok(h.game().players[1].battle.some(x=>x.uid==='other-target'));h.read('onlineClient.dispose()');
});

test('a legal face-down opponent mana target remains selectable without revealing its identity',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;const card=(cardId,uid)=>({cardId,uid,tapped:false,entered:0});s.players[0].battle=[];s.players[1].battle=[];s.players[1].grave=[];s.players[1].mana=[{...card('dm26rp1-S002','hidden-mana-target'),faceDown:true},card('dm01-083','other-mana')];s.players[0].mana=Array.from({length:4},(_,i)=>card('dm01-108','pay-'+i));s.players[0].hand=[card('dm02-035','mana-crisis')];e.step(s,e.getLegalActions(s).find(a=>a.kind==='play'));});
 await h.click('online-zone',{player:'1',zone:'mana'});assert.ok(!h.dialog.innerHTML.includes(e.card('dm26rp1-S002').name));await h.click('online-pick-card',{uid:'hidden-mana-target'});assert.ok(!h.root.innerHTML.includes(e.card('dm26rp1-S002').name));
 const index=String(h.read('onlineState.room.game.actions.find(a=>(a.targetUids||[]).includes("hidden-mana-target")).id'));await h.click('online-move',{index,revision:String(h.read('onlineState.room.revision'))});assert.ok(h.game().players[1].grave.some(x=>x.uid==='hidden-mana-target'));assert.ok(h.game().players[1].mana.some(x=>x.uid==='other-mana'));h.read('onlineClient.dispose()');
});

test('own face-down mana opens its original details while the opponent receives no original face',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;s.players[0].hand=[];s.players[0].mana=[{cardId:'dm26rp1-S002',uid:'own-hidden-mana',faceDown:true,tapped:false,entered:0}];});
 await h.click('online-zone',{player:'0',zone:'mana'});assert.ok(h.dialog.innerHTML.includes(e.card('dm26rp1-S002').name));await h.click('online-pick-card',{uid:'own-hidden-mana'});assert.match(h.root.innerHTML,/data-action="card-detail"[^>]*data-id="dm26rp1-S002"/);
 const guest=await h.service.get(h.read('onlineState.room.code'),{uid:'u2'},'u2');assert.equal(guest.game.players[0].mana[0].privateFace,undefined);assert.ok(!JSON.stringify(guest.game.players[0].mana).includes('dm26rp1-S002'));h.read('onlineClient.dispose()');
});
