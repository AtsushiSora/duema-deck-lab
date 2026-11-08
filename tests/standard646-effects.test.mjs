import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-646.json',import.meta.url)));
const HEMO='dmrp01-046',DUKO='dmex14-090',SENMEN='dm25rp1-065';
const WATER='dm01-080',FIRE='dm01-097',DUAL='dmd09-007',SMALL_DUAL='dm13-030',STRONG='dm01-059';
const SPLIT='dmex12-074',SPELL='dm02-032',APUL='dmrp22-042';
const valueOf=choice=>choice.value?.uid??choice.value;
const pick=(s,value)=>act(s,'extended',a=>valueOf(s.decision.choices[a.choice])===value);
const ids=xs=>xs.map(x=>x.uid);
const physical=s=>ids(e.physicalCards(s)).sort();
const end=s=>{s.phase='attack';act(s,'endTurn');drain(s);};

test('Phase 646 verifies original prints and alternate text without duplicating a deck ID',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 assert.equal(cards.length,3);
 for(const row of cards){
  const detail=details.cards.find(d=>d.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:646}));
  for(const [field,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[field],value);
  assert.deepEqual(data.cards.filter(c=>key(c.name)===key(row.name)).map(c=>c.id),[row.id]);
  assert.ok(row.verification.facesMatched);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].id=row.id;
  assert.deepEqual(catalogue.resolveRows(deck.cards),deck.cards);
  assert.deepEqual(e.validateDeck(deck),[]);
 }
 assert.equal(printAliases.length,2);
 for(const row of printAliases){
  assert.ok(row.verification.facesMatched);
  assert.equal(row.canonicalId,HEMO);
  assert.ok(!data.cards.some(c=>c.id===row.id));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:646}),cards.find(c=>c.id===HEMO).spec);
 }
});

test('Hemoglo forces the opponent to choose a discard on entry and on its turn-end return',()=>{
 let s=setup();
 give(s,0,'hand',[HEMO]);
 give(s,1,'hand',[FIRE,WATER,STRONG]);
 give(s,1,'battle',[STRONG]);
 const [hemo]=s.players[0].hand,[keep,first,second]=s.players[1].hand,before=physical(s);
 act(s,'play');
 assert.equal(s.decision.player,1);
 pick(s,first.uid);
 assert.deepEqual(ids(s.players[1].hand),[keep.uid,second.uid]);
 hemo.entered=0;
 const [enemy]=s.players[1].battle;
 enemy.tapped=true;
 attack(s,hemo.uid,enemy.uid);
 drain(s);
 assert.ok(ids(s.players[0].grave).includes(hemo.uid));
 s=JSON.parse(JSON.stringify(s));
 act(s,'endTurn');
 assert.equal(s.decision.player,1);
 pick(s,second.uid);
 assert.ok(ids(s.players[0].battle).includes(hemo.uid));
 assert.ok(ids(s.players[1].hand).includes(keep.uid));
 assert.ok(ids(s.players[1].grave).includes(second.uid));
 assert.deepEqual(physical(s),before);
});

test('Dukohan has no delayed return when a sweep also destroys the only allied multicolor creature',()=>{
 const s=setup();
 give(s,0,'battle',[DUKO,SMALL_DUAL]);
 give(s,0,'hand',[SPELL]);
 const [duko,dual]=s.players[0].battle;
 act(s,'play');
 drain(s);
 assert.ok(ids(s.players[0].grave).includes(duko.uid));
 assert.ok(ids(s.players[0].grave).includes(dual.uid));
 assert.ok(!s.g537Delays?.some(d=>d.uid===duko.uid));
 end(s);
 assert.ok(ids(s.players[0].grave).includes(duko.uid));
});

test('Dukohan checks its own multicolor creature when resolving the death ability, once',()=>{
 for(const keeper of [DUAL,SPLIT]){
  const s=setup();
  give(s,0,'battle',[DUKO,keeper]);
  give(s,1,'battle',[STRONG,DUAL]);
  const [duko,ally]=s.players[0].battle,[enemy]=s.players[1].battle;
  enemy.tapped=true;
  attack(s,duko.uid,enemy.uid);
  drain(s);
  assert.equal(!!s.g537Delays?.some(d=>d.uid===duko.uid),keeper===DUAL);
  if(keeper===DUAL){
   s.extTasks=[{op:'g34_Target',p:0,source:DUKO,owner:'self',to:'grave'}];
   s.phase='main';
   act(s,'toAttack');
   drain(s);
   assert.ok(ids(s.players[0].grave).includes(ally.uid));
  }
  end(s);
  assert.equal(ids(s.players[0].battle).includes(duko.uid),keeper===DUAL);
 }
});

test('Senmen selects two distinct qualifying cards before moving either, through save resume',()=>{
 for(const firstColor of ['水','火','多色']){
  let s=setup();
  give(s,0,'hand',[SENMEN]);
  give(s,0,'grave',[WATER,WATER,FIRE,FIRE,DUAL,SPLIT,SPELL]);
  const [water1,water2,fire1,fire2,dual]=s.players[0].grave,before=physical(s);
  const first=firstColor==='水'?water1:firstColor==='火'?fire1:dual;
  const second=firstColor==='水'?fire2:water2;
  act(s,'play');
  assert.deepEqual(s.decision.choices.map(valueOf),[water1.uid,water2.uid,fire1.uid,fire2.uid,dual.uid,null]);
  pick(s,first.uid);
  assert.deepEqual(s.players[0].hand,[]);
  assert.ok(ids(s.players[0].grave).includes(first.uid));
  const allowed=firstColor==='水'?[fire1.uid,fire2.uid,dual.uid]:firstColor==='火'?[water1.uid,water2.uid,dual.uid]:[water1.uid,water2.uid,fire1.uid,fire2.uid];
  assert.deepEqual(s.decision.choices.map(valueOf),[...allowed,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,second.uid);
  assert.deepEqual(ids(s.players[0].hand),[first.uid,second.uid]);
  assert.deepEqual(physical(s),before);
 }
});

test('Senmen can return zero or one card and respects a grave movement restriction',()=>{
 for(const mode of ['none','one','locked']){
  const s=setup();
  give(s,0,'hand',[SENMEN]);
  give(s,0,'grave',[WATER,DUAL]);
  const [,dual]=s.players[0].grave;
  if(mode==='locked')give(s,1,'battle',[APUL]);
  act(s,'play');
  if(mode==='one')pick(s,dual.uid);
  if(mode!=='locked')pick(s,null);
  assert.deepEqual(ids(s.players[0].hand),mode==='one'?[dual.uid]:[]);
 }
});
