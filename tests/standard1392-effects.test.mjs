import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {data,details,snapshot,PRESETS,e,setup,inst,cast,drain} from './target-fixture.mjs';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1392.json',import.meta.url))),ids=manifest.cards.map(c=>c.id),NECK='dmsd11-014',WAVE='dmsd11-005';
for(const row of manifest.cards){
 test(row.name+' is summoned from the top of super GR with printed power, paid summon status and ordinary summoning sickness',()=>{
  const s=setup();s.active=0;s.format='advance';const top=inst(row.id);s.players[0].gr=[top,inst(NECK)];s.players[0].battle.push(inst(WAVE));
  cast(s,'dm06-110');drain(s);assert.ok(s.players[0].battle.includes(top));assert.equal(s.players[0].gr.length,1);assert.equal(top.summonedTurn,s.turn);assert.equal(e.power(top,false,s),parseInt(row.faces[0].powerText)+(row.id==='dmrp09-014'?2000:0));
  s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===top.uid));assert.ok(s.log.some(x=>x.type==='grSummon'&&x.cardId===row.id));
 });
 test(row.name+' returns below super GR rather than remaining in the grave when destroyed',()=>{
  const s=setup();s.format='advance';s.active=1;const gr=inst(row.id);gr.cardOwner=0;s.players[0].battle.push(gr);s.players[0].gr=[inst(NECK)];
  cast(s,'dm01-027');drain(s);assert.ok(!s.players[0].battle.includes(gr));assert.ok(!s.players[0].grave.includes(gr));assert.equal(s.players[0].gr.at(-1),gr);
 });
}
test('the five new names use existing IDs and preserve the main forty, super GR and saved-deck snapshots',()=>{
 const registry=createCatalogue(snapshot,data.cards,details),deck={...structuredClone(PRESETS[0]),format:'advance',grCards:[...ids,NECK].map(id=>({id,count:2}))},before=structuredClone(deck);
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(registry.validate(deck),[]);const game=e.createGame([deck,deck],{seed:1392});assert.equal(game.players[0].gr.length,12);assert.equal(game.players[0].deck.length,30);assert.deepEqual(deck,before);
 assert.ok(e.validateDeck({...deck,grCards:[{id:ids[0],count:3},...ids.slice(1).map(id=>({id,count:2})),{id:NECK,count:1}]}).some(x=>x.includes('2枚まで')));
 assert.ok(e.validateDeck({...deck,format:'original'}).some(x=>x.includes('超GR')));
 for(const id of ids){assert.equal(registry.get(id).id,id);assert.equal(e.card(id).gr,true);assert.equal(e.card(id).manaValue,0);}
});

const put1392=(s,p,id)=>{const x=inst(id);x.cardOwner=p;s.players[p].battle.push(x);return x;};
function pick1392(s,v){const a=e.getLegalActions(s).find(a=>{const x=s.decision?.choices?.[a.choice]?.value;return(x?.uid??x)===v;});assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
function attack1392(s,x){s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));}
test('Orechin looks at exactly the top two and puts the selected card below the entire deck',()=>{
 const s=setup();s.format='advance';s.active=0;const before=Array.from({length:5},()=>inst('dm01-108'));s.players[0].deck=[...before];s.players[0].gr=[inst('dmsd13-003')];cast(s,'dmsd11-018');assert.equal(s.decision?.choices.filter(x=>x.value).length,2);pick1392(s,before[0].uid);drain(s);assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...before.slice(1),before[0]].map(x=>x.uid));
});
test('Spikey cannot boost itself or an opposing creature and its ally boost expires',()=>{
 const s=setup();s.active=0;const x=put1392(s,0,'dmrp09-048'),ally=put1392(s,0,'dm01-108'),enemy=put1392(s,1,'dm01-108'),base=e.power(ally,false,s);attack1392(s,x);assert.deepEqual(s.decision.choices.filter(x=>x.value).map(x=>x.value.uid),[ally.uid]);pick1392(s,ally.uid);drain(s);assert.equal(e.power(ally,false,s),base+3000);assert.equal(e.power(enemy,false,s),2000);e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));drain(s);assert.equal(e.power(ally,false,s),base);
});
for(const handCount of[0,1,3])test('Choco puts exactly one own hand card into mana when possible: '+handCount,()=>{
 const s=setup();s.active=0;const x=put1392(s,0,'dmrp10-064'),hand=Array.from({length:handCount},()=>inst('dm01-108'));s.players[0].hand=[...hand];s.players[1].hand=[inst('dm01-108')];const before=s.players[0].mana.length;attack1392(s,x);if(handCount){assert.equal(s.decision.choices.filter(x=>x.value).length,handCount);assert.ok(!s.decision.choices.some(x=>x.value===null));pick1392(s,hand[0].uid);}drain(s);assert.equal(s.players[0].mana.length,before+(handCount?1:0));assert.equal(s.players[0].hand.length,Math.max(0,handCount-1));assert.equal(s.players[1].hand.length,2);
});
for(const n of[0,1,2,3])test('Doping Dope discards up to two available own cards and breaks two: '+n,()=>{
 const s=setup();s.active=0;const x=put1392(s,0,'dmrp09-s08');s.players[0].hand=Array.from({length:n},()=>inst('dm01-108'));attack1392(s,x);drain(s);assert.equal(s.players[0].hand.length,Math.max(0,n-2));assert.equal(s.players[0].grave.length,Math.min(2,n));assert.equal(s.players[1].shields.length,3);
});
test('Balbal returns an own shield to hand without permitting its S Trigger',()=>{
 const s=setup();s.format='advance';s.active=0;const sh=inst('dm01-027');s.players[0].shields=[sh];s.players[0].gr=[inst('dmrp12-089')];const enemy=put1392(s,1,'dm01-108');cast(s,'dmsd11-018');drain(s);assert.equal(s.players[0].shields.length,0);assert.ok(s.players[0].hand.includes(sh));assert.ok(s.players[1].battle.includes(enemy));assert.equal(s.decision,null);assert.equal(s.metrics[0].triggers,0);
});
test('Balbal does not stall when there is no shield',()=>{const s=setup();s.format='advance';s.active=0;s.players[0].shields=[];s.players[0].gr=[inst('dmrp12-089')];cast(s,'dmsd11-018');drain(s);assert.equal(s.decision,null);assert.equal(s.players[0].battle[0].cardId,'dmrp12-089');});
