import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-753.json',import.meta.url)));

test('Phase 753 validates the card and its four alternate prints and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:753}));
  assert.throws(()=>standardCardSpec(detail,{phase:752}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:753}));
 }
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of printAliases){
  const original=cards.find(c=>c.id===row.canonicalId);
  const stats=faces=>faces.map(({abilityText,...face})=>face);
  assert.deepEqual(stats(row.faces),stats(original.faces));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:753}),original.spec);
  assert.ok(row.verification.facesMatched);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:2}]),[{id:row.canonicalId,count:3}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
 }
});

const LAPUTA='dm25rp1-S05',LOW='dm01-083',NATURE='dm01-108',FIRE='dm01-097',SPELL='dm01-110';
const MULTI='dmex17-021',FIELD='dmex12-023',WD='dm25ex2-045',SEED='dmsd20-016';
const APUL='dmrp22-042',TOKOSHIE='dmrp17-025',EX='dm23ex2-016',EVO='dm02-s04';
const restore=s=>JSON.parse(JSON.stringify(s));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const pick=(s,predicate)=>act(s,'extended',a=>predicate(s.decision.choices[a.choice].value));
const pickUID=(s,x)=>pick(s,v=>v?.uid===x.uid||v===x.uid);
const skip=s=>pick(s,v=>v===null);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 s.active=0;
 for(const p of [0,1]){
  give(s,p,'deck',Array(20).fill(NATURE));
  give(s,p,'mana',Array(15).fill(NATURE));
 }
 return s;
}
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
function start(s,dragon,target='player'){
 attack(s,dragon.uid,target);
 assert.equal(s.decision?.task?.op,'g34_ManaExchange753');
}
function exchange(s,old,incoming){
 pickUID(s,old);
 assert.equal(s.decision?.task?.op,'g34_ManaExchangePick753');
 pickUID(s,incoming);
}

test('Sympathy counts all opposing mana cards, including face-down and tapped mana, down to one',()=>{
 const s=field(),dragon=put(s,0,'hand',LAPUTA);
 give(s,1,'mana',[LOW,LOW]);
 s.players[1].mana[0].faceDown=true;
 s.players[1].mana[1].tapped=true;
 const cost=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===dragon.uid)?.cost;
 assert.equal(cost(),12);
 for(let i=0;i<12;i++)put(s,1,'mana',LOW,{tapped:true});
 assert.equal(cost(),1);
 act(s,'play',a=>a.uid===dragon.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.equal(e.effectiveCard(dragon,s).breaker,4);
 assert.equal(e.effectiveCard(dragon,s).machFighter,true);
});

test('Mach Fighter can attack an untapped creature upon entry; declining the exchange leaves Q-Breaker available',()=>{
 const s=field(),enemy=put(s,1,'battle',LOW),dragon=put(s,0,'hand',LAPUTA);
 act(s,'play',a=>a.uid===dragon.uid);
 s.phase='attack';
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===dragon.uid&&a.target===enemy.uid));
 assert.ok(!e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===dragon.uid&&a.target==='player'));
 const t=field(),ready=put(t,0,'battle',LAPUTA);
 start(t,ready);
 skip(t);drain(t);
 assert.equal(t.players[1].shields.length,1);
});

test('The exchange only offers lower-cost elements in the chosen owner’s mana and survives saving both choices',()=>{
 let s=field(),dragon=put(s,0,'battle',LAPUTA),old=put(s,1,'battle',MULTI);
 give(s,1,'mana',[]);
 const equal=put(s,1,'mana',MULTI),seed=put(s,1,'mana',SEED,{tapped:true}),hidden=put(s,1,'mana',LOW,{faceDown:true});
 const spell=put(s,1,'mana',SPELL),own=put(s,0,'mana',LOW);
 const before=physical(s);
 start(s,dragon);
 s=restore(s);
 pickUID(s,old);
 const offered=s.decision.choices.flatMap(o=>o.value?[o.value.uid]:[]);
 assert.deepEqual(offered,[seed.uid]);
 s=restore(s);
 pickUID(s,seed);
 assert.ok(has(s,1,'mana',old));
 assert.ok(s.players[1].mana.find(x=>x.uid===old.uid).tapped);
 assert.ok(has(s,1,'battle',seed));
 assert.ok(!s.players[1].battle.find(x=>x.uid===seed.uid).tapped);
 assert.ok(!has(s,1,'mana',seed));
 for(const x of [equal,hidden,spell])assert.ok(has(s,1,'mana',x));
 assert.ok(has(s,0,'mana',own));
 assert.deepEqual(physical(s),before);
});

