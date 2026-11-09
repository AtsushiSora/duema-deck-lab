import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-719.json',import.meta.url)));

test('Phase 719 validates four complete printed cards and keeps the catalogue IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 const key=name=>canonicalCardName(name).normalize('NFKC').replace(/\s/g,'');
 for(const row of cards){
  const detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:719}));
  assert.throws(()=>standardCardSpec(detail,{phase:718}));
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
  assert.throws(()=>standardCardSpec(incomplete,{phase:719}));
 }
});

const ZEM='dm16-036',ROMU='dm19-013',ZERES='dm19-080',MAGUS='dm17-012';
const GEAR='dm14-110',SUIT='dm14-086',FIRE='dm01-097',NATURE='dm01-108',DARK='dm01-090';
const ARC='dm19-109',ARC_EVO='dmrp19-020',MARINE='dm21-043',GIANT='dm09-s05';
const HAND='dm01-027',CRUISER='dm05-s03';
const GEAR_SAVER='dm15-021';
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p].battle.push(x);
 return x;
}
function play(s,id){
 s.phase='main';
 const x=inst(id);
 s.players[s.active].hand.push(x);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
const pick=(s,x)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===(x?.uid??x);
});
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const equip=(gear,host)=>gear.crossedTo={uid:host.uid,incarnation:host.incarnation||0};

test('Zemekis and Romu official reprints resolve to their original battle IDs',()=>{
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(printAliases.map(x=>x.canonicalId),[ZEM,ROMU]);
 for(const print of printAliases){
  const original=cards.find(x=>x.id===print.canonicalId);
  assert.deepEqual(print.faces,original.faces);
  assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:719}),original.spec);
  assert.ok(print.verification.facesMatched);
  assert.match(print.image,/^https:\/\/dm\.takaratomy\.co\.jp\/.*\.jpg$/);
  assert.equal(regulationVerification.limits[print.id],regulationVerification.limits[original.id]);
  assert.equal(catalogue.get(print.id).id,original.id);
  assert.deepEqual(catalogue.resolveRows([{id:print.id,count:2},{id:original.id,count:2}]),[{id:original.id,count:4}]);
  assert.ok(!data.cards.some(c=>c.id===print.id));
 }
});

test('Zemekis chooses only opposing gear and the crossed host remains after removing the chosen gear',()=>{
 let s=field();
 const own=put(s,0,GEAR),host=put(s,1,FIRE),crossed=put(s,1,GEAR),uncrossed=put(s,1,SUIT);
 equip(crossed,host);
 assert.equal(e.power(host,false,s),e.card(FIRE).power+2000);
 play(s,ZEM);
 assert.deepEqual(choices(s),[crossed.uid,uncrossed.uid,null]);
 s=restore(s);
 pick(s,crossed);
 drain(s);
 assert.deepEqual(s.players[1].battle.map(x=>x.uid),[host.uid,uncrossed.uid]);
 assert.deepEqual(s.players[1].grave.map(x=>x.uid),[crossed.uid]);
 assert.equal(e.power(s.players[1].battle[0],false,s),e.card(FIRE).power);
 assert.ok(s.players[0].battle.some(x=>x.uid===own.uid));
});

test('Zemekis can decline and respects Cross Gear Saver',()=>{
 for(const use of [false,true]){
  const s=field(),gear=put(s,1,GEAR);
  const saver=put(s,1,GEAR_SAVER);
  play(s,ZEM);
  pick(s,use?gear:null);
  if(use){
   assert.equal(s.decision.type,'leaveReplace');
   act(s,'replaceUltra',a=>a.uid===saver.uid);
   drain(s);
   assert.ok(s.players[1].grave.some(x=>x.uid===saver.uid));
  }
  assert.ok(s.players[1].battle.some(x=>x.uid===gear.uid));
 }
});

