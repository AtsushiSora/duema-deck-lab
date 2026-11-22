import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineScreenHTML} from '../dist/online-ui.js';
const c=(uid,name=uid)=>({uid,id:uid,name,cost:3,power:2000,type:'creature',under:[]});
function fixture(seat=0){const p=(name,own)=>({name,deckCount:30,handCount:own?12:5,shieldCount:5,hand:own?Array.from({length:12},(_,i)=>c('h'+i)):[],battle:[c('b'+name)],mana:[],grave:[],faceUpShields:[]});return {busy:false,connected:true,room:{seat,phase:'playing',game:{turn:1,phase:'charge',first:0,actor:seat,players:[p('host',seat===0),p('guest',seat===1)],actions:[{id:42,kind:'charge',uid:'h0',label:'h0をマナへ'},{id:71,kind:'skipCharge',uid:null,label:'置かずに進む'}]}}};}
test('both seats see their own field below the opponent and every hand card in a single shelf',()=>{for(const seat of [0,1]){const state=fixture(seat),before=structuredClone(state),html=onlineScreenHTML(state,{user:{uid:'me'}});assert.ok(html.indexOf('opponent-field')<html.indexOf('own-field'));const own=html.slice(html.indexOf('own-field'));assert.match(own,new RegExp(seat===0?'host':'guest'));assert.match(html,/data-fit-grid="shields" data-fit-count="5"/);assert.equal((html.match(/class="shield-tile"/g)||[]).length,10);assert.equal((html.match(/class="hand-shelf-card/g)||[]).length,12);assert.match(html,/online-dock/);assert.ok(!html.includes('id="online-controls"'));assert.deepEqual(state,before);}});
test('selected card actions retain server ids, never fall back to unrelated moves and always allow a return to all choices',()=>{const state=fixture();let html=onlineScreenHTML(state,{user:{},actionsOpen:true,selected:'h0'});assert.match(html,/data-action="online-move"[^>]*data-index="42"/);assert.ok(!html.includes('data-index="71"'));html=onlineScreenHTML(state,{user:{},actionsOpen:true,selected:'h1'});assert.ok(!html.includes('data-action="online-move"'));assert.match(html,/このカードで選べる操作はありません/);assert.match(html,/data-action="online-all-actions"/);assert.match(html,/data-action="online-actions-close"/);html=onlineScreenHTML(state,{user:{},actionsOpen:true});assert.match(html,/data-index="71"/);});
test('inspection remains available while disconnected but submitting a move is disabled, and private faces stay hidden',()=>{const state=fixture();state.connected=false;state.room.game.players[1].battle=[{uid:'hidden',hidden:true}];const html=onlineScreenHTML(state,{user:{},actionsOpen:true,selected:'h0',art:id=>`<span data-art="${id}"></span>`});assert.match(html,/data-action="online-move" disabled/);assert.ok(!html.includes('data-art="undefined"'));assert.match(html,/裏向き/);assert.match(html,/再接続してください/);});
test('required choices, number declarations, result and malicious labels remain usable and escaped in the overlay',()=>{const state=fixture();state.room.game.decision='<script>効果の選択</script>';state.room.game.numberChoice=true;let html=onlineScreenHTML(state,{user:{},actionsOpen:true});assert.match(html,/id="online-number"/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));state.room.phase='finished';state.room.game.winner=0;state.room.game.actions=[];html=onlineScreenHTML(state,{user:{},actionsOpen:true});assert.match(html,/あなたの勝利/);assert.match(html,/data-action="online-back"/);});

test('online board shows stacked shield card counts with no hidden card identities',()=>{const o=fixture();o.room.game.players[1].shieldGroups=[{cardCount:3},{cardCount:1},{cardCount:1},{cardCount:1},{cardCount:1}];const html=onlineScreenHTML(o,{user:{uid:'host'}});assert.match(html,/3枚の束/);assert.match(html,/>3枚<\/small>/);});

test('online fields show NewWorld bases and its one-use state instead of creature power',()=>{const s=fixture();s.room.game.players[0].battle=[{...c('world','新世壊'),type:'field',worldUsed:true,under:[c('base')]}];const html=onlineScreenHTML(s,{user:{}});assert.match(html,/下 1枚 · 使用済/);assert.ok(!html.includes('creature-current-power">0'));});
test('an attached aura identifies its visible host on the online field',()=>{const s=fixture(),host=c('host','装着先＆GR');s.room.game.players[0].battle=[host,{...c('zaha'),type:'aura',auraTo:{uid:host.uid,incarnation:0}}];assert.match(onlineScreenHTML(s,{user:{}}),/装着：装着先＆GR/);host.hidden=true;assert.doesNotMatch(onlineScreenHTML(s,{user:{}}),/装着先＆GR/);});
test('online badges and the selected-card drawer count all nested sources, while hidden cards expose none',()=>{const s=fixture(),x={...c('evo'),evolution:true,under:[{...c('base'),under:[c('deep1'),c('deep2')]}]};s.room.game.players[0].battle=[x];let html=onlineScreenHTML(s,{user:{},actionsOpen:true,selected:'evo'});assert.match(html,/aria-label="進化元 3枚"/);assert.match(html,/コスト 3 · 進化元 3枚/);x.under[0].under.pop();html=onlineScreenHTML(s,{user:{}});assert.match(html,/aria-label="進化元 2枚"/);x.hidden=true;html=onlineScreenHTML(s,{user:{}});assert.ok(!html.includes('creature-source-count'));x.hidden=false;x.sealed=true;html=onlineScreenHTML(s,{user:{}});assert.ok(!html.includes('creature-source-count'));});

test('an equipped weapon identifies its host and a released Dragheart requests the reverse art',()=>{
 const s=fixture(),host=c('host','装備先＆クリーチャー');
 const weapon={...c('weapon'),type:'weapon',weaponTo:{uid:host.uid,incarnation:0}};
 const dragon={...c('dragon'),type:'creature',awakened:true};
 s.room.game.players[0].battle=[host,weapon,dragon];
 const sides=[];
 const html=onlineScreenHTML(s,{user:{},art:(id,options)=>{if(id===dragon.id)sides.push(options?.awakened);return '';}});
 assert.match(html,/装備：装備先＆クリーチャー/);
 assert.ok(sides.includes(true));
});

test('lobby chooses one shared deck before create or join and removes the AI shortcut',()=>{
 const state={room:null,busy:false,connected:true},decks=[{id:'mine',name:'自分のデッキ'},{id:'bad',name:'未対応'}],before=structuredClone({state,decks});
 const html=onlineScreenHTML(state,{user:{name:'友達 & 自分'},decks,selectedDeckId:'mine',valid:d=>d.id==='mine'});
 assert.doesNotMatch(html,/AI対戦へ|data-view="battle"/);assert.match(html,/友達 &amp; 自分/);
 assert.equal((html.match(/id="online-deck"/g)||[]).length,1);
 assert.ok(html.indexOf('id="online-deck"')<html.indexOf('data-action="online-create"'));
 assert.ok(html.indexOf('id="online-deck"')<html.indexOf('data-action="online-join"'));
 assert.match(html,/<option value="bad"[^>]*disabled/);
 assert.match(html,/<label for="online-code">/);assert.match(html,/<details class="online-help"><summary>/);
 assert.ok(html.indexOf('data-action="online-resume"')>html.indexOf('data-action="online-join"'));
 assert.deepEqual({state,decks},before);
});
test('an invitation preserves the escaped code and places joining before room creation',()=>{
 const html=onlineScreenHTML({room:null},{user:{name:'自分'},decks:[{id:'d',name:'deck'}],selectedDeckId:'d',code:'A1B2"<code>'});
 assert.match(html,/招待されたルームに参加/);assert.match(html,/value="A1B2&quot;&lt;code&gt;"/);
 assert.ok(html.indexOf('data-action="online-join"')<html.indexOf('data-action="online-create"'));
});
test('lobby blocks creation and joining when no playable deck exists or a request is pending',()=>{
 for(const [busy,decks,valid] of [[false,[],()=>true],[false,[{id:'bad',name:'未対応'}],()=>false],[true,[{id:'d',name:'deck'}],()=>true]]){
  const html=onlineScreenHTML({room:null,busy},{user:{name:'自分'},decks,valid});
  for(const action of ['online-create','online-join'])assert.match(html,new RegExp(`data-action="${action}" disabled`));
  if(!busy)assert.match(html,/data-view="decks"/);
 }
 const html=onlineScreenHTML({room:null},{user:null});assert.match(html,/まずはGoogleでログイン/);assert.match(html,/data-view="account"/);assert.doesNotMatch(html,/data-action="online-(create|join)"/);
});

const {onlinePrimaryAction}=await import('../dist/online-ui.js');
for(const seat of[0,1])for(const zone of['grave','mana','extra','abyss'])test('a selected playable '+zone+' card at seat '+seat+' uses its server move instead of advancing the phase',()=>{
 const s=fixture(seat),g=s.room.game,x=c('zone-card');g.phase='main';g.players[seat][zone]=[x];g.actions=[{id:91,kind:'play',uid:x.uid,playType:'creature',label:'墓地から召喚する'},{id:92,kind:'toAttack',label:'攻撃へ'}];
 const primary=onlinePrimaryAction(s.room,x.uid);assert.equal(primary.command,'move');assert.equal(primary.move.id,91);assert.equal(primary.label,'召喚する');
 const html=onlineScreenHTML(s,{user:{},selected:x.uid,actionsOpen:true});assert.match(html,/data-action="online-move"[^>]*data-index="91"/);assert.doesNotMatch(html,/data-index="92"/);
 g.actions=[g.actions[1]];assert.equal(onlinePrimaryAction(s.room,x.uid).command,'card');
});
test('grave alternate summons show their methods and never create a move absent from the server',()=>{
 const s=fixture(),g=s.room.game,x=c('grave-alternative');g.phase='main';g.players[0].grave=[x];g.actions=[{id:3,kind:'play',uid:x.uid,requiresMethod:true,playType:'creature',label:'アビスラッシュ'},{id:4,kind:'toAttack'}];
 assert.equal(onlinePrimaryAction(s.room,x.uid).command,'card');g.actor=1;assert.equal(onlinePrimaryAction(s.room,x.uid).disabled,true);
});

test('ordinary online moves carry their room revision and retain multi-card effect targets when a creature is selected',()=>{
 const s=fixture();s.room.revision=18;s.room.game.decision='2体を選ぶ';const first=c('target-one'),second=c('target-two');s.room.game.players[1].battle=[first,second];s.room.game.actions=[{id:7,kind:'effect',uid:null,targetUids:[first.uid,second.uid],label:'この2体をタップ'},{id:8,kind:'effect',uid:'other',label:'別の対象'}];
 for(const selected of[first.uid,second.uid]){const html=onlineScreenHTML(s,{user:{},actionsOpen:true,selected});assert.match(html,/data-action="online-move"[^>]*data-index="7"[^>]*data-revision="18"/);assert.doesNotMatch(html,/data-index="8"/);}
});

for(const seat of [0,1])test('online attack context names and highlights the attacker and creature target at seat '+seat,()=>{
 const state=fixture(seat),g=state.room.game;g.attack={attacker:'bhost',target:'bguest',player:0};
 const html=onlineScreenHTML(state,{user:{}});
 assert.match(html,/aria-label="進行中の攻撃"/);
 assert.ok(html.includes(`${seat===0?'あなた':'相手'}の「bhost」 → ${seat===1?'あなた':'相手'}の「bguest」`));
 assert.match(html,/is-attacking[^>]*><button[^>]*data-uid="bhost"[^>]*aria-label="bhostを選ぶ・攻撃中/);
 assert.match(html,/is-attack-target[^>]*><button[^>]*data-uid="bguest"[^>]*aria-label="bguestを選ぶ・攻撃対象/);
 const before=html;g.attack.attacker='not-on-board';assert.doesNotMatch(onlineScreenHTML(state,{user:{}}),/aria-label="進行中の攻撃"/);assert.notEqual(before,onlineScreenHTML(state,{user:{}}));
});
test('online shield targets and direct attacks are distinguished without revealing hidden identities',()=>{
 const state=fixture(1),g=state.room.game;g.attack={attacker:'bhost',target:'player',player:0,shieldIndex:2};
 let html=onlineScreenHTML(state,{user:{}});
 assert.match(html,/あなたのシールド 3/);assert.equal((html.match(/class="shield-tile is-attack-target"/g)||[]).length,1);
 g.players[1].shieldCount=0;html=onlineScreenHTML(state,{user:{}});assert.match(html,/あなたへダイレクトアタック/);
 g.players[0].battle[0].hidden=true;g.players[0].battle[0].name='private-source';
 html=onlineScreenHTML(state,{user:{}});assert.doesNotMatch(html,/private-source/);assert.match(html,/裏向きのカード/);
 state.room.phase='finished';assert.doesNotMatch(onlineScreenHTML(state,{user:{}}),/aria-label="進行中の攻撃"/);
});
test('numeric entry is separate from legal candidates, shows its server minimum and escapes drafts',()=>{
 const state=fixture();state.room.revision=10;state.room.game.numberChoice=true;state.room.game.numberMinimum=6;state.room.game.actions=[{id:4,kind:'extended',number:6,label:'6を宣言'}];
 const html=onlineScreenHTML(state,{user:{},actionsOpen:true,numberValue:'37"<draft>'});
 assert.match(html,/placeholder="6以上の整数、または∞"/);assert.match(html,/value="37&quot;&lt;draft&gt;"/);
 assert.match(html,/data-action="online-number-submit"[^>]*data-index="4" data-revision="10"/);
 assert.match(html,/data-action="online-move"[^>]*data-index="4"/);
});

for(const seat of [0,1])for(const type of ['creature','gear','field','seed'])test('a selected field '+type+' keeps contextual controls at seat '+seat,async()=>{
 const {onlinePrimaryAction}=await import('../dist/online-ui.js'),state=fixture(seat),g=state.room.game,x={...c('field-object'),type};
 g.phase='main';g.players[seat].battle=[x];g.actions=[{id:3,kind:type==='creature'?'hyper':'extended',uid:x.uid,label:'能力を使う'},{id:8,kind:'toAttack',label:'攻撃へ進む'}];
 const primary=onlinePrimaryAction(state.room,x.uid);assert.equal(primary.command,'card');assert.equal(primary.label,'使う方法を選ぶ');assert.equal(primary.move,null);
 g.phase='attack';g.actions=[{id:5,kind:'attack',uid:x.uid,label:'攻撃'},{id:8,kind:'endTurn',label:'ターン終了'}];
 assert.equal(onlinePrimaryAction(state.room,x.uid).command,'targets');
});
test('a permanent connection error explains that automatic retries are paused while manual reconnect stays available',()=>{
 const state=fixture();state.connected=false;state.error='更新してから再接続してください。';state.retry={automatic:false,delay:6000};
 const html=onlineScreenHTML(state,{user:{}});assert.match(html,/自動再接続を停止中/);assert.match(html,/data-action="online-refresh"/);
});

test('online dialog renderer rejects invalid scopes, protects hidden faces and labels stale data',async()=>{
 const {onlineDialogContent}=await import('../dist/online-ui.js'),state=fixture(),room=state.room;
 room.game.players[0].mana=[{uid:'hidden-mana',hidden:true,name:'secret-face',id:'secret-id'}];
 let content=onlineDialogContent(room,{kind:'zone',player:0,zone:'mana'},{connected:false});
 assert.match(content.html,/最後に確認した内容/);assert.match(content.html,/裏向き/);assert.doesNotMatch(content.html,/secret-face|secret-id/);
 assert.equal(onlineDialogContent(room,{kind:'zone',player:0,zone:'deck'}),null);
 assert.equal(onlineDialogContent(room,{kind:'zone',player:1,zone:'revealedHand'}),null);
 assert.equal(onlineDialogContent({...room,seat:-1},{kind:'field',player:0}),null);
 assert.equal(onlineDialogContent(room,{kind:'field',player:3}),null);
 room.game.revealedHand=[c('known-hand')];assert.match(onlineDialogContent(room,{kind:'zone',player:1,zone:'revealedHand'}).html,/known-hand/);
 assert.equal(onlineDialogContent(room,{kind:'zone',player:0,zone:'revealedHand'}),null);
});

for(const kind of ['ordinary','confirm','number','mana','lobby','waiting'])test('online action context '+kind+' renders the same opaque scope on every mutating control',()=>{
 const state=fixture();state.room.revision=7;state.room.code='1122334455667788';const g=state.room.game;let pending=null,expected;
 if(kind==='ordinary')expected=['online-primary','online-move'];
 if(kind==='confirm'){g.actions=[{id:9,kind:'attack',label:'攻撃する',uid:'bhost',target:'player'}];pending={revision:7,action:g.actions[0]};expected=['online-primary','online-confirm-move'];}
 if(kind==='number'){g.numberChoice=true;g.actions=[{id:11,kind:'choose',number:3,label:'3を宣言'}];expected=['online-primary','online-move','online-number-submit'];}
 if(kind==='mana'){g.manaPayment={amount:0,cost:1,colors:[],cards:[{uid:'mana1',name:'mana',colors:[],value:1,selected:false}]};g.actions=[{id:12,kind:'selectMana',uid:'mana1'},{id:13,kind:'confirmMana'},{id:14,kind:'cancelMana'}];expected=['online-primary','online-pay-mana'];}
 if(kind==='lobby'){state.room=null;expected=['online-create','online-join'];}
 if(kind==='waiting'){state.room.phase='waiting';delete state.room.game;expected=['online-cancel'];}
 const html=onlineScreenHTML(state,{user:{uid:'current'},actionContext:'scope-123',decks:[{id:'d',name:'deck'}],actionsOpen:true,pending});
 for(const action of expected){const buttons=[...html.matchAll(/<button\b([^>]*)>/g)].filter(m=>m[1].includes(`data-action="${action}"`));assert.ok(buttons.length,action);for(const [,attrs]of buttons)assert.match(attrs,/data-context="scope-123"/);}
});
test('online action context is escaped without exposing an account identifier in the markup',()=>{
 const html=onlineScreenHTML(fixture(),{user:{uid:'private-account-id'},actionContext:'scope"<&',actionsOpen:true});assert.match(html,/data-context="scope&quot;&lt;&amp;"/);assert.doesNotMatch(html,/private-account-id/);
});
