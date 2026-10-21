import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {e,PRESETS,data,details,snapshot,target,DOGI,GG,inst,give,setup} from './target-fixture.mjs';
import * as cardInfo from '../dist/card-info.js';
import * as manual from '../dist/manual-ui.js';import {createCatalogue} from '../dist/catalogue.js';
import * as visuals from '../dist/battle-visuals.js';
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href));
function harness(state,{mobile=false,scrollers={}}={}){
 const listeners={},errors=[],timers=new Map();let serial=0;
 const root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},toast={textContent:'',classList:{add(){},remove(){}}},classes=new Set();
 const context=vm.createContext({...e,...manual,...visuals,...cardInfo,battleCard:e.card,PRESETS,createCatalogue,fixtureRegistry:createCatalogue(snapshot,data.cards,details),fixtureState:state,fixtureDecks:[target,target],console:{log(){},error:e=>errors.push(e)},structuredClone,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,Intl,Date,CSS:{escape:x=>x},localStorage:{getItem:()=>null,setItem(){}},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout:f=>{timers.set(++serial,f);return serial;},clearTimeout:id=>timers.delete(id),clearInterval(){},setInterval:()=>++serial,
  document:{querySelector:s=>s==='#app'?root:s==='#dialog'?dialog:s==='#toast'?toast:scrollers[s]||null,querySelectorAll:s=>s==='.play-creatures,.shield-tiles'?scrollers.lanes||[]:[],activeElement:null,body:{classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)}},addEventListener:(name,f)=>listeners[name]=f},window:{innerHeight:800,addEventListener(){},scrollTo(){},matchMedia:q=>({matches:mobile&&q==='(max-width: 850px)'})}});
 vm.runInContext(app,context);
 vm.runInContext("registry=fixtureRegistry;cards=registry.cards;battleCards=fixtureRegistry.cards.filter(c=>c.supported);battle={state:fixtureState,decks:fixtureDecks,practice:true};view='manual';manualUI=newManualUI();selectedHand=null;render();",context);
 return {state,root,context,classes,errors,timers,read:code=>vm.runInContext(code,context),click:async(action,extra={})=>{const button={dataset:{action,...extra},closest:()=>null};await listeners.click({target:{closest:()=>button}});assert.deepEqual(errors,[]);}};
}

test('real app wiring selects a hand card without changing the game, then executes only its legal charge',async()=>{
 const s=e.createGame([target,target],{seed:2020}),h=harness(s),hand=s.players[0].hand[0];assert.ok(h.classes.has('manual-playing'));assert.ok(h.root.innerHTML.includes('manual-console'));const before=s.actions;await h.click('hand-card',{uid:hand.uid});assert.equal(s.actions,before);assert.equal(h.read('selectedHand'),hand.uid);assert.ok(h.root.innerHTML.includes('is-selected'));const a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===hand.uid);await h.click('battle-step',{index:String(a.id)});assert.equal(s.phase,'main');assert.ok(s.players[0].mana.some(x=>x.uid===hand.uid));assert.equal(h.read('selectedHand'),null);
});
test('real app board wiring previews an arrow before confirming exactly one attack, without a modal',async()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);give(s,1,'battle',['dm01-075']);s.players[1].battle[0].tapped=true;s.phase='attack';const h=harness(s),own=s.players[0].battle[0],opp=s.players[1].battle[0];await h.click('manual-creature',{uid:own.uid,player:'0'});assert.equal(s.actions,0);assert.equal(h.read('manualUI.attacker'),own.uid);assert.ok(h.root.innerHTML.includes('攻撃先を選ぼう'));await h.click('manual-creature',{uid:opp.uid,player:'1'});assert.equal(s.actions,0);assert.ok(h.root.innerHTML.includes('attack-overlay'));assert.ok(h.root.innerHTML.includes('攻撃を確定'));const id=h.read('manualUI.attackChoice.id');await h.click('manual-confirm-attack',{index:String(id)});assert.equal(s.actions,1);assert.equal(s.attack.target,opp.uid);assert.equal(s.decision.type,'block');assert.equal(h.read('dialog.open'),false);await h.click('manual-confirm-attack',{index:String(id)});assert.equal(s.actions,1);
});
test('real app end-turn guard can be cancelled and confirmation advances exactly once',async()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);s.phase='attack';const h=harness(s),end=e.getLegalActions(s).find(a=>a.kind==='endTurn');await h.click('battle-step',{index:String(end.id)});assert.equal(s.actions,0);assert.ok(h.root.innerHTML.includes('まだ攻撃できる'));await h.click('manual-cancel-end');assert.equal(s.actions,0);assert.equal(h.read('manualUI.confirm'),null);await h.click('battle-step',{index:String(end.id)});await h.click('manual-confirm-end',{index:String(end.id)});assert.equal(s.active,1);assert.equal(s.actions,1);
});

