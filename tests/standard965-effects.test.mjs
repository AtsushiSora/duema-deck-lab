import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,cast,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const VAJ='dmc34-025',SEMINAR='dmrp05-030',CHUCK='dmrp07-067';
const PLAIN='dm01-108',WATER='dm01-083',DRAW='dm06-085',BOUNCE='dm01-086';
const PAX='dmrp14-037',LIGHT='dm01-075',MULTI='dm25rp3-S06',FIELD='dmr21-036';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>(s.decision?.choices??[]).map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();

function field(active=0){
 const s=setup();s.active=active;
 for(const p of [0,1]){give(s,p,'deck',Array(18).fill(PLAIN));give(s,p,'grave',[]);}
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function invoke(s,defs){
 s.phase='main';
 s.extTasks=[{op:'g34_Sequence',p:s.active,source:PAX,defs}];
 act(s,'toAttack');
}

function drawChoices(s,accept){
 let n=0;
 while(s.decision){
  if(s.decision.type==='effectOrder')act(s,'orderEffect');
  else{
   assert.equal(s.decision.task.op,'g34_Draw');
   assert.equal(s.decision.source,SEMINAR);
   pick(s,accept?1:0);
   n++;
   assert.ok(n<=4);
  }
 }
 return n;
}

test('Phase 965 keeps three fully verified canonical cards and no duplicate prints',()=>{
 const m=read('tools/support-phase-965.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(r=>r.id),[VAJ,SEMINAR,CHUCK]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const {id}=row,c=e.card(id),f=row.faces[0],d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:965}),row.spec);
  assert.throws(()=>standardCardSpec(d,{phase:964}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'未知の能力。'}]},{phase:965}));
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.race,c.power,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,f.race,Number(f.powerText),f.civilizations.filter(civ=>civ!=='無色'),1,4]);
  assert.equal(c.supportBatch,'phase-965');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[id],4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(refs.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.deepEqual(catalogue.resolveRows([{id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Vajuuta counts distinct enemy colors across visible elements without recursing into another Vajuuta',()=>{
 const s=field(),x=put(s,0,'battle',VAJ);
 const enemy=put(s,1,'battle',VAJ),multi=put(s,1,'battle',MULTI);
 put(s,1,'battle',FIELD);
 put(s,1,'battle',SEMINAR);
 put(s,1,'battle',PLAIN,{sealed:true});
 put(s,1,'mana',PLAIN);
 assert.equal(e.effectiveCard(x,s).extraBreak,3);
 assert.equal(e.effectiveCard(enemy,s).extraBreak,1);
 multi.faceDown=true;
 assert.equal(e.effectiveCard(x,s).extraBreak,2);
 multi.faceDown=false;
 x.g35Ignored=s.turn;
 assert.equal(e.effectiveCard(x,s).extraBreak??0,0);
});

for(const [colors,n] of [[[],1],[[LIGHT,WATER,WATER],3],[[MULTI],4]])test('Vajuuta actually breaks its normal shield plus one per enemy civilization '+n+':'+colors.length,()=>{
 const s=field(),x=put(s,0,'battle',VAJ);
 for(const id of colors)put(s,1,'battle',id);
 const before=physical(s);
 attack(s,x.uid);act(s,'noBlock');
 if(s.decision?.type==='breakChoice')act(s,'breakShields');
 assert.equal(s.players[1].shields.length,5-n);
 assert.equal(s.players[1].hand.length,n);
 assert.deepEqual(physical(s),before);
});

for(const [active,keep,accept,expected] of [[0,true,true,2],[0,true,false,2],[0,false,true,0],[1,true,true,0]])test('Seminar watches other friendly departures only on its own turn '+[active,keep,accept],()=>{
 let s=field(active),host=put(s,0,'battle',SEMINAR);
 put(s,0,'battle',PLAIN);put(s,0,'battle',WATER);
 const before=physical(s);
 invoke(s,[{op:'Sweep',owner:active===0?'self':'opponent',to:'grave',filter:{creature:true},...(keep?{excludeUid:host.uid}:{})}]);
 s=restore(s);
 assert.equal(drawChoices(s,accept),expected);
 assert.equal(s.players[0].hand.length,accept?expected:0);
 assert.equal(s.players[0].battle.some(y=>y.uid===host.uid),keep);
 assert.deepEqual(physical(s),before);
});

test('Seminar draws after an ally returns to hand, while an opposing or noncreature departure is ignored',()=>{
 const s=field(),source=put(s,0,'battle',SEMINAR),ally=put(s,0,'battle',PLAIN);
 const enemy=put(s,1,'battle',PLAIN),other=put(s,0,'battle',FIELD);
 invoke(s,[{op:'ExactMove',owner:0,to:'hand',target:other.uid}]);assert.equal(s.decision,null);
 s.phase='main';cast(s,PAX);
 pick(s,enemy);pick(s,ally);
 assert.equal(s.decision?.source,SEMINAR);
 assert.equal(drawChoices(s,true),1);
 assert.ok(s.players[0].battle.includes(source));
 assert.ok(s.players[0].hand.includes(ally)&&s.players[1].hand.includes(enemy));
});

for(const late of [false,true])test('Chuck uses the player’s first cast of the turn, including a cast before it entered '+late,()=>{
 const s=field();
 if(late)cast(s,DRAW);
 const x=put(s,0,'hand',CHUCK);
 act(s,'play',a=>a.uid===x.uid);
 assert.equal(e.power(x,false,s),1000);
 cast(s,DRAW);drain(s);
 assert.equal(e.power(x,false,s),late?1000:5000);
 cast(s,DRAW);drain(s);
 assert.equal(e.power(x,false,s),late?1000:5000);
 s.phase='attack';act(s,'endTurn');
 assert.equal(e.power(x,false,s),1000);
});

test('Chuck ignores the opponent’s cast and can trigger on its own S-Trigger spell on the opponent turn',()=>{
 const s=field(1),x=put(s,0,'battle',CHUCK),attacker=put(s,1,'battle',PLAIN);
 give(s,0,'shields',[BOUNCE]);
 cast(s,DRAW);assert.equal(e.power(x,false,s),1000);
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 act(s,'effect',a=>a.targets?.some(y=>y.uid===attacker.uid));
 drain(s);
 assert.equal(s.active,1);
 assert.equal(e.power(x,false,s),5000);
 assert.ok(s.players[0].mana.every(y=>!y.tapped));
});

test('An ignored Chuck does not queue its first-spell boost',()=>{
 const s=field(),x=put(s,0,'battle',CHUCK);
 put(s,1,'battle',GEN);
 cast(s,DRAW);
 assert.equal(e.power(x,false,s),1000);
 assert.ok(!x.powerModifiers?.length);
});
