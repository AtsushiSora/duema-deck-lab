import test from 'node:test';import assert from 'node:assert/strict';
import {readEditorDraft,writeEditorDraft,clearEditorDraft,EDITOR_DRAFT_KEY} from '../dist/editor-draft.js';
import {deckAccountStatus} from '../dist/deck-save-status.js';
import {readDisplayPreferences,saveDisplayPreferences,applyDisplayPreferences,applyTextSize} from '../dist/display-preferences.js';
import {createCardDetailsLoader} from '../dist/card-details-loader.js';
import {createCatalogue} from '../dist/catalogue.js';import {searchText,invalidateCardSearch,matchesCard} from '../dist/card-info.js';
import {handCardModel} from '../dist/hand-ui.js';
import {e,PRESETS,snapshot,data,details,setup,give} from './target-fixture.mjs';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('incomplete draft survives a reload independently of registered decks and validates cards on restore',()=>{
 const s=storage(),registry=createCatalogue(snapshot,data.cards,details),deck={...structuredClone(PRESETS[0]),cards:PRESETS[0].cards.slice(0,2)},before=structuredClone(deck);
 assert.ok(writeEditorDraft(s,{deck,role:'opponent',returnView:'battle',tab:'cards'}));deck.name='later';const draft=readEditorDraft(s,registry);assert.equal(draft.deck.name,before.name);assert.deepEqual(draft.deck.cards,before.cards);assert.equal(draft.role,'opponent');assert.ok(clearEditorDraft(s));assert.equal(readEditorDraft(s,registry),null);
 s.setItem(EDITOR_DRAFT_KEY,JSON.stringify({version:1,role:'mine',deck:{id:'x',name:'x',cards:[{id:'not-a-card',count:1}]}}));assert.equal(readEditorDraft(s,registry),null);assert.equal(writeEditorDraft({setItem(){throw Error('quota');}},{deck:before,role:'mine'}),false);
});
test('account status reflects current identity and confirmed remote content, not just the deck id or timestamps',()=>{
 const deck=structuredClone(PRESETS[0]),remote=structuredClone(deck),state={user:{uid:'one'},loaded:true,cloud:{snapshot:{decks:[remote],friends:[]}}};remote.cards.reverse();remote.updated='newer';
 assert.equal(deckAccountStatus(deck,'mine',state).kind,'saved');deck.cards[0].count++;assert.equal(deckAccountStatus(deck,'mine',state).kind,'pending');assert.equal(deckAccountStatus(deck,'mine',{user:null}).kind,'local');assert.equal(deckAccountStatus(remote,'opponent',state).kind,'pending');assert.equal(deckAccountStatus(remote,'mine',{...state,loaded:false}).kind,'pending');assert.equal(deckAccountStatus(remote,'mine',state,{localOK:false}).kind,'warning');
});
test('display preferences validate, survive reload and never compound text scaling',()=>{
 const s=storage();assert.ok(saveDisplayPreferences(s,{textSize:'largest',motion:'reduced'}));assert.deepEqual(readDisplayPreferences(s),{textSize:'largest',motion:'reduced'});const attrs={};applyDisplayPreferences({documentElement:{setAttribute:(k,v)=>attrs[k]=v}},readDisplayPreferences(s));assert.equal(attrs['data-motion'],'reduced');
 const style={removeProperty(k){delete this[k==='font-size'?'fontSize':k];}},el={style,closest:()=>false},root={querySelectorAll:()=>[el]},view={getComputedStyle:()=>({fontSize:style.fontSize||'12px'})};applyTextSize(root,'large',view);assert.equal(style.fontSize,'13.8px');applyTextSize(root,'largest',view);assert.equal(style.fontSize,'15.6px');applyTextSize(root,'normal',view);assert.equal(style.fontSize,undefined);
 s.setItem('duema.displayPreferences.v1','{"textSize":"giant","motion":"oops"}');assert.deepEqual(readDisplayPreferences(s),{textSize:'normal',motion:'system'});
});
test('details loader does no startup request, coalesces requests, validates count and permits retry after failure',async()=>{
 let calls=0,fail=true,loaded=0;const loader=createCardDetailsLoader({expectedCount:2,fetcher:async()=>{calls++;if(fail)throw Error('offline');return {ok:true,json:async()=>({processedCount:2,cards:[]})};},onLoad:()=>loaded++});assert.equal(calls,0);assert.equal(loader.loaded,false);
 await assert.rejects(loader.load(),/offline/);fail=false;await Promise.all([loader.load(),loader.load()]);assert.equal(calls,2);assert.equal(loaded,1);assert.equal(loader.loaded,true);await loader.load();assert.equal(calls,2);
 const bad=createCardDetailsLoader({expectedCount:3,fetcher:async()=>({ok:true,json:async()=>({processedCount:2,cards:[]})})});await assert.rejects(bad.load(),/件数/);assert.equal(bad.loaded,false);
});
test('lazy catalogue hydration preserves saved card references, aliases and supported status and enables full-text filters',()=>{
 const registry=createCatalogue(snapshot,data.cards),before=registry.cards.length,unsupported=registry.cards.find(c=>!c.supported&&details.cards.some(d=>d.id===c.id&&d.faces[0]?.abilityText)),ref=registry.get(unsupported.id),oldSearch=searchText(ref);registry.hydrate(details);registry.cards.forEach(invalidateCardSearch);
 assert.equal(registry.get(ref.id),ref);assert.equal(registry.cards.length,before);assert.equal(ref.supported,false);assert.notEqual(searchText(ref),oldSearch);assert.ok(matchesCard(ref,{query:ref.faces[0].abilityText.slice(0,8)}));assert.equal(registry.get(PRESETS[0].cards[0].id).supported,true);
 const original=structuredClone(ref);assert.throws(()=>registry.hydrate({...details,cards:details.cards.map(d=>d.id===ref.id?{...d,name:'間違い'}:d)}),/名前/);assert.deepEqual(ref,original);
});
test('hand reasons distinguish mana amount, civilization, evolution, timing and spell restrictions without changing state',()=>{
 const s=setup();give(s,0,'hand',['dm01-108']);give(s,0,'mana',[]);let before=structuredClone(s),m=handCardModel(s,s.players[0].hand[0].uid);assert.match(m.status,/マナが不足/);assert.deepEqual(s,before);
 give(s,0,'mana',Array(10).fill('dm01-075'));m=handCardModel(s,s.players[0].hand[0].uid);assert.match(m.status,/文明/);give(s,0,'mana',Array(10).fill('dm01-108'));assert.equal(handCardModel(s,s.players[0].hand[0].uid).canUse,true);
 const evolution=data.cards.find(c=>c.evolution&&!c.neoEvolution&&!c.sMax&&!c.graveEvolution&&!c.manaEvolution);assert.ok(evolution);give(s,0,'hand',[evolution.id]);give(s,0,'battle',[]);assert.match(handCardModel(s,s.players[0].hand[0].uid).status,/進化元/);
 s.active=1;assert.match(handCardModel(s,s.players[0].hand[0].uid).status,/相手の操作中/);s.active=0;s.phase='attack';assert.match(handCardModel(s,s.players[0].hand[0].uid).status,/攻撃は盤面/);
 s.phase='main';const spell=data.cards.find(c=>c.type==='spell');give(s,0,'hand',[spell.id]);s.extLimits=[{player:0,kind:'cast'}];assert.match(handCardModel(s,s.players[0].hand[0].uid).status,/使用制限/);
});
