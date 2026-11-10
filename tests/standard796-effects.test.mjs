import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-796.json',import.meta.url)));
const EYE="dm24rp4-008",TAIL="dm24rp4-009",CLAW="dm24rp4-010";
const SMALL="dm01-108",BOL="dm06-s08",SEED="dmrp22-076",COMMAND="dm23rp3-064",APUL="dmrp22-042";
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
test('Phase 796 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:796}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:796}));
  assert.deepEqual(registry.cards.filter(c=>canonicalCardName(c.name)===canonicalCardName(row.name)).map(c=>c.id),[row.id]);
  assert.equal(e.card(row.id).limit,regulationVerification.limits[row.id]);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(e.card(row.id)[key],value);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  const prints=printAliases.filter(x=>x.canonicalId===row.id);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id:prints[0]?.id??row.id,count:1});
  deck.cards=registry.resolveRows(deck.cards);
  assert.equal(deck.cards.at(-1).id,row.id);
  assert.deepEqual(e.validateDeck(deck),[]);
  for(const print of prints){
   assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[row.id]);
   assert.equal(print.verification.facesMatched,true);
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:796}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const choices=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
const taskIs=(s,op)=>assert.equal(s.decision?.task?.op,op,JSON.stringify(s.decision));

for(const id of [EYE,TAIL,CLAW])test(e.card(id).name+' untaps from hand, uses G・ストライク and qualifies as a shinkalize base',()=>{
 let s=setup();s.phase='charge';
 const charged=put(s,0,'hand',id);
 act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(has(s,0,'mana',charged));
 assert.equal(charged.tapped,false);
 assert.equal(e.card(charged).type,'seed');
 assert.equal(e.card(charged).shinkalize,true);
 const base=put(s,0,'battle',id);
 assert.equal(e.isCreature(s,base),false);
 const evolution=put(s,0,'hand','dm24ex4-016');
 assert.ok(e.evolutionBases(s,0,e.card(evolution)).some(x=>x.uid===base.uid));
 play(s,evolution);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(s.players[0].battle.find(x=>x.uid===evolution.uid).under[0].uid,base.uid);
 s=setup();s.active=1;give(s,0,'shields',[id]);
 const attacker=put(s,1,'battle',SMALL),later=put(s,1,'battle',SMALL);
 attack(s,attacker.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 taskIs(s,'gsDeclare');
 pick(s,true);
 taskIs(s,'gsTarget');
 pick(s,later.uid);
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===later.uid));
 assert.ok(s.players[0].hand.some(x=>x.cardId===id));
});

for(const dest of ['shields','hand','mana'])test('邪眼 looks at the same top card and may move it to '+dest,()=>{
 const s=setup(),eye=put(s,0,'hand',EYE),top=inst(TAIL),second=s.players[0].deck[0];
 s.players[0].deck.unshift(top);
 const drawn=s.players[0].drawsThisTurn||0;
 play(s,eye);
 taskIs(s,'g34_LookDestination467');
 assert.deepEqual(new Set(choices(s)),new Set(['shields','hand','mana']));
 assert.ok(s.decision.choices.every(x=>x.cardId===TAIL));
 assert.equal(s.players[0].deck[0].uid,top.uid);
 pick(s,dest);
 assert.equal(s.players[0].deck[0].uid,second.uid);
 assert.ok(has(s,0,dest,top));
 assert.equal(s.players[0].drawsThisTurn||0,drawn);
 if(dest==='mana')assert.equal(top.tapped,true);
 if(dest==='shields')assert.ok(!top.faceUp);
});

