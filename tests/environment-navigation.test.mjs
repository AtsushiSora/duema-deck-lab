import {APP_VERSION} from '../dist/app-updates.js';
import {createCardArt} from '../dist/card-art.js';
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
 const context=vm.createContext({APP_VERSION,createCardArt,...e,...manual,...cardInfo,...environment,battleCard:e.card,PRESETS,createCatalogue,prepareDeckCopy,fixtureRegistry:registry,fixtureSaved:{decks:empty?[]:[{...structuredClone(PRESETS[0]),id:'original',name:'元のデッキ',category:'自分'}],friends:[],history:[],selected:'original'},fixtureData:data,
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

test('match overview exposes own and opponent environment buttons; each picker leads to playable deck selection',async()=>{
 const h=harness();
 assert.match(h.root.innerHTML, /aria-label="自分の環境デッキを選ぶ"/);
 assert.match(h.root.innerHTML, /aria-label="相手の環境デッキを選ぶ"/);
 await h.click('select-my-deck');await h.click('choose-environment',{role:'mine'});
 assert.ok(h.dialog.open);const html=h.dialog.innerHTML;
 assert.match(html,/バイケン（Grimoire）/);
 assert.ok(html.indexOf('data-action="pick-environment"')<html.indexOf('40枚の構成・対応状況を見る'));
 assert.match(html,/対戦可能/);assert.ok(!html.includes('対戦は準備中'));
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
 assert.match(h.root.innerHTML,/バイケン（Grimoire）/);
 assert.ok(h.root.innerHTML.indexOf('data-action="create-environment"')<h.root.innerHTML.indexOf('40枚の構成・対応状況を見る'));
 h.read("edit.name='編集中のデッキ'");await h.click('create-environment',{id:target.id});
 assert.match(h.dialog.innerHTML,/作成中の内容を終了/);assert.equal(h.read('saved.decks.length'),1);
 await h.click('close-dialog');assert.equal(h.read('edit.name'),'編集中のデッキ');
 await h.click('create-environment',{id:target.id});await h.click('confirm-environment',{id:target.id});
 assert.equal(h.read('view'),'decks');assert.equal(h.read('myDeck().name'),target.name);assert.equal(h.read('sum(myDeck())'),40);
});

test('environment navigation is available with no saved deck and all four lists enable battle',async()=>{
 const h=harness({empty:true});await h.click('choose-environment',{role:'mine'});await h.click('pick-environment',{id:target.id,role:'mine'});
 assert.equal(h.read('view'),'battle');assert.equal(h.read('sum(myDeck())'),40);
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:'env-gp2026-grimoire',role:'opponent'});
 assert.equal(h.read('saved.friends.length'),1);assert.equal(h.read('matchBlockReason(myDeck(),simulationOpponents(null))'),'');
 assert.ok(!/<button[^>]*data-action="start-match"[^>]*disabled/.test(h.root.innerHTML));
});

