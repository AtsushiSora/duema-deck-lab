import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,cast,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const FOCK='dmx20-021',HAKOBU='dm22rp1-053',DEADMAN='dmex16-033';
const NATURE='dm01-108',WATER='dm01-083',FIRE='dm01-097',LIGHT='dm01-075';
const COIN='dm22rp1-054',SAW='dmx20-005',GUERRILLA='ゲリラ・コマンド';
const BIRDS='dmex18-029',YATTARE='dmsd01-012',RAINBOW='dmx01-015';
function add(s,p,zone,id,attrs={}){
 const card=Object.assign(inst(id),attrs);
 s.players[p][zone].push(card);
 return card;
}
const value=c=>c.value?.uid??c.value;
const options=s=>s.decision.choices.map(value);
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);

test('three canonical cards match official faces, images and limits',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1152.json',import.meta.url)));
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[FOCK,HAKOBU,DEADMAN]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const c=e.card(row.id),f=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1152}),row.spec);
  assert.deepEqual(details.cards.find(x=>x.id===row.id).faces,row.faces);
  assert.equal(c.cost,f.cost);
  assert.equal(c.power,Number(f.powerText));
  assert.deepEqual(c.civilizations,f.civilizations);
  assert.equal(c.limit,4);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.equal(c.manaValue,1);
  assert.equal(catalogue.get(row.id).id,row.id);
  assert.equal(catalogue.byName.get(nameKey(row.name)).id,row.id);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
});

const hasRace=(s,x)=>e.effectiveCard(x,s).race.split('/').includes(GUERRILLA);

test('Fock grants the race only to current allies and the effect ends with the turn (QA 37261)',()=>{
 const s=setup(),ally=add(s,0,'battle',FIRE),enemy=add(s,1,'battle',FIRE);
 const seed=add(s,0,'battle',COIN);
 cast(s,FOCK);
 assert.ok(hasRace(s,ally));
 assert.ok(!hasRace(s,enemy)&&!hasRace(s,seed));
 cast(s,FIRE);
 const newcomer=s.players[0].battle.at(-1);
 assert.ok(!hasRace(s,newcomer));
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.ok(!hasRace(s,ally));
});

test('Fock lets a fire creature use the granted race for invasion and keeps it after evolving (QA 37260/37261)',()=>{
 const s=setup(),ally=add(s,0,'battle',FIRE);
 cast(s,FOCK);
 const invasion=add(s,0,'hand',SAW);
 attack(s,ally.uid);
 assert.ok(s.decision);
 drain(s);
 assert.ok(s.players[0].battle.includes(invasion));
 assert.ok(invasion.under.includes(ally));
 assert.ok(hasRace(s,invasion));
});

test('Hakobu can tap an untapped allied light creature, a light Tamaseed or itself',()=>{
 for(const mode of ['creature','seed','self']){
  const s=setup(),own=s.players[0];
  const body=add(s,0,'battle',LIGHT),coin=add(s,0,'battle',COIN);
  const tapped=add(s,0,'battle',LIGHT,{tapped:true}),wrongColor=add(s,0,'battle',WATER);
  const enemy=add(s,1,'battle',LIGHT);
  const self=add(s,0,'hand',HAKOBU),top=own.deck[0];
  act(s,'play',a=>a.uid===self.uid);
  assert.deepEqual(new Set(options(s)),new Set([body.uid,coin.uid,self.uid,null]));
  const selected={creature:body,seed:coin,self}[mode];
  pick(s,selected.uid);
  assert.ok(selected.tapped&&own.hand.includes(top));
  assert.ok(tapped.tapped&&!wrongColor.tapped&&!enemy.tapped);
 }
});

test('Hakobu can decline without tapping or drawing',()=>{
 const s=setup(),ally=add(s,0,'battle',LIGHT),top=s.players[0].deck[0];
 cast(s,HAKOBU);pick(s,null);
 assert.equal(ally.tapped,false);
 assert.equal(s.players[0].deck[0],top);
 assert.ok(s.players[0].battle.every(x=>!x.tapped));
});

test('Hakobu cannot draw when every allied light element is already tapped',()=>{
 const s=setup(),own=s.players[0],top=own.deck[0];
 add(s,0,'battle',LIGHT,{tapped:true});
 add(s,0,'battle',COIN,{tapped:true});
 add(s,1,'battle','dmr02-s03');
 cast(s,HAKOBU);
 if(s.decision)assert.deepEqual(options(s),[null]);
 drain(s);
 assert.equal(own.deck[0],top);
 assert.ok(own.battle.every(x=>x.tapped));
});

test('Nam Deadman counts distinct civilizations of allied creatures and ramps all cards tapped',()=>{
 const s=setup(),own=s.players[0];
 add(s,0,'battle',RAINBOW);
 add(s,0,'battle',FIRE);
 add(s,0,'battle',COIN);
 add(s,1,'battle',LIGHT);
 const top=own.deck.slice(0,4),next=own.deck[4],before=own.mana.length;
 cast(s,DEADMAN);
 assert.equal(own.mana.length,before+4);
 assert.deepEqual(own.mana.slice(-4),top);
 assert.ok(top.every(x=>x.tapped));
 assert.equal(own.deck[0],next);
});

for(const [id,qa] of [[YATTARE,39966],[BIRDS,40871]])test('Nam Deadman adds one mana with '+id+' (QA '+qa+')',()=>{
 const s=setup(),own=s.players[0],top=own.deck[0],before=own.mana.length;
 add(s,0,'battle',id);
 cast(s,DEADMAN);
 assert.equal(own.mana.length,before+1);
 assert.equal(own.mana.at(-1),top);
 assert.equal(top.tapped,true);
});
