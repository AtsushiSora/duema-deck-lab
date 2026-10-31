import * as characterRoster from '../dist/character-roster.js';
import * as extraCharacters from '../dist/character-challenge.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const binding=source.slice(source.indexOf('const searchInputIds='),source.indexOf("document.addEventListener('change'"));
const ids=['tournament-deck-search','home-deck-search','deck-card-search','starter25-search','manual-choice-search','ocr-card-search','card-search','opponent-search'];
function harness(id){
 const listeners={},nodes=new Map(),updates=[],results={innerHTML:''};
 const field=(value='')=>({id,value,isConnected:true,selectionStart:value.length,selectionEnd:value.length,selectionDirection:'none',dataset:{index:'2'},focus(options){this.focusOptions=options;},setSelectionRange(...range){this.range=range;}});
 let current=field();nodes.set('#'+id,current);nodes.set('#ocr-search-results',results);
 const redraw=kind=>{updates.push(kind);current.isConnected=false;current=field(read(`({homeQuery,deckQuery,starterQuery,manual:manualUI.filter,query,opponentQuery})`)[{ 'home-deck-search':'homeQuery','deck-card-search':'deckQuery','starter25-search':'starterQuery','manual-choice-search':'manual','card-search':'query','opponent-search':'opponentQuery'}[id]]);nodes.set('#'+id,current);};
 const ctx=vm.createContext({...characterRoster,...extraCharacters,Promise,document:{addEventListener:(type,fn)=>listeners[type]=fn},$:s=>nodes.get(s),render:()=>redraw('page'),refreshStarter25:()=>redraw('picker'),refreshTournamentPicker:()=>{updates.push('tournament');results.innerHTML=read('tournamentDeckQuery');},cards:[{id:'jasmine',name:'霞み妖精ジャスミン'},{id:'clock',name:'終末の時計 ザ・クロック'}],norm:s=>s.normalize('NFKC').toLowerCase(),esc:s=>s});
 vm.runInContext("let homeQuery='',deckQuery='',starterQuery='',query='',opponentQuery='',tournamentDeckQuery='',page=5,manualUI={filter:'',choicePage:3},edit={name:''},replayIndex=0;",ctx);
 vm.runInContext(binding,ctx);
 function read(code){return vm.runInContext(code,ctx);}
 return{read,updates,results,get input(){return current;},emit(type,options={}){listeners[type]({target:current,...options});},emitFor(type,target,options={}){listeners[type]({target,...options});}};
}

for(const id of ids)test(`${id}: Japanese conversion stays intact until commit, including missing isComposing flags`,async()=>{
 const h=harness(id),original=h.input;h.emit('compositionstart');
 for(const value of ['し','じゃす','ジャスミン']){original.value=value;h.emit('input',{isComposing:true});h.emit('input',{isComposing:false});assert.equal(h.input,original);assert.equal(original.isConnected,true);assert.equal(h.updates.length,0);assert.equal(h.results.innerHTML,'');}
 original.selectionStart=2;original.selectionEnd=4;original.selectionDirection='backward';h.emit('compositionend');await Promise.resolve();
 if(id==='tournament-deck-search'){assert.equal(h.read('tournamentDeckQuery'),'ジャスミン');assert.equal(h.input,original);assert.equal(h.updates.length,1);assert.equal(h.results.innerHTML,'ジャスミン');}
 else if(id==='ocr-card-search'){assert.match(h.results.innerHTML,/霞み妖精ジャスミン/);assert.doesNotMatch(h.results.innerHTML,/ザ・クロック/);assert.equal(h.input,original);}
 else{assert.equal(h.updates.length,1);assert.equal(h.input.value,'ジャスミン');assert.deepEqual(h.input.range,[2,4,'backward']);assert.equal(h.input.focusOptions.preventScroll,true);}
});

test('a final input after compositionend commits once and ignores the detached old input',async()=>{
 const h=harness('card-search'),old=h.input;h.emit('compositionstart');old.value='妖精';h.emit('input',{isComposing:true});h.emit('compositionend');old.value='ジャスミン';h.emit('input',{isComposing:false});await Promise.resolve();h.emitFor('input',old,{isComposing:false});assert.equal(h.read('query'),'ジャスミン');assert.equal(h.updates.length,1);assert.equal(h.read('page'),0);
});
test('a final composing input before compositionend commits without needing another input event',async()=>{
 const h=harness('manual-choice-search');h.emit('compositionstart');h.input.value='墓地';h.emit('input',{isComposing:true});h.emit('compositionend');await Promise.resolve();assert.equal(h.read('manualUI.filter'),'墓地');assert.equal(h.read('manualUI.choicePage'),0);assert.equal(h.updates.length,1);
});
test('typing, replacing a selection, pasting and clearing still update search results',()=>{
 const h=harness('opponent-search');for(const value of ['d','de','デュエマ','ドラゴン','']){h.input.value=value;h.input.selectionStart=h.input.selectionEnd=value.length;h.emit('input',{isComposing:false});assert.equal(h.read('opponentQuery'),value);assert.equal(h.input.value,value);}assert.equal(h.updates.length,5);
});
test('a pending IME commit cannot redraw a screen after its field was removed',async()=>{
 const h=harness('starter25-search');h.emit('compositionstart');h.input.value='天門';h.emit('compositionend');h.input.isConnected=false;await Promise.resolve();assert.equal(h.updates.length,0);assert.equal(h.read('starterQuery'),'');
});
test('cancelling conversion leaves an empty query and later Japanese input still works',async()=>{
 const h=harness('deck-card-search');h.emit('compositionstart');h.input.value='く';h.emit('input',{isComposing:true});h.input.value='';h.emit('compositionend');await Promise.resolve();assert.equal(h.read('deckQuery'),'');h.emit('compositionstart');h.input.value='クロック';h.emit('input',{isComposing:true});h.emit('compositionend');await Promise.resolve();assert.equal(h.read('deckQuery'),'クロック');
});