test('dotto tournament list is selectable for either side and enables battle with the existing supported list',async()=>{
 const h=harness();await h.click('choose-environment',{role:'mine'});assert.match(h.dialog.innerHTML,/ドギラゴン王道（dotto）/);await h.click('pick-environment',{id:'env-nationals2025-dotto',role:'mine'});assert.equal(h.read('myDeck().templateId'),'env-nationals2025-dotto');assert.equal(h.read('sum(myDeck())'),40);
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:target.id,role:'opponent'});assert.equal(h.read('matchBlockReason(myDeck(),simulationOpponents(null))'),'');assert.ok(!/<button[^>]*data-action="start-match"[^>]*disabled/.test(h.root.innerHTML));
 await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:'env-nationals2025-dotto',role:'opponent'});assert.equal(h.read('opponentDecks().find(x=>x.id===selectedOpp).templateId'),'env-nationals2025-dotto');assert.equal(h.read('sum(opponentDecks().find(x=>x.id===selectedOpp))'),40);
});
test('year filters show newest groups first and select the filtered list for either role without writing on filtering',async()=>{for(const role of['mine','opponent']){const h=harness();await h.click('choose-environment',{role});const years=[...h.dialog.innerHTML.matchAll(/data-environment-year="(\d+)"/g)].map(x=>x[1]);assert.deepEqual(years,['2026','2025','2024','2023']);assert.equal((h.dialog.innerHTML.match(/class="panel environment-card/g)||[]).length,24);const writes=h.writes.length;
 await h.click('environment-year',{year:'2023'});assert.deepEqual([...h.dialog.innerHTML.matchAll(/data-environment-year="(\d+)"/g)].map(x=>x[1]),['2023']);assert.equal((h.dialog.innerHTML.match(/class="panel environment-card/g)||[]).length,5);assert.match(h.dialog.innerHTML,/data-year="2023" aria-pressed="true"/);assert.ok(!h.dialog.innerHTML.includes('data-id="env-gp2026-grimoire"'));assert.equal(h.writes.length,writes);assert.equal(h.read('environmentPickerRole'),role);
 await h.click('environment-year',{year:'all'});assert.equal((h.dialog.innerHTML.match(/class="panel environment-card/g)||[]).length,24);await h.click('environment-year',{year:'2023'});await h.click('pick-environment',{id:'env-lionel-practice',role});assert.equal(h.read(role==='mine'?'myDeck().templateId':'selectedOpponent().templateId'),'env-lionel-practice');assert.equal(h.read(role==='mine'?'sum(myDeck())':'sum(selectedOpponent())'),40);assert.equal(h.read('saved.decks[0].name'),'元のデッキ');await h.click('choose-environment',{role});assert.equal(h.read('environmentYearFilter'),'all');assert.equal((h.dialog.innerHTML.match(/class="panel environment-card/g)||[]).length,24);}});
test('year filtering in the editor preserves the draft and creation safeguards',async()=>{const h=harness();await h.click('nav',{view:'decks'});await h.click('new-deck');h.read("edit.name='年代別から選ぶ途中';edit.cards=[{id:'dm01-108',count:1}]");await h.click('editor-tab',{tab:'environment'});const original=h.read('JSON.stringify(edit)'),writes=h.writes.length;await h.click('environment-year',{year:'2024'});assert.equal((h.root.innerHTML.match(/class="panel environment-card/g)||[]).length,6);assert.ok(!h.dialog.open);assert.equal(h.read('JSON.stringify(edit)'),original);assert.equal(h.writes.length,writes);await h.click('create-environment',{id:'env-kenji-gp2024-maiken'});assert.match(h.dialog.innerHTML,/作成中の内容を終了/);await h.click('close-dialog');assert.equal(h.read('JSON.stringify(edit)'),original);});

 test('historical environment selection, sharing and JSON imports preserve original limits in the actual app',async()=>{
 const h=harness();await h.click('choose-environment',{role:'mine'});assert.match(h.dialog.innerHTML,/当時の使用制限/);await h.click('pick-environment',{id:'env-abyss-practice',role:'mine'});
 assert.equal(h.read('myDeck().historicalId'),'env-abyss-practice');assert.equal(h.read("myDeck().cards.find(x=>x.id==='dm14-069').count"),1);assert.equal(h.read("myDeck().cards.find(x=>x.id==='dm23ex1-004').count"),4);
 h.read('globalThis.shared=sharedURL(myDeck())');assert.equal(h.read('typeof shared'),'string');
 assert.equal(h.read('parseDeckText(JSON.stringify(myDeck())).historicalId'),'env-abyss-practice');assert.equal(h.read('registry.validate(parseDeckText(JSON.stringify(myDeck()))).length'),0);
 assert.equal(h.read('parseDeckText(new TextDecoder().decode(Uint8Array.from(atob(decodeURIComponent(new URL(shared).hash.slice(6))),c=>c.charCodeAt(0)))).historicalId'),'env-abyss-practice');await h.click('choose-environment',{role:'opponent'});await h.click('pick-environment',{id:'env-abyss-practice',role:'opponent'});assert.equal(h.read('saved.friends[0].historicalId'),'env-abyss-practice');assert.equal(h.read('matchBlockReason(myDeck(),simulationOpponents(null))'),'');
 assert.match(h.read('tournamentHTML(myDeck())'),/大会当時の40枚/);assert.equal(h.read('saved.decks[0].name'),'元のデッキ');
 });