test('邪尾 draws first and may deploy a Command creature or Command tamaseed from either zone',()=>{
 for(const dest of ['hand','mana',null]){
  const s=setup(),tail=put(s,0,'hand',TAIL),drawn=inst(COMMAND),seed=put(s,0,'mana',SEED);
  const nonCommand=put(s,0,'hand',SMALL),overCost=put(s,0,'mana',TAIL);
  s.players[0].deck.unshift(drawn);
  play(s,tail);
  taskIs(s,'g34_Select');
  assert.ok(has(s,0,'hand',drawn));
  assert.deepEqual(new Set(choices(s)),new Set([drawn.uid,seed.uid,null]));
  pick(s,dest==='hand'?drawn.uid:dest==='mana'?seed.uid:null);
  assert.ok(has(s,0,'hand',nonCommand)&&has(s,0,'mana',overCost));
  assert.equal(has(s,0,'battle',drawn),dest==='hand');
  assert.equal(has(s,0,'battle',seed),dest==='mana');
 }
});

test('邪爪 chooses one graveyard and shuffles only selected cards at the bottom',()=>{
 for(const owner of [0,1]){
  let s=setup(),claw=put(s,0,'hand',CLAW);
  const first=put(s,owner,'grave',SMALL),second=put(s,owner,'grave',BOL),third=put(s,owner,'grave',EYE),other=put(s,1-owner,'grave',TAIL);
  const original=s.players[owner].deck.map(y=>y.uid);
  play(s,claw);
  pick(s,0);
  pick(s,owner);
  assert.deepEqual(new Set(choices(s)),new Set([first.uid,second.uid,third.uid,null]));
  pick(s,first.uid);
  s=restore(s);
  pick(s,second.uid);
  pick(s,null);
  assert.deepEqual(s.players[owner].deck.slice(0,-2).map(y=>y.uid),original);
  assert.deepEqual(new Set(s.players[owner].deck.slice(-2).map(y=>y.uid)),new Set([first.uid,second.uid]));
  assert.ok(has(s,owner,'grave',third)&&has(s,1-owner,'grave',other));
 }
});

test('邪爪 allows zero cards in the selected graveyard',()=>{
 const s=setup(),claw=put(s,0,'hand',CLAW),x=put(s,1,'grave',BOL);
 const deck=s.players[1].deck.map(y=>y.uid);
 play(s,claw);
 pick(s,0);
 pick(s,1);
 pick(s,null);
 assert.ok(has(s,1,'grave',x));
 assert.deepEqual(s.players[1].deck.map(y=>y.uid),deck);
});

test('邪爪 enforces cost four only for elements and ramps the selected card owner',()=>{
 for(const target of ['battle','mana']){
  const s=setup(),claw=put(s,0,'hand',CLAW),mana=put(s,1,'mana',BOL),large=put(s,1,'battle',BOL);
  const eligible=put(s,1,'battle',TAIL),top=s.players[1].deck[0];
  play(s,claw);
  pick(s,1);
  taskIs(s,'g34_ElementOrMana796');
  assert.ok(choices(s).includes(mana.uid)&&choices(s).includes(eligible.uid)&&!choices(s).includes(large.uid));
  const x=target==='battle'?eligible:mana;
  pick(s,x.uid);
  assert.equal(s.players[1].deck.at(-1).uid,x.uid);
  assert.ok(has(s,1,'mana',top));
  assert.ok(has(s,1,'battle',large));
 }
});

test('邪爪 still ramps the owner when a selected mana card cannot move',()=>{
 const s=setup(),claw=put(s,0,'hand',CLAW),mana=put(s,1,'mana',BOL),top=s.players[1].deck[0];
 put(s,0,'battle',APUL);
 play(s,claw);
 pick(s,1);
 pick(s,mana.uid);
 assert.ok(has(s,1,'mana',mana)&&has(s,1,'mana',top));
});

test('邪爪 exposes only the position of a face-down mana card',()=>{
 const s=setup(),claw=put(s,0,'hand',CLAW),mana=put(s,1,'mana',BOL);
 mana.faceDown=true;
 play(s,claw);
 pick(s,1);
 const option=s.decision.choices.find(x=>x.value.uid===mana.uid);
 assert.match(option.label,/裏向きのカード/);
 assert.ok(!option.cardId&&!option.label.includes(e.card(mana).name));
 pick(s,mana.uid);
 assert.equal(s.players[1].deck.at(-1).uid,mana.uid);
});