test('Magus uncrosses both sides and preserves the gear, hosts and unrelated states (QA 35385)',()=>{
 const s=field(),own=put(s,0,FIRE),enemy=put(s,1,FIRE,{tapped:true});
 const first=put(s,0,GEAR),second=put(s,1,SUIT),third=put(s,1,GEAR),loose=put(s,0,SUIT);
 equip(first,own);
 equip(second,enemy);
 equip(third,enemy);
 assert.equal(e.power(enemy,false,s),e.card(FIRE).power+3000);
 const before=e.physicalCards(s).map(x=>x.uid).sort();
 const magus=play(s,MAGUS);
 drain(s);
 assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),[...before,magus.uid].sort());
 assert.ok([first,second,third,loose].every(x=>!x.crossedTo));
 assert.ok(s.players[0].battle.includes(own));
 assert.ok(s.players[1].battle.includes(enemy));
 assert.equal(enemy.tapped,true);
 assert.equal(e.power(enemy,false,s),e.card(FIRE).power);
 act(s,'crossGear',a=>a.uid===first.uid&&a.target===own.uid);
 assert.equal(first.crossedTo.uid,own.uid);
});

test('Romu ignores its own, enemy and unrelated entries, then can decline an ally trigger',()=>{
 const s=field(),enemy=put(s,1,FIRE);
 play(s,ROMU);
 assert.equal(s.decision,null);
 play(s,FIRE);
 assert.equal(s.decision,null);
 s.active=1;
 play(s,ARC);
 drain(s);
 assert.equal(s.decision,null);
 s.active=0;
 play(s,ARC);
 assert.ok(choices(s).includes(enemy.uid));
 pick(s,null);
 assert.equal(enemy.tapped,false);
});

test('Romu queues a separate tap for each allied Arc Seraphim entering on the opposing turn',()=>{
 const s=field();
 put(s,0,ROMU);
 s.active=1;
 const first=put(s,1,FIRE),second=put(s,1,DARK);
 give(s,0,'hand',[ARC,ARC]);
 const [a,b]=s.players[0].hand;
 play(s,GIANT);
 pick(s,a);
 pick(s,b);
 while(['effectOrder','entryOrder'].includes(s.decision?.type))act(s,'orderEffect');
 pick(s,first);
 while(['effectOrder','entryOrder'].includes(s.decision?.type))act(s,'orderEffect');
 pick(s,second);
 drain(s);
 assert.ok(first.tapped&&second.tapped);
});

test('Romu sees an allied evolution entering and can tap an enemy',()=>{
 const s=field();
 put(s,0,ROMU);
 const base=put(s,0,NATURE),enemy=put(s,1,FIRE);
 play(s,ARC_EVO);
 act(s,'evolve',a=>a.base===base.uid||a.baseUid===base.uid);
 while(['effectOrder','entryOrder'].includes(s.decision?.type)){
  const preferred=e.getLegalActions(s).find(a=>a.cardId===ROMU);
  if(preferred)e.step(s,preferred);
  else act(s,'orderEffect');
 }
 if(!s.decision?.choices.some(c=>c.value?.uid===enemy.uid))throw Error('Missing target choice');
 pick(s,enemy);
 if(!enemy.tapped&&s.decision)pick(s,enemy);
 assert.equal(enemy.tapped,true);
 drain(s);
});

test('Zeres replaces destruction only with an active allied Deep Marine',()=>{
 for(const mode of ['own','opponent','sealed','ignored']){
  const s=field(),zeres=put(s,1,ZERES);
  const marine=put(s,mode==='opponent'?0:1,MARINE);
  if(mode==='sealed'){
   marine.sealed=1;
   s.players[1].seals.push({...inst(NATURE),faceDown:true,sealOf:marine.uid});
  }
  if(mode==='ignored')zeres.g35Ignored=s.turn;
  play(s,HAND);
  act(s,'effect',a=>a.targets.some(x=>x.uid===zeres.uid));
  drain(s);
  const zone=mode==='own'?'hand':'grave';
  assert.ok(s.players[1][zone].some(x=>x.uid===zeres.uid),mode);
 }
});

test('Zeres checks the Deep Marine before a simultaneous destruction resolves',()=>{
 const s=field(),zeres=put(s,0,ZERES),marine=put(s,0,MARINE);
 play(s,CRUISER);
 drain(s);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[zeres.uid]);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[marine.uid]);
});
