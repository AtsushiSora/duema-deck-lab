import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {e,PRESETS,data,details,snapshot,target,DOGI,GG,inst,give,setup} from './target-fixture.mjs';
import * as cardInfo from '../dist/card-info.js';
import * as manual from '../dist/manual-ui.js';import {createCatalogue} from '../dist/catalogue.js';
import * as visuals from '../dist/battle-visuals.js';
import * as fit from '../dist/board-fit.js';
import * as handUI from '../dist/hand-ui.js';
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href));
function harness(state,{mobile=false,scrollers={}}={}){
 const listeners={},errors=[],timers=new Map();let serial=0;
 const root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},toast={textContent:'',classList:{add(){},remove(){}}},classes=new Set();
 const context=vm.createContext({...e,...manual,...visuals,...fit,...handUI,...cardInfo,battleCard:e.card,PRESETS,createCatalogue,fixtureRegistry:createCatalogue(snapshot,data.cards,details),fixtureState:state,fixtureDecks:[target,target],console:{log(){},error:e=>errors.push(e)},structuredClone,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,Intl,Date,CSS:{escape:x=>x},localStorage:{getItem:()=>null,setItem(){}},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout:f=>{timers.set(++serial,f);return serial;},clearTimeout:id=>timers.delete(id),clearInterval(){},setInterval:()=>++serial,
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

test('phone starts with the full board and opens the hand and controls only on request',async()=>{
 const s=e.createGame([target,target],{seed:2020}),h=harness(s,{mobile:true}),before=structuredClone(s),uid=s.players[0].hand[0].uid;
 assert.equal(h.read('manualUI.mobilePanel'),'closed');assert.ok(h.root.innerHTML.includes('manual-mobile-dock'));assert.ok(!h.root.innerHTML.includes('class="manual-hand-cards"'));
 await h.click('manual-open-hand');assert.equal(h.read('manualUI.mobilePanel'),'hand');assert.ok(h.root.innerHTML.includes('class="manual-hand-cards"'));assert.deepEqual(s,before);
 await h.click('manual-panel-toggle');assert.equal(h.read('manualUI.mobilePanel'),'closed');assert.deepEqual(s,before);
 await h.click('manual-open-hand');await h.click('hand-card',{uid});assert.equal(s.actions,0);assert.equal(h.read('selectedHand'),uid);assert.equal(h.read('manualUI.mobilePanel'),'card');assert.ok(h.root.innerHTML.includes('hand-inspector'));
 const a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===uid);await h.click('battle-step',{index:String(a.id)});
 assert.equal(s.phase,'main');assert.equal(h.read('manualUI.panelMinimized'),false);assert.ok(s.players[0].mana.some(x=>x.uid===uid));
 assert.equal(h.read('manualUI.mobilePanel'),'closed');
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
 const s=e.createGame([target,target],{seed:2020}),scrollers={'.manual-board-area':{scrollTop:120},'.manual-hand-cards':{scrollLeft:60},'.hand-shelf-cards':{scrollLeft:220},'.manual-console-content':{scrollTop:90,dataset:{}},lanes:[{scrollLeft:41},{scrollLeft:72}]},h=harness(s,{mobile:true,scrollers});
 scrollers['.manual-console-content'].scrollTop=90;await h.click('manual-panel-toggle');
 assert.equal(scrollers['.manual-board-area'].scrollTop,120);assert.equal(scrollers['.manual-hand-cards'].scrollLeft,60);assert.equal(scrollers['.hand-shelf-cards'].scrollLeft,220);assert.equal(scrollers['.manual-console-content'].scrollTop,90);assert.deepEqual(scrollers.lanes.map(x=>x.scrollLeft),[41,72]);
 await h.click('manual-panel-toggle');await h.click('hand-card',{uid:s.players[0].hand[0].uid});assert.equal(scrollers['.manual-console-content'].scrollTop,0);assert.equal(scrollers['.manual-board-area'].scrollTop,120);
});

test('phone hand pages expose later cards and selecting one executes the correct legal mana charge',async()=>{
 const s=e.createGame([target,target],{seed:2020});s.players[0].hand.push(...s.players[0].deck.splice(0,6));const h=harness(s,{mobile:true}),uid=s.players[0].hand.at(-1).uid;
 await h.click('manual-open-hand');assert.equal((h.root.innerHTML.match(/class="manual-hand-card /g)||[]).length,6);assert.ok(!h.root.innerHTML.includes(`data-focus-key="hand-${uid}"`));
 await h.click('manual-hand-page',{page:'1'});assert.equal(s.actions,0);assert.ok(h.root.innerHTML.includes(`data-focus-key="hand-${uid}"`));
 await h.click('hand-card',{uid});const a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===uid);await h.click('battle-step',{index:String(a.id)});assert.ok(s.players[0].mana.some(x=>x.uid===uid));assert.equal(h.read('manualUI.mobilePanel'),'closed');
});

test('mandatory effect choices can be viewed on the board, paged and chosen with their original engine ids',async()=>{
 const s=setup();s.players[0].hand.push(inst('dm23bd4-008'));e.step(s,e.getLegalActions(s).find(a=>a.kind==='play'));assert.equal(s.decision.type,'manaTop');const h=harness(s,{mobile:true}),before=s.actions;
 assert.equal(h.read('manualUI.mobilePanel'),'actions');await h.click('manual-panel-toggle');assert.equal(h.read('manualUI.mobilePanel'),'closed');assert.equal(s.actions,before);
 await h.click('manual-open-actions');await h.click('manual-choice-page',{page:'1'});const choiceButtons=[...h.root.innerHTML.matchAll(/<button class="choice-card"[^>]*data-index="(\d+)"/g)];assert.ok(choiceButtons.length<=4);assert.ok(choiceButtons.length>0);
 const id=Number(choiceButtons.at(-1)[1]),a=e.getLegalActions(s).find(a=>a.id===id),selected=s.players[0].mana.find(x=>x.uid===a.uid);await h.click('battle-step',{index:String(id)});assert.equal(s.players[0].deck[0].uid,selected.uid);assert.equal(s.actions,before+1);assert.equal(h.read('manualUI.mobilePanel'),'closed');
});

test('all dense board cards remain in the overview and a paged enlargement can select the last attacker',async()=>{
 const s=setup();give(s,0,'battle',Array(17).fill('dm01-108'));s.phase='attack';const h=harness(s,{mobile:true}),uid=s.players[0].battle.at(-1).uid;
 assert.ok(h.root.innerHTML.includes('data-fit-count="17"'));for(const x of s.players[0].battle)assert.ok(h.root.innerHTML.includes(`data-visual-key="creature:0:${x.uid}"`));
 await h.click('manual-field',{player:'0',page:'4'});assert.ok(h.read('dialog.open'));assert.ok(h.read('dialog.innerHTML').includes(uid));await h.click('manual-creature',{player:'0',uid});assert.equal(h.read('dialog.open'),false);assert.equal(h.read('manualUI.attacker'),uid);assert.equal(h.read('manualUI.mobilePanel'),'closed');assert.equal(s.actions,0);
});

test('shelf selection reopens the same card, clearing removes placement cues, and the last card in a long shelf remains usable',async()=>{
 const s=e.createGame([target,target],{seed:2020});s.players[0].hand.push(...s.players[0].deck.splice(0,7));const shelf={scrollLeft:480},h=harness(s,{mobile:true,scrollers:{'.hand-shelf-cards':shelf}}),before=structuredClone(s),uid=s.players[0].hand.at(-1).uid;
 let html=h.root.innerHTML;Object.defineProperty(h.root,'innerHTML',{get:()=>html,set:value=>{html=value;shelf.scrollLeft=0;}});
 assert.ok(h.root.innerHTML.includes(`data-focus-key="shelf-${uid}"`));await h.click('hand-card',{uid});assert.equal(h.read('manualUI.mobilePanel'),'card');assert.ok(h.root.innerHTML.includes('hand-mana-target'));assert.deepEqual(s,before);
 assert.equal(shelf.scrollLeft,480);await h.click('manual-panel-toggle');await h.click('hand-card',{uid});assert.equal(shelf.scrollLeft,480);assert.equal(h.read('selectedHand'),uid);assert.equal(h.read('manualUI.mobilePanel'),'card');assert.deepEqual(s,before);
 await h.click('manual-clear-hand');assert.equal(h.read('selectedHand'),null);assert.equal(h.read('manualUI.mobilePanel'),'closed');assert.ok(!h.root.innerHTML.includes('hand-mana-target'));assert.equal(shelf.scrollLeft,480);assert.deepEqual(s,before);
});

test('twinpact face tabs alter only preview and the chosen spell executes only after pressing its legal action',async()=>{
 const s=setup();give(s,0,'hand',['dm22ex1-030']);give(s,0,'mana',Array(3).fill('dm01-097'));const h=harness(s,{mobile:true}),uid=s.players[0].hand[0].uid;
 await h.click('hand-card',{uid});assert.equal(h.read('manualUI.handFace'),1);assert.ok(h.root.innerHTML.includes('hand-spell-target'));assert.equal(s.actions,0);
 await h.click('manual-hand-face',{face:'0'});assert.equal(s.actions,0);assert.ok(!h.root.innerHTML.includes('hand-spell-target'));await h.click('manual-hand-face',{face:'1'});assert.equal(s.actions,0);
 const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.face===1);await h.click('battle-step',{index:String(a.id)});assert.equal(s.actions,1);assert.equal(h.read('selectedHand'),null);assert.equal(s.players[0].battle.length,0);assert.ok(s.players[0].mana.some(x=>x.uid===uid));
});

test('an inspected hand card stays readable while the opponent acts, then closes if that card leaves the hand',async()=>{
 const s=e.createGame([target,target],{seed:2020,first:1}),h=harness(s,{mobile:true}),uid=s.players[0].hand[0].uid;
 await h.click('hand-card',{uid});assert.equal(h.read('manualUI.mobilePanel'),'card');assert.ok(h.root.innerHTML.includes('相手の操作中'));
 e.step(s,e.chooseAI(s));h.read('render()');assert.equal(h.read('manualUI.mobilePanel'),'card');assert.equal(h.read('selectedHand'),uid);assert.ok(h.root.innerHTML.includes('hand-inspector'));
 s.players[0].grave.push(...s.players[0].hand.splice(s.players[0].hand.findIndex(x=>x.uid===uid),1));s.actions++;h.read('render()');assert.equal(h.read('selectedHand'),null);assert.equal(h.read('manualUI.mobilePanel'),'closed');
});
test('mobile extra methods exposes a legal PerfectDarkness grave cast and begins its actual modal effect',async()=>{const s=setup();give(s,0,'grave',['dmrp12-s08']);const h=harness(s,{mobile:true});await h.click('manual-extra-methods');assert.ok(h.read('dialog.open'));assert.match(h.read('dialog.innerHTML'),/墓地から絶望と反魂と滅殺の決断を唱える/);const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.origin==='grave');await h.click('battle-step',{index:String(a.id)});assert.equal(s.decision.task.op,'s6Modes');assert.equal(s.players[0].grave.length,0);assert.ok(h.root.innerHTML.includes('同じ効果も選べます'));});
test('mobile extra methods exposes Vamiria hyper activation, including its actual tap-cost choice',async()=>{const s=setup();give(s,0,'battle',['dm24ex1-028','dmr01-056']);const h=harness(s,{mobile:true});await h.click('manual-extra-methods');assert.match(h.read('dialog.innerHTML'),/ハイパー化する/);const a=e.getLegalActions(s).find(a=>a.kind==='hyper');await h.click('battle-step',{index:String(a.id)});assert.equal(s.decision.task.op,'hyperCost');});
test('mobile extra methods exposes Crossfire G-zero from mana and executes that exact permission',async()=>{const s=setup();give(s,0,'battle',['dm24ex1-023','dmrp06-025','dmrp06-025','dmex18-029']);s.players[0].battle[0].hyperActive=true;give(s,0,'mana',['dm23ex1-011']);const uid=s.players[0].mana[0].uid,h=harness(s,{mobile:true});await h.click('manual-extra-methods');assert.match(h.read('dialog.innerHTML'),/G・ゼロ/);const a=e.getLegalActions(s).find(a=>a.origin==='mana'&&a.freeSummon==='G・ゼロ');await h.click('battle-step',{index:String(a.id)});assert.ok(s.players[0].battle.some(x=>x.uid===uid));});
test('the actual zone dialog hides opposing crystal mana identities while allowing its owner to inspect them',async()=>{const s=setup();for(const p of[0,1]){give(s,p,'mana',['dm23ex3-024']);s.players[p].mana[0].faceDown=true;}const h=harness(s,{mobile:true});await h.click('zone-detail',{player:'1',zone:'mana'});assert.match(h.read('dialog.innerHTML'),/裏向きのマナ/);assert.ok(!h.read('dialog.innerHTML').includes('インカ'));assert.ok(!h.read('dialog.innerHTML').includes('dm23ex3-024'));await h.click('zone-detail',{player:'0',zone:'mana'});assert.match(h.read('dialog.innerHTML'),/裏向き：清浄のカルマ インカ/);});
test('mobile Gio inspection exposes reveal reduction and executes selected reveals and evolution through real buttons',async()=>{const s=setup();give(s,0,'mana',Array(8).fill('dm01-075'));give(s,0,'battle',['dm01-075']);give(s,0,'hand',['dmex17-105','dmrp09-s03']);const h=harness(s,{mobile:true}),uid=s.players[0].hand[0].uid;await h.click('hand-card',{uid});assert.match(h.root.innerHTML,/手札を公開して軽減する/);const a=e.getLegalActions(s).find(x=>x.alternative==='gio');await h.click('battle-step',{index:String(a.id)});assert.equal(s.decision.task.op,'g20Gio');assert.match(h.root.innerHTML,/召喚コストを軽減/);for(const value of[s.players[0].hand[1].uid,false,s.players[0].battle[0].uid]){const i=s.decision.choices.findIndex(c=>c.value===value),a=e.getLegalActions(s).find(a=>a.choice===i);assert.ok(a);await h.click('battle-step',{index:String(a.id)});}assert.equal(s.players[0].battle[0].cardId,'dmex17-105');assert.equal(s.players[0].mana.filter(x=>x.tapped).length,8);});
test('mobile Gate displays selection progress and commits both blockers only after both choices',async()=>{const s=setup();give(s,0,'hand',['dm16-007','dmrp05-002','dm22ex1-062']);const [g,a,v]=s.players[0].hand,h=harness(s,{mobile:true});const play=e.getLegalActions(s).find(a=>a.uid===g.uid&&a.kind==='play');await h.click('battle-step',{index:String(play.id)});for(const [i,uid]of[a.uid,v.uid].entries()){assert.match(h.root.innerHTML,new RegExp(i+' / 2体'));const choice=s.decision.choices.findIndex(c=>c.value===uid),action=e.getLegalActions(s).find(a=>a.choice===choice);await h.click('battle-step',{index:String(action.id)});if(i===0)assert.equal(s.players[0].battle.length,0);}assert.equal(s.players[0].battle.length,2);assert.equal(s.decision,null);assert.match(h.root.innerHTML,/星門の精霊アケルナル/);});
test('mobile board taps execute Guardman as a legal defensive action without opening a blocking window',async()=>{const s=setup();s.active=1;give(s,1,'battle',['dm01-108']);give(s,0,'battle',['dm01-075','dmrp01-027']);const [target,guard]=s.players[0].battle;target.tapped=true;s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.target===target.uid));const h=harness(s,{mobile:true});assert.match(h.root.innerHTML,/ガードマン/);await h.click('manual-creature',{uid:guard.uid,player:'0'});assert.equal(guard.tapped,true);assert.ok(s.players[0].battle.some(x=>x.uid===target.uid));assert.ok(s.log.some(x=>x.type==='guardman'));assert.ok(!s.log.some(x=>x.type==='block'));});
test('mobile dormant Hercules displays as a seed and exposes its one mana summon through the existing methods picker',async()=>{const s=setup();give(s,0,'battle',['dm22rp2-S8']);s.players[0].mana.push(inst('dmrp04m-060'));const uid=s.players[0].mana.at(-1).uid,h=harness(s,{mobile:true});assert.match(h.root.innerHTML,/タマシード/);await h.click('manual-extra-methods');assert.match(h.read('dialog.innerHTML'),/ヘラクレスでマナの/);const a=e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===uid&&a.manaPermit?.startsWith('g16:'));await h.click('battle-step',{index:String(a.id)});assert.ok(s.players[0].battle.some(x=>x.uid===uid));assert.ok(!e.getLegalActions(s).some(a=>a.manaPermit?.startsWith('g16:')));});