test('attack preview can be cancelled and retargeted, and stale confirmations cannot execute another action',async()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);give(s,1,'battle',['dm01-075']);s.players[1].battle[0].tapped=true;s.phase='attack';const h=harness(s,{mobile:true}),own=s.players[0].battle[0],opp=s.players[1].battle[0];
 await h.click('manual-creature',{uid:own.uid,player:'0'});await h.click('manual-creature',{uid:opp.uid,player:'1'});assert.equal(s.actions,0);const original=h.read('manualUI.attackChoice.id');
 await h.click('manual-cancel-attack');assert.equal(s.actions,0);assert.equal(h.read('manualUI.attackChoice'),null);assert.equal(h.read('manualUI.attacker'),own.uid);
 const shield=e.getLegalActions(s).find(a=>a.kind==='attack'&&a.shield);await h.click('battle-step',{index:String(shield.id)});assert.equal(s.actions,0);assert.ok(h.root.innerHTML.includes('相手のシールド'));
 await h.click('manual-confirm-attack',{index:String(original)});assert.equal(s.actions,0);assert.equal(h.read('manualUI.attackChoice'),null);
 const end=e.getLegalActions(s).find(a=>a.kind==='endTurn');await h.click('battle-step',{index:String(end.id)});assert.ok(h.root.innerHTML.includes('まだ攻撃できる'));
 await h.click('manual-creature',{uid:opp.uid,player:'1'});assert.equal(h.read('manualUI.confirm'),null);assert.ok(h.root.innerHTML.includes('攻撃を確定'));
 opp.tapped=false;h.read('render()');await h.click('manual-confirm-attack',{index:String(original)});assert.equal(s.actions,0);assert.equal(h.read('manualUI.attackChoice'),null);
});

test('mana gain feedback appears after an executed move and is cleared on undo instead of suggesting a reverse move',async()=>{
 const s=e.createGame([target,target],{seed:2020}),h=harness(s,{mobile:true}),uid=s.players[0].hand[0].uid,a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===uid);
 assert.equal(h.read('manualUI.feedback'),null);await h.click('hand-card',{uid});await h.click('battle-step',{index:String(a.id)});assert.ok(h.root.innerHTML.includes('マナ +1枚'));assert.ok(h.root.innerHTML.includes('zone-change-delta'));
 const at=h.read('manualUI.feedback.at');await h.click('manual-panel-toggle');assert.equal(h.read('manualUI.feedback.at'),at);await h.click('undo-battle');assert.equal(h.read('manualUI.feedback'),null);assert.ok(!h.root.innerHTML.includes('マナ -1枚'));
});
test('real app retains hint/undo behavior, collapsible logs and faster AI timing without modifying the rule version',async()=>{
 const s=setup();give(s,0,'hand',['dm01-108']);s.phase='charge';const h=harness(s),before=e.ENGINE_VERSION;await h.click('manual-log');assert.equal(h.read('manualUI.logOpen'),true);await h.click('manual-speed');assert.equal(h.read('manualUI.fast'),true);await h.click('hand-card',{uid:s.players[0].hand[0].uid});await h.click('battle-step',{index:'0'});assert.equal(s.phase,'main');await h.click('undo-battle');assert.equal(h.read('battle.state.phase'),'charge');assert.equal(h.read('manualUI.fast'),true);assert.equal(h.read('manualUI.logOpen'),true);assert.equal(e.ENGINE_VERSION,before);await h.click('battle-hint');assert.equal(h.read('dialog.open'),true);assert.ok(h.read('dialog.innerHTML').includes('次の一手のヒント'));
});

