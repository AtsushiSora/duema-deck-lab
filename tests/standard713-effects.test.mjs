import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-713.json',import.meta.url)));

test('Phase 713 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:713}));
  assert.throws(()=>standardCardSpec(detail,{phase:712}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:713}));
 }
 for(const row of printAliases){
  const canonical=cards.find(x=>x.id===row.canonicalId);
  assert.equal(row.name,canonical.name);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:713}),canonical.spec);
  assert.ok(row.verification.facesMatched);
  assert.match(row.image,/^https:\/\/dm\.takaratomy\.co\.jp\/.*\.jpg$/);
  assert.equal(regulationVerification.limits[row.id],regulationVerification.limits[canonical.id]);
  assert.ok(!data.cards.some(c=>c.id===row.id));
 }
});

const BALUS='dm05-022',NOIR='dm09-021',TANZANITE='dm10-008';
const SURVIVOR='dm05-025',PLAIN='dm01-075',OUTRAGE='dmd09-007',MAX='dmr09-021';
const VELVET='dmr09-s01',TWIN='dm22ex1-062',SPELL='dmr18-043',GRAVE_LOCK='dmrp08-014';
const restore=s=>JSON.parse(JSON.stringify(s));
const find=(s,p,z,x)=>s.players[p][z].find(y=>y.uid===x.uid);
function field(){
 const s=setup();
 s.active=0;
 s.phase='attack';
 return s;
}
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
const use=(s,x)=>act(s,'tapAbility',a=>a.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===(value?.uid??value);
});

test('Each Balus grants one end trigger to each of its own Survivors, including itself',()=>{
 let s=field();
 const own=[put(s,0,BALUS,{tapped:true}),put(s,0,BALUS,{tapped:true}),put(s,0,SURVIVOR,{tapped:true})];
 const plain=put(s,0,PLAIN,{tapped:true}),enemy=put(s,1,SURVIVOR,{tapped:true,skipUntap:true});
 act(s,'endTurn');
 assert.equal(s.decision.type,'effectOrder');
 for(const x of own)assert.equal(s.pendingEffects.filter(t=>t.source===BALUS&&t.uid===x.uid).length,2);
 s=restore(s);
 drain(s);
 for(const x of own)assert.equal(find(s,0,'battle',x).tapped,false);
 for(const [p,x] of [[0,plain],[1,enemy]])assert.equal(find(s,p,'battle',x).tapped,true);
});

test('Balus needs a live source when the turn ends and only triggers on its controller’s turn',()=>{
 for(const scenario of ['source left','source ignored','opponent turn']){
  const s=field(),source=put(s,0,BALUS,{tapped:true}),survivor=put(s,0,SURVIVOR,{tapped:true,skipUntap:true});
  if(scenario==='source left')s.players[0].grave.push(s.players[0].battle.shift());
  if(scenario==='source ignored')source.g35Ignored=s.turn;
  if(scenario==='opponent turn')s.active=1;
  act(s,'endTurn');
  drain(s);
  assert.equal(survivor.tapped,true,scenario);
 }
});

test('Noir fixes a race at activation and untaps exact matches from both sides at the end',()=>{
 let s=field();
 const source=put(s,0,NOIR),ally=put(s,0,OUTRAGE,{tapped:true});
 const locked=put(s,0,OUTRAGE,{tapped:true,tapLocks:[0]});
 const rival=put(s,1,OUTRAGE,{tapped:true,skipUntap:true});
 const wrong=put(s,1,MAX,{tapped:true,skipUntap:true});
 use(s,source);
 assert.equal(s.decision.task.op,'g34_ChooseRaceUntap713');
 assert.ok(s.decision.choices.some(c=>c.value==='ドラゴノイド'));
 assert.ok(s.decision.choices.every(c=>typeof c.value==='string'));
 s=restore(s);
 pick(s,'アウトレイジ');
 assert.ok(find(s,0,'battle',ally).tapped&&find(s,1,'battle',rival).tapped);
 s.players[0].grave.push(s.players[0].battle.shift());
 const later=put(s,0,OUTRAGE,{tapped:true,entered:s.turn});
 s=restore(s);
 act(s,'endTurn');
 drain(s);
 for(const [p,x] of [[0,ally],[0,later],[1,rival]])assert.equal(find(s,p,'battle',x).tapped,false);
 for(const [p,x] of [[0,locked],[1,wrong]])assert.equal(find(s,p,'battle',x).tapped,true);
 assert.equal(s.g537Delays.length,0);
});

test('Noir can choose and untap its own race',()=>{
 const s=field(),source=put(s,0,NOIR);
 use(s,source);
 assert.equal(source.tapped,true);
 pick(s,'ガーディアン');
 act(s,'endTurn');
 drain(s);
 assert.equal(source.tapped,false);
});

for(const selected of [VELVET,TWIN])test('Tanzanite recovers all copies by creature face name after restore: '+selected,()=>{
 let s=field();
 const source=put(s,0,TANZANITE);
 give(s,0,'grave',[VELVET,TWIN,TWIN,SPELL,PLAIN]);
 give(s,1,'grave',[VELVET]);
 const [single,twin,secondTwin,spell,plain]=s.players[0].grave,enemy=s.players[1].grave[0];
 use(s,source);
 assert.ok(source.tapped);
 assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[single.uid,twin.uid,secondTwin.uid,plain.uid]);
 s=restore(s);
 pick(s,selected===VELVET?single:twin);
 drain(s);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[single.uid,twin.uid,secondTwin.uid]);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[spell.uid,plain.uid]);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[enemy.uid]);
});

test('Tanzanite does not recover from a locked grave or offer a spell-only choice',()=>{
 for(const locked of [false,true]){
  const s=field(),source=put(s,0,TANZANITE);
  if(locked)put(s,1,GRAVE_LOCK);
  give(s,0,'grave',locked?[TWIN]:[SPELL]);
  use(s,source);
  assert.ok(source.tapped);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].grave.length,1);
  assert.equal(s.players[0].hand.length,0);
 }
});

test('Tanzanite enters mana tapped and retains W Breaker when attacking',()=>{
 const s=field(),x=put(s,0,TANZANITE);
 give(s,0,'hand',[TANZANITE]);
 s.phase='charge';
 act(s,'charge',a=>a.cardId===TANZANITE);
 assert.equal(s.players[0].mana.at(-1).tapped,true);
 const before=s.players[1].shields.length;
 attack(s,x.uid);
 act(s,'noBlock');
 drain(s);
 assert.equal(s.players[1].shields.length,before-2);
});
