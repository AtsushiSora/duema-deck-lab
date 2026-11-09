import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-691.json',import.meta.url)));

test('Phase 691 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:691}));
  assert.throws(()=>standardCardSpec(detail,{phase:690}));
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
  if(row.currentPrint){
   assert.deepEqual(row.spec,standardCardSpec({...row.currentPrint,status:'complete'},{phase:691}));
   assert.ok(row.currentPrint.verification.facesMatched);
   assert.ok(!data.cards.some(c=>c.id===row.currentPrint.id));
  }
 }
});

const RAIJIN='dm28-063',BIKE='dm08-027',RAPTOR='dm19-033',SPIRIT='dmrp11-091';
const SMALL='dm01-108',GEAR='dm14-110',REMOVAL='dm01-027';
const field=(p=0)=>Object.assign(setup(),{active:p});
const put=(s,p,id,tapped=false)=>{const x=inst(id);x.tapped=tapped;s.players[p].battle.push(x);return x;};
function play(s,id){s.phase='main';const x=inst(id);s.players[s.active].hand.push(x);act(s,'play',a=>a.uid===x.uid);return x;}
const noBlock=s=>{if(s.decision?.type==='block')act(s,'noBlock');};
const actions=(s,x)=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target))];
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

for(const p of [0,1])test('Raijin defeats the declared creature with +4000 and keeps its power through the rest of the turn '+p,()=>{
 const s=field(p),x=put(s,p,RAIJIN),y=put(s,1-p,RAPTOR,true),all=physical(s);
 attack(s,x.uid,y.uid);
 noBlock(s);
 assert.ok(s.players[1-p].grave.some(z=>z.uid===y.uid));
 assert.ok(s.players[p].battle.includes(x));
 assert.equal(e.power(x,false,s),5000);
 const restored=JSON.parse(JSON.stringify(s)),same=restored.players[p].battle.find(y=>y.uid===x.uid);
 assert.equal(e.power(same,false,restored),5000);
 act(restored,'endTurn');
 assert.equal(e.power(same,false,restored),1000);
 assert.deepEqual(physical(restored),all);
});

test('Raijin attacking a player does not boost, even when blocked',()=>{
 const s=field(),x=put(s,0,RAIJIN),b=put(s,1,BIKE);
 attack(s,x.uid);
 assert.equal(e.power(x,true,s),1000);
 act(s,'block',a=>a.uid===b.uid);
 assert.ok(s.players[0].grave.some(y=>y.uid===x.uid));
 assert.ok(s.players[1].battle.includes(b));
});

test('An ignored Raijin cannot boost when declaring an attack against a creature',()=>{
 const s=field(),x=put(s,0,RAIJIN),y=put(s,1,RAPTOR,true);
 x.g35Ignored=s.turn;
 attack(s,x.uid,y.uid);
 noBlock(s);
 assert.ok(s.players[0].grave.some(z=>z.uid===x.uid));
 assert.ok(s.players[1].battle.includes(y));
});

for(const p of [0,1])test('Bike stays after its own summon, cannot attack, and destroys only itself when another ally enters '+p,()=>{
 const s=field(p),x=play(s,BIKE);
 assert.ok(s.players[p].battle.includes(x));
 s.phase='attack';
 assert.deepEqual(actions(s,x),[]);
 s.active=1-p;
 play(s,SMALL);
 assert.ok(s.players[p].battle.includes(x));
 s.active=p;
 const y=play(s,SMALL);
 assert.ok(s.players[p].battle.includes(y));
 assert.ok(s.players[p].grave.some(z=>z.uid===x.uid));
 assert.equal(s.players[p].battle.length,1);
});

test('Bike can block and does not react to an allied noncreature entering',()=>{
 const s=field(),x=play(s,BIKE);
 const gear=play(s,GEAR);
 assert.ok(s.players[0].battle.includes(gear));
 assert.ok(s.players[0].battle.includes(x));
 s.active=1;
 const y=put(s,1,SMALL);
 attack(s,y.uid);
 act(s,'block',a=>a.uid===x.uid);
 assert.ok(s.players[1].grave.some(z=>z.uid===y.uid));
 assert.equal(s.players[0].shields.length,5);
});

for(const p of [0,1])test('Raptor protects only its two allied races while a friendly Brave Spirit is present '+p,()=>{
 const s=field(1-p),attacker=put(s,1-p,SMALL),raptor=put(s,p,RAPTOR,true),drake=put(s,p,RAIJIN,true),unrelated=put(s,p,SMALL,true);
 const enemySpirit=put(s,1-p,SPIRIT);
 s.phase='attack';
 assert.ok(e.card(SPIRIT).race.includes('ブレイブ・スピリット'));
 assert.deepEqual(actions(s,attacker),['player',raptor.uid,drake.uid,unrelated.uid]);
 const spirit=put(s,p,SPIRIT,true);
 assert.deepEqual(actions(s,attacker),['player',unrelated.uid]);
 drake.g35Ignored=s.turn;
 spirit.g35Ignored=s.turn;
 assert.deepEqual(actions(s,attacker),['player',unrelated.uid]);
 raptor.g35Ignored=s.turn;
 assert.deepEqual(actions(s,attacker),['player',raptor.uid,drake.uid,unrelated.uid,spirit.uid]);
 delete raptor.g35Ignored;
 spirit.sealed=true;
 assert.deepEqual(actions(s,attacker),['player',raptor.uid,drake.uid,unrelated.uid]);
 delete spirit.sealed;
 s.players[p].battle.splice(s.players[p].battle.indexOf(spirit),1);
 s.players[p].grave.push(spirit);
 assert.ok(s.players[1-p].battle.includes(enemySpirit));
 assert.deepEqual(actions(s,attacker),['player',raptor.uid,drake.uid,unrelated.uid]);
});

test('Raptor attack restriction is not immunity to a spell targeting the protected creature',()=>{
 const s=field(),target=put(s,1,RAIJIN,true),raptor=put(s,1,RAPTOR,true),spirit=put(s,1,SPIRIT,true);
 play(s,REMOVAL);
 act(s,'effect',a=>a.targets?.[0]?.uid===target.uid);
 assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));
 assert.ok(s.players[1].battle.includes(raptor)&&s.players[1].battle.includes(spirit));
});
