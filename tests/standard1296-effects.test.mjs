import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,PRESETS,setup,snapshot} from './target-fixture.mjs';

const MUGEN='dmr23-s01',SHOTEN='dmrp01-002',LEVOIR='dmsd02-003';
const LIGHT='dm01-013',ALLY='dm01-108',ATTACKER='dm01-097';
const COST_EIGHT='dm03-s01',COST_NINE='dmr18-045',EVOLUTION='dm02-s01',SPELL='dm01-027';
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
const end=s=>{s.phase='attack';act(s,'endTurn');};
const redirected=s=>s.log.filter(x=>x.type==='guardman');

test('seven official prints preserve three canonical IDs, artwork, complete rules and legal decks',()=>{
 const m=read('tools/support-phase-1296.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(x=>x.id),[MUGEN,SHOTEN,LEVOIR]);
 assert.equal(m.printAliases.length,4);
 for(const row of [...m.cards,...m.printAliases]){
  const {id,name,image,source,canonicalId=id}=row,c=e.card(canonicalId),front=row.faces[0];
  assert.deepEqual([c.cost,c.power,c.manaValue,c.civilizations,c.race,c.limit],
   [front.cost,Number(front.powerText),1,front.civilizations,front.race,4]);
  assert.equal(front.abilityText,c.text);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1296}),row.spec);
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

test('Mugen untaps and redirects only to another tapped ally (QA 37916)',()=>{
 const s=field(),attacker=add(s,0,'battle',ATTACKER);
 const mugen=add(s,1,'battle',MUGEN,{tapped:true}),target=add(s,1,'battle',ALLY,{tapped:true});
 add(s,1,'battle',LIGHT);
 attack(s,attacker.uid);
 act(s,'untapRedirect1295',a=>a.uid===mugen.uid);
 assert.deepEqual(choices(s),[target.uid]);
 pick(s,target.uid);
 assert.equal(mugen.tapped,false);
 assert.ok(s.players[1].grave.some(x=>x.uid===target.uid));
 assert.equal(s.players[1].shields.length,5);
 assert.equal(redirected(s).length,1);
 assert.ok(!s.log.some(x=>x.type==='block'));
});

test('Mugen can untap with no destination, and cannot pay while untapped (QA 37917 and 37918)',()=>{
 for(const tapped of [false,true]){
  const s=field(),attacker=add(s,0,'battle',ATTACKER),mugen=add(s,1,'battle',MUGEN,{tapped});
  attack(s,attacker.uid);
  assert.equal(e.getLegalActions(s).some(a=>a.kind==='untapRedirect1295'),tapped);
  act(s,tapped?'untapRedirect1295':'noBlock');
  drain(s);
  assert.equal(mugen.tapped,false);
  assert.equal(s.players[1].shields.length,4);
  assert.deepEqual(redirected(s),[]);
 }
});

test('Mugen can end its own turn by tapping itself or an ally to draw, or decline',()=>{
 for(const choice of ['source','ally',null]){
  const s=field(),mugen=add(s,0,'battle',MUGEN),ally=add(s,0,'battle',LIGHT);
  add(s,0,'battle',ALLY,{tapped:true});
  add(s,1,'battle',ALLY);
  const top=s.players[0].deck[0];
  end(s);
  assert.deepEqual(choices(s),[mugen.uid,ally.uid,null]);
  pick(s,choice==='source'?mugen.uid:choice==='ally'?ally.uid:null);
  assert.equal(mugen.tapped,choice==='source');
  assert.equal(ally.tapped,choice==='ally');
  assert.equal(s.players[0].hand.some(x=>x.uid===top.uid),choice!==null);
  assert.equal(s.active,1);
  assert.ok(!s.decision);
 }
});

test('Mugen has W・Breaker and its draw is unavailable at the end of the other turn',()=>{
 const s=field(1),mugen=add(s,0,'battle',MUGEN);
 end(s);
 assert.equal(s.active,0);
 assert.ok(!s.decision);
 attack(s,mugen.uid);
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Shoten can enter normally or NEO evolve only over its own Light creature',()=>{
 for(const evolved of [false,true]){
  const s=field(),light=add(s,0,'battle',LIGHT),other=add(s,0,'battle',ALLY);
  const x=add(s,0,'hand',SHOTEN);
  act(s,'play',a=>a.uid===x.uid);
  const bases=e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid??null);
  assert.ok(bases.includes(light.uid)&&bases.includes(null)&&!bases.includes(other.uid));
  act(s,'evolve',a=>evolved?a.baseUid===light.uid:!a.baseUid);
  const shoten=onBoard(s,0,x);
  assert.equal(e.isEvolution(shoten),evolved);
  assert.equal(onBoard(s,0,light)!==undefined,!evolved);
  if(evolved)assert.deepEqual(shoten.under.map(y=>y.uid),[light.uid]);
 }
});

