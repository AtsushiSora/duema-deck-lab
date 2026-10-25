import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {APP_VERSION} from '../dist/app-updates.js';
import {createCardArt} from '../dist/card-art.js';
import {e,PRESETS,data,details,snapshot,target} from './target-fixture.mjs';
import * as cardInfo from '../dist/card-info.js';
import * as manual from '../dist/manual-ui.js';
import * as environment from '../dist/environment.js';
import * as challenge from '../dist/hero-challenge.js';
import * as opponentProgress from '../dist/opponent-progress.js';
import {createCatalogue} from '../dist/catalogue.js';
import {prepareDeckCopy} from '../dist/deck-copy.js';
import {starter25Matches,resolveStarter25Decks} from '../dist/starter25.js';
const registry=createCatalogue(snapshot,data.cards,details);
const {opponentProgressKey,recordManualVictory,isOpponentDefeated,defeatedBadgeHTML}=opponentProgress;
const heroes=challenge.resolveHeroDecks(JSON.parse(await readFile(new URL('../dist/hero-decks.json',import.meta.url))),registry);
const rivals=challenge.resolveRivalDecks(JSON.parse(await readFile(new URL('../dist/rival-decks.json',import.meta.url))),registry);
const won=d=>({state:{winner:0},decks:[PRESETS[0],d]});
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href));
function harness({empty=false}={}){
 const listeners={},errors=[],writes=[],root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},toast={textContent:'',classList:{add(){},remove(){}}};
 const registry=createCatalogue(snapshot,data.cards,details);
 const context=vm.createContext({...opponentProgress,APP_VERSION,createCardArt,...e,...manual,...cardInfo,...environment,battleCard:e.card,PRESETS,createCatalogue,prepareDeckCopy,...challenge,resolveStarter25Decks,starter25Matches,fixtureRegistry:registry,fixtureSaved:{decks:empty?[]:[{...structuredClone(PRESETS[0]),id:'original',name:'元のデッキ',category:'自分'}],friends:[],history:[],selected:'original'},fixtureData:data,
  console:{error:e=>errors.push(e)},structuredClone,btoa,atob,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,Intl,Date,
  localStorage:{getItem:()=>null,setItem:(key,value)=>writes.push(JSON.parse(value))},setTimeout:()=>1,clearTimeout(){},clearInterval(){},setInterval:()=>1,
  document:{querySelector:s=>s==='#app'?root:s==='#dialog'?dialog:s==='#toast'?toast:null,querySelectorAll:()=>[],body:{classList:{toggle(){}}},addEventListener:(name,f)=>listeners[name]=f},window:{addEventListener(){},scrollTo(){}},location:{hash:'',pathname:'/',origin:'https://example.test'},history:{replaceState(){}}});
 vm.runInContext(app,context);
 vm.runInContext("registry=fixtureRegistry;cards=registry.cards;battleCards=fixtureData.cards;metadata=fixtureData;environmentDecks=resolveEnvironmentDecks(registry);saved=fixtureSaved;view='battle';render();",context);
 const read=code=>vm.runInContext(code,context);
 return {root,dialog,writes,read,click:async(action,extra={})=>{
  const html=dialog.open?dialog.innerHTML:root.innerHTML;
  const buttons=[...html.matchAll(/<button\b([^>]*)>[\s\S]*?<\/button>/g)].map(m=>m[1]);
  assert.ok(buttons.some(attrs=>attrs.includes(`data-action="${action}"`)&&Object.entries(extra).every(([k,v])=>attrs.includes(`data-${k}="${v}"`))&&!/\bdisabled\b/.test(attrs)),`visible enabled button: ${action} ${JSON.stringify(extra)}`);
  const button={dataset:{action,...extra},closest:()=>null};await listeners.click({target:{closest:()=>button}});assert.deepEqual(errors,[]);
 }};
}

