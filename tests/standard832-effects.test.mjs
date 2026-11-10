import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain} from './target-fixture.mjs';
import {createCatalogue} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const MACH='dm34-049',PSY='dm33-011',SOUL='dm35-015',SUN='dmc62-002';
const DRAGON='dm06-s08',NEX='dm32-s08',BIRD='dm06-062',DUAL='dmr20-061',LAND='dm01-108';
const KILL='dm01-027',BOUNCE='dm01-086',STRONG='dm01-s08';
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function put(s,p,z,id){const x=inst(id);s.players[p][z].push(x);return x;}
function pick(s,value){act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);}
function values(s){return s.decision.choices.map(o=>o.value?.uid??o.value);}
function end(s){s.phase='attack';act(s,'endTurn');drain(s);}
function deck(s,id){give(s,0,'deck',[id,LAND,LAND,LAND]);return s.players[0].deck[0];}
const resume=s=>JSON.parse(JSON.stringify(s));
const uids=s=>e.physicalCards(s).map(x=>x.uid).sort();

test('Phase 832 implements each official card and aliases all three reprints',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-832.json',import.meta.url)));
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[MACH,PSY,SOUL]);
 for(const row of m.cards){
  const d=details.cards.find(x=>x.id===row.id),c=e.card(row.id),f=d.faces[0];
  assert.deepEqual(row.faces,d.faces);
  assert.deepEqual(row.spec,standardCardSpec(d,{phase:832}));
  const unknown=structuredClone(d);unknown.faces[0].abilityText+='未知の能力。';
  assert.throws(()=>standardCardSpec(unknown,{phase:832}));
  assert.deepEqual([c.name,c.cost,c.race||'',c.manaValue,c.limit],[f.name,f.cost,f.race,1,4]);
  assert.equal(CARD_IMAGES[row.id],row.image);
 }
 assert.deepEqual(m.printAliases.map(x=>x.id),['dmc62-018','dmx21-007','dmc67-006']);
 for(const row of m.printAliases){
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:832}),m.cards.find(x=>x.id===row.canonicalId).spec);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1},{id:row.canonicalId,count:3}]),[{id:row.canonicalId,count:4}]);
  assert.equal(m.regulationVerification.limits[row.id],4);
 }
});

for(const reduce of [0,1])test('Mach Rupia offers optional NEX summon reduction '+reduce,()=>{
 const s=setup();put(s,0,'battle',MACH);
 const plain=put(s,0,'hand',DRAGON),nex=put(s,0,'hand',NEX);
 assert.equal(e.getLegalActions(s).find(a=>a.uid===plain.uid).cost,7);
 act(s,'play',a=>a.uid===nex.uid);
 pick(s,reduce);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6-reduce);
 drain(s);
});

test('Mach Rupia gives speed to allied Armored Dragons only and returns every recent non-evolution',()=>{
 const s=setup(),p=s.players[0];
 const old=put(s,0,'battle',DRAGON),recent=put(s,0,'battle',DRAGON),other=put(s,0,'battle',BIRD);
 const before=put(s,0,'battle',NEX),foe=put(s,1,'battle',DRAGON);
 recent.entered=other.entered=before.entered=foe.entered=s.turn;
 cast(s,MACH);
 const newest=put(s,0,'battle',DRAGON);newest.entered=s.turn;
 const evo=put(s,0,'battle',SUN);evo.entered=s.turn;evo.under=[inst(DRAGON)];
 assert.equal(e.effectiveCard(recent,s).speedAttacker,true);
 assert.ok(!e.effectiveCard(other,s).speedAttacker);
 assert.ok(!e.effectiveCard(foe,s).speedAttacker);
 end(s);
 assert.deepEqual(p.hand.map(x=>x.uid),[recent.uid,before.uid,newest.uid]);
 assert.ok(has(s,0,'battle',old));
 assert.ok(has(s,0,'battle',evo));
 assert.ok(has(s,1,'battle',foe));
});

test('Mach Rupia needs to be present at its own turn end and uses original entry after reconstruction',()=>{
 const s=setup(),old=put(s,0,'battle',DRAGON),recent=put(s,0,'battle',DRAGON),mach=put(s,0,'battle',MACH);
 old.entered=recent.entered=s.turn;old.originalEntryTurn=s.turn-1;
 end(s);
 assert.ok(has(s,0,'battle',old));
 assert.ok(has(s,0,'hand',recent));
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==mach.uid);
 s.active=0;old.originalEntryTurn=s.turn;
 end(s);
 assert.ok(has(s,0,'battle',old));
});

test('Psychic You resolves own then opponent choices and hides the opponent shield identities',()=>{
 const s=setup(),own=put(s,0,'hand',BIRD),opp=put(s,1,'hand',DRAGON);
 give(s,0,'shields',[KILL]);give(s,1,'shields',[KILL,LAND]);
 const [first]=s.players[0].shields,[second]=s.players[1].shields;
 const spell=put(s,0,'hand',PSY),before=uids(s);
 act(s,'play',a=>a.uid===spell.uid);pick(s,own.uid);pick(s,first.uid);
 assert.ok(has(s,0,'hand',first));
 assert.ok(has(s,0,'shields',own));
 assert.deepEqual(values(s),[opp.uid,null]);
 pick(s,opp.uid);
 const saved=resume(s),options=e.getLegalActions(saved);
 assert.ok(options.every(a=>a.player===0&&!a.cardId));
 pick(saved,second.uid);
 assert.deepEqual(uids(saved),before);
 assert.ok(has(saved,1,'hand',second));
 assert.ok(has(saved,1,'shields',opp));
 assert.equal(saved.decision,null);
 assert.ok(!saved.log.some(x=>x.cardId===KILL));
});

