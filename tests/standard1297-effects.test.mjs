import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const FEIWONG='dmsd02-005',GENBLUE='dmrp03-062',TOPAZ='dmrp02-060',FOS='dmrp07-061',OORILIA='dmrp02-004';
const LIGHT='dm01-013',ALLY='dm01-108',ATTACKER='dm01-097';
const KILL='dm01-027',SMALL='dm25-007',LARGE='dm01-015',KIRA='dmrp17-s01';
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
function cast(s,p,id,base=null){
 s.phase='main';
 const x=add(s,p,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 if(s.decision?.type==='evolution')act(s,'evolve',a=>base?a.baseUid===base.uid:!a.baseUid);
 return x;
}
const pick=(s,uid)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===uid;
});
const choices=s=>s.decision.choices.map(({value})=>value?.uid??value);

test('eleven official prints preserve five canonical IDs, artwork, complete rules and legal decks',()=>{
 const m=read('tools/support-phase-1297.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[FEIWONG,GENBLUE,TOPAZ,FOS,OORILIA]);
 assert.equal(m.printAliases.length,6);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,image,source,canonicalId=id}=row,c=e.card(canonicalId),front=row.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.equal(front.abilityText,c.text);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1297}),row.spec);
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

test('Feiwong can tap itself or another untapped ally to draw on entry, or decline',()=>{
 for(const selection of ['self','ally',null]){
  const s=field(),ally=add(s,0,'battle',ALLY);
  add(s,0,'battle',LIGHT,{tapped:true});
  add(s,1,'battle',ALLY);
  const top=s.players[0].deck[0],feiwong=cast(s,0,FEIWONG);
  assert.deepEqual(choices(s),[ally.uid,feiwong.uid,null]);
  pick(s,selection==='self'?feiwong.uid:selection==='ally'?ally.uid:null);
  assert.equal(feiwong.tapped,selection==='self');
  assert.equal(ally.tapped,selection==='ally');
  assert.equal(s.players[0].hand.some(x=>x.uid===top.uid),selection!==null);
 }
});

for(const id of [FEIWONG,GENBLUE,TOPAZ,FOS,OORILIA]){
 test(id+' can redirect a player attack to another tapped ally without blocking',()=>{
  const s=field(),a=add(s,0,'battle',ATTACKER);
  const source=add(s,1,'battle',id,{tapped:true}),target=add(s,1,'battle',LIGHT,{tapped:true});
  add(s,1,'battle',ALLY);
  attack(s,a.uid);
  act(s,'untapRedirect1295',x=>x.uid===source.uid);
  assert.deepEqual(choices(s),[source.uid,target.uid]);
  pick(s,target.uid);
  assert.equal(source.tapped,false);
  assert.ok(s.players[0].grave.some(x=>x.uid===a.uid));
  assert.equal(s.players[1].shields.length,5);
  assert.ok(!s.log.some(x=>x.type==='block'));
 });
}

test('Genblue taps an opposing creature after destruction, with no option to decline',()=>{
 const s=field(),other=add(s,0,'battle',ALLY),alreadyTapped=add(s,0,'battle',LIGHT,{tapped:true});
 const genblue=add(s,1,'battle',GENBLUE);
 add(s,1,'battle',ALLY);
 cast(s,0,KILL);
 act(s,'effect',a=>a.targets.some(t=>t.uid===genblue.uid));
 assert.ok(s.players[1].grave.some(x=>x.uid===genblue.uid));
 assert.equal(s.decision.player,1);
 assert.deepEqual(choices(s),[other.uid,alreadyTapped.uid]);
 pick(s,other.uid);
 assert.equal(other.tapped,true);
});

test('Genblue triggers after losing a redirected battle, while a return to hand does not trigger',()=>{
 const s=field(),a=add(s,0,'battle','dm01-103'),other=add(s,0,'battle',ALLY);
 const genblue=add(s,1,'battle',GENBLUE,{tapped:true});
 attack(s,a.uid);
 act(s,'untapRedirect1295');
 pick(s,genblue.uid);
 assert.equal(s.decision.player,1);
 pick(s,other.uid);
 assert.ok(s.players[1].grave.some(x=>x.uid===genblue.uid));
 assert.ok(other.tapped);
 const next=field(),bounced=add(next,1,'battle',GENBLUE);
 add(next,0,'battle',ALLY);
 cast(next,0,'dm01-086');
 if(next.decision?.type==='effect')act(next,'effect',a=>a.targets.some(t=>t.uid===bounced.uid));
 else pick(next,bounced.uid);
 assert.ok(next.players[1].hand.some(x=>x.uid===bounced.uid));
 assert.ok(!next.decision);
 assert.equal(next.players[0].battle[0].tapped,false);
});

