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
function harness({origin='https://duema-deck-lab.netlify.app',roomCode=()=> '1122334455667788',live=false}={}){const liveWatches=new Set();const dialogEvents={},key=randomBytes(32).toString('base64'),root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener:(name,fn)=>dialogEvents[name]=fn,showModal(){this.open=true;},close(){this.open=false;}},listeners={},errors=[],writes=[],copied=[],nodes={},classes=new Set(),registry=createCatalogue(snapshot,data.cards,details),local={decks:[{...structuredClone(PRESETS[0]),id:'mine',name:'自分の40枚'}],friends:[],history:[{id:'existing-result'}],selected:'mine'},rooms=new Map(),sessions=new Map();let version=0,watch,activeIdentity='u1';
 // Model native input replacement when the real application replaces its root HTML.
 let rendered='';Object.defineProperty(root,'innerHTML',{get:()=>rendered,set:value=>{rendered=value;const field=value.match(/id="online-number"[^>]*value="([^"]*)"/);if(field)nodes['#online-number']={value:field[1]};else delete nodes['#online-number'];const code=value.match(/id="online-code"[^>]*value="([^"]*)"/);if(code)nodes['#online-code']={value:code[1]};else delete nodes['#online-code'];}});
 const service=createDuelService({key,code:roomCode,seed:()=>42,store:{getRoom:async c=>structuredClone(rooms.get(c)||null),getSession:async uid=>structuredClone(sessions.get(uid)||null),commit:async({doc,previous,session})=>{const old=rooms.get(doc.code);if(old?old.version!==previous:previous!==null)throw new DuelError('room/conflict','競合',409);if(session){const prior=sessions.get(session.uid);if(prior?prior.version!==session.previous:session.previous!==null)throw new DuelError('room/conflict','セッション更新競合',409);}rooms.set(doc.code,{doc:structuredClone(doc),version:String(++version)});if(session)sessions.set(session.uid,{code:session.code,version:String(version)});if(live)for(const w of [...liveWatches])if(w.code===doc.code)queueMicrotask(()=>w.next({revision:doc.revision,fromCache:false}));}}}),handler=createDuelHandler({service,verifyToken:async t=>({uid:t,name:t==='u1'?'自分':'友達',firebase:{sign_in_provider:'google.com'}})}),onlineFactory=options=>createOnlineClient({...options,timer:()=>1,cancel(){},fetcher:(url,opts)=>handler(new Request('https://duema-deck-lab.netlify.app'+url,opts))}),accountFactory=options=>createAccountClient({...options,fetchConfig:async()=>({schemaVersion:1,firebase:{projectId:'duema-example',authDomain:'duema-example.firebaseapp.com',apiKey:'AIza'+'x'.repeat(35),appId:'1:123:web:abc123'}}),createAdapter:async()=>({watch(cb){watch=cb;queueMicrotask(()=>cb(null));return()=>{};},signIn:()=>watch({uid:'u1',name:'自分',email:'u@example.com'}),signOut:()=>watch(null),getIdToken:async()=>activeIdentity,read:async()=>null,watchRoom:live?(code,next,error)=>{const w={code,next,error};liveWatches.add(w);queueMicrotask(()=>next({revision:rooms.get(code).doc.revision,fromCache:false}));return()=>liveWatches.delete(w);}:undefined})});
 const ctx=vm.createContext({...appFeatures,...characterRoster,...extraCharacters,PHOTO_OCTOBER_DECKS,PHOTO_OCTOBER_28_DECKS,PHOTO_RECENT_DECKS,...championLibrary,...opponentProgress,...updates,createCardArt,...e,...info,...manual,...environment,...starter,bindFittedBoard,createAccountClient:accountFactory,createOnlineClient:onlineFactory,onlineScreenHTML,onlinePrimaryAction,onlinePendingMove,accountScreenHTML,mergeAccountSnapshot,battleCard:e.card,createCatalogue,prepareDeckCopy,PRESETS,fixtureRegistry:registry,fixtureData:data,fixtureSaved:local,console:{error:e=>errors.push(e)},structuredClone,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,URLSearchParams,Intl,Date,fetch:async url=>({ok:true,json:async()=>structuredClone(url.startsWith('cards.json')?data:url.startsWith('catalogue.json')?snapshot:details)}),navigator:{clipboard:{writeText:async s=>copied.push(s)}},localStorage:{getItem:()=>null,setItem:(key,v)=>writes.push({key,value:JSON.parse(v)})},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},document:{querySelector:q=>q==='#app'?root:q==='#dialog'?dialog:q==='#toast'?{textContent:'',classList:{add(){},remove(){}}}:nodes[q]||null,querySelectorAll:()=>[],body:{classList:{toggle(c,value){value?classes.add(c):classes.delete(c);}}},addEventListener:(k,f)=>listeners[k]=f},window:{addEventListener(){},scrollTo(){}},location:{hash:'',pathname:'/',origin,reload(){}},history:{replaceState(){}}});vm.runInContext(source,ctx);vm.runInContext('registry=fixtureRegistry;cards=registry.cards;battleCards=fixtureData.cards;metadata=fixtureData;environmentDecks=resolveEnvironmentDecks(registry);starterDecks=resolveStarter25Decks(registry);saved=fixtureSaved;view="battle";render();',ctx);const read=c=>vm.runInContext(c,ctx),click=async(action,extra={})=>{if(!('context' in extra)){const html=dialog.open?dialog.innerHTML:root.innerHTML,button=[...html.matchAll(/<button\b([^>]*)>/g)].find(m=>m[1].includes(`data-action="${action}"`)&&Object.entries(extra).every(([k,v])=>m[1].includes(`data-${k}="${v}"`))),context=button?.[1].match(/data-context="([^"]+)"/);if(context)extra={...extra,context:context[1]};}if(action==='online-resign'&&!('confirmation' in extra)){const token=dialog.innerHTML.match(/data-action="online-resign" data-confirmation="([^"]+)"/);if(token)extra={...extra,confirmation:token[1]};}if(await routeToAction({action,extra,getHTML:()=>dialog.open?dialog.innerHTML:root.innerHTML,fire:(action,extra)=>listeners.click({target:{closest:()=>({dataset:{action,...extra},closest:()=>null})}})}))return;const html=dialog.open?dialog.innerHTML:root.innerHTML;assert.ok([...html.matchAll(/<button\b([^>]*)>/g)].some(m=>m[1].includes(`data-action="${action}"`)&&!/\bdisabled\b/.test(m[1])&&Object.entries(extra).every(([k,v])=>m[1].includes(`data-${k}="${v}"`))),'visible '+action);await listeners.click({target:{closest:()=>({dataset:{action,...extra},closest:()=>null})}});for(let n=0;n<4;n++)await tick();assert.deepEqual(errors,[]);};return{setUser:async user=>{activeIdentity=user?.uid||'u1';await watch(user);for(let n=0;n<4;n++)await tick();},root,dialog,read,click,nativeClose:()=>{dialog.open=false;dialogEvents.close?.();},input:(id,value)=>{nodes['#'+id].value=value;listeners.input({target:{id,value}});},change:async(id,value)=>{await listeners.change({target:{id,value,matches:()=>false}});assert.deepEqual(errors,[]);},dispatch:async(action,extra={})=>{await listeners.click({target:{closest:()=>({dataset:{action,...extra},closest:()=>null})}});await tick();assert.deepEqual(errors,[]);},writes,copied,nodes,classes,service,game:()=>openRoom(rooms.get(read('onlineState.room.code')).doc,key).game,async editGame(fn){const row=rooms.get(read('onlineState.room.code')),state=openRoom(row.doc,key);fn(state.game);state.revision++;row.doc=sealRoom(state,key);row.version=String(++version);await read('onlineClient.refresh()');},async login(){await click('nav',{view:'online'});await click('nav',{view:'account'});await click('account-login');await click('nav',{view:'online'});},async friend(){const code=read('onlineState.room.code');await service.join({code,deck:PRESETS[1],requestId:'friend-join-123456789'}, {uid:'u2',name:'友達'},'u2');await click('online-refresh');}};
}
test('actual app offers online entry, Google login, deck-backed room creation and an invitation with no token',async()=>{const h=harness();await h.login();assert.match(h.root.innerHTML,/data-action="online-create"/);await h.click('online-create');assert.match(h.root.innerHTML,/友達を待っています/);assert.equal(h.read('onlineState.room.phase'),'waiting');await h.click('online-copy-link');assert.equal(h.copied[0],'https://duema-deck-lab.netlify.app/?view=online&room=1122334455667788');assert.equal(h.read('saved.history[0].id'),'existing-result');h.read('onlineClient.dispose()');});
test('actual app receives the second player, renders a fixed board, sends legal moves and keeps the persisted room after navigation',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();assert.equal(h.classes.has('online-playing'),true);assert.match(h.root.innerHTML,/online-hand-track/);assert.ok(!h.root.innerHTML.includes('id="online-controls"'));await h.click('online-card',{uid:h.read('onlineState.room.game.players[0].hand[0].uid')});const index=String(h.read('onlineState.room.game.actions[0].id')),revision=h.read('onlineState.room.revision');await h.click('online-move',{index,revision:String(revision)});assert.equal(h.read('onlineState.room.revision'),revision+1);await h.click('online-menu');await h.click('online-leave');assert.equal(h.read('view'),'battle');assert.equal(h.classes.has('online-playing'),false);await h.click('nav',{view:'online'});assert.equal(h.read('onlineState.room.phase'),'playing');h.read('onlineClient.dispose()');});
test('actual app requires resignation confirmation, records the online result separately and preserves AI history',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-confirm-resign');assert.match(h.dialog.innerHTML,/投了しますか/);assert.equal(h.read('onlineState.room.phase'),'playing');await h.click('online-resign');assert.equal(h.read('onlineState.room.phase'),'finished');assert.equal(h.read('saved.onlineHistory[0].result'),'負け');assert.equal(h.read('saved.history[0].id'),'existing-result');assert.equal(h.writes.at(-1).key,'duema-deck-lab-v1');h.read('onlineClient.dispose()');});

test('online card selection and field overview use an overlay without replacing the board or revealing the opposing hand',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();const uid=h.read('onlineState.room.game.players[0].hand[0].uid');assert.ok(!h.root.innerHTML.includes('online-hand-list'));assert.ok(!h.root.innerHTML.includes('手札一覧'));await h.click('online-card',{uid});assert.equal(h.dialog.open,false);assert.equal(h.read('onlineSelected'),uid);assert.match(h.root.innerHTML,/class="online-controls"/);assert.match(h.root.innerHTML,/class="online-board play-board"/);assert.match(h.root.innerHTML,/data-action="card-detail"/);await h.click('online-actions-close');assert.ok(!h.root.innerHTML.includes('id="online-controls"'));await h.click('online-field',{player:'1'});assert.match(h.dialog.innerHTML,/友達のバトルゾーン/);assert.match(h.dialog.innerHTML,/クリーチャーはまだいません/);h.read('onlineClient.dispose()');});

