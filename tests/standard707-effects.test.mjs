import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,GEN} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-707.json',import.meta.url)));

test('Phase 707 validates three complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:707}));
  assert.throws(()=>standardCardSpec(detail,{phase:706}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:707}));
 }
});

const SEED='dm13-008',DOCTOR='dm09-046',MONARCH='dm19-s05';
const BODY='dm01-108',FIRE='dm01-097',DEMON='dm01-s06',DEMON2='dm01-s05';
const DESTROY='dm01-027',BOUNCE='dm01-086',SPELL='dm01-110';
const put=(s,p,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
function play(s,id){
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function remove(s,x,spell=DESTROY){
 s.active=1;
 s.phase='main';
 const cast=play(s,spell);
 act(s,'effect',a=>a.targets?.some(t=>t.uid===x.uid));
 return cast;
}

test('Verified reprints have matching abilities and one battle ID per name',()=>{
 assert.equal(printAliases.length,4);
 for(const print of printAliases){
  const original=cards.find(x=>x.id===print.canonicalId);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:707}),original.spec);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[original.id]);
  assert.ok(print.verification.facesMatched);
  assert.ok(!data.cards.some(x=>x.id===print.id));
 }
});

test('Inspect Seed stays tapped and offers one optional draw for every own attack that turn',()=>{
 let s=setup();
 s.active=1;
 const seed=put(s,0,SEED,{tapped:true}),a=put(s,0,BODY),b=put(s,0,BODY),enemy=put(s,1,BODY);
 end(s);
 assert.equal(s.decision.type,'silent496');
 s=restore(s);
 act(s,'silent496',a=>a.yes);
 assert.ok(s.players[0].battle.find(x=>x.uid===seed.uid).tapped);
 const hand=s.players[0].hand.length,top=s.players[0].deck[0];
 attack(s,a.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,0);
 act(s,'noBlock');
 assert.equal(s.players[0].hand.length,hand);
 attack(s,b.uid);
 pick(s,1);
 act(s,'noBlock');
 assert.ok(has(s,0,'hand',top));
 end(s);
 attack(s,enemy.uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 end(s);
 act(s,'silent496',a=>!a.yes);
 assert.ok(!s.players[0].battle.find(x=>x.uid===seed.uid).tapped);
 attack(s,a.uid);
 assert.equal(s.decision.type,'block');
});

test('Inspect Seed effect survives the source leaving and ignores spell-only suppression',()=>{
 const s=setup();
 s.active=1;
 const seed=put(s,0,SEED,{tapped:true}),attacker=put(s,0,BODY);
 end(s);
 act(s,'silent496',a=>a.yes);
 s.players[0].battle.splice(s.players[0].battle.indexOf(seed),1);
 s.players[0].grave.push(seed);
 put(s,1,GEN);
 const top=s.players[0].deck[0];
 attack(s,attacker.uid);
 assert.equal(s.decision.task.op,'g34_Draw');
 pick(s,1);
 assert.ok(has(s,0,'hand',top));
});

for(const accept of [false,true])test('Bat Doctor can choose another own grave creature including a Twinpact or decline '+accept,()=>{
 let s=setup();
 const doctor=put(s,0,DOCTOR);
 give(s,0,'grave',[SPELL,BODY,'dm22ex1-082']);
 give(s,1,'grave',[FIRE]);
 const [,body,twin]=s.players[0].grave,before=physical(s);
 const cast=remove(s,doctor);
 assert.ok(has(s,0,'grave',doctor));
 assert.deepEqual(choices(s),[body.uid,twin.uid,null]);
 s=restore(s);
 pick(s,accept?twin.uid:null);
 assert.equal(has(s,0,'hand',twin),accept);
 assert.ok(has(s,0,'grave',doctor)&&has(s,0,'grave',body));
 assert.deepEqual(physical(s),[...before,cast.uid].sort());
});

test('Bat Doctor does not recover from a bounce or when it is the only creature in the grave',()=>{
 for(const spell of [BOUNCE,DESTROY]){
  const s=setup(),doctor=put(s,0,DOCTOR);
  remove(s,doctor,spell);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,spell===BOUNCE?'hand':'grave',doctor));
 }
});

for(const accept of [false,true])test('Death Monarch can return its own evolution base and all eligible demons together or decline '+accept,()=>{
 let s=setup();
 const wrong=put(s,0,BODY),base=put(s,0,DEMON);
 give(s,0,'grave',[DEMON2,MONARCH,SPELL,FIRE]);
 give(s,1,'grave',[DEMON2]);
 const [other,prior,spell,nonDemon]=s.players[0].grave;
 const monarch=play(s,MONARCH);
 assert.equal(s.decision.type,'evolution');
 assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid),[base.uid]);
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.ok(has(s,0,'battle',wrong));
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 assert.equal(e.effectiveCard(monarch,s).breaker,2);
 const before=physical(s),cast=remove(s,monarch);
 assert.equal(s.decision.task.op,'g34_Offer');
 assert.ok(has(s,0,'grave',base)&&has(s,0,'grave',monarch));
 s=restore(s);
 pick(s,accept?true:null);
 if(accept){
  assert.deepEqual(choices(s).sort(),[other.uid,base.uid].sort());
  pick(s,other.uid);
  assert.ok(!has(s,0,'battle',other));
  assert.deepEqual(choices(s),[base.uid]);
  s=restore(s);
  pick(s,base.uid);
  assert.ok(has(s,0,'battle',base)&&has(s,0,'battle',other));
  const returned=s.players[0].battle.find(x=>x.uid===base.uid);
  assert.equal(returned.entered,s.turn);
  assert.notEqual(returned.summonedTurn,s.turn);
 }else{
  assert.ok(has(s,0,'grave',base)&&has(s,0,'grave',other));
 }
 assert.ok([prior,spell,nonDemon,monarch].every(x=>has(s,0,'grave',x)));
 assert.equal(s.players[1].grave.filter(x=>x.cardId===DEMON2).length,1);
 assert.deepEqual(physical(s),[...before,cast.uid].sort());
});

test('Death Monarch cannot take demons out of a locked graveyard',()=>{
 const s=setup(),monarch=put(s,0,MONARCH,{under:[inst(DEMON)]});
 give(s,0,'grave',[DEMON2]);
 put(s,1,'dmrp22-042');
 remove(s,monarch);
 if(s.decision?.task?.op==='g34_Offer')pick(s,true);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].battle.length,0);
 assert.deepEqual(s.players[0].grave.map(x=>x.cardId).sort(),[DEMON,DEMON2,MONARCH].sort());
});
