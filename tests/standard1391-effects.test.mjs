import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {data,details,snapshot,PRESETS,e,setup,inst,cast,drain} from './target-fixture.mjs';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1391.json',import.meta.url))),ids=manifest.cards.map(c=>c.id),NECK='dmsd11-014',WAVE='dmsd11-005';
for(const row of manifest.cards){
 test(row.name+' is summoned from the top of super GR with printed power, paid summon status and ordinary summoning sickness',()=>{
  const s=setup();s.active=0;s.format='advance';const top=inst(row.id);s.players[0].gr=[top,inst(NECK)];s.players[0].battle.push(inst(WAVE));
  cast(s,'dm06-110');drain(s);assert.ok(s.players[0].battle.includes(top));assert.equal(s.players[0].gr.length,1);assert.equal(top.summonedTurn,s.turn);assert.equal(e.power(top,false,s),parseInt(row.faces[0].powerText)+(row.id==='dmrp09-014'?2000:row.id==='dmsd11-001'?1000:0));
  s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===top.uid));assert.ok(s.log.some(x=>x.type==='grSummon'&&x.cardId===row.id));
 });
 test(row.name+' returns below super GR rather than remaining in the grave when destroyed',()=>{
  const s=setup();s.format='advance';s.active=1;const gr=inst(row.id);gr.cardOwner=0;s.players[0].battle.push(gr);s.players[0].gr=[inst(NECK)];
  cast(s,'dm01-027');drain(s);assert.ok(!s.players[0].battle.includes(gr));assert.ok(!s.players[0].grave.includes(gr));assert.equal(s.players[0].gr.at(-1),gr);
 });
}
test('the five new names use existing IDs and preserve the main forty, super GR and saved-deck snapshots',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,NECK].map(id=>({id,count:2}))},before=structuredClone(deck);
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(registry.validate(deck),[]);const game=e.createGame([deck,deck],{seed:1391});assert.equal(game.players[0].gr.length,12);assert.equal(game.players[0].deck.length,30);assert.deepEqual(deck,before);
 assert.ok(e.validateDeck({...deck,grCards:[{id:ids[0],count:3},...ids.slice(1).map(id=>({id,count:2})),{id:NECK,count:1}]}).some(x=>x.includes('2枚まで')));
 assert.ok(e.validateDeck({...deck,format:'original'}).some(x=>x.includes('超GR')));
 for(const id of ids){assert.equal(registry.get(id).id,id);assert.equal(e.card(id).gr,true);assert.equal(e.card(id).manaValue,0);}
});

const put1391=(s,p,id)=>{const x=inst(id);x.cardOwner=p;s.players[p].battle.push(x);return x;};
test('Kraken counts own grave spells, including a twin spell face, and updates immediately',()=>{
 const s=setup(),x=put1391(s,0,'dmsd11-001');s.players[0].grave=[inst('dm06-110'),inst('dmex12-074'),inst('dm01-108')];s.players[1].grave=[inst('dm06-110')];
 assert.equal(e.power(x,false,s),4000);s.players[0].grave.shift();assert.equal(e.power(x,false,s),3000);
});
for(const n of[3,4,9,10])test('Kraken actual powered break threshold with '+n+' grave spells',()=>{
 const s=setup();s.active=0;const x=put1391(s,0,'dmsd11-001');s.players[0].grave=Array.from({length:n},()=>inst('dm06-110'));s.phase='attack';
 e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));e.step(s,e.getLegalActions(s).find(a=>a.kind==='noBlock'));drain(s);assert.equal(s.players[1].shields.length,5-(1+Math.floor((2000+1000*n)/6000)));
});
test('Four You includes itself and only own creatures, and counts changes dynamically',()=>{
 const s=setup(),x=put1391(s,0,'dmrp09-014');assert.equal(e.power(x,false,s),1000);put1391(s,1,'dm01-108');assert.equal(e.power(x,false,s),1000);put1391(s,0,'dm01-108');assert.equal(e.power(x,false,s),2000);s.players[0].battle.pop();assert.equal(e.power(x,false,s),1000);
});
test('Bolshack boosts only while attacking, counts fire spells and creatures, and double breaks',()=>{
 const s=setup();s.active=0;const x=put1391(s,0,'dm24ex2-031');s.players[0].grave=[inst('dm01-097'),inst('dm01-064'),inst('dm06-110')];s.players[1].grave=[inst('dm01-097')];assert.equal(e.power(x,false,s),6000);assert.equal(e.power(x,true,s),8000);s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));e.step(s,e.getLegalActions(s).find(a=>a.kind==='noBlock'));drain(s);assert.equal(s.players[1].shields.length,3);
});
test('San Pietro counts itself and other own Hunters only during battle',()=>{
 const s=setup(),x=put1391(s,0,'dmex08-237'),enemy=put1391(s,1,'dm01-108');assert.equal(e.power(x,false,s),1000);assert.equal(e.matchupPower(x,enemy,true,s),2000);put1391(s,0,'dmx12a-s02');put1391(s,1,'dmx12a-s02');assert.equal(e.matchupPower(x,enemy,false,s),3000);assert.equal(e.power(x,true,s),1000);
});
for(const n of[9,10,11])test('Zero Void destruction threshold counts all own grave cards: '+n,()=>{
 const s=setup();s.format='advance';s.active=1;const x=put1391(s,0,'dmbd22-007');s.players[0].grave=Array.from({length:n},(_,i)=>inst(i%2?'dm06-110':'dm01-108'));s.players[0].gr=[inst(NECK)];cast(s,'dm01-027');drain(s);assert.equal(s.players[0].battle.includes(x),n>=10);assert.equal(s.players[0].gr.includes(x),n<10);
});
test('Zero Void protection does not prevent a bounce and GR still returns to super GR',()=>{
 const s=setup();s.format='advance';s.active=1;const x=put1391(s,0,'dmbd22-007');s.players[0].grave=Array.from({length:10},()=>inst('dm01-108'));s.players[0].gr=[];cast(s,'dm01-086');drain(s);assert.ok(!s.players[0].battle.includes(x));assert.equal(s.players[0].gr.at(-1),x);assert.ok(!s.players[0].hand.includes(x));
});