test('only a human victory records a persistent mark, repeated renders and later losses cannot remove it',()=>{
 const d=target,p=recordManualVictory({},won(d),registry),key=opponentProgressKey(d,registry);
 assert.equal(p[key],true);assert.equal(recordManualVictory(p,won(d),registry),p);
 for(const winner of [null,1,-1,undefined])assert.equal(recordManualVictory(p,{...won(d),state:{winner}},registry),p);
 assert.ok(isOpponentDefeated(d,JSON.parse(JSON.stringify(p)),registry));
 assert.equal(isOpponentDefeated(d,{},registry),false);
});
test('copies, renames, random IDs, reordered rows and alternate print IDs share the actual forty-card mark',()=>{
 const d=target,p=recordManualVictory({},won(d),registry),copy=prepareDeckCopy([],d,registry,{id:'copy',category:'相手'}).deck;
 copy.name='名前変更';copy.id='random-id';copy.cards.reverse();assert.ok(isOpponentDefeated(copy,p,registry));
 const alias=Object.keys(snapshot.aliases).find(id=>registry.get(id)&&id!==registry.get(id).id);assert.ok(alias);
 const printDeck={cards:[{id:alias,count:40}]},canonicalDeck={cards:[{id:registry.get(alias).id,count:40}]};assert.equal(opponentProgressKey(printDeck,registry),opponentProgressKey(canonicalDeck,registry));
 const changed=structuredClone(d);changed.cards[0].count--;changed.cards[1].count++;assert.equal(isOpponentDefeated(changed,p,registry),false);
});
test('all environment, official starter and character lists can have independent marks without mutating decks',()=>{
 const lists=[...environment.resolveEnvironmentDecks(registry),...resolveStarter25Decks(registry),...heroes,...rivals],before=structuredClone(lists);let p={};
 for(const d of lists){assert.ok(opponentProgressKey(d,registry));p=recordManualVictory(p,won(d),registry);assert.ok(isOpponentDefeated(d,p,registry));}
 assert.deepEqual(lists,before);assert.equal(opponentProgressKey({cards:[]},registry),null);assert.equal(opponentProgressKey({cards:[{id:'bad',count:40}]},registry),null);
});
test('existing protagonist and rival wins retain the same badge and no win/loss counts are shown',()=>{
 for(const [group,decks]of [['hero',heroes],['rival',rivals]]){
  const legacy={[decks[0].hero.id]:{wins:1,losses:3}},html=challenge.heroChallengeHTML(decks,legacy,{group,defeated:d=>isOpponentDefeated(d,{},registry,legacy)});
  assert.equal((html.match(/✓ 撃破済み/g)||[]).length,1);assert.ok(html.includes('もう一度挑む'));assert.ok(!html.includes('1勝'));assert.ok(!html.includes('3敗'));
  assert.ok(!isOpponentDefeated(decks[1],{},registry,legacy));
 }
 assert.equal(defeatedBadgeHTML(false),'');assert.ok(defeatedBadgeHTML(true).includes('✓ 撃破済み'));
});
test('app completion hook saves ordinary manual wins once using the started opponent snapshot',()=>{
 const h=harness();h.read('battle={state:{winner:null},decks:structuredClone([saved.decks[0],environmentDecks[0]])};recordManualOutcome()');assert.equal(h.writes.length,0);
 h.read('battle.state.winner=1;recordManualOutcome()');assert.equal(h.writes.length,0);
 h.read('battle.state.winner=0;recordManualOutcome()');assert.equal(h.writes.length,1);
 h.read('recordManualOutcome();battle.state.winner=1;recordManualOutcome()');assert.equal(h.writes.length,1);
 assert.ok(h.read('isOpponentDefeated(environmentDecks[0],saved.defeatedDecks,registry)'));
 h.read('saved=JSON.parse(JSON.stringify(saved));battle=null;showOpponentPicker()');assert.ok(!h.dialog.innerHTML.includes('✓ 撃破済み'));
 h.read("showEnvironmentPicker('opponent')");assert.equal((h.dialog.innerHTML.match(/✓ 撃破済み/g)||[]).length,1);
 h.read("showEnvironmentPicker('mine')");assert.ok(!h.dialog.innerHTML.includes('✓ 撃破済み'));
});
test('opponent pickers show the mark for copies and starter lists while own-deck views remain clear',()=>{
 const h=harness();h.read("starterDecks=resolveStarter25Decks(registry);const d=starterDecks[0];saved.friends=[prepareDeckCopy([],d,registry,{id:'opponent',category:'相手'}).deck];battle={state:{winner:0},decks:[saved.decks[0],saved.friends[0]]};recordManualOutcome();showOpponentPicker()");assert.match(h.dialog.innerHTML,/✓ 撃破済み/);
 assert.match(h.read('starter25HTML({role:"opponent",direct:true})'),/✓ 撃破済み/);assert.ok(!h.read('starter25HTML({role:"mine",direct:true})').includes('✓ 撃破済み'));
 h.read('battle=null;renderMatch()');assert.match(h.root.innerHTML,/✓ 撃破済み/);h.read('view="decks";render()');assert.ok(!h.root.innerHTML.includes('✓ 撃破済み'));
});
test('challenge completion preserves legacy progress, records its deck and remains isolated from automatic history',()=>{
 const h=harness();h.read("battle={state:{winner:0},decks:[saved.decks[0],{...environmentDecks[0],id:'hero-shobu',hero:{id:'shobu'}}],challengeId:'shobu',challengeGame:'one'};recordManualOutcome();recordManualOutcome()");assert.equal(h.writes.length,1);assert.equal(h.read('saved.heroProgress.shobu.wins'),1);
 h.read('battle=null;saved.history.push({stats:{wins:100}});renderMatch()');assert.equal(h.writes.length,1);
 assert.equal(h.read('Object.keys(saved.defeatedDecks).length'),1);
});
