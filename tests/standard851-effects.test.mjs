import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {CARD_IMAGES} from '../dist/card-images.js';

const SIDE='dmr19-045',RIDERS='dm15-050',PRINT='dmex08-094',VEGAS='dmr17-018';
const WATER='dm01-083',LAND='dm01-108',FIRE='dm01-097',BLOCK='dm01-076',FIVE='dm12-021';
const ADAM='dmr19-s03',CMD='dmbd10-010',BIG='dmrp20-s10',QX='dm25ex1-049';
const CELL='dmrp20-km5',INFINITY='dmrp15-km1';
const pick=(s,v)=>act(s,'extended',a=>{
 const value=s.decision.choices[a.choice].value;
 return (value?.uid??value)===v;
});
function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1])give(s,p,'deck',Array(12).fill(LAND));
 return s;
}
function put(s,p,zone,id,props={}){
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
}
function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid&&!a.alternative);
 return x;
}
function evolve(s,base){
 const x=play(s,ADAM);
 act(s,'evolve',a=>a.baseUid===base.uid);
 return x;
}
const registry=createCatalogue(snapshot,data.cards,details);

test('Phase 851 verifies all printings and merges the Riders reprint into its original ID',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-851.json',import.meta.url)));
 assert.deepEqual(m.cards.map(x=>x.id),[SIDE,RIDERS,VEGAS]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[[PRINT,RIDERS]]);
 assert.deepEqual(registry.resolveRows([{id:PRINT,count:1},{id:RIDERS,count:3}]),[{id:RIDERS,count:4}]);
 assert.deepEqual(standardCardSpec({...m.printAliases[0],status:'complete'},{phase:851}),m.cards[1].spec);
 assert.equal(m.regulationVerification.limits[PRINT],4);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),[f]=row.faces;
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(standardCardSpec(d,{phase:851}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:850}));
  const unknown=structuredClone(d);
  unknown.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:851}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.name,c.type,c.cost,c.power,c.race,c.civilizations,c.limit],
   [f.name,'creature',f.cost,Number(f.powerText),f.race,f.civilizations,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[row.id]);
 }
});

test('Side targets only a legal opposing creature with Blocker when an ally evolves',()=>{
 const s=field(),base=put(s,0,'battle',WATER);
 put(s,0,'battle',SIDE);
 put(s,0,'battle',BLOCK);
 put(s,1,'battle',LAND);
 put(s,1,'battle',BLOCK,{justDiverActive:true});
 const granted=put(s,1,'battle',FIRE,{g34Grants:[{turn:s.turn,blocker:true}]});
 evolve(s,base);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid),[granted.uid]);
 pick(s,granted.uid);
 assert.ok(s.players[1].grave.includes(granted));
 assert.equal(s.decision,null);
});

test('Side targets a blocker on battlefield invasion and applies its EX Life replacement',()=>{
 const s=field(),attacker=put(s,0,'battle',CMD);
 const old=inst(WATER),evolution=put(s,0,'battle',ADAM,{under:[old]});
 put(s,0,'battle',SIDE);
 const [payment]=s.players[1].shields;
 const blocker=put(s,1,'battle',BIG,{exLifeShieldUid:payment.uid});
 attack(s,attacker.uid);
 pick(s,true);
 pick(s,true);
 assert.equal(s.attack.attacker,evolution.uid);
 pick(s,blocker.uid);
 assert.ok(s.players[1].grave.includes(payment));
 assert.ok(s.players[1].battle.includes(blocker));
 assert.equal(s.decision.type,'block');
});

for(const [owner,count] of [[0,0],[0,1],[0,2],[1,1]])test('Riders checks its own grave and moves at most one mana card '+owner+'/'+count,()=>{
 const s=field(),n=s.players[1].mana.length;
 const [{id}]=registry.resolveRows([{id:PRINT,count:1}]);
 give(s,owner,'grave',Array(count).fill(id));
 const target=s.players[1].mana[0];
 target.faceDown=true;
 const x=play(s,RIDERS);
 assert.ok(s.players[0].battle.includes(x));
 if(owner===0&&count){
  assert.equal(s.decision.player,0);
  assert.equal(s.decision.choices.length,n);
  assert.ok(s.decision.choices.every(c=>c.value!==null));
  const option=s.decision.choices.find(c=>(c.value?.uid??c.value)===target.uid);
  assert.equal(option.cardId,undefined);
  pick(s,target.uid);
  assert.ok(s.players[1].grave.includes(target));
  assert.equal(s.players[1].mana.length,n-1);
 }else assert.equal(s.players[1].mana.length,n);
 assert.equal(s.decision,null);
});

for(const [id,draw] of [[LAND,false],[FIVE,true],[CELL,false],[INFINITY,true]])test('Vegas rotates a publicly revealed top card and checks cost '+id,()=>{
 const s=field(1),p=1,enemy=0;
 give(s,enemy,'deck',[id,FIRE,LAND]);
 const [first,second,third]=s.players[enemy].deck;
 const top=s.players[p].deck.slice(0,3);
 const rng=s.rng;
 play(s,VEGAS);
 assert.deepEqual(s.players[enemy].deck,[second,third,first]);
 assert.deepEqual(s.players[p].hand,draw?top:[]);
 assert.ok(s.log.some(x=>x.type==='reveal'&&x.player===enemy&&x.text.includes(e.card(id).name)));
 assert.equal(s.rng,rng);
 assert.equal(s.decision,null);
});

for(const n of [4,7])test('Vegas lets the controller choose the revealed twinpact cost after rotating it '+n,()=>{
 let s=field();
 give(s,1,'deck',[QX,LAND]);
 const [rotated]=s.players[1].deck,[first,second,third]=s.players[0].deck;
 play(s,VEGAS);
 assert.equal(s.players[1].deck.at(-1),rotated);
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(c=>c.value),[4,7]);
 s=structuredClone(s);
 pick(s,n);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),n===7?[first.uid,second.uid,third.uid]:[]);
 assert.equal(s.players[1].deck.at(-1).uid,rotated.uid);
 assert.equal(s.decision,null);
});

for(const owner of [0,1])test('Vegas uses the restriction on the seat instructed to reveal '+owner,()=>{
 const s=field();
 put(s,owner,'battle',QX);
 give(s,1,'deck',[FIVE,FIRE,LAND]);
 const original=[...s.players[1].deck];
 play(s,VEGAS);
 assert.deepEqual(s.players[1].deck,owner===0?original:[original[1],original[2],original[0]]);
 assert.equal(s.players[0].hand.length,owner===0?0:3);
 assert.equal(s.log.some(x=>x.type==='reveal'),owner===1);
});

test('Vegas handles single-card and protected empty opposing libraries',()=>{
 for(const hasTop of [true,false]){
  const s=field();
  if(!hasTop)put(s,1,'battle',BIG);
  give(s,1,'deck',hasTop?[FIVE]:[]);
  const original=[...s.players[1].deck];
  play(s,VEGAS);
  assert.deepEqual(s.players[1].deck,original);
  assert.equal(s.players[0].hand.length,hasTop?3:0);
  assert.equal(s.winner,null);
 }
});
