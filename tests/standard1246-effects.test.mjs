import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DRAGON='dm22-018',FACELESS='dmr19-s02',TUXEDO='dmx11-026';
const SMALL='dm01-108',BLOCKER='dm01-001',TRIGGER='dm01-027',MIGHTY='dm18-135';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const add=(s,p,z,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][z].push(x);
 return x;
};
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const choices=s=>s.decision.choices.map(o=>o.value);
const pick=(s,uid)=>act(s,'extended',a=>choices(s)[a.choice]===uid);
function move(s,p,x,to){
 s.phase='main';
 s.extTasks=[{op:'g34_ExactMove',p:1-p,source:TRIGGER,owner:p,target:x.uid,targetIncarnation:x.incarnation||0,to}];
 act(s,'toAttack');
}
function summon(s,x){act(s,'play',a=>a.uid===x.uid);}

test('The three new cards and their five official prints resolve without duplicate names',()=>{
 const m=read('tools/support-phase-1246.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(row=>row.id),[DRAGON,FACELESS,TUXEDO]);
 assert.deepEqual(m.printAliases.map(row=>[row.id,row.canonicalId]),[['promoy5-054',DRAGON],['dmex13-046',TUXEDO]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),face=row.faces[0];
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1246}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [face.cost,Number(face.powerText),face.race,face.civilizations,1,4]);
  assert.equal(c.breaker,2);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
 }
});

test('Geo Gravanis recalculates the current power of only its other tapped allies during the attack',()=>{
 const s=setup(),x=add(s,0,'battle',DRAGON);
 const ally=add(s,0,'battle',SMALL,{tapped:true,powerModifiers:[{amount:2000}]});
 const copy=add(s,0,'battle',DRAGON,{tapped:true});
 const sealed=add(s,0,'battle',SMALL,{tapped:true,sealed:true});
 s.players[0].seals.push(Object.assign(inst(SMALL),{faceDown:true,sealOf:sealed.uid}));
 const blocker=add(s,1,'battle',BLOCKER);
 add(s,1,'battle',SMALL,{tapped:true,powerModifiers:[{amount:20000}]});
 assert.equal(e.power(x,false,s),6000);
 attack(s,x.uid);
 assert.equal(e.power(x,true,s),12000+e.power(ally,false,s));
 ally.powerModifiers[0].amount=4000;
 assert.equal(e.power(x,true,s),12000+e.power(ally,false,s));
 copy.tapped=false;
 assert.equal(e.power(x,true,s),6000+e.power(ally,false,s));
 act(s,'block',a=>a.uid===blocker.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,1,'grave',blocker));
});

test('Geo Gravanis uses W Breaker on a player attack',()=>{
 const s=setup(),x=add(s,0,'battle',DRAGON);
 attack(s,x.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
 assert.equal(s.players[1].hand.length,2);
});

test('Faceless protects itself and allies while the opponent has at most two shield groups on its controller’s turn',()=>{
 const s=setup();
 const protector=add(s,0,'battle',FACELESS),ally=add(s,0,'battle',SMALL);
 give(s,1,'shields',[SMALL,SMALL]);s.players[1].shields[0].shieldStack=[inst(SMALL),inst(SMALL)];
 move(s,0,ally,'grave');drain(s);
 move(s,0,protector,'hand');drain(s);
 assert.ok(has(s,0,'battle',ally)&&has(s,0,'battle',protector));
 const enemy=add(s,1,'battle',SMALL);
 move(s,1,enemy,'hand');drain(s);
 assert.ok(has(s,1,'hand',enemy));
});

test('Faceless cannot save allies with zero power, on the opponent’s turn, or while the opponent has three shields',()=>{
 for(const scenario of ['zero','opponent','three','ignored']){
  const s=setup();s.active=scenario==='opponent'?1:0;
  const source=add(s,0,'battle',FACELESS),ally=add(s,0,'battle',SMALL);
  if(scenario==='ignored')source.g35Ignored=s.turn;
  give(s,1,'shields',Array(scenario==='three'?3:2).fill(SMALL));
  if(scenario==='zero')ally.powerModifiers=[{amount:-e.card(SMALL).power}];
  move(s,0,ally,'grave');drain(s);
  assert.ok(has(s,0,'grave',ally),scenario);
 }
});

test('Faceless preserves a losing attacker and lets its controller choose a competing replacement',()=>{
 const s=setup();give(s,1,'shields',[SMALL]);
 add(s,0,'battle',FACELESS);
 const attacker=add(s,0,'battle',SMALL),target=add(s,1,'battle',BLOCKER,{tapped:true});
 attack(s,attacker.uid,target.uid);drain(s);
 assert.ok(has(s,0,'battle',attacker)&&has(s,1,'battle',target));
 for(const replacement of ['replaceStay577','replaceYamata']){
  const x=add(s,0,'battle',MIGHTY);
  move(s,0,x,'grave');
  assert.equal(s.decision.player,0);
  act(s,replacement);drain(s);
  assert.ok(has(s,0,replacement==='replaceYamata'?'mana':'battle',x));
 }
});

test('Tuxedo sends exactly two shield groups and their attached cards to the grave together without shield triggers',()=>{
 const s=setup();give(s,0,'shields',[TRIGGER,TRIGGER,SMALL]);give(s,1,'shields',[SMALL,SMALL]);
 const [a,b,left]=s.players[0].shields,attached=inst(TRIGGER);
 a.shieldStack=[attached];
 summon(s,add(s,0,'hand',TUXEDO));
 assert.deepEqual(choices(s),[a.uid,b.uid,left.uid]);
 pick(s,a.uid);
 assert.ok(has(s,0,'shields',a));
 assert.deepEqual(choices(s),[b.uid,left.uid]);
 pick(s,b.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].shields,[left]);
 assert.equal(s.players[1].shields.length,2);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid).sort(),[a.uid,attached.uid,b.uid].sort());
 assert.ok(!e.getLegalActions(s).some(x=>x.kind==='useTrigger'));
});

test('Tuxedo sends all remaining shields with fewer than two and can block and attack players',()=>{
 for(const count of [0,1]){
  const s=setup();give(s,0,'shields',Array(count).fill(TRIGGER));
  summon(s,add(s,0,'hand',TUXEDO));
  if(count)pick(s,s.players[0].shields[0].uid);
  assert.equal(s.decision,null);
  assert.equal(s.players[0].shields.length,0);
  assert.equal(s.players[0].grave.length,count);
 }
 const s=setup();s.active=1;
 const x=add(s,0,'battle',TUXEDO),attacker=add(s,1,'battle',SMALL);
 attack(s,attacker.uid);
 act(s,'block',a=>a.uid===x.uid);drain(s);
 assert.ok(has(s,0,'battle',x)&&has(s,1,'grave',attacker));
 s.active=0;x.tapped=false;
 attack(s,x.uid);drain(s);
 assert.equal(s.players[1].shields.length,3);
});
