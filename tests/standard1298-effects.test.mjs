import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const RUSHU='dm26rp3-053',DEINA='dmrp07-012',CEDIAS='promoy16-028';
const LIGHT='dm01-013',ALLY='dm01-108',ATTACKER='dm01-097';
const KILL='dm01-027',METALLICA='dmrp02-060',NO_DISCOUNT='dmrp22-027';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const onBoard=(s,p,x)=>s.players[p].battle.find(y=>y.uid===x.uid);
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(20).fill(ALLY));
 return s;
}
function add(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function cast(s,p,id){
 s.phase='main';
 const x=add(s,p,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}
const pick=(s,uid)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===uid;
});
const choices=s=>s.decision.choices.map(({value})=>value?.uid??value);

test('four official prints preserve three canonical IDs, artwork, complete rules and legal decks',()=>{
 const m=read('tools/support-phase-1298.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[RUSHU,DEINA,CEDIAS]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['dmbd04-002',CEDIAS]]);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,image,source,canonicalId=id}=row,c=e.card(canonicalId),front=row.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  const rules=text=>text.replace(/[。）]+$/,'');
  assert.equal(rules(front.abilityText),rules(c.text));
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1298}),row.spec);
  assert.deepEqual(registry.resolveRows([{id,count:1},{id:canonicalId,count:2}]),[{id:canonicalId,count:3}]);
  assert.equal(data.cards.filter(x=>nameKey(x.name)===nameKey(name)).length,1);
  assert.deepEqual(refs.find(x=>x.id===id),{id,canonicalId,name,image,source});
  if(id===canonicalId)assert.equal(CARD_IMAGES[id],image);
  const deck=structuredClone(PRESETS[0]);
  deck.cards[0].count--;
  deck.cards.push({id,count:1});
  assert.deepEqual(e.validateDeck({...deck,cards:registry.resolveRows(deck.cards)}),[]);
 }
});

for(const [id,n] of [[RUSHU,3],[DEINA,2],[CEDIAS,2]]){
 test(id+' breaks the printed number of shields',()=>{
  const s=field(),attacker=add(s,0,'battle',id);
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'breakShields',a=>a.shields.length===n);
  drain(s);
  assert.equal(s.players[1].shields.length,5-n);
 });
 test(id+' may untap to redirect to itself or a tapped ally',()=>{
  for(const toSelf of [false,true]){
   const s=field(),attacker=add(s,0,'battle',ATTACKER);
   const source=add(s,1,'battle',id,{tapped:true}),ally=add(s,1,'battle',LIGHT,{tapped:true});
   add(s,1,'battle',ALLY);
   attack(s,attacker.uid);
   act(s,'untapRedirect1295',a=>a.uid===source.uid);
   assert.deepEqual(choices(s),[source.uid,ally.uid]);
   pick(s,toSelf?source.uid:ally.uid);
   assert.equal(source.tapped,false);
   assert.ok(onBoard(s,1,source)&&onBoard(s,1,ally));
   assert.ok(s.players[0].grave.some(x=>x.uid===attacker.uid));
   assert.equal(s.players[1].shields.length,5);
   assert.ok(!s.log.some(x=>x.type==='block'));
  }
 });
}

test('Deina may pay five and enter tapped, pay six and enter untapped, or cancel before paying',()=>{
 for(const amount of [1,0,false]){
  let s=field();
  const x=cast(s,0,DEINA);
  assert.equal(s.decision.task.op,'g34_PayCount499');
  assert.deepEqual(choices(s),[1,0,false]);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,0);
  s=JSON.parse(JSON.stringify(s));
  pick(s,amount);
  assert.equal(onBoard(s,0,x)?.tapped,amount===false?undefined:amount===1);
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,amount===false?0:6-amount);
  assert.equal(s.players[0].hand.some(y=>y.uid===x.uid),amount===false);
 }
});

