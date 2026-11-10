import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,PRESETS,setup,give,inst,act,attack} from './target-fixture.mjs';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {canonicalCardName} from '../dist/card-name-aliases.js';
import {CARD_IMAGES} from '../dist/card-images.js';

const {cards,printAliases,regulationVerification}=JSON.parse(readFileSync(new URL('../tools/support-phase-777.json',import.meta.url)));
const AVATAR='dm24rp3-014',SONG='dm24rp4-035',GIANT='dm24rp3-072',SKULL='dm24rp3-062';
const BODY='dm01-108',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',SEED='dm25ex1-054',BIG='dm01-007',FOUR='dm24ex2-068',THREE='dm01-106';
function put(s,p,zone,id){
 const x=inst(id);
 s.players[p][zone].push(x);
 return x;
}
const restore=s=>JSON.parse(JSON.stringify(s));
const pick=(s,value)=>act(s,'extended',a=>{const v=s.decision.choices[a.choice].value;return (v?.uid??v)===value;});
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
function play(s,id){
 s.phase='main';
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
test('Phase 777 definitions and alternate prints preserve the canonical saved deck IDs',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 for(const row of cards){
  const detail=details.cards.find(c=>c.id===row.id);
  assert.deepEqual(row.faces,detail.faces);
  assert.deepEqual(row.spec,standardCardSpec(detail,{phase:777}));
  const partial=structuredClone(detail);
  partial.faces[0].abilityText+='\n未知の能力';
  assert.throws(()=>standardCardSpec(partial,{phase:777}));
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
   assert.deepEqual(standardCardSpec({...print,status:'complete'},{phase:777}),row.spec);
   assert.equal(registry.get(print.id).id,row.id);
   assert.equal(registry.get(print.id.toLowerCase()).id,row.id);
   assert.equal(refs.find(x=>x.id===print.id.toLowerCase()).image,print.image);
  }
 }
});