test('online contextual phase button submits one current move and stale revisions are ignored',async()=>{const h=harness();await h.login();await h.click('online-create');await h.friend();const revision=String(h.read('onlineState.room.revision'));assert.match(h.root.innerHTML,/マナを置かずに進む/);await h.click('online-primary',{revision});assert.equal(h.read('onlineState.room.game.phase'),'main');assert.equal(h.read('onlineState.room.revision'),Number(revision)+1);assert.match(h.root.innerHTML,/攻撃へ進む/);const before=h.read('onlineState.room.revision');await h.dispatch('online-primary',{context:h.read('onlineActionScope?.token'),revision});assert.equal(h.read('onlineState.room.revision'),before);await h.click('online-menu');await h.click('online-all-actions');assert.equal(h.dialog.open,false);assert.match(h.root.innerHTML,/online-action-drawer/);h.read('onlineClient.dispose()');});

test('online end turn reviews remaining attacks, cancels safely and rejects a duplicate confirmation',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.editGame(s=>{s.phase='attack';s.active=0;s.decision=null;s.players[0].battle=[{cardId:'dm01-108',uid:'ready',entered:0,tapped:false}];s.players[1].battle=[];});
 const revision=String(h.read('onlineState.room.revision')),before=h.game().actions;await h.click('online-primary',{revision});assert.equal(h.game().actions,before);assert.match(h.root.innerHTML,/攻撃せずにターンを終了しますか/);await h.click('online-cancel-move');assert.equal(h.game().actions,before);
 await h.click('online-primary',{revision});const index=String(h.read('onlinePending.action.id'));await h.click('online-confirm-move',{index,revision});assert.equal(h.game().actions,before+1);assert.equal(h.game().active,1);await h.dispatch('online-confirm-move',{context:h.read('onlineActionScope?.token'),index,revision});assert.equal(h.game().actions,before+1);h.read('onlineClient.dispose()');
});
test('online attack selection previews its target before the contextual attack button submits it',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();await h.editGame(s=>{s.phase='attack';s.active=0;s.decision=null;s.players[0].battle=[{cardId:'dm01-108',uid:'ready',entered:0,tapped:false}];s.players[1].battle=[];});
 const revision=String(h.read('onlineState.room.revision')),before=h.game().actions;await h.click('online-card',{uid:'ready'});assert.match(h.root.innerHTML,/攻撃先を選ぶ/);const index=String(h.read('onlineState.room.game.actions.find(a=>a.kind==="attack").id'));await h.click('online-move',{index,revision});assert.equal(h.game().actions,before);assert.match(h.root.innerHTML,/攻撃内容を確認/);assert.match(h.root.innerHTML,/>攻撃する<\/button>/);await h.click('online-primary',{revision});assert.equal(h.game().actions,before+1);assert.equal(h.game().attack.attacker,'ready');await h.dispatch('online-primary',{context:h.read('onlineActionScope?.token'),revision});assert.equal(h.game().actions,before+1);h.read('onlineClient.dispose()');
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
 await h.dispatch('online-pay-mana',{context:h.read('onlineActionScope?.token'),index:waterIndex,revision:staleRevision});
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
 const revision=h.read('onlineState.room.revision');await h.dispatch('online-move',{context:h.read('onlineActionScope?.token'),index,revision:oldRevision});assert.equal(h.read('onlineState.room.revision'),revision);assert.equal(h.game().decision,null);assert.equal(h.game().players[0].hand[0].uid,'different-card');
 await h.dispatch('online-move',{context:h.read('onlineActionScope?.token'),index});assert.equal(h.read('onlineState.room.revision'),revision);h.read('onlineClient.dispose()');
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

test('actual friend board reviews visible changes and opens the log without changing the game or saved decks',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 const uid=h.read('onlineState.room.game.players[0].hand[0].uid');
 await h.click('online-card',{uid});await h.click('online-primary',{revision:String(h.read('onlineState.room.revision'))});
 assert.match(h.root.innerHTML,/マナが1枚増えた/);
 assert.match(h.root.innerHTML,/あなたの場の変化 · 3\/3/);
 const revision=h.read('onlineState.room.revision'),actions=h.game().actions,saved=h.read('JSON.stringify(saved)');
 await h.click('online-feedback-prev');assert.match(h.root.innerHTML,/手札が1枚減った/);
 await h.click('online-feedback-prev');assert.match(h.root.innerHTML,/カードをマナに置きました。/);
 await h.click('online-refresh');assert.match(h.root.innerHTML,/あなたの場の変化 · 1\/3/);
 await h.click('online-feedback-next');assert.match(h.root.innerHTML,/あなたの場の変化 · 2\/3/);
 await h.click('online-log');assert.match(h.dialog.innerHTML,/カードをマナに置きました。/);
 assert.equal(h.read('onlineState.room.revision'),revision);assert.equal(h.game().actions,actions);assert.equal(h.read('JSON.stringify(saved)'),saved);
 h.read('onlineClient.dispose()');
});