test('Topaz can enter normally or NEO evolve only over an allied Light creature',()=>{
 for(const evolve of [false,true]){
  const s=field(),base=add(s,0,'battle',LIGHT),invalid=add(s,0,'battle',ALLY);
  add(s,1,'battle',LIGHT);
  const topaz=add(s,0,'hand',TOPAZ);
  act(s,'play',a=>a.uid===topaz.uid);
  assert.deepEqual(e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid??null).sort(),
   [base.uid,null].sort());
  act(s,'evolve',a=>evolve?a.baseUid===base.uid:!a.baseUid);
  assert.equal(e.isEvolution(topaz),evolve);
  assert.equal(!!onBoard(s,0,base),!evolve);
  assert.ok(onBoard(s,0,invalid));
  if(evolve)assert.deepEqual(topaz.under.map(x=>x.uid),[base.uid]);
 }
});

test('Fos requires strictly more creatures and excludes a sealed card and a noncreature element',()=>{
 for(const allies of [0,1,2]){
  const s=field(),attacker=add(s,0,'battle',ATTACKER);
  add(s,0,'battle',ALLY);
  const fos=add(s,1,'battle',FOS,{tapped:true}),sealed=add(s,1,'battle',LIGHT);
  add(s,1,'seals',ALLY,{faceDown:true,sealOf:sealed.uid});
  add(s,1,'battle','dm25rp4-013');
  for(let i=0;i<allies;i++)add(s,1,'battle',LIGHT);
  attack(s,attacker.uid);
  const mayRedirect=e.getLegalActions(s).some(x=>x.kind==='untapRedirect1295'&&x.uid===fos.uid);
  assert.equal(mayRedirect,allies===2);
 }
});

test('Oorilia applies the printed cost boundary to its opponent only and recalculates shield counts',()=>{
 const s=field(),oorilia=add(s,1,'battle',OORILIA),small=add(s,0,'hand',SMALL);
 const large=add(s,0,'hand',LARGE),creature=add(s,0,'hand',LIGHT);
 assert.equal(e.card(SMALL).cost,5);
 assert.ok(e.card(LARGE).type==='spell'&&e.card(LARGE).cost>5);
 const legal=x=>e.getLegalActions(s).some(a=>a.kind==='play'&&a.uid===x.uid);
 assert.ok(legal(small));
 s.players[0].shields[0].shieldStack=[inst(ALLY)];
 s.players[0].shields.pop();
 assert.equal(legal(small),false);
 assert.equal(e.canCastSpell(e.observation(s,0),0,e.card(SMALL),'hand'),false);
 assert.ok(legal(large)&&legal(creature));
 assert.ok(e.canCastSpell(s,1,e.card(SMALL)));
 oorilia.g35Ignored=s.turn;
 assert.ok(legal(small));
});

test('Oorilia sees the pending shield count when its opponent declares a spell S・Trigger',()=>{
 for(const [shields,allowed] of [[4,false],[5,false],[6,true]]){
  const s=field(),attacker=add(s,0,'battle',ATTACKER);
  add(s,0,'battle',OORILIA);
  give(s,1,'shields',[SMALL,...Array(shields-1).fill(ALLY)]);
  const shield=s.players[1].shields[0];
  attack(s,attacker.uid);
  act(s,'noBlock');
  if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===shield.uid),allowed);
  if(allowed){act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);}
  assert.equal(s.players[1][allowed?'grave':'hand'].some(x=>x.uid===shield.uid),true);
 }
});

test('Kira grants Oorilia Blocker, and only the ability legal in its current tap state can be declared (QA 40109)',()=>{
 for(const tapped of [false,true]){
  const s=field(),first=add(s,0,'battle',ATTACKER);
  const oorilia=add(s,1,'battle',OORILIA,{tapped});
  add(s,1,'battle',KIRA,{tapped:true,under:[inst(LIGHT)]});
  assert.equal(e.effectiveCard(oorilia,s).blocker,true);
  attack(s,first.uid);
  const options=e.getLegalActions(s).filter(a=>a.uid===oorilia.uid);
  assert.deepEqual(options.map(x=>x.kind),[tapped?'untapRedirect1295':'block']);
  act(s,options[0].kind,a=>a.uid===oorilia.uid);
  if(tapped)pick(s,oorilia.uid);
  assert.equal(oorilia.tapped,!tapped);
  assert.equal(s.log.some(x=>x.type==='block'&&x.cardId===OORILIA),!tapped);
  assert.ok(s.players[0].grave.some(x=>x.uid===first.uid));
 }
});