test('A field can swap with tapped mana and neither single-color card enters tapped',()=>{
 const s=field(),dragon=put(s,0,'battle',LAPUTA),old=put(s,0,'battle',FIELD),incoming=put(s,0,'mana',TOKOSHIE,{tapped:true});
 start(s,dragon);exchange(s,old,incoming);
 assert.equal(s.players[0].mana.find(x=>x.uid===old.uid).tapped,false);
 assert.equal(s.players[0].battle.find(x=>x.uid===incoming.uid).tapped,false);
});

test('A normally summoned Laputa can exchange itself and continue attacking with the tapped replacement',()=>{
 const s=field(),dragon=put(s,0,'hand',LAPUTA),incoming=put(s,0,'mana',LOW);
 const target=put(s,1,'battle','dm01-084');
 act(s,'play',a=>a.uid===dragon.uid);
 start(s,dragon,target.uid);exchange(s,dragon,incoming);
 assert.ok(has(s,0,'mana',dragon));
 assert.equal(s.players[0].mana.find(x=>x.uid===dragon.uid).tapped,false);
 assert.equal(s.players[0].battle.find(x=>x.uid===incoming.uid).tapped,true);
 drain(s);
 assert.ok(s.log.some(row=>row.kind==='battle'||row.type==='battle'));
});

test('An exchanged attack target is replaced by the incoming tapped creature in the same battle',()=>{
 const s=field(),dragon=put(s,0,'battle',LAPUTA),old=put(s,1,'battle',MULTI,{tapped:true}),incoming=put(s,1,'mana',LOW);
 start(s,dragon,old.uid);exchange(s,old,incoming);
 assert.ok(has(s,1,'mana',old));
 assert.equal(s.players[1].battle.find(x=>x.uid===incoming.uid).tapped,true);
 drain(s);
 assert.ok(has(s,1,'grave',incoming));
 assert.ok(has(s,0,'battle',dragon));
});

test('A replacement on either half cancels the exchange without applying the replacement cost',()=>{
 for(const mode of ['Apul','Tokoshie','EX life']){
  const s=field(),dragon=put(s,0,'battle',LAPUTA);
  const old=put(s,1,'battle',mode==='EX life'?EX:MULTI);
  const incoming=put(s,1,'mana',LOW,{tapped:true});
  const shield=s.players[1].shields[0];
  if(mode==='EX life')old.exLifeShieldUid=shield.uid;
  else put(s,0,'battle',mode==='Apul'?APUL:TOKOSHIE);
  start(s,dragon);exchange(s,old,incoming);
  assert.ok(has(s,1,'battle',old),mode);
  assert.ok(has(s,1,'mana',incoming),mode);
  assert.ok(s.players[1].mana.find(x=>x.uid===incoming.uid).tapped,mode);
  assert.ok(has(s,1,'shields',shield),mode);
 }
});

test('The effect controller chooses either WD face, and a mana card can be selected by its cheaper face',()=>{
 for(const [face,ceiling] of [[0,6],[1,6],[1,4]]){
  const s=field(),dragon=put(s,0,'battle',LAPUTA),old=put(s,1,'battle',ceiling===6?MULTI:'dm01-042');
  const incoming=put(s,1,'mana',WD);
  start(s,dragon);pickUID(s,old);
  assert.equal(s.decision.player,0);
  assert.deepEqual(s.decision.choices.flatMap(o=>o.value?.uid===incoming.uid?[o.value.face]:[]),ceiling===6?[0,1]:[1]);
  pick(s,v=>v?.uid===incoming.uid&&v.face===face);
  const placed=s.players[1].battle.find(x=>x.uid===incoming.uid);
  assert.ok(placed);
  assert.equal(!!placed.g393JWDBack,face===1);
  assert.equal(e.effectiveCard(placed,s).cost,face===1?3:5);
 }
});

test('An evolution entrant must use a different base and the base choice belongs to its owner',()=>{
 let s=field(),dragon=put(s,0,'battle',LAPUTA),old=put(s,1,'battle',MULTI);
 const base=put(s,1,'battle',FIRE),incoming=put(s,1,'mana',EVO);
 start(s,dragon);exchange(s,old,incoming);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.op,'g34_ManaExchangeBase753');
 s=restore(s);pickUID(s,base);
 const evolved=s.players[1].battle.find(x=>x.uid===incoming.uid);
 assert.equal(evolved?.under[0].uid,base.uid);
 assert.ok(has(s,1,'mana',old));
});