test('Deina offers the affordable reduced payment, while a reduction prohibition or deployment keeps it untapped',()=>{
 for(const mode of ['reduced','forbidden','deploy']){
  const s=field();
  give(s,0,'mana',Array(mode==='reduced'?5:6).fill(LIGHT));
  if(mode==='forbidden')add(s,1,'battle',NO_DISCOUNT);
  if(mode==='deploy'){
   const x=add(s,0,'hand',DEINA);
   s.extTasks=[{op:'g34_Sequence',p:0,source:LIGHT,defs:[
    {op:'Select',origin:'hand',n:1,deploy:true,filter:{creature:true}}
   ]}];
   act(s,'toAttack');
   pick(s,x.uid);
   assert.equal(onBoard(s,0,x).tapped,false);
   assert.ok(s.players[0].mana.every(x=>!x.tapped));
  }else{
   const x=cast(s,0,DEINA);
   if(mode==='reduced'){
    assert.deepEqual(choices(s),[1,false]);
    pick(s,1);
   }else assert.ok(!s.decision);
   assert.equal(onBoard(s,0,x).tapped,mode==='reduced');
   assert.ok(s.players[0].mana.every(x=>x.tapped));
  }
 }
});

test('Cedias protects other Metallica from opponent choices only while its controller leads in shield groups',()=>{
 for(const mode of ['equal','leading','ignored','own-choice']){
  const ownChoice=mode==='own-choice';
  const s=field(),cedias=add(s,1,'battle',CEDIAS);
  const ally=add(s,1,'battle',METALLICA),other=add(s,1,'battle',ALLY);
  if(mode!=='equal')s.players[0].shields.pop();
  s.players[0].shields[0].shieldStack=[inst(ALLY)];
  if(mode==='ignored')cedias.g35Ignored=s.turn;
  if(ownChoice){
   s.active=1;
   cast(s,1,'dm01-086');
   assert.ok(e.getLegalActions(s).some(a=>a.targets?.some(t=>t.uid===ally.uid)));
  }else{
   cast(s,0,KILL);
   const available=e.getLegalActions(s).flatMap(a=>a.targets?.map(t=>t.uid)??[]);
   assert.deepEqual(available,mode==='leading'?[cedias.uid,other.uid]:[cedias.uid,ally.uid,other.uid]);
  }
 }
});

test('Cedias does not stop attacks, blocks or mass effects affecting protected Metallica',()=>{
 const tests=['attack','block','sweep'];
 for(const mode of tests){
  const s=field(),cedias=add(s,1,'battle',CEDIAS),ally=add(s,1,'battle',METALLICA,{tapped:mode==='attack'});
  s.players[0].shields.pop();
  if(mode==='attack'){
   const attacker=add(s,0,'battle',ATTACKER);
   attack(s,attacker.uid,ally.uid);
   act(s,'noBlock');
   assert.ok(s.players[1].grave.some(x=>x.uid===ally.uid));
  }else if(mode==='block'){
   add(s,1,'battle','dmrp17-s01',{tapped:true,under:[inst(LIGHT)]});
   const attacker=add(s,0,'battle',ATTACKER);
   attack(s,attacker.uid);
   act(s,'block',a=>a.uid===ally.uid);
   drain(s);
   assert.ok(s.log.some(x=>x.type==='block'&&x.cardId===METALLICA));
  }else{
   cast(s,0,'dm01-015');
   drain(s);
   assert.equal(cedias.tapped,true);
   assert.equal(ally.tapped,true);
  }
 }
});

test('Cedias excludes another Metallica from an opponent element choice',()=>{
 const s=field(),cedias=add(s,1,'battle',CEDIAS),ally=add(s,1,'battle',METALLICA);
 const fieldCard=add(s,1,'battle','dmrp08-005');
 s.players[0].shields.pop();
 cast(s,0,'dm24ex1-028');
 assert.equal(s.decision.task.op,'elementBounce');
 assert.deepEqual(choices(s),[cedias.uid,fieldCard.uid]);
 pick(s,fieldCard.uid);
 assert.ok(s.players[1].grave.some(x=>x.uid===fieldCard.uid));
 assert.ok(onBoard(s,1,ally));
});

test('Cedias allows an opponent to choose a physical card below a protected Metallica',()=>{
 const s=field(),base=inst(LIGHT);
 const cedias=add(s,1,'battle',CEDIAS);
 const ally=add(s,1,'battle',METALLICA,{under:[base]});
 s.players[0].shields.pop();
 cast(s,0,'dmr15-041');
 assert.deepEqual(choices(s),[cedias.uid,base.uid]);
 pick(s,base.uid);
 assert.ok(s.players[1].hand.some(x=>x.uid===base.uid));
 assert.ok(onBoard(s,1,ally));
});
