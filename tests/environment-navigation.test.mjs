import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {e,PRESETS,data,details,snapshot,target} from './target-fixture.mjs';
import * as cardInfo from '../dist/card-info.js';
import * as manual from '../dist/manual-ui.js';
import * as environment from '../dist/environment.js';
import {createCatalogue} from '../dist/catalogue.js';
import {prepareDeckCopy} from '../dist/deck-copy.js';
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href));
function harness({empty=false}={}){
 const listeners={},errors=[],writes=[],root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},toast={textContent:'',classList:{add(){},remove(){}}};
 const registry=createCatalogue(snapshot,data.cards,details);
 const context=vm.createContext({...e,...manual,...cardInfo,...environment,battleCard:e.card,PRESETS,createCatalogue,prepareDeckCopy,fixtureRegistry:registry,fixtureSaved:{decks:empty?[]:[{...structuredClone(PRESETS[0]),id:'original',name:'元のデッキ',category:'自分'}],friends:[],history:[],selected:'original'},fixtureData:data,
  console:{error:e=>errors.push(e)},structuredClone,crypto:globalThis.crypto,TextDecoder,TextEncoder,URL,Intl,Date,
  localStorage:{getItem:()=>null,setItem:(key,value)=>writes.push(JSON.parse(value))},setTimeout:()=>1,clearTimeout(){},clearInterval(){},setInterval:()=>1,
  document:{querySelector:s=>s==='#app'?root:s==='#dialog'?dialog:s==='#toast'?toast:null,querySelectorAll:()=>[],body:{classList:{toggle(){}}},addEventListener:(name,f)=>listeners[name]=f},window:{addEventListener(){},scrollTo(){}},location:{hash:'',pathname:'/'},history:{replaceState(){}}});
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

test('match overview exposes own and opponent environment buttons; each picker leads to playable deck selection',async()=>{
 const h=harness();
 assert.match(h.root.innerHTML, /aria-label="自分の環境デッキを選ぶ"/);
 assert.match(h.root.innerHTML, /aria-label="相手の環境デッキを選ぶ"/);
 await h.click('select-my-deck');await h.click('choose-environment',{role:'mine'});
 assert.ok(h.dialog.open);const html=h.dialog.innerHTML;
 assert.ok(html.indexOf(target.name)<html.indexOf('バイケン（Grimoire）'));
 assert.ok(html.indexOf('data-action="pick-environment"')<html.indexOf('40枚の構成・対応状況を見る'));
 assert.match(html,/対戦可能/);assert.match(html,/登録する（対戦は準備中）/);
 assert.ok(!/<details[^>]*\bopen/.test(html));
 await h.click('pick-environment',{id:target.id,role:'mine'});
 assert.equal(h.read('view'),'battle');assert.equal(h.dialog.open,false);
 assert.equal(h.read('myDeck().name'),target.name);assert.equal(h.read('sum(myDeck())'),40);
 assert.equal(h.read('saved.decks.length'),2);assert.equal(h.read('saved.decks[0].name'),'元のデッキ');assert.equal(h.read('saved.friends.length'),0);
 assert.ok(h.writes.length);assert.deepEqual(JSON.parse(h.read('JSON.stringify(myDeck().cards)')),target.cards);
 await h.click('choose-opponent');await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:target.id,role:'opponent'});
 assert.equal(h.read('view'),'battle');assert.equal(h.read('saved.friends.length'),1);assert.equal(h.read('saved.friends[0].id===selectedOpp'),true);
 assert.equal(h.read('matchBlockReason(myDeck(),simulationOpponents(null))'),'');
 assert.match(h.root.innerHTML,/<button[^>]*data-action="start-match"[^>]*>/);
 assert.ok(!h.root.innerHTML.match(/<button[^>]*data-action="start-match"[^>]*disabled/));
 assert.equal(h.read('saved.friends[0].cards===myDeck().cards'),false);
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:target.id,role:'opponent'});assert.equal(h.read('saved.friends.length'),1);
});

test('new-deck editor keeps environment entry, actionable supported list first, and explicit protection for unfinished edits',async()=>{
 const h=harness();await h.click('nav',{view:'decks'});
 assert.ok(!h.root.innerHTML.includes('data-action="choose-environment"'));
 await h.click('new-deck');await h.click('editor-tab',{tab:'environment'});
 assert.ok(h.root.innerHTML.indexOf(target.name)<h.root.innerHTML.indexOf('バイケン（Grimoire）'));
 assert.ok(h.root.innerHTML.indexOf('data-action="create-environment"')<h.root.innerHTML.indexOf('40枚の構成・対応状況を見る'));
 h.read("edit.name='編集中のデッキ'");await h.click('create-environment',{id:target.id});
 assert.match(h.dialog.innerHTML,/作成中の内容を終了/);assert.equal(h.read('saved.decks.length'),1);
 await h.click('close-dialog');assert.equal(h.read('edit.name'),'編集中のデッキ');
 await h.click('create-environment',{id:target.id});await h.click('confirm-environment',{id:target.id});
 assert.equal(h.read('view'),'decks');assert.equal(h.read('myDeck().name'),target.name);assert.equal(h.read('sum(myDeck())'),40);
});

test('environment navigation is available with no saved deck and incomplete lists remain blocked for battle',async()=>{
 const h=harness({empty:true});await h.click('choose-environment',{role:'mine'});await h.click('pick-environment',{id:target.id,role:'mine'});
 assert.equal(h.read('view'),'battle');assert.equal(h.read('sum(myDeck())'),40);
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:'env-gp2026-grimoire',role:'opponent'});
 assert.equal(h.read('saved.friends.length'),1);assert.match(h.read('matchBlockReason(myDeck(),simulationOpponents(null))'),/カード効果が未対応/);
 assert.match(h.root.innerHTML,/<button[^>]*data-action="start-match"[^>]*disabled/);
});

test('dotto tournament list is selectable for either side and enables battle with the existing supported list',async()=>{
 const h=harness();await h.click('choose-environment',{role:'mine'});assert.match(h.dialog.innerHTML,/ドギラゴン王道（dotto）/);await h.click('pick-environment',{id:'env-nationals2025-dotto',role:'mine'});assert.equal(h.read('myDeck().templateId'),'env-nationals2025-dotto');assert.equal(h.read('sum(myDeck())'),40);
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:target.id,role:'opponent'});assert.equal(h.read('matchBlockReason(myDeck(),simulationOpponents(null))'),'');assert.ok(!/<button[^>]*data-action="start-match"[^>]*disabled/.test(h.root.innerHTML));
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:'env-nationals2025-dotto',role:'opponent'});assert.equal(h.read('opponentDecks().find(x=>x.id===selectedOpp).templateId'),'env-nationals2025-dotto');assert.equal(h.read('sum(opponentDecks().find(x=>x.id===selectedOpp))'),40);
});
