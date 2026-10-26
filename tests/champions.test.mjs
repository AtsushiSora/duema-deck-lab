import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {APP_VERSION} from '../dist/app-updates.js';import {createCardArt} from '../dist/card-art.js';import {e,PRESETS,data,details,snapshot,target} from './target-fixture.mjs';
import * as cardInfo from '../dist/card-info.js';import * as manual from '../dist/manual-ui.js';import * as environment from '../dist/environment.js';import * as opponentProgress from '../dist/opponent-progress.js';import * as championLibrary from '../dist/champions.js';import {createCatalogue} from '../dist/catalogue.js';import {prepareDeckCopy} from '../dist/deck-copy.js';import {historicalProfile} from '../dist/historical-regulations.js';import {makeAccountSnapshot,decodeAccountSnapshot,encodeAccountSnapshot} from '../dist/account-data.js';
const championData=JSON.parse(await readFile(new URL('../dist/champion-decks.json',import.meta.url),'utf8')),registry=createCatalogue(snapshot,data.cards,details),resolved=championLibrary.resolveChampions(championData,registry);
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/\bboot\(\);\s*$/,'').replaceAll('import.meta.url',JSON.stringify(new URL('../dist/app.js',import.meta.url).href));
function harness({empty=false}={}){
 const listeners={},errors=[],writes=[],root={innerHTML:''},dialog={innerHTML:'',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}},toast={textContent:'',classList:{add(){},remove(){}}};
 const registry=createCatalogue(snapshot,data.cards,details);
 const context=vm.createContext({...championLibrary,...opponentProgress,APP_VERSION,createCardArt,...e,...manual,...cardInfo,...environment,battleCard:e.card,PRESETS,createCatalogue,prepareDeckCopy,fixtureRegistry:registry,fixtureSaved:{decks:empty?[]:[{...structuredClone(PRESETS[0]),id:'original',name:'元のデッキ',category:'自分'}],friends:[],history:[],selected:'original'},fixtureData:data,fetch:async url=>{assert.match(url,/champion-decks\.json/);return {ok:true,json:async()=>structuredClone(championData)};},
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

test('the archive pins complete official recipes with their main and all additional zones, without replacements',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../tools/champion-sources-v0.97.0.json',import.meta.url),'utf8'));assert.deepEqual(championData,manifest);assert.equal(resolved.records.length,70);assert.equal(new Set(resolved.records.map(r=>r.id)).size,70);assert.equal(new Set(resolved.records.map(r=>r.slug)).size,52);
 for(const r of resolved.records){assert.ok(championLibrary.officialChampionSource(r.source));assert.ok(r.resultSource.startsWith('https://dm.takaratomy.co.jp/coverage/'));assert.equal(r.cards.reduce((n,c)=>n+c.count,0),r.mainCount);assert.equal(r.extraZones.flatMap(z=>z.cards).reduce((n,c)=>n+c.count,0),r.extraCount);assert.ok(r.cards.every(c=>c.name&&c.id));}
});
test('national champion Rino preserves sixty cards and both extra zones rather than becoming a forty-card approximation',()=>{
 const r=resolved.records.find(r=>r.slug==='dmnt24'&&r.mainCount===60);assert.equal(r.player,'リノグレ');assert.equal(r.extraCount,20);assert.deepEqual(r.extraZones.map(z=>[z.name,z.cards.reduce((n,c)=>n+c.count,0)]),[['超次元ゾーン',8],['超GRゾーン',12]]);assert.equal(r.deck,null);assert.equal(r.playable,false);const html=championLibrary.championRowsHTML(r);assert.match(html,/60枚/);assert.match(html,/超次元ゾーン/);assert.match(html,/超GRゾーン/);
});
test('a team champion includes losing individual seats and never substitutes a finalist from the other team',()=>{
 assert.deepEqual(resolved.records.filter(r=>r.slug==='dmgp2024b').map(r=>r.player).sort(),['Rikky','極限バンバン辿異','紅蓮'].sort());assert.ok(!resolved.records.some(r=>r.slug==='dmgp2024b'&&r.player==='えむつー'));assert.deepEqual(resolved.records.filter(r=>r.slug==='dmscs09a').map(r=>r.player).sort(),['たぐ','英進んにょお！？勢','まつぴ'].sort());
});
test('fixed official forties permit only their observed original limits, and remain valid across copying and account storage',()=>{
 const entries=resolved.records.filter(r=>r.deck);assert.equal(entries.length,40);assert.equal(resolved.records.filter(r=>r.playable).length,21);
 for(const r of entries){const d=r.deck;assert.ok(historicalProfile(d));assert.deepEqual(registry.validate(d),[]);const copy=prepareDeckCopy([],d,registry,{id:'copy-'+r.id,category:'相手'}).deck;assert.deepEqual(copy.cards,d.cards);assert.ok(historicalProfile(copy));const restored=decodeAccountSnapshot(encodeAccountSnapshot(makeAccountSnapshot({decks:[],friends:[copy]},registry)),registry).friends[0];assert.ok(historicalProfile(restored));if(r.playable){assert.deepEqual(e.validateDeck(d),[]);const game=e.createGame([PRESETS[0],d],{seed:9701,first:0});assert.equal(e.physicalCards(game).length,80);assert.ok(e.getLegalActions(game).length);}}
 const d=structuredClone(entries[0].deck);d.cards[0].count--;d.cards[1].count++;assert.equal(historicalProfile(d),null);
});
test('missing official names are kept outside the complete library and coverage never claims every tournament is available',()=>{
 assert.equal(championData.gaps.length,2);assert.ok(championData.gaps.some(r=>r.slug==='dmscs01'));assert.ok(championData.gaps.some(r=>r.slug==='dmjp2023'));const html=championLibrary.championsHTML(resolved);assert.match(html,/オリジナルの公式優勝デッキ 38件/);assert.ok(!html.includes('優勝：垣根'));assert.ok(!html.includes('2015年'));assert.ok(!html.includes('全構成を確認できていない'));assert.equal(resolved.records.length,70);
});
test('year and series filters expose the actual championship season and retain every card name and source',()=>{
 const html=championLibrary.championsHTML(resolved,{year:'2024',series:'全国大会'});assert.match(html,/優勝：リノグレ/);assert.ok(!html.includes('メイン60枚'));assert.ok(!html.includes('優勝：希亜'));for(const r of resolved.records.filter(r=>r.year===2024&&r.series==='全国大会'&&championLibrary.isOriginalChampion(r)))for(const c of r.cards)assert.ok(html.includes(c.name.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));
});
test('real app entry, filters and ready selection use a verified unchanged champion without replacing existing decks',async()=>{
 const h=harness();await h.click('choose-champions',{role:'opponent'});assert.match(h.dialog.innerHTML,/オリジナルの公式優勝デッキ 38件/);await h.click('champion-year',{year:'2026'});await h.click('champion-series',{series:'GP'});assert.match(h.dialog.innerHTML,/Grimoire/);assert.ok(!h.dialog.innerHTML.includes('優勝：希亜'));
 await h.click('pick-champion',{id:'champion-dmgp2026b-0-original',role:'opponent'});assert.equal(h.read('saved.friends.length'),1);assert.equal(h.read('myDeck().name'),'元のデッキ');assert.equal(h.read('selectedOpponent().historicalId'),'champion-dmgp2026b-0-original');assert.equal(h.read('matchBlockReason(myDeck(),[selectedOpponent()])'),'');
});
test('unsupported main-deck cards can be registered as the complete official forty while extra-zone lists cannot be selected as a stripped deck',async()=>{
 const h=harness();await h.click('choose-champions',{role:'mine'});await h.click('pick-champion',{id:'champion-dmnt25-0-original',role:'mine'});assert.equal(h.read('sum(myDeck())'),40);assert.equal(h.read('coverage(myDeck()).unsupported')>0,true);await h.click('choose-champions',{role:'opponent'});h.read("championYear='2024';championSeries='全国大会'");await h.click('champion-year',{year:'2024'});assert.ok(!h.dialog.innerHTML.includes('メイン60枚'));assert.ok(!h.dialog.innerHTML.includes('champion-dmnt24-0-advance'));assert.match(h.dialog.innerHTML,/優勝：リノグレ/);
});
test('winning a selected champion shows the same persistent defeat badge in the champion picker',async()=>{
 const h=harness();await h.click('choose-champions',{role:'opponent'});await h.click('pick-champion',{id:'champion-dmgp2026b-0-original',role:'opponent'});h.read('battle={state:{winner:0},decks:[myDeck(),selectedOpponent()]};recordManualOutcome();battle=null');await h.click('choose-champions',{role:'opponent'});assert.match(h.dialog.innerHTML,/✓ 撃破済み/);
});
test('corrupt or approximated official rows and untrusted source URLs are rejected',()=>{
 for(const change of [d=>d.records[0].cards[0].count++,d=>d.records[0].source='https://example.com',d=>d.records.push(d.records[0]),d=>d.records[0].cards[0].id='unknown']){const d=structuredClone(championData);change(d);assert.throws(()=>championLibrary.resolveChampions(d,registry));}
});

test('source parser preserves comments, evolution angle brackets, unknown slots and all external-zone labels',async()=>{
 const {parseOfficialDeckLists}=await import('../tools/champion-parser.mjs');
 const html=`<table><td align="center"><!-- note --><b>選手<br><strong>全国大会2024<br>アドバンス構築</strong></b></td></table>
 <font>60　クリーチャー</font><b>4</b> <a href='/card/detail/?id=dmrp21-071'>《ツクっちょ &lt;メイ様.Star&gt;》</a><br>
 <b>4</b> <a href='/card/detail/?id='>《》</a><font>8　超次元ゾーン</font><b>1</b> <a href='/card/detail/?id=dmrp21-071'>《ツクっちょ &lt;メイ様.Star&gt;》</a><font>12　超GRゾーン</font><b>2</b> <a href='/card/detail/?id=dmrp21-071'>《ツクっちょ &lt;メイ様.Star&gt;》</a>`;
 const [d]=parseOfficialDeckLists(html,registry);assert.equal(d.player,'選手');assert.equal(d.cards[0].printedName,'ツクっちょ <メイ様.Star>');assert.equal(d.cards[1].id,null);assert.equal(d.cards[1].count,4);assert.equal(d.mainCount,8);assert.equal(d.extraCount,3);assert.deepEqual(d.cards.map(c=>c.zone),['main','main','超次元ゾーン','超GRゾーン']);
});

test('exporting an original champion preserves its exact official forty and format',async()=>{
 const h=harness();await h.click('choose-champions',{role:'opponent'});h.read('const recipeDownloads=[];download=(name,value)=>recipeDownloads.push({name,value})');await h.click('export-champion',{id:'champion-dmnt24-0-original'});const output=JSON.parse(h.read('recipeDownloads[0].value'));assert.equal(output.kind,'official-tournament-recipe');assert.equal(output.recipe.mainCount,40);assert.equal(output.recipe.extraCount,0);assert.deepEqual(output.recipe,championData.records.find(r=>r.id==='champion-dmnt24-0-original'));assert.throws(()=>h.read('parseDeckText(recipeDownloads[0].value)'));
});

test('official history winners and archived lists recover the early years without confusing runner-up and champion',()=>{
 assert.equal(resolved.records.find(r=>r.slug==='dmgp04').player,'カムイ');
 const gp3=resolved.records.find(r=>r.slug==='dmgp03');assert.equal(gp3.player,'W');assert.equal(gp3.cards.find(c=>c.id==='dmr19-fl01').count,1);assert.equal(gp3.sourceCorrections.length,1);
 assert.equal(resolved.records.filter(r=>r.slug==='dmnt18').length,2);assert.equal(resolved.records.filter(r=>r.slug==='saikyoiketteisen').length,2);
 const r=resolved.records.find(r=>r.archiveSource);assert.ok(championLibrary.officialArchiveSource(r.archiveSource,r.source));assert.equal(championLibrary.officialArchiveSource(r.archiveSource,'https://dm.takaratomy.co.jp/coverage/other'),false);assert.equal(championLibrary.officialArchiveSource(r.archiveSource.replace('dm.takaratomy.co.jp','example.com'),r.source),false);
 const corrupt=structuredClone(championData);corrupt.records.find(r=>r.archiveSource).archiveSource=r.archiveSource.replace('dm.takaratomy.co.jp','example.com');assert.throws(()=>championLibrary.resolveChampions(corrupt,registry));
});
test('the history table parser retains both columns, metadata, unresolved slots and additional zones',async()=>{
 const {parseOfficialHistory}=await import('../tools/champion-parser.mjs');
 const html=`<table class="deckList"><tr><td>4</td><td><a href='/card/detail/?id=dmrp05-011'>《奇石 ミクセル/ジャミング・チャフ》</a></td><td>1</td><td><a href='/card/detail/?id='>《》</a></td></tr><tr><td colspan="4" class="zone">超次元ゾーン</td></tr><tr><td>2</td><td><a href='/card/detail/?id=dmrp05-011'>《奇石 ミクセル/ジャミング・チャフ》</a></td></tr></table><table class="deckName"><tr><td colspan="3">デッキ名</td></tr><tr><td>2016年9月19日</td><td>DMGP3rd 優勝</td><td>W</td></tr></table>`;
 const [r]=parseOfficialHistory(html,registry);assert.deepEqual(r.header,['W','DMGP3rd 優勝','2016年9月19日','デッキ名']);assert.equal(r.mainCount,5);assert.equal(r.extraCount,2);assert.equal(r.cards[0].id,'dmrp05-011');assert.equal(r.cards[1].id,null);assert.equal(r.cards[1].printedName,'');
});
test('battle-ready filter exposes twenty-one selectable exact recipes and combines with years and series',async()=>{const h=harness();await h.click('choose-champions',{role:'opponent'});await h.click('champion-availability',{availability:'ready'});assert.match(h.dialog.innerHTML,/21件を表示/);assert.ok(!h.dialog.innerHTML.includes('効果対応待ち'));assert.ok(!h.dialog.innerHTML.includes('追加ゾーンの対戦対応待ち'));await h.click('champion-year',{year:'2023'});await h.click('champion-series',{series:'全国大会'});assert.match(h.dialog.innerHTML,/1件を表示/);assert.match(h.dialog.innerHTML,/優勝：キナリ/);await h.click('pick-champion',{id:'champion-dmnt23-0-original',role:'opponent'});assert.equal(h.read('matchBlockReason(myDeck(),[selectedOpponent()])'),'');assert.equal(h.read('selectedOpponent().historicalId'),'champion-dmnt23-0-original');});