async function declarationHarness(min=0){
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 await h.click('online-card',{uid:h.read('onlineState.room.game.players[0].hand[0].uid')});
 await h.click('online-primary',{revision:String(h.read('onlineState.room.revision'))});
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;s.extTasks=[{op:'g9Number',p:0,source:'dm24rp4-002',family:'ignore',minNumber:min}];e.step(s,e.getLegalActions(s).find(a=>a.kind==='toAttack'));});
 return h;
}
for(const number of [0,3,6,'∞'])test('online number candidate commits its own value regardless of the typed draft: '+number,async()=>{
 const h=await declarationHarness(number===6?6:0);h.input('online-number','37');
 const a=h.read(`onlineState.room.game.actions.find(a=>a.number===${JSON.stringify(number)})`);
 assert.ok(a);if(number==='∞')await h.click('online-page',{page:'1'});
 await h.click('online-move',{index:String(a.id),revision:String(h.read('onlineState.room.revision'))});
 assert.equal(h.game().extLimits.at(-1).cost,number);assert.equal(h.read('onlineState.connected'),true);
 h.read('onlineClient.dispose()');
});
for(const [input,want] of [['37',37],['３７',37],['∞','∞']])test('explicit online number submission validates and commits arbitrary input '+input,async()=>{
 const h=await declarationHarness(6);h.input('online-number',input);
 const a=h.read('onlineState.room.game.actions[0]');
 await h.click('online-number-submit',{index:String(a.id),revision:String(h.read('onlineState.room.revision'))});
 assert.equal(h.game().extLimits.at(-1).cost,want);assert.equal(h.read('onlineState.connected'),true);
 h.read('onlineClient.dispose()');
});
test('invalid and stale numeric submissions never send a move, and the server rejects values below its own minimum',async()=>{
 const h=await declarationHarness(6),revision=h.read('onlineState.room.revision'),a=h.read('onlineState.room.game.actions[0]');
 h.read('let numberMoveCalls=0;const actualNumberMove=onlineClient.move;onlineClient.move=(...args)=>{numberMoveCalls++;return actualNumberMove(...args)}');
 for(const input of ['', '5','-1','1.5','9007199254740992','bad']){
  h.input('online-number',input);await h.click('online-number-submit',{index:String(a.id),revision:String(revision)});
 }
 h.input('online-number','37');await h.dispatch('online-number-submit',{context:h.read('onlineActionScope?.token'),index:String(a.id),revision:String(revision-1)});
 assert.equal(h.read('numberMoveCalls'),0);assert.equal(h.read('onlineState.room.revision'),revision);assert.equal(h.read('onlineState.connected'),true);
 await assert.rejects(h.service.move({schemaVersion:1,code:h.read('onlineState.room.code'),revision,actionId:a.id,number:5,requestId:'below-minimum-123456'},{uid:'u1',name:'自分'},'u1'),err=>err.code==='move/number');
 assert.equal(h.game().decision.task.minNumber,6);h.read('onlineClient.dispose()');
});
test('number drafts survive feedback review, reconnect, pagination and closing the panel, but never cross revisions or identity changes',async()=>{
 const h=await declarationHarness();h.input('online-number','37');
 await h.click('online-feedback-prev');assert.equal(h.nodes['#online-number'].value,'37');
 await h.click('online-refresh');assert.equal(h.nodes['#online-number'].value,'37');
 await h.click('online-page',{page:'1'});assert.equal(h.nodes['#online-number'].value,'37');
 await h.click('online-actions-close');assert.equal(h.nodes['#online-number'],undefined);
 await h.click('online-primary',{revision:String(h.read('onlineState.room.revision'))});assert.equal(h.nodes['#online-number'].value,'37');
 await h.editGame(s=>{s.decision=null;s.extTasks=[{op:'g9Number',p:0,source:'dm24rp4-002',family:'ignore'}];s.phase='main';e.step(s,e.getLegalActions(s).find(a=>a.kind==='toAttack'));});
 assert.equal(h.nodes['#online-number'].value,'');
 h.input('online-number','99');h.read("onlineClient.setIdentity(null)");assert.equal(h.read('onlineNumberDraft.value'),'');
 assert.equal(h.nodes['#online-number'],undefined);h.read('onlineClient.dispose()');
});
test('online log opens with the newest event first without changing the underlying chronology or saved data',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 h.read('onlineState.room.events=[{player:0,turn:1,text:"old-event"},{player:1,turn:2,text:"latest-event"}];const chronologicalBefore=JSON.stringify(onlineState.room.events);const savedBeforeLog=JSON.stringify(saved)');
 await h.click('online-log');assert.ok(h.dialog.innerHTML.indexOf('latest-event')<h.dialog.innerHTML.indexOf('old-event'));
 assert.equal(h.read('JSON.stringify(onlineState.room.events)===chronologicalBefore'),true);assert.equal(h.read('JSON.stringify(saved)===savedBeforeLog'),true);
 h.read('onlineClient.dispose()');
});

