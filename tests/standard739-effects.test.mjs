import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-739.json',import.meta.url)));

test('Phase 739 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:739}));
  assert.throws(()=>standardCardSpec(detail,{phase:738}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:739}));
 }
});

const HORN='dm08-054',ASSASSIN='dm08-013',WORM='dm08-046';
const DRAGON='dm08-049',NOID='dm01-100',BEAST='dm01-108',WATER='dm01-083';
const NIN='dmrp22-033',YAMATA='dmbd18-003';
const field=()=>Object.assign(setup(),{active:0});
const ids=zone=>zone.map(y=>y.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,v)=>act(s,'extended',a=>s.decision.choices[a.choice].value===v);
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
function chooseEffect(s,id){
 const action=e.getLegalActions(s).find(a=>a.cardId===id);
 assert.ok(action);
 e.step(s,action);
}

test('Horn ramps once for each friendly Dragon or Dragonoid and ignores all other entries',()=>{
 const s=field();
 give(s,0,'deck',['dm10-064',BEAST,WATER]);
 const [multi,mono,remaining]=s.players[0].deck;
 const initial=s.players[0].mana.length;
 play(s,HORN);
 play(s,BEAST);
 s.active=1;
 play(s,DRAGON);
 assert.equal(s.players[0].mana.length,initial);
 s.active=0;
 play(s,DRAGON);
 assert.equal(s.players[0].mana.at(-1).uid,multi.uid);
 assert.equal(multi.tapped,true);
 play(s,NOID);
 assert.equal(s.players[0].mana.at(-1).uid,mono.uid);
 assert.equal(mono.tapped,false);
 assert.deepEqual(ids(s.players[0].deck),[remaining.uid]);
});

test('Horn obeys the mana replacement and checks for defeat after moving the last library card',()=>{
 for(const replace of [false,true]){
  const s=field();
  put(s,0,HORN);
  if(replace)put(s,1,NIN);
  give(s,0,'deck',[BEAST]);
  const top=s.players[0].deck[0];
  play(s,DRAGON);
  drain(s);
  assert.ok(ids(s.players[0][replace?'grave':'mana']).includes(top.uid));
  assert.equal(s.players[0].deck.length,0);
  assert.equal(s.winner,1);
 }
});

test('Assassin picks exactly one tied minimum from either side and survives restoring the choice',()=>{
 for(const owner of [0,1]){
  let s=field();
  put(s,0,ASSASSIN);
  const ally=put(s,0,WATER),enemy=put(s,1,WATER),bigger=put(s,1,BEAST);
  const source=play(s,DRAGON);
  assert.equal(s.decision.task.op,'g61_Bronx');
  assert.deepEqual(s.decision.choices.map(c=>c.value),[ally.uid,enemy.uid]);
  s=restore(s);
  pick(s,owner===0?ally.uid:enemy.uid);
  drain(s);
  assert.ok(ids(s.players[owner].grave).includes(owner===0?ally.uid:enemy.uid));
  assert.ok(ids(s.players[1-owner].battle).includes(owner===0?enemy.uid:ally.uid));
  assert.ok(ids(s.players[0].battle).includes(source.uid)&&ids(s.players[1].battle).includes(bigger.uid));
 }
});

test('Assassin cannot choose a larger creature when the unique minimum is protected',()=>{
 const s=field();
 put(s,0,ASSASSIN);
 const low=put(s,1,WATER,{g34Grants:[{turn:s.turn,untargetable:true}],powerModifiers:[{amount:-500,expires:'end',who:0}]});
 const larger=put(s,1,BEAST);
 s.active=1;
 play(s,NOID);
 assert.equal(s.decision,null);
 s.active=0;
 play(s,NOID);
 drain(s);
 assert.equal(s.decision,null);
 assert.ok(ids(s.players[1].battle).includes(low.uid)&&ids(s.players[1].battle).includes(larger.uid));
 assert.equal(s.players[0].grave.length+s.players[1].grave.length,0);
});

test('Assassin can resolve after Horn when both watch the same Dragon entry',()=>{
 const s=field(),a=put(s,0,ASSASSIN),horn=put(s,0,HORN);
 const low=put(s,1,WATER),larger=put(s,1,BEAST);
 play(s,DRAGON);
 assert.ok(['effectOrder','entryOrder'].includes(s.decision?.type));
 chooseEffect(s,HORN);
 assert.equal(s.decision.task.op,'g61_Bronx');
 assert.equal(s.decision.source,ASSASSIN);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[low.uid]);
 pick(s,low.uid);
 drain(s);
 assert.ok(ids(s.players[0].battle).includes(a.uid)&&ids(s.players[0].battle).includes(horn.uid));
 assert.ok(ids(s.players[1].grave).includes(low.uid)&&ids(s.players[1].battle).includes(larger.uid));
});

test('Tyrant Worm stays on its own entry, then another copy causes only the older copy to be destroyed',()=>{
 const s=field(),old=play(s,WORM);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,BEAST);
 assert.ok(ids(s.players[0].battle).includes(old.uid));
 s.active=0;
 const before=s.players[0].deck.length;
 old.g34Grants=[{turn:s.turn,g172Death:[{op:'Draw',n:1}]}];
 const fresh=play(s,WORM);
 drain(s);
 assert.ok(ids(s.players[0].grave).includes(old.uid)&&ids(s.players[0].battle).includes(fresh.uid));
 assert.equal(s.players[0].deck.length,before-1);
});

test('Tyrant Worm uses a real leaving replacement and can restore the pending decision',()=>{
 let s=field();
 put(s,0,YAMATA);
 const worm=put(s,0,WORM);
 play(s,BEAST);
 assert.equal(s.decision.type,'leaveReplace');
 s=restore(s);
 act(s,'replaceYamata');
 drain(s);
 assert.ok(ids(s.players[0].mana).includes(worm.uid));
 assert.ok(!ids(s.players[0].grave).includes(worm.uid));
});