const ids=(s,p,zone)=>s.players[p][zone].map(x=>x.uid);
const values=s=>s.decision.choices.map(x=>x.value?.uid??x.value);
function task(s,op,p,options){
 s.phase='main';
 s.extTasks=[{op,p,source:BODY,...options}];
 act(s,'toAttack');
}
function seal(s,p,x){
 x.sealed=true;
 (s.players[p].seals??=[]).push({...inst(BODY),faceDown:true,sealOf:x.uid});
}
test('Avatar needs three distinct visible element costs, including noncreatures and same-cost duplicates',()=>{
 const s=setup(),x=put(s,0,'hand',AVATAR);
 const quote=()=>e.getLegalActions(s).find(a=>a.kind==='play'&&a.uid===x.uid).cost;
 put(s,0,'battle',BODY);
 put(s,0,'battle',WATER);
 put(s,0,'battle',SEED);
 const third=put(s,0,'battle',FOUR);
 third.sealed=true;
 put(s,1,'battle',BIG);
 assert.equal(quote(),6);
 third.sealed=false;
 assert.equal(quote(),1);
 put(s,1,'battle','dmrp22-027');
 assert.equal(quote(),6);
});
test('Avatar can shield on entry, on a real tap, and again after untapping',()=>{
 let s=setup();
 give(s,0,'deck',Array(7).fill(BODY));
 const [first,second]=ids(s,0,'deck'),before=ids(s,0,'shields');
 const x=play(s,AVATAR);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,true);
 assert.deepEqual(ids(s,0,'shields'),[...before,first]);
 task(s,'g34_Target',0,{owner:'self',tap:true});
 pick(s,x.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 s=restore(s);
 pick(s,null);
 assert.equal(ids(s,0,'deck')[0],second);
 task(s,'g34_Target',0,{owner:'self',tap:true});
 pick(s,x.uid);
 assert.equal(s.decision,null);
 task(s,'g34_Target',0,{owner:'self',untap:true});
 pick(s,x.uid);
 task(s,'g34_Target',0,{owner:'self',tap:true});
 pick(s,x.uid);
 pick(s,true);
 assert.deepEqual(ids(s,0,'shields'),[...before,first,second]);
});
test('Avatar triggers from the tap used to declare an attack',()=>{
 const s=setup(),x=put(s,0,'battle',AVATAR),top=s.players[0].deck[0];
 attack(s,x.uid);
 assert.equal(s.decision.task.op,'g34_Offer');
 pick(s,true);
 assert.ok(has(s,0,'shields',top));
});
test('Operation normally costs seven and draws once per own visible creature cost',()=>{
 const s=setup();
 give(s,0,'deck',Array(9).fill(BODY));
 give(s,0,'battle',[BODY,WATER,THREE,FOUR,BIG,SEED]);
 seal(s,0,s.players[0].battle[4]);
 put(s,1,'battle',BIG);
 const top=ids(s,0,'deck').slice(0,3),spell=put(s,0,'hand',SONG);
 act(s,'play',a=>a.uid===spell.uid&&!a.alternative&&a.cost===7);
 assert.deepEqual(ids(s,0,'hand'),top);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,7);
 assert.ok(s.players[0].battle.every(x=>!x.tapped));
});
test('Operation can pay with distinct tapped creatures and rejects sealed, tapped and duplicate costs',()=>{
 let s=setup();
 give(s,0,'deck',Array(10).fill(BODY));
 give(s,0,'mana',[WATER]);
 const spell=put(s,0,'hand',SONG);
 const [one,two,three,four,sealed,tapped]=[BODY,WATER,THREE,FOUR,BIG,'dmr19-001'].map(id=>put(s,0,'battle',id));
 seal(s,0,sealed);
 tapped.tapped=true;
 act(s,'play',a=>a.uid===spell.uid&&a.alternative==='hyperEnergy'&&a.label.includes('唱える'));
 assert.ok(!values(s).includes(sealed.uid)&&!values(s).includes(tapped.uid));
 pick(s,one.uid);
 assert.ok(!values(s).includes(two.uid));
 s=restore(s);
 pick(s,three.uid);
 pick(s,four.uid);
 assert.ok(s.decision.choices.some(x=>x.value===false&&x.label.includes('唱える')));
 pick(s,false);
 assert.deepEqual(s.players[0].battle.filter(x=>x.tapped).map(x=>x.uid),[one.uid,three.uid,four.uid,tapped.uid]);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,1);
 assert.equal(s.players[0].hand.length,4);
 assert.ok(has(s,0,'grave',spell));
});
test('Operation draws zero with no own creatures and can cancel payment without tapping',()=>{
 const s=setup(),top=ids(s,0,'deck');
 put(s,1,'battle',BIG);
 const x=put(s,0,'battle',THREE),spell=put(s,0,'hand',SONG);
 act(s,'play',a=>a.uid===spell.uid&&a.alternative==='hyperEnergy');
 pick(s,x.uid);
 pick(s,null);
 assert.ok(!x.tapped&&has(s,0,'hand',spell));
 give(s,0,'battle',[]);
 act(s,'play',a=>a.uid===spell.uid&&!a.alternative);
 assert.deepEqual(ids(s,0,'deck'),top);
 assert.deepEqual(ids(s,0,'hand'),[]);
});
for(const [id,mana,destination,n] of [[GIANT,BODY,'mana',1],[SKULL,DARK,'hand',2]]){
 test(id+' only gives the opponent a choice after the alternative summon',()=>{
  for(const accept of [true,false]){
   let s=setup();
   give(s,0,'mana',[FIRE,mana]);
   give(s,1,'deck',[AVATAR,BODY,THREE,FOUR]);
   const top=ids(s,1,'deck').slice(0,n),x=put(s,0,'hand',id),before=ids(s,1,destination);
   const legal=e.getLegalActions(s).filter(a=>a.kind==='play'&&a.uid===x.uid);
   assert.deepEqual(legal.map(a=>a.cost),[2]);
   act(s,'play',a=>a.uid===x.uid&&a.role==='paidAlt568');
   assert.equal(s.decision.player,1);
   assert.equal(s.decision.task.op,'g34_Offer');
   s=restore(s);
   pick(s,accept?true:null);
   assert.deepEqual(ids(s,1,destination),accept?[...before,...top]:before);
   assert.ok(has(s,0,'battle',x));
   assert.equal(e.effectiveCard(s.players[0].battle[0],s).cost,5);
   assert.equal(e.effectiveCard(s.players[0].battle[0],s).breaker,2);
   assert.equal(s.players[0].mana.filter(y=>y.tapped).length,2);
  }
 });
 test(id+' has no offer after ordinary summoning or after entry is replaced',()=>{
  for(const replaced of [false,true]){
   const s=setup(),x=put(s,0,'hand',id),before=ids(s,1,'deck');
   if(replaced){
    give(s,0,'mana',[FIRE,mana]);
    put(s,1,'battle','dm22rp1-049');
   }
   act(s,'play',a=>a.uid===x.uid&&(replaced?a.role==='paidAlt568':!a.alternative&&a.cost===5));
   assert.equal(s.decision,null);
   assert.deepEqual(ids(s,1,'deck'),before);
   assert.ok(has(s,0,replaced?'mana':'battle',x));
  }
 });
 test(id+' requires its own civilization for the alternative payment',()=>{
  const s=setup(),x=put(s,0,'hand',id);
  give(s,0,'mana',[FIRE,FIRE]);
  assert.ok(!e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid));
 });
}