test('room-code input survives background recovery before blur and can be cleared without resurrecting an older code',async()=>{
 const h=harness();await h.login();const original=h.service.resume;
 h.service.resume=async()=>{throw Error('synthetic network interruption');};
 await h.read('onlineClient.refresh()');assert.equal(h.read('onlineState.connected'),false);
 h.input('online-code','AABBCCDDEEFF0011');
 h.service.resume=original;await h.read('onlineClient.refresh()');
 assert.equal(h.read('onlineState.connected'),true);assert.equal(h.nodes['#online-code'].value,'AABBCCDDEEFF0011');assert.equal(h.read('onlineCode'),'AABBCCDDEEFF0011');
 h.input('online-code','');await h.read('renderOnline()');assert.equal(h.nodes['#online-code'].value,'');assert.equal(h.read('onlineCode'),'');
 h.read('onlineClient.dispose()');
});
test('selected field Hyper ability opens its choices instead of advancing and resolves through real server moves',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 await h.editGame(s=>{s.phase='main';s.active=0;s.decision=null;s.players[0].battle=[{uid:'field-hyper',cardId:'dm24ex1-028',entered:0,tapped:false},{uid:'donor',cardId:'dm01-108',entered:0,tapped:false}];});
 await h.click('online-card',{uid:'field-hyper'});const before=h.game().actions,revision=String(h.read('onlineState.room.revision'));
 assert.equal(h.read('onlinePrimaryAction(onlineState.room,onlineSelected,onlinePending).label'),'使う方法を選ぶ');
 await h.click('online-primary',{revision});assert.equal(h.game().actions,before);assert.equal(h.game().phase,'main');
 let a=h.read('onlineState.room.game.actions.find(a=>a.kind==="hyper"&&a.uid==="field-hyper")');
 await h.click('online-move',{index:String(a.id),revision});
 a=h.read('onlineState.room.game.actions.find(a=>a.targetUids?.includes("donor"))');assert.ok(a);
 await h.click('online-move',{index:String(a.id),revision:String(h.read('onlineState.room.revision'))});
 assert.equal(h.game().phase,'main');assert.equal(h.game().players[0].battle.find(c=>c.uid==='field-hyper').hyperActive,true);assert.equal(h.game().players[0].battle.find(c=>c.uid==='donor').tapped,true);
 h.read('onlineClient.dispose()');
});

test('recovery safety: a response lost after a committed charge reconciles without applying the charge twice',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();
 const original=h.service.move,uid=h.read('onlineState.room.game.players[0].hand[0].uid'),before=h.game().actions,revision=h.read('onlineState.room.revision');let calls=0;
 h.service.move=async(...args)=>{calls++;await original(...args);throw Error('synthetic response lost after commit');};
 await h.click('online-card',{uid});await h.click('online-primary',{revision:String(revision)});
 assert.equal(h.read('onlineState.connected'),false);assert.equal(h.game().actions,before+1);
 h.service.move=original;await h.click('online-refresh');
 assert.equal(h.read('onlineState.connected'),true);assert.equal(h.read('onlineState.room.revision'),revision+1);assert.equal(h.game().actions,before+1);assert.equal(calls,1);
 assert.ok(h.game().players[0].mana.some(c=>c.uid===uid));assert.ok(!h.game().players[0].hand.some(c=>c.uid===uid));
 console.log('CHECK PASSED committed charge survives lost response and refresh exactly once');h.read('onlineClient.dispose()');
});
test('recovery safety: two simultaneous client mutations commit only once',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();const before=h.game().actions,revision=h.read('onlineState.room.revision');
 const result=await h.read('Promise.all([onlineClient.move(onlineState.room.game.actions.find(a=>a.kind==="charge").id),onlineClient.move(onlineState.room.game.actions.find(a=>a.kind==="charge").id)])');
 assert.equal(result.filter(Boolean).length,1);assert.equal(h.game().actions,before+1);assert.equal(h.read('onlineState.room.revision'),revision+1);
 console.log('CHECK PASSED concurrent same-device mutations apply once');h.read('onlineClient.dispose()');
});

