import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-710.json',import.meta.url)));

test('Phase 710 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:710}));
  assert.throws(()=>standardCardSpec(detail,{phase:709}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:710}));
 }
});

const PITCHU='dm37-047',RUBIN='dm22-050',TIARA='dm05-013';
const FLAME='dmr09-095',DRAGON='dm08-049',SURVIVOR='dm05-054';
const BODY='dm01-108',WATER='dm01-083',SPELL='dm01-027';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const field=()=>{
 const s=setup();
 s.active=0;
 return s;
};
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,x)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===x.uid;
});
const use=(s,uid)=>act(s,'tapAbility',a=>a.uid===uid);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);

test('six verified alternate prints share the three registered battle definitions',()=>{
 assert.equal(printAliases.length,6);
 for(const print of printAliases){
  const original=cards.find(c=>c.id===print.canonicalId);
  assert.equal(print.name,original.name);
  assert.ok(print.verification.facesMatched);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:710}),original.spec);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[original.id]);
  assert.ok(!data.cards.some(c=>c.id===print.id));
 }
});

for(const [sourceId,targetId,otherId] of [[PITCHU,FLAME,DRAGON],[RUBIN,DRAGON,FLAME]]){
 test(sourceId+' untaps a friendly creature of the right race and permits another attack',()=>{
  let s=field();
  const source=put(s,0,sourceId),target=put(s,0,targetId),other=put(s,0,otherId,{tapped:true});
  const enemy=put(s,1,targetId,{tapped:true}),ordinary=put(s,0,BODY,{tapped:true});
  attack(s,target.uid);
  act(s,'noBlock');
  drain(s);
  assert.ok(target.tapped);
  const spent=s.players[0].mana.filter(x=>x.tapped).length;
  use(s,source.uid);
  assert.ok(source.tapped);
  assert.deepEqual(s.decision.choices.map(c=>c.value.uid),[target.uid]);
  s=restore(s);
  pick(s,target);
  assert.equal(s.players[0].battle.find(x=>x.uid===target.uid).tapped,false);
  for(const [owner,x] of [[0,source],[0,other],[0,ordinary],[1,enemy]]){
   assert.equal(s.players[owner].battle.find(y=>y.uid===x.uid).tapped,true);
  }
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,spent);
  attack(s,target.uid);
 });

 test(sourceId+' obeys summoning sickness, speed attacker and untap restrictions',()=>{
  const s=field();
  s.phase='attack';
  const source=put(s,0,sourceId,{entered:s.turn}),target=put(s,0,targetId,{tapped:true,tapLocks:[0]});
  const available=()=>e.getLegalActions(s).some(a=>a.kind==='tapAbility'&&a.uid===source.uid);
  assert.equal(available(),sourceId===PITCHU);
  source.entered=s.turn-1;
  use(s,source.uid);
  pick(s,target);
  assert.ok(source.tapped&&target.tapped);
  assert.equal(available(),false);
 });
}

test('Tiara and other friendly Survivors make the defender choose one of their own hand cards',()=>{
 for(const id of [TIARA,SURVIVOR]){
  let s=field();
  if(id!==TIARA)put(s,0,TIARA);
  const attacker=put(s,0,id),target=put(s,1,BODY,{tapped:true});
  give(s,0,'hand',[SPELL]);
  give(s,1,'hand',[SPELL,WATER,BODY]);
  const chosen=s.players[1].hand[1];
  attack(s,attacker.uid,id===TIARA?'player':target.uid);
  assert.equal(s.decision.task.op,'discard');
  assert.equal(s.decision.player,1);
  assert.deepEqual(s.decision.choices.map(c=>c.cardId),[SPELL,WATER,BODY]);
  s=restore(s);
  pick(s,chosen);
  assert.ok(has(s,1,'grave',chosen));
  assert.deepEqual(s.players[1].hand.map(x=>x.cardId),[SPELL,BODY]);
  assert.equal(s.players[0].hand.length,1);
 }
});

test('two Tiaras queue two discards for an attacking Tiara, even if only one card remains',()=>{
 const s=field(),attacker=put(s,0,TIARA);
 put(s,0,TIARA);
 give(s,1,'hand',[WATER]);
 const chosen=s.players[1].hand[0];
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'effectOrder');
 assert.equal(s.pendingEffects.filter(x=>x.source===TIARA).length,2);
 act(s,'orderEffect');
 pick(s,chosen);
 drain(s);
 assert.ok(has(s,1,'grave',chosen));
 assert.equal(s.players[1].grave.length,1);
});

test('Tiara does not affect non-Survivors, the opposing side or a hand with no cards',()=>{
 for(const [sourceOwner,id,hasHand] of [[0,BODY,true],[1,SURVIVOR,true],[0,SURVIVOR,false]]){
  const s=field();
  put(s,sourceOwner,TIARA);
  const x=put(s,0,id);
  if(hasHand)give(s,1,'hand',[WATER]);
  attack(s,x.uid);
  assert.equal(s.decision.type,'block');
  assert.equal(s.players[1].hand.length,Number(hasHand));
 }
});
