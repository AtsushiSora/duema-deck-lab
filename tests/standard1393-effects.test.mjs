import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue} from '../dist/catalogue.js';
import {data,details,snapshot,PRESETS,e,setup,inst,cast,drain} from './target-fixture.mjs';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1393.json',import.meta.url))),ids=manifest.cards.map(c=>c.id),NECK='dmsd11-014',WAVE='dmsd11-005';
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
 assert.deepEqual(e.validateDeck(deck),[]);assert.deepEqual(registry.validate(deck),[]);const game=e.createGame([deck,deck],{seed:1393});assert.equal(game.players[0].gr.length,12);assert.equal(game.players[0].deck.length,30);assert.deepEqual(deck,before);
 assert.ok(e.validateDeck({...deck,grCards:[{id:ids[0],count:3},...ids.slice(1).map(id=>({id,count:2})),{id:NECK,count:1}]}).some(x=>x.includes('2枚まで')));
 assert.ok(e.validateDeck({...deck,format:'original'}).some(x=>x.includes('超GR')));
 for(const id of ids){assert.equal(registry.get(id).id,id);assert.equal(e.card(id).gr,true);assert.equal(e.card(id).manaValue,0);}
});

const put1393=(s,p,id)=>{s.format='advance';const x=inst(id);x.cardOwner=p;s.players[p].battle.push(x);return x;};
function pick1393(s,v){const a=e.getLegalActions(s).find(a=>{const x=s.decision?.choices?.[a.choice]?.value;return(x?.uid??x)===v;});assert.ok(a,JSON.stringify(s.decision));e.step(s,a);}
function attack1393(s,x){s.phase='attack';e.step(s,e.getLegalActions(s).find(a=>a.kind==='attack'&&a.uid===x.uid&&a.target==='player'));}
for(const accept of[false,true])test('Brain Tentacle optional draw then discard: '+accept,()=>{
 const s=setup();s.active=0;s.format='advance';const top=inst('dm01-108');s.players[0].deck.unshift(top);s.players[0].hand=[];s.players[0].gr=[inst('dmbd22-006')];const n=s.players[0].deck.length;cast(s,'dmsd11-018');pick1393(s,accept?true:null);drain(s);assert.equal(s.players[0].deck.length,n-(accept?1:0));assert.equal(s.players[0].hand.length,0);assert.equal(s.players[0].grave.includes(top),accept);s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'));s.active=1;const enemy=put1393(s,1,'dm01-108');attack1393(s,enemy);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.cardId==='dmbd22-006'));
});
for(const p of[0,1,null])test('Machinegun may untap a creature controlled by either player or decline: '+p,()=>{
 const s=setup();s.active=0;s.format='advance';const own=put1393(s,0,'dm01-108'),enemy=put1393(s,1,'dm01-108');own.tapped=enemy.tapped=true;s.players[0].gr=[inst('dmsd08-013')];cast(s,'dmsd11-018');pick1393(s,p===null?null:p===0?own.uid:enemy.uid);drain(s);assert.equal(own.tapped,p!==0);assert.equal(enemy.tapped,p!==1);
});
for(const removal of['dm01-027','dm01-086'])test('TL20 leave trigger works on destruction or bounce and freezes until its owners next turn: '+removal,()=>{
 const s=setup();s.active=1;const x=put1393(s,0,'dmsd09-003'),enemy=put1393(s,1,'dm01-076');s.players[0].gr=[];cast(s,removal);drain(s);assert.ok(s.players[0].gr.includes(x));s.phase='attack';assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===enemy.uid));e.step(s,e.getLegalActions(s).find(a=>a.kind==='endTurn'));drain(s);assert.equal(s.active,0);const atk=put1393(s,0,'dm01-108');attack1393(s,atk);assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===enemy.uid));
});
test('Renbra tapping to attack taps an opposing creature before blockers are declared',()=>{
 const s=setup();s.active=0;const x=put1393(s,0,'dmsd10-002'),enemy=put1393(s,1,'dm01-076');attack1393(s,x);drain(s);assert.equal(enemy.tapped,true);assert.equal(s.players[1].shields.length,4);
});
for(const accept of[false,true])test('Eikya shield saver is optional and its destruction returns it to super GR: '+accept,()=>{
 const s=setup();s.active=1;const x=put1393(s,0,'dmrp12-065');s.players[0].gr=[];const enemy=put1393(s,1,'dm01-108');attack1393(s,enemy);e.step(s,e.getLegalActions(s).find(a=>a.kind==='noBlock'));assert.equal(s.decision.type,'shieldGuard');e.step(s,e.getLegalActions(s).find(a=>a.kind===(accept?'saveShield':'finishShieldGuards')));drain(s);assert.equal(s.players[0].shields.length,accept?5:4);assert.equal(s.players[0].gr.includes(x),accept);assert.equal(s.players[0].battle.includes(x),!accept);
});