test('recovery safety: clearing an ended room does not reopen it on resume or delete its result',async()=>{
 const h=harness();await h.login();await h.click('online-create');await h.friend();const code=h.read('onlineState.room.code');
 await h.click('online-menu');await h.click('online-confirm-resign');await h.click('online-resign');
 assert.equal(h.read('onlineState.room.phase'),'finished');const history=h.read('JSON.stringify(saved.onlineHistory)');
 await h.click('online-back');await h.read('onlineClient.refresh()');assert.equal(h.read('onlineState.room'),null);assert.match(h.root.innerHTML,/data-action="online-create"/);
 const finished=await h.service.get(code,{uid:'u1'},'u1');assert.equal(finished.phase,'finished');assert.equal(finished.game.winner,1);
 assert.equal(h.read('JSON.stringify(saved.onlineHistory)'),history);
 console.log('CHECK PASSED ended room remains stored while normal resume returns to lobby');h.read('onlineClient.dispose()');
});

async function onlineDialogHarness(){const h=harness();await h.login();await h.click('online-create');await h.friend();return h;}
async function opposingDialogAttack(h,id='dialog-opposing-attack-1234'){
 const code=h.read('onlineState.room.code'),opponent=await h.service.get(code,{uid:'u2'},'u2'),attack=opponent.game.actions.find(a=>a.kind==='attack');assert.ok(attack);
 await h.service.move({code,revision:opponent.revision,actionId:attack.id,requestId:id},{uid:'u2',name:'友達'},'u2');await h.read('onlineClient.refresh()');
}
test('online dialog clears private contents when authentication ends, without deleting decks or histories',async()=>{
 const h=await onlineDialogHarness();await h.editGame(s=>{s.players[0].mana=[{uid:'private-dialog-mana',cardId:'dm01-108',faceDown:true,tapped:false,entered:0}];});
 await h.click('online-zone',{player:'0',zone:'mana'});assert.equal(h.dialog.open,true);assert.match(h.dialog.innerHTML,/炎のたてがみ/);
 const before=h.read('JSON.stringify(saved)');await h.read('accountClient.signOut()');await tick();
 assert.equal(h.read('accountState.user'),null);assert.equal(h.read('onlineState.room'),null);assert.equal(h.read('onlineDialog'),null);assert.equal(h.dialog.open,false);assert.equal(h.dialog.innerHTML,'');assert.equal(h.read('JSON.stringify(saved)'),before);
 h.read('onlineClient.dispose()');
});
test('online dialog refreshes the field after a real opposing attack and preserves the list scroll position',async()=>{
 const h=await onlineDialogHarness();await h.editGame(s=>{s.phase='attack';s.active=1;s.decision=null;s.players[1].battle=[{uid:'live-field-attacker',cardId:'dm01-108',entered:0,tapped:false}];});
 await h.click('online-field',{player:'1'});assert.ok(!h.dialog.innerHTML.includes('タップ中'));h.nodes['#dialog .dialog-content']={scrollTop:48};
 await opposingDialogAttack(h);assert.equal(h.read('onlineState.room.game.players[1].battle[0].tapped'),true);assert.equal(h.dialog.open,true);assert.match(h.dialog.innerHTML,/タップ中/);assert.equal(h.nodes['#dialog .dialog-content'].scrollTop,48);
 h.read('onlineClient.dispose()');
});
test('online dialog removes departed creatures, updates open logs and never mutates event chronology',async()=>{
 const h=await onlineDialogHarness();await h.editGame(s=>{s.phase='main';s.active=0;s.players[1].battle=[{uid:'departed-dialog-card',cardId:'dm01-108',entered:0,tapped:false}];});
 await h.click('online-field',{player:'1'});await h.editGame(s=>{s.players[1].grave.push(s.players[1].battle.pop());});
 assert.equal(h.dialog.open,true);assert.ok(!h.dialog.innerHTML.includes('departed-dialog-card'));assert.match(h.dialog.innerHTML,/クリーチャーはまだいません/);
 await h.click('close-dialog');await h.editGame(s=>{s.phase='attack';s.active=1;s.decision=null;s.players[1].battle=[{uid:'log-attacker',cardId:'dm01-108',entered:0,tapped:false}];});
 await h.click('online-log');await opposingDialogAttack(h,'dialog-log-update-12345');assert.equal(h.dialog.open,true);assert.match(h.dialog.innerHTML,/攻撃しました。/);
 assert.ok(h.dialog.innerHTML.indexOf('攻撃しました。')<h.dialog.innerHTML.indexOf('対戦開始'));
 assert.ok(h.read('onlineState.room.events.at(-1).text').includes('攻撃'));h.read('onlineClient.dispose()');
});
test('online dialog marks disconnected data and removes the warning after reconnect',async()=>{
 const h=await onlineDialogHarness();await h.click('online-zone',{player:'0',zone:'mana'});
 const original=h.service.get;h.service.get=async()=>{throw Error('network loss');};await h.read('onlineClient.refresh()');assert.equal(h.dialog.open,true);assert.match(h.dialog.innerHTML,/最後に確認した内容/);
 h.service.get=original;await h.read('onlineClient.refresh()');assert.equal(h.dialog.open,true);assert.ok(!h.dialog.innerHTML.includes('最後に確認した内容'));h.read('onlineClient.dispose()');
});
test('online dialog closes and erases a hand inspection as soon as the server stops revealing it',async()=>{
 const h=await onlineDialogHarness();await h.editGame(s=>{
  const c={uid:'revealed-dialog-hand',cardId:'dm23rp3-S05',entered:0,tapped:false};s.players[1].hand=[c];
  s.decision={type:'extended',player:0,source:'dm22rp2-S5',title:'相手の手札を見る',task:{op:'g13_Murder',p:0,source:'dm22rp2-S5'},choices:[{label:'公開された手札',value:c.uid,cardId:c.cardId}]};
 });
 await h.click('online-zone',{player:'1',zone:'revealedHand'});assert.ok(h.dialog.innerHTML.includes('revealed-dialog-hand'));
 await h.editGame(s=>{s.decision=null;});assert.equal(h.dialog.open,false);assert.equal(h.dialog.innerHTML,'');assert.equal(h.read('onlineDialog'),null);h.read('onlineClient.dispose()');
});
test('online dialog clears when its room is cleared or closed natively and does not overwrite a public card detail',async()=>{
 const h=await onlineDialogHarness();await h.click('online-zone',{player:'0',zone:'grave'});h.nativeClose();assert.equal(h.read('onlineDialog'),null);assert.equal(h.dialog.innerHTML,'');
 await h.click('online-zone',{player:'0',zone:'mana'});h.read('showCard("dm01-108")');const detail=h.dialog.innerHTML;assert.equal(h.read('onlineDialog'),null);
 await h.editGame(s=>{s.players[0].mana=[];});assert.equal(h.dialog.innerHTML,detail);assert.equal(h.dialog.open,true);
 await h.click('close-dialog');await h.click('online-zone',{player:'0',zone:'mana'});h.read('onlineClient.clear()');assert.equal(h.dialog.open,false);assert.equal(h.dialog.innerHTML,'');assert.equal(h.read('onlineDialog'),null);h.read('onlineClient.dispose()');
});
test('online dialog card-target selection offers and resolves a legal fight directly from the target card',async()=>{
 const h=await onlineDialogHarness();await h.editGame(s=>{
  s.phase='main';s.active=0;s.decision=null;const c=(uid,cardId)=>({uid,cardId,entered:0,tapped:false});
  s.players[0].battle=[];s.players[0].hand=[c('dialog-fighter','dmr21-092')];s.players[0].mana=Array.from({length:15},(_,i)=>c('fight-mana-'+i,i%2?'dm01-027':'dm01-097'));s.players[1].battle=[c('dialog-fight-target','dm01-108')];
  e.step(s,e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid==='dialog-fighter'));
 });
 const a=h.read('onlineState.room.game.actions.find(a=>a.kind==="fight")');assert.ok(a.targetUids.includes('dialog-fighter'));assert.ok(a.targetUids.includes('dialog-fight-target'));
 const before=h.game().actions;await h.click('online-card',{uid:'dialog-fight-target'});assert.ok(!h.root.innerHTML.includes('このカードで選べる操作はありません'));assert.equal(h.game().actions,before);
 await h.click('online-move',{index:String(a.id),revision:String(h.read('onlineState.room.revision'))});assert.ok(!h.game().players[1].battle.some(c=>c.uid==='dialog-fight-target'));h.read('onlineClient.dispose()');
});