test('phone board expansion changes only display and selecting a card reopens its legal controls',async()=>{
 const s=e.createGame([target,target],{seed:2020}),h=harness(s,{mobile:true}),before=structuredClone(s),uid=s.players[0].hand[0].uid;
 await h.click('manual-panel-toggle');assert.equal(h.read('manualUI.panelMinimized'),true);assert.ok(h.root.innerHTML.includes('操作を開く'));assert.deepEqual(s,before);
 await h.click('manual-panel-toggle');assert.equal(h.read('manualUI.panelMinimized'),false);
 await h.click('hand-card',{uid});assert.equal(s.actions,0);assert.equal(h.read('selectedHand'),uid);assert.ok(h.root.innerHTML.includes('selected-hand-info'));
 const a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===uid);await h.click('battle-step',{index:String(a.id)});
 assert.equal(s.phase,'main');assert.equal(h.read('manualUI.panelMinimized'),false);assert.ok(s.players[0].mana.some(x=>x.uid===uid));
});

test('an AI transition to a required human decision reopens a minimized panel without changing the game',async()=>{
 const s=setup();give(s,0,'battle',['dm01-084']);give(s,1,'battle',['dm01-108']);s.active=1;s.phase='attack';const h=harness(s,{mobile:true});await h.click('manual-panel-toggle');assert.equal(h.read('manualUI.panelMinimized'),true);
 e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'));assert.equal(s.decision.type,'block');
 const before=structuredClone(s);h.read('render()');assert.equal(h.read('manualUI.panelMinimized'),false);assert.deepEqual(s,before);assert.ok(h.root.innerHTML.includes('ブロックするか選ぼう'));
});

test('phone menu retains speed, help, hints, undo and logs without navigating away from the board',async()=>{
 const s=e.createGame([target,target],{seed:2020}),h=harness(s,{mobile:true});await h.click('manual-options');
 for(const action of ['manual-speed','manual-help','battle-hint','undo-battle','manual-log'])assert.ok(h.read('dialog.innerHTML').includes(`data-action="${action}"`));
 await h.click('manual-speed');assert.equal(h.read('manualUI.fast'),true);assert.equal(h.read('dialog.open'),false);assert.equal(s.actions,0);
 await h.click('manual-options');await h.click('manual-help');assert.ok(h.read('dialog.innerHTML').includes('手札をタップ'));await h.click('close-dialog');
 const uid=s.players[0].hand[0].uid,a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===uid);await h.click('hand-card',{uid});await h.click('battle-step',{index:String(a.id)});
 await h.click('manual-options');await h.click('undo-battle');assert.equal(h.read('battle.state.phase'),'charge');assert.equal(h.read('dialog.open'),false);
 await h.click('manual-options');await h.click('battle-hint');assert.ok(h.read('dialog.innerHTML').includes('次の一手のヒント'));await h.click('close-dialog');
 await h.click('manual-options');await h.click('manual-log');assert.ok(h.read('dialog.innerHTML').includes('manual-log-events'));assert.equal(h.read('view'),'manual');await h.click('close-dialog');assert.equal(h.read('dialog.open'),false);
 h.read('battle.practice=false');await h.click('manual-options');assert.ok(!h.read('dialog.innerHTML').includes('data-action="battle-hint"'));assert.ok(!h.read('dialog.innerHTML').includes('data-action="undo-battle"'));
});

test('board and horizontal lane positions survive display changes, while a new hand selection brings its controls to the top',async()=>{
 const s=e.createGame([target,target],{seed:2020}),scrollers={'.manual-board-area':{scrollTop:120},'.manual-hand-cards':{scrollLeft:60},'.manual-console-content':{scrollTop:90,dataset:{}},lanes:[{scrollLeft:41},{scrollLeft:72}]},h=harness(s,{mobile:true,scrollers});
 scrollers['.manual-console-content'].scrollTop=90;await h.click('manual-panel-toggle');
 assert.equal(scrollers['.manual-board-area'].scrollTop,120);assert.equal(scrollers['.manual-hand-cards'].scrollLeft,60);assert.equal(scrollers['.manual-console-content'].scrollTop,90);assert.deepEqual(scrollers.lanes.map(x=>x.scrollLeft),[41,72]);
 await h.click('manual-panel-toggle');await h.click('hand-card',{uid:s.players[0].hand[0].uid});assert.equal(scrollers['.manual-console-content'].scrollTop,0);assert.equal(scrollers['.manual-board-area'].scrollTop,120);
});
