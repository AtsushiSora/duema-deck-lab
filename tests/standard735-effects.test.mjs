import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-735.json',import.meta.url)));

test('Phase 735 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:735}));
  assert.throws(()=>standardCardSpec(detail,{phase:734}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:735}));
 }
});

const TRI='dmx13-016',TUNNEL='dm09-043',GUARD='dm09-023';
const BEAST='dm01-108',BEAST_BIG='dm01-103',WATER='dm01-083';
const DRAGON='dm01-s08',EARTH_DRAGON='dm22ex1-070',FISH='dm01-082';
const ZERO='dm23ex2-065',COURTNEY='dm13-015',GEAR='dm14-110';
const field=(active=0)=>Object.assign(setup(),{active});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);

function put(s,p,id,zone='battle',attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,id,'hand');
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function end(s){
 s.phase='attack';
 act(s,'endTurn');
 drain(s);
}

test('Tristone counts tapped and face-down colorless mana and destroys below the count on both sides',()=>{
 const s=field();
 put(s,0,ZERO,'mana');
 put(s,0,ZERO,'mana',{tapped:true});
 put(s,0,WATER,'mana',{faceDown:true});
 put(s,1,ZERO,'mana');
 const allies=[put(s,0,BEAST),put(s,0,BEAST_BIG),put(s,0,GEAR)];
 const enemies=[put(s,1,WATER),put(s,1,BEAST_BIG)];
 const spell=play(s,TRI);
 drain(s);
 assert.ok(has(s,0,'grave',allies[0])&&has(s,1,'grave',enemies[0]));
 assert.ok(has(s,0,'battle',allies[1])&&has(s,1,'battle',enemies[1]));
 assert.ok(has(s,0,'battle',allies[2]));
 assert.ok(has(s,0,'grave',spell));
});

test('Tristone does nothing without colorless mana, including when Courtney gives all mana civilizations',()=>{
 for(const withCourtney of [false,true]){
  const s=field();
  const ally=put(s,0,BEAST),enemy=put(s,1,WATER);
  if(withCourtney){
   put(s,0,COURTNEY);
   put(s,0,ZERO,'mana');
   put(s,0,ZERO,'mana',{tapped:true});
   put(s,0,WATER,'mana',{faceDown:true});
  }
  play(s,TRI);
  drain(s);
  assert.ok(has(s,0,'battle',ally)&&has(s,1,'battle',enemy));
 }
});

test('Cyber Tunnel declares Dragon and prevents real blocking for existing matching creatures until turn end',()=>{
 const s=field();
 const dragon=put(s,0,DRAGON),enemy=put(s,1,EARTH_DRAGON);
 const ordinary=put(s,0,BEAST),blocker=put(s,1,FISH);
 play(s,TUNNEL);
 assert.ok(s.decision.choices.some(o=>o.value==='ドラゴン'));
 assert.ok(!s.decision.choices.some(o=>o.value==='サイバー'));
 pick(s,'ドラゴン');
 drain(s);
 const later=put(s,0,DRAGON);
 assert.ok(e.effectiveCard(dragon,s).unblockable&&e.effectiveCard(enemy,s).unblockable);
 assert.ok(!e.effectiveCard(later,s).unblockable&&!e.effectiveCard(ordinary,s).unblockable);
 attack(s,dragon.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='block'));
 drain(s);
 assert.equal(s.players[1].shields.length,3);
 attack(s,ordinary.uid);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='block'&&a.uid===blocker.uid));
 drain(s);
 end(s);
 assert.ok(!e.effectiveCard(dragon,s).unblockable&&!e.effectiveCard(enemy,s).unblockable);
});

test('Sentinel Guard may be triggered, saves the race choice and grants real blocking until the caster starts a turn',()=>{
 let s=field(1);
 const ally=put(s,0,BEAST),first=put(s,1,WATER),second=put(s,1,WATER);
 const enemy=put(s,1,BEAST),other=put(s,0,WATER);
 give(s,0,'shields',[GUARD]);
 give(s,0,'mana',[]);
 attack(s,first.uid);
 act(s,'noBlock');
 act(s,'useTrigger');
 assert.equal(s.decision.player,0);
 s=JSON.parse(JSON.stringify(s));
 pick(s,'ビーストフォーク');
 drain(s);
 const get=(p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);
 const later=put(s,0,BEAST);
 assert.ok(e.effectiveCard(get(0,ally),s).blocker&&e.effectiveCard(get(1,enemy),s).blocker);
 assert.ok(!e.effectiveCard(get(0,other),s).blocker&&!e.effectiveCard(later,s).blocker);
 assert.equal(s.players[0].mana.length,0);
 assert.equal(s.players[0].shields.length,0);
 attack(s,second.uid);
 act(s,'block',a=>a.uid===ally.uid);
 drain(s);
 assert.ok(has(s,1,'grave',second)&&has(s,0,'battle',ally));
 end(s);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(get(0,ally),s).blocker&&!e.effectiveCard(get(1,enemy),s).blocker);
});

test('Sentinel Guard cast normally lasts through the opponent turn',()=>{
 const s=field();
 const ally=put(s,0,BEAST);
 play(s,GUARD);
 pick(s,'ビーストフォーク');
 drain(s);
 end(s);
 assert.equal(s.active,1);
 assert.ok(e.effectiveCard(ally,s).blocker);
 end(s);
 assert.equal(s.active,0);
 assert.ok(!e.effectiveCard(ally,s).blocker);
});