async function resignationFixture(){const h=harness();await h.login();await h.click('online-create');await h.friend();return h;}
async function openResignation(h){await h.click('online-menu');await h.click('online-confirm-resign');assert.equal(h.dialog.open,true);return h.read('onlineResignConfirmation.token');}
test('online resignation logout revokes consent before another participant logs in',async()=>{
 const h=await resignationFixture(),token=await openResignation(h),decks=h.read('JSON.stringify(saved.decks)'),history=h.read('JSON.stringify(saved.history)');
 await h.setUser(null);assert.equal(h.dialog.open,false);assert.equal(h.dialog.innerHTML,'');assert.equal(h.read('onlineResignConfirmation'),null);
 await h.setUser({uid:'u2',name:'友達'});assert.equal(h.read('onlineState.room.seat'),1);const revision=h.read('onlineState.room.revision');
 await h.dispatch('online-resign',{confirmation:token});assert.equal(h.game().winner,null);assert.equal(h.read('onlineState.room.revision'),revision);assert.equal(h.read('JSON.stringify(saved.decks)'),decks);assert.equal(h.read('JSON.stringify(saved.history)'),history);h.read('onlineClient.dispose()');
});
test('online resignation direct account switch rejects old consent and accepts a fresh confirmation',async()=>{
 const h=await resignationFixture(),old=await openResignation(h);await h.setUser({uid:'u2',name:'友達'});assert.equal(h.dialog.open,false);const fresh=await openResignation(h);assert.notEqual(old,fresh);
 await h.dispatch('online-resign',{confirmation:old});assert.equal(h.dialog.open,true);assert.equal(h.read('onlineState.room.phase'),'playing');await h.click('online-resign');assert.equal(h.game().winner,0);assert.equal(h.read('saved.onlineHistory[0].result'),'負け');h.read('onlineClient.dispose()');
});
for(const method of ['button','native'])test('online resignation '+method+' dismissal revokes queued confirmation',async()=>{
 const h=await resignationFixture(),old=await openResignation(h);if(method==='button')await h.click('close-dialog');else h.nativeClose();assert.equal(h.read('onlineResignConfirmation'),null);assert.equal(h.dialog.innerHTML,'');const fresh=await openResignation(h);
 await h.dispatch('online-resign',{confirmation:old});assert.equal(h.read('onlineResignConfirmation.token'),fresh);assert.equal(h.dialog.open,true);await h.click('online-resign');assert.equal(h.game().winner,1);h.read('onlineClient.dispose()');
});
test('online resignation cleared room revokes consent even after resuming the same room',async()=>{
 const h=await resignationFixture(),old=await openResignation(h);h.read('onlineClient.clear()');assert.equal(h.dialog.open,false);assert.equal(h.dialog.innerHTML,'');await h.read('onlineClient.refresh()');await h.dispatch('online-resign',{confirmation:old});assert.equal(h.read('onlineState.room.phase'),'playing');h.read('onlineClient.dispose()');
});
test('online resignation finished room closes confirmation and rejects its queued event',async()=>{
 const h=await resignationFixture(),old=await openResignation(h),code=h.read('onlineState.room.code');await h.service.resign({code,revision:h.read('onlineState.room.revision'),requestId:'opponent-resign-12345678'},{uid:'u2',name:'友達'},'u2');await h.read('onlineClient.refresh()');assert.equal(h.dialog.open,false);const revision=h.read('onlineState.room.revision');await h.dispatch('online-resign',{confirmation:old});assert.equal(h.game().winner,0);assert.equal(h.read('onlineState.room.revision'),revision);h.read('onlineClient.dispose()');
});
test('online resignation replacement by public card details revokes old consent without closing the details',async()=>{
 const h=await resignationFixture(),old=await openResignation(h);h.read('showCard("dm01-108")');const detail=h.dialog.innerHTML;await h.dispatch('online-resign',{confirmation:old});assert.equal(h.dialog.open,true);assert.equal(h.dialog.innerHTML,detail);assert.equal(h.read('onlineResignConfirmation'),null);assert.equal(h.read('onlineState.room.phase'),'playing');h.read('onlineClient.dispose()');
});
test('online resignation connection loss revokes consent and requires fresh confirmation after recovery',async()=>{
 const h=await resignationFixture(),old=await openResignation(h),get=h.service.get;h.service.get=async()=>{throw Error('temporary outage');};await h.read('onlineClient.refresh()');assert.equal(h.dialog.open,false);h.service.get=get;await h.read('onlineClient.refresh()');await h.dispatch('online-resign',{confirmation:old});assert.equal(h.read('onlineState.room.phase'),'playing');await openResignation(h);await h.click('online-resign');assert.equal(h.game().winner,1);h.read('onlineClient.dispose()');
});
test('online resignation confirmation remains valid after an opponent move in the same room',async()=>{
 const h=await resignationFixture();await h.editGame(g=>{g.active=1;g.phase='attack';g.decision=null;g.players[1].battle=[];});const token=await openResignation(h),code=h.read('onlineState.room.code'),opponent=await h.service.get(code,{uid:'u2',name:'友達'},'u2'),action=opponent.game.actions.find(a=>a.kind==='endTurn');assert.ok(action);await h.service.move({code,revision:opponent.revision,actionId:action.id,requestId:'opponent-end-turn-12345678'},{uid:'u2',name:'友達'},'u2');await h.read('onlineClient.refresh()');assert.ok(h.read('onlineState.room.revision')>opponent.revision);assert.equal(h.dialog.open,true);assert.equal(h.read('onlineResignConfirmation.token'),token);await h.click('online-resign');assert.equal(h.game().winner,1);const revision=h.read('onlineState.room.revision');await h.dispatch('online-resign',{confirmation:token});assert.equal(h.read('onlineState.room.revision'),revision);h.read('onlineClient.dispose()');
});
test('online resignation ignores unscoped events and confirmation requests outside a live match',async()=>{
 const h=harness();await h.dispatch('online-resign',{confirmation:'stale'});await h.dispatch('online-confirm-resign');assert.equal(h.dialog.open,false);assert.equal(h.read('onlineResignConfirmation'),null);h.read('onlineClient?.dispose()');
});

