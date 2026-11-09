import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-737.json',import.meta.url)));

test('Phase 737 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:737}));
  assert.throws(()=>standardCardSpec(detail,{phase:736}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:row.id,count:1});
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
  const incomplete=structuredClone(detail);
  incomplete.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(incomplete,{phase:737}));
 }
});

const VENOM='dm09-028',DREAM='dm09-033',FULL='dm09-051',CART='dm23rp1-071';
const BEAST='dm01-108',WATER='dm01-083',FISH='dm01-082',PHANTOM='dm01-079';
const GUARD='dmrp22-074',TWIN='dm23rp1-013',TSU='dmrp22-030',QQ='dmrp07-m01';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
const ids=zone=>zone.map(y=>y.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
const actions=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const blocks=s=>actions(s,'block').map(a=>a.uid);
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function tap(s,x){
 s.phase='attack';
 act(s,'tapAbility',a=>a.uid===x.uid);
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Venom grants Slayer to both sides for this turn and destroys the winner of a real battle',()=>{
 let s=field();
 const source=put(s,0,VENOM),attacker=put(s,0,BEAST),enemy=put(s,1,BEAST);
 const other=put(s,0,WATER),victim=put(s,1,PHANTOM,{tapped:true});
 s.phase='attack';
 source.entered=s.turn;
 assert.ok(!actions(s,'tapAbility').some(a=>a.uid===source.uid));
 source.entered=0;
 tap(s,source);
 assert.ok(source.tapped&&!s.attack);
 s=restore(s);
 pick(s,'ビーストフォーク');
 const unit=(p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);
 const later=put(s,0,BEAST);
 assert.ok(e.effectiveCard(unit(0,attacker),s).slayer&&e.effectiveCard(unit(1,enemy),s).slayer);
 assert.ok(!e.effectiveCard(unit(0,other),s).slayer&&!e.effectiveCard(later,s).slayer);
 attack(s,attacker.uid,victim.uid);
 drain(s);
 assert.ok(ids(s.players[0].grave).includes(attacker.uid)&&ids(s.players[1].grave).includes(victim.uid));
 end(s);
 assert.ok(!e.effectiveCard(unit(1,enemy),s).slayer);
});

test('Dream excludes blockers at 3000 and reevaluates their current power',()=>{
 for(const modified of [false,true]){
  const s=field(),source=put(s,0,DREAM),attacker=put(s,0,BEAST);
  const low=put(s,1,FISH),high=put(s,1,PHANTOM);
  tap(s,source);
  pick(s,'ビーストフォーク');
  if(modified){
   low.powerModifiers=[{amount:1000,expires:'end',who:0}];
   high.powerModifiers=[{amount:-1000,expires:'end',who:0}];
  }
  if(modified)attacker.g35Ignored=s.turn;
  attack(s,attacker.uid);
  const eligible=modified?low:high;
  assert.deepEqual(blocks(s),[eligible.uid]);
  act(s,'block',a=>a.uid===eligible.uid);
  drain(s);
  assert.equal(s.players[1].shields.length,5);
 }
});

test('Dream only restricts blocking of creatures in the selected race at resolution',()=>{
 const s=field(),source=put(s,0,DREAM),before=put(s,0,BEAST),other=put(s,0,WATER);
 const blocker=put(s,1,FISH);
 tap(s,source);
 pick(s,'ビーストフォーク');
 const later=put(s,0,BEAST);
 for(const x of [before,other,later]){
  attack(s,x.uid);
  assert.deepEqual(blocks(s),x===before?[]:[blocker.uid]);
  act(s,'noBlock');
  drain(s);
 }
 assert.equal(s.players[1].shields.length,2);
});

