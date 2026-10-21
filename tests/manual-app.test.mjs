import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {e,PRESETS,data,details,snapshot,target,DOGI,GG,inst,give,setup} from './target-fixture.mjs';
import * as cardInfo from '../dist/card-info.js';
import * as manual from '../dist/manual-ui.js';import {createCatalogue} from '../dist/catalogue.js';
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href));
function harness(state){
 const listeners={},errors=[],timers=new Map();let serial=0;
 const root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},toast={textContent:'',classList:{add(){},remove(){}}},classes=new Set();
 const context=vm.createContext({...e,...manual,...cardInfo,battleCard:e.card,PRESETS,createCatalogue,fixtureRegistry:createCatalogue(snapshot,data.cards,details),fixtureState:state,fixtureDecks:[target,target],console:{log(){},error:e=>errors.push(e)},structuredClone,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,Intl,Date,CSS:{escape:x=>x},localStorage:{getItem:()=>null,setItem(){}},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout:f=>{timers.set(++serial,f);return serial;},clearTimeout:id=>timers.delete(id),clearInterval(){},setInterval:()=>++serial,
  document:{querySelector:s=>s==='#app'?root:s==='#dialog'?dialog:s==='#toast'?toast:null,querySelectorAll:()=>[],activeElement:null,body:{classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)}},addEventListener:(name,f)=>listeners[name]=f},window:{innerHeight:800,addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})}});
 vm.runInContext(app,context);
 vm.runInContext("registry=fixtureRegistry;cards=registry.cards;battleCards=fixtureRegistry.cards.filter(c=>c.supported);battle={state:fixtureState,decks:fixtureDecks,practice:true};view='manual';manualUI=newManualUI();selectedHand=null;render();",context);
 return {state,root,context,classes,errors,timers,read:code=>vm.runInContext(code,context),click:async(action,extra={})=>{const button={dataset:{action,...extra},closest:()=>null};await listeners.click({target:{closest:()=>button}});assert.deepEqual(errors,[]);}};
}

test('real app wiring selects a hand card without changing the game, then executes only its legal charge',async()=>{
 const s=e.createGame([target,target],{seed:2020}),h=harness(s),hand=s.players[0].hand[0];assert.ok(h.classes.has('manual-playing'));assert.ok(h.root.innerHTML.includes('manual-console'));const before=s.actions;await h.click('hand-card',{uid:hand.uid});assert.equal(s.actions,before);assert.equal(h.read('selectedHand'),hand.uid);assert.ok(h.root.innerHTML.includes('is-selected'));const a=e.getLegalActions(s).find(a=>a.kind==='charge'&&a.uid===hand.uid);await h.click('battle-step',{index:String(a.id)});assert.equal(s.phase,'main');assert.ok(s.players[0].mana.some(x=>x.uid===hand.uid));assert.equal(h.read('selectedHand'),null);
});
test('real app board wiring selects attacker first, then executes the chosen enemy target without a modal',async()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);give(s,1,'battle',['dm01-075']);s.players[1].battle[0].tapped=true;s.phase='attack';const h=harness(s),own=s.players[0].battle[0],opp=s.players[1].battle[0];await h.click('manual-creature',{uid:own.uid,player:'0'});assert.equal(s.actions,0);assert.equal(h.read('manualUI.attacker'),own.uid);assert.ok(h.root.innerHTML.includes('攻撃先を選ぼう'));await h.click('manual-creature',{uid:opp.uid,player:'1'});assert.equal(s.actions,1);assert.equal(s.attack.target,opp.uid);assert.equal(s.decision.type,'block');assert.equal(h.read('dialog.open'),false);
});
test('real app end-turn guard can be cancelled and confirmation advances exactly once',async()=>{
 const s=setup();give(s,0,'battle',['dm01-108']);s.phase='attack';const h=harness(s),end=e.getLegalActions(s).find(a=>a.kind==='endTurn');await h.click('battle-step',{index:String(end.id)});assert.equal(s.actions,0);assert.ok(h.root.innerHTML.includes('まだ攻撃できる'));await h.click('manual-cancel-end');assert.equal(s.actions,0);assert.equal(h.read('manualUI.confirm'),null);await h.click('battle-step',{index:String(end.id)});await h.click('manual-confirm-end',{index:String(end.id)});assert.equal(s.active,1);assert.equal(s.actions,1);
});
test('real app retains hint/undo behavior, collapsible logs and faster AI timing without modifying the rule version',async()=>{
 const s=setup();give(s,0,'hand',['dm01-108']);s.phase='charge';const h=harness(s),before=e.ENGINE_VERSION;await h.click('manual-log');assert.equal(h.read('manualUI.logOpen'),true);await h.click('manual-speed');assert.equal(h.read('manualUI.fast'),true);await h.click('hand-card',{uid:s.players[0].hand[0].uid});await h.click('battle-step',{index:'0'});assert.equal(s.phase,'main');await h.click('undo-battle');assert.equal(h.read('battle.state.phase'),'charge');assert.equal(h.read('manualUI.fast'),true);assert.equal(h.read('manualUI.logOpen'),true);assert.equal(e.ENGINE_VERSION,before);await h.click('battle-hint');assert.equal(h.read('dialog.open'),true);assert.ok(h.read('dialog.innerHTML').includes('次の一手のヒント'));
});