test('Psychic You can skip either exchange or return the newly added shield with zero prior shields',()=>{
 for(const ownAccept of [false,true]){
  const s=setup(),own=put(s,0,'hand',KILL),enemy=put(s,1,'hand',KILL);
  give(s,0,'shields',[]);give(s,1,'shields',[]);
  cast(s,PSY);
  pick(s,ownAccept?own.uid:null);
  if(ownAccept){assert.deepEqual(values(s),[own.uid]);pick(s,own.uid);}
  pick(s,ownAccept?null:enemy.uid);
  if(!ownAccept){assert.deepEqual(values(s),[enemy.uid]);pick(s,enemy.uid);}
  assert.ok(has(s,0,'hand',own));
  assert.ok(has(s,1,'hand',enemy));
  assert.equal(s.decision,null);
 }
});

test('Psychic You can be used from a broken shield',()=>{
 const s=setup(),attacker=put(s,0,'battle',LAND);
 give(s,1,'shields',[PSY]);put(s,1,'hand',BIRD);
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
 act(s,'useTrigger',a=>a.cardId===PSY);
 assert.equal(s.decision.player,1);
 pick(s,null);drain(s);
 assert.ok(s.players[1].grave.some(x=>x.cardId===PSY));
});

for(const take of [false,true])test('Soulburn optionally deploys a Fire Bird and still destroys for a dual race '+take,()=>{
 const s=setup(),source=put(s,0,'battle',SOUL),card=deck(s,DUAL),victim=put(s,1,'battle',DUAL),big=put(s,1,'battle',STRONG);
 attack(s,source.uid);
 assert.deepEqual(values(s),[card.uid,null]);
 pick(s,take?card.uid:null);
 assert.deepEqual(values(s),[victim.uid]);
 pick(s,victim.uid);drain(s);
 assert.ok(has(s,1,'grave',victim));
 assert.ok(has(s,1,'battle',big));
 assert.equal(has(s,0,'battle',card),take);
 assert.equal(has(s,0,'deck',card),!take);
 assert.deepEqual(s.players[0].g34Protected,[]);
});

test('Soulburn leaves unrelated cards and undeployed Dragons on top of the library',()=>{
 for(const id of [BOUNCE,DRAGON]){
  const s=setup(),source=put(s,0,'battle',SOUL),top=deck(s,id),victim=put(s,1,'battle',BIRD);
  attack(s,source.uid);
  if(id===DRAGON)pick(s,victim.uid);
  drain(s);
  assert.equal(s.players[0].deck[0].uid,top.uid);
  assert.equal(has(s,1,'grave',victim),id===DRAGON);
  assert.equal(s.players[1].shields.length,3);
 }
});

for(const evolve of [true,false])test('Soulburn destroys first, then optionally evolves only itself and keeps attacking '+evolve,()=>{
 const s=setup(),source=put(s,0,'battle',SOUL),top=deck(s,SUN),victim=put(s,1,'battle',BIRD),other=put(s,0,'battle',DRAGON),before=uids(s);
 attack(s,source.uid);pick(s,victim.uid);
 assert.deepEqual(values(s),[source.uid,null]);
 const saved=resume(s);
 pick(saved,evolve?source.uid:null);
 if(evolve){
  const attacker=saved.players[0].battle.find(x=>x.uid===top.uid);
  assert.deepEqual(attacker.under.map(x=>x.uid),[source.uid]);
  assert.ok(has(saved,0,'battle',other));
 }
 drain(saved);
 assert.equal(saved.players[1].shields.length,3);
 assert.deepEqual(uids(saved),before);
 assert.equal(has(saved,0,'deck',top),!evolve);
 assert.deepEqual(saved.players[0].g34Protected,[]);
});

test('Psychic You keeps the opponent exchange available when its own shield addition is prohibited',()=>{
 const s=setup(),own=put(s,0,'hand',BIRD),opp=put(s,1,'hand',DRAGON);
 put(s,1,'battle','dmrp22-037');
 cast(s,PSY);
 assert.deepEqual(values(s),[opp.uid,null]);
 pick(s,opp.uid);pick(s,opp.uid);
 assert.ok(has(s,0,'hand',own));
 assert.ok(has(s,1,'hand',opp));
 assert.equal(s.decision,null);
});

test('Soulburn cannot reveal or move the top card through a library look lock',()=>{
 const s=setup(),source=put(s,0,'battle',SOUL),top=deck(s,DUAL);
 put(s,1,'battle','dmrp07-m01');
 attack(s,source.uid);drain(s);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.ok(!s.log.some(x=>x.kind==='reveal'&&x.cardId===SOUL));
 assert.ok(!s.players[0].g34Protected?.length);
});