test('Full Command allows attacks on untapped creatures, does not grant haste, and allows Guardman',()=>{
 const s=field(),attacker=put(s,0,BEAST),ordinary=put(s,0,WATER),sick=put(s,0,BEAST,{entered:s.turn});
 const victim=put(s,1,WATER),blocker=put(s,1,FISH),guard=put(s,1,GUARD);
 play(s,FULL);
 pick(s,'ビーストフォーク');
 const later=put(s,0,BEAST);
 s.phase='attack';
 assert.deepEqual(actions(s,'attack').filter(a=>a.target===victim.uid).map(a=>a.uid),[attacker.uid]);
 attack(s,attacker.uid,victim.uid);
 assert.deepEqual(blocks(s),[]);
 assert.ok(actions(s,'guardman').some(a=>a.uid===guard.uid));
 act(s,'noBlock');
 drain(s);
 assert.ok(ids(s.players[1].grave).includes(victim.uid));
 assert.ok(!s.players[1].battle.find(x=>x.uid===blocker.uid).tapped);
 assert.ok(e.effectiveCard(sick,s).attackUntapped);
 assert.ok(![ordinary,later].some(x=>e.effectiveCard(x,s).attackUntapped));
});

test('Full Command still allows a player attack to be blocked and expires at turn end',()=>{
 const s=field(),attacker=put(s,0,BEAST),enemy=put(s,1,BEAST),blocker=put(s,1,FISH);
 play(s,FULL);
 pick(s,'ビーストフォーク');
 assert.ok(e.effectiveCard(enemy,s).attackUntapped);
 attack(s,attacker.uid);
 assert.deepEqual(blocks(s),[blocker.uid]);
 act(s,'noBlock');
 drain(s);
 end(s);
 assert.ok(!e.effectiveCard(enemy,s).attackUntapped);
});

test('Cart rejects near races in the official QA and saves the order of the two unmatched cards',()=>{
 let s=field();
 give(s,0,'deck',['dm23rp1-S8','dm22ex1-124',WATER,BEAST]);
 const [first,second,...rest]=ids(s.players[0].deck);
 play(s,CART);
 assert.ok(!s.log.some(x=>x.type==='reveal'&&x.cardId===CART));
 pick(s,'ジャイアント・インセクト');
 assert.deepEqual(ids(s.players[0].hand),[]);
 assert.equal(s.decision.task.op,'g34_Order');
 assert.deepEqual(s.decision.choices.map(o=>o.value),[first,second]);
 s=restore(s);
 pick(s,second);
 assert.deepEqual(ids(s.players[0].deck),[...rest,second,first]);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Cart takes every matching card, including a twinpact with the race on its spell side',()=>{
 const s=field();
 give(s,0,'deck',[TWIN,'dm23rp2-013',WATER]);
 const [first,second,third]=ids(s.players[0].deck);
 play(s,CART);
 pick(s,'マジック・ソング');
 assert.deepEqual(ids(s.players[0].hand),[first,second]);
 assert.deepEqual(ids(s.players[0].deck),[third]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.cardId===CART));
});

test('Cart respects reveal replacement, a deck lock, and a library shorter than two cards',()=>{
 for(const mode of ['replace','lock','short']){
  const s=field();
  if(mode!=='short')put(s,1,mode==='replace'?TSU:QQ);
  give(s,0,'deck',mode==='short'?['dm01-066']:['dm01-066','dm09-053',WATER]);
  const [first,...rest]=ids(s.players[0].deck);
  play(s,CART);
  pick(s,'ジャイアント・インセクト');
  assert.deepEqual(ids(s.players[0].hand),mode==='lock'?[]:[first]);
  assert.deepEqual(ids(s.players[0].deck),mode==='lock'?[first,...rest]:rest);
  assert.equal(s.winner,mode==='short'?1:null);
 }
});


test('Full Command is an external attack permission even when the recipient abilities are ignored',()=>{
 const s=field(),attacker=put(s,0,BEAST),victim=put(s,1,WATER);
 put(s,1,FISH);
 play(s,FULL);
 pick(s,'ビーストフォーク');
 attacker.g35Ignored=s.turn;
 attack(s,attacker.uid,victim.uid);
 assert.deepEqual(blocks(s),[]);
 act(s,'noBlock');
 drain(s);
 assert.ok(ids(s.players[1].grave).includes(victim.uid));
});