function captureOnlineAction(h,action){
 const button=[...h.root.innerHTML.matchAll(/<button\b([^>]*)>/g)].find(m=>m[1].includes(`data-action="${action}"`)&&!/\bdisabled\b/.test(m[1]));assert.ok(button,'enabled '+action);
 const data=Object.fromEntries([...button[1].matchAll(/data-([a-z]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));assert.ok(data.context);delete data.action;return data;
}
async function actionContextFixture(kind='move'){
 if(kind==='number'){const h=await declarationHarness(6);h.input('online-number','37');return h;}
 const h=await resignationFixture();
 if(kind==='confirm'){
  await h.editGame(g=>{g.phase='attack';g.active=0;g.decision=null;g.players[0].battle=[{uid:'scope-attacker',cardId:'dm01-108',entered:0,tapped:false}];g.players[1].battle=[];});
  await h.click('online-menu');await h.click('online-all-actions');const a=h.read('onlineState.room.game.actions.find(a=>a.kind==="attack")');await h.click('online-move',{index:String(a.id),revision:String(h.read('onlineState.room.revision'))});
 }else if(kind==='mana'){
  await h.editGame(g=>{g.phase='main';g.active=0;g.decision=null;g.players[0].battle=[];g.players[0].hand=[{cardId:'dm06-085',uid:'scope-spell',tapped:false,entered:0}];g.players[0].mana=Array.from({length:5},(_,i)=>({cardId:i===0?'dm01-083':'dm01-108',uid:'scope-mana-'+i,tapped:false,entered:0}));});
  await h.click('online-card',{uid:'scope-spell'});await h.click('online-primary',{revision:String(h.read('onlineState.room.revision'))});assert.ok(h.read('onlineState.room.game.manaPayment'));
 }else if(kind==='move'){await h.click('online-menu');await h.click('online-all-actions');}
 return h;
}
for(const [kind,action] of [['move','online-move'],['primary','online-primary'],['number','online-number-submit'],['mana','online-pay-mana'],['confirm','online-confirm-move']]){
 test('online action context '+kind+' rejects delayed events after leaving and returning to the same match',async()=>{
  const h=await actionContextFixture(kind),old=captureOnlineAction(h,action),before=h.read('onlineState.room.revision');
  await h.click('online-menu');await h.click('online-account');assert.equal(h.read('view'),'account');await h.dispatch(action,old);assert.equal(h.read('onlineState.room.revision'),before);
  await h.click('nav',{view:'online'});assert.equal(h.read('onlineState.room.revision'),before);const fresh=captureOnlineAction(h,action);assert.notEqual(fresh.context,old.context);await h.dispatch(action,old);assert.equal(h.read('onlineState.room.revision'),before);
  if(kind==='number')h.input('online-number','37');await h.click(action,fresh);assert.equal(h.read('onlineState.room.revision'),before+1);h.read('onlineClient.dispose()');
 });
 test('online action context '+kind+' requires the original token even when revision and action match',async()=>{
  const h=await actionContextFixture(kind),current=captureOnlineAction(h,action),before=h.read('onlineState.room.revision'),unscoped={...current};delete unscoped.context;
  await h.dispatch(action,unscoped);await h.dispatch(action,{...current,context:'obsolete'});assert.equal(h.read('onlineState.room.revision'),before);await h.click(action,current);assert.equal(h.read('onlineState.room.revision'),before+1);h.read('onlineClient.dispose()');
 });
}
test('online action context old room events cannot affect a new room with identical revision and action IDs',async()=>{
 let number=0;const h=harness({roomCode:()=>String(++number).padStart(16,'0')});await h.login();await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-all-actions');const old=captureOnlineAction(h,'online-move'),oldCode=h.read('onlineState.room.code');
 await h.service.resign({code:oldCode,revision:Number(old.revision),requestId:'finish-first-room-12345678'},{uid:'u2',name:'友達'},'u2');await h.read('onlineClient.refresh()');await h.click('online-back');await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-all-actions');const fresh=captureOnlineAction(h,'online-move');assert.notEqual(h.read('onlineState.room.code'),oldCode);assert.equal(fresh.revision,old.revision);assert.equal(fresh.index,old.index);
 const before=h.read('onlineState.room.revision');await h.dispatch('online-move',old);assert.equal(h.read('onlineState.room.revision'),before);await h.click('online-move',fresh);assert.equal(h.read('onlineState.room.revision'),before+1);h.read('onlineClient.dispose()');
});
test('online action context auth round trip invalidates old moves even for the same account and room',async()=>{
 const h=await actionContextFixture(),old=captureOnlineAction(h,'online-move'),before=h.read('onlineState.room.revision');await h.setUser(null);await h.setUser({uid:'u1',name:'自分'});await h.click('online-menu');await h.click('online-all-actions');const fresh=captureOnlineAction(h,'online-move');assert.notEqual(fresh.context,old.context);await h.dispatch('online-move',old);assert.equal(h.read('onlineState.room.revision'),before);await h.click('online-move',fresh);assert.equal(h.read('onlineState.room.revision'),before+1);h.read('onlineClient.dispose()');
});
test('online action context another account cannot reuse the previous participant action in another match',async()=>{
 let number=0;const h=harness({roomCode:()=>String(++number).padStart(16,'0')});await h.login();await h.click('online-create');await h.friend();await h.click('online-menu');await h.click('online-all-actions');const old=captureOnlineAction(h,'online-move'),code=h.read('onlineState.room.code');
 await h.service.resign({code,revision:Number(old.revision),requestId:'finish-account-room-123456'},{uid:'u2',name:'友達'},'u2');await h.read('onlineClient.refresh()');const next=await h.service.create({deck:PRESETS[0],requestId:'second-account-host-123456'},{uid:'u2',name:'友達'},'u2');await h.service.join({code:next.code,deck:PRESETS[1],requestId:'third-account-join-1234567'},{uid:'u3',name:'別の友達'},'u3');await h.setUser({uid:'u2',name:'友達'});await h.click('online-menu');await h.click('online-all-actions');const fresh=captureOnlineAction(h,'online-move');assert.equal(fresh.revision,old.revision);assert.equal(fresh.index,old.index);const before=h.read('onlineState.room.revision');await h.dispatch('online-move',old);assert.equal(h.read('onlineState.room.revision'),before);await h.click('online-move',fresh);assert.equal(h.read('onlineState.room.revision'),before+1);h.read('onlineClient.dispose()');
});
for(const action of ['online-create','online-cancel'])test('online action context '+action+' rejects stale lobby controls after navigation',async()=>{
 const h=harness();await h.login();if(action==='online-cancel')await h.click('online-create');const old=captureOnlineAction(h,action);await h.click('nav',{view:'account'});await h.dispatch(action,old);assert.equal(h.read('onlineState.room?.phase??null'),action==='online-cancel'?'waiting':null);await h.click('nav',{view:'online'});await h.dispatch(action,old);assert.equal(h.read('onlineState.room?.phase??null'),action==='online-cancel'?'waiting':null);await h.click(action);assert.equal(h.read('onlineState.room.phase'),action==='online-cancel'?'cancelled':'waiting');h.read('onlineClient.dispose()');
});
test('online action context join requires current consent from the lobby before attaching a deck',async()=>{
 const h=harness();await h.service.create({deck:PRESETS[0],requestId:'friend-lobby-context-123456'},{uid:'u2',name:'友達'},'u2');await h.login();h.input('online-code','1122334455667788');const old=captureOnlineAction(h,'online-join');await h.click('nav',{view:'account'});await h.dispatch('online-join',old);assert.equal(h.read('onlineState.room'),null);await h.click('nav',{view:'online'});await h.dispatch('online-join',old);assert.equal(h.read('onlineState.room'),null);await h.click('online-join');assert.equal(h.read('onlineState.room.phase'),'playing');assert.equal(h.read('onlineState.room.seat'),1);h.read('onlineClient.dispose()');
});
for(const action of ['online-primary','online-move'])test('online action context '+action+' cannot reuse a prior selection at the same room revision',async()=>{
 const h=await actionContextFixture(),old=captureOnlineAction(h,action),room=h.read('onlineState.room'),different=room.game.players[0].hand.find(c=>c.uid!==room.game.actions.find(a=>String(a.id)===old.index)?.uid);assert.ok(different);await h.click('online-card',{uid:different.uid});const fresh=captureOnlineAction(h,action);assert.equal(h.read('onlineState.room.revision'),room.revision);assert.notEqual(fresh.context,old.context);await h.dispatch(action,old);assert.equal(h.read('onlineState.room.revision'),room.revision);await h.click(action,fresh);assert.equal(h.read('onlineState.room.revision'),room.revision+1);assert.ok(h.game().players[0].mana.some(c=>c.uid===different.uid));h.read('onlineClient.dispose()');
});
test('live app sync receives a friend joining and resigning through revision notifications without manual refresh',async()=>{
 const h=harness({live:true});await h.login();await h.click('online-create');const code=h.read('onlineState.room.code');
 await h.service.join({code,deck:PRESETS[1],requestId:'live-friend-join-123456789'},{uid:'u2',name:'友達'},'u2');for(let n=0;n<4;n++)await tick();assert.equal(h.read('onlineState.room.phase'),'playing');assert.match(h.root.innerHTML,/online-board/);
 await h.service.resign({code,revision:h.read('onlineState.room.revision'),requestId:'live-friend-resign-1234567'},{uid:'u2',name:'友達'},'u2');for(let n=0;n<4;n++)await tick();assert.equal(h.read('onlineState.room.phase'),'finished');assert.match(h.root.innerHTML,/あなたの勝利/);assert.equal(h.read('saved.onlineHistory[0].result'),'勝ち');h.read('onlineClient.dispose()');
});
test('live app sync leaves the current selection and operation token intact for an unchanged notification',async()=>{
 const h=harness({live:true});await h.login();await h.click('online-create');await h.friend();await h.click('online-card',{uid:h.read('onlineState.room.game.players[0].hand[0].uid')});const selected=h.read('onlineSelected'),context=h.read('onlineActionScope.token');await h.read('onlineClient.refresh()');assert.equal(h.read('onlineSelected'),selected);assert.equal(h.read('onlineActionScope.token'),context);await h.click('online-primary',{revision:String(h.read('onlineState.room.revision'))});assert.equal(h.game().actions,1);h.read('onlineClient.dispose()');
});