test('Shoten offers only eligible cards at the start of the opponent’s turn and deploys tapped',()=>{
 for(const choose of [false,true]){
  let s=field();
  const shoten=add(s,0,'battle',SHOTEN,{tapped:true}),light=add(s,0,'hand',COST_EIGHT);
  const neo=add(s,0,'hand',SHOTEN);
  for(const id of [COST_NINE,EVOLUTION,SPELL,ALLY])add(s,0,'hand',id);
  end(s);
  assert.equal(s.active,1);
  assert.equal(s.decision.player,0);
  assert.deepEqual(choices(s),[light.uid,neo.uid,null]);
  s=JSON.parse(JSON.stringify(s));
  pick(s,choose?light.uid:null);
  assert.equal(onBoard(s,0,shoten).tapped,true);
  assert.equal(onBoard(s,0,light)?.tapped,choose?true:undefined);
  assert.equal(s.players[0].hand.some(x=>x.uid===light.uid),!choose);
 }
});

test('Shoten can deploy a NEO card and choose its legal evolution base (QA 31571)',()=>{
 const s=field(),source=add(s,0,'battle',SHOTEN,{tapped:true});
 const copy=add(s,0,'hand',SHOTEN),base=add(s,0,'battle',LIGHT);
 end(s);
 pick(s,copy.uid);
 assert.equal(s.decision.task.op,'g34_Put');
 pick(s,base.uid);
 const result=onBoard(s,0,copy);
 assert.ok(e.isEvolution(result));
 assert.equal(result.tapped,true);
 assert.deepEqual(result.under.map(x=>x.uid),[base.uid]);
 assert.ok(onBoard(s,0,source).tapped);
});

test('Shoten does not trigger while untapped or during its controller’s turn start',()=>{
 for(const active of [0,1]){
  const s=field(active);
  add(s,0,'battle',SHOTEN,{tapped:active===1});
  add(s,0,'hand',COST_EIGHT);
  end(s);
  assert.ok(!s.decision);
  assert.equal(s.active,1-active);
 }
});

test('Shoten can redirect an attack to itself or a tapped ally',()=>{
 const s=field(),attacker=add(s,0,'battle',ATTACKER);
 const shoten=add(s,1,'battle',SHOTEN,{tapped:true}),ally=add(s,1,'battle',LIGHT,{tapped:true});
 attack(s,attacker.uid);
 act(s,'untapRedirect1295');
 assert.deepEqual(choices(s),[shoten.uid,ally.uid]);
 pick(s,shoten.uid);
 assert.equal(shoten.tapped,false);
 assert.ok(s.players[0].grave.some(x=>x.uid===attacker.uid));
});

test('Levoir’s entry can tap itself or an untapped ally before choosing an enemy',()=>{
 for(const selection of ['self','ally',null]){
  const s=field(),ally=add(s,0,'battle',ALLY),enemy=add(s,1,'battle',ALLY);
  add(s,0,'battle',LIGHT,{tapped:true});
  const levoir=cast(s,0,LEVOIR);
  assert.deepEqual(choices(s),[ally.uid,levoir.uid,null]);
  pick(s,selection==='self'?levoir.uid:selection==='ally'?ally.uid:null);
  if(selection){
   assert.deepEqual(choices(s),[enemy.uid]);
   pick(s,enemy.uid);
  }
  assert.equal(levoir.tapped,selection==='self');
  assert.equal(ally.tapped,selection==='ally');
  assert.equal(enemy.tapped,selection!==null);
 }
});

test('Levoir resolves as an S・Trigger, then uses the untap redirect against a later attack',()=>{
 const s=field(),first=add(s,0,'battle',ATTACKER),second=add(s,0,'battle',ATTACKER);
 const target=add(s,1,'battle',LIGHT,{tapped:true});
 give(s,1,'shields',[LEVOIR,ALLY]);
 const [shield]=s.players[1].shields;
 attack(s,first.uid);
 act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.includes(shield.uid));
 act(s,'useTrigger',a=>a.uid===shield.uid);
 pick(s,shield.uid);
 pick(s,first.uid);
 assert.equal(onBoard(s,1,shield).tapped,true);
 attack(s,second.uid);
 act(s,'untapRedirect1295',a=>a.uid===shield.uid);
 assert.deepEqual(choices(s),[target.uid,shield.uid]);
 pick(s,target.uid);
 assert.equal(onBoard(s,1,shield).tapped,false);
 assert.equal(s.players[1].shields.length,1);
 assert.ok(s.players[0].grave.some(x=>x.uid===second.uid));
});
