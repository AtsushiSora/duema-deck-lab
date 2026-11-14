import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ANNIE='dm22rp1-020',CLAW='dm22rp1-021',MUSHROOM='dm22rp1-023';
const FIRE='dm01-097',GREEN='dm01-108',DRAGON='dm01-008',FIRE_SEED='dmrp21-069',GREEN_SEED='dmsd20-015';
const KATSU='dmex15-b002',SWORD='dmr21-l02',AGOKUI='dmrp09-021',QQQX='dmrp07-m01';
const field=(active=0)=>{
 const s=Object.assign(setup(),{active});
 for(const p of [0,1])give(s,p,'deck',Array(24).fill(GREEN));
 return s;
};
const add=(s,p,zone,id,props={})=>{
 const x=Object.assign(inst(id),props);
 s.players[p][zone].push(x);
 return x;
};
const top=(s,p,id)=>{
 const x=inst(id);
 s.players[p].deck.unshift(x);
 return x;
};
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,value)=>act(s,'extended',a=>s.decision.choices[a.choice].value===value||
 s.decision.choices[a.choice].value?.uid===value);
const resolve=(s,source)=>{
 const effect=s.pendingEffects.find(q=>q.source===source&&q.player===s.active);
 assert.ok(effect,source);
 act(s,'orderEffect',a=>a.effectId===effect.effectId);
};
const finishAttack=s=>{if(s.decision?.type==='block')act(s,'noBlock');drain(s);};
const attacks=(s,x)=>[...new Set(e.getLegalActions(s).filter(a=>a.kind==='attack'&&a.uid===x.uid).map(a=>a.target))];

test('the five official prints match the three definitions and their original IDs',()=>{
 const read=f=>JSON.parse(readFileSync(new URL('../tools/'+f,import.meta.url)));
 const manifest=read('support-phase-1222.json'),refs=read('image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[ANNIE,CLAW,MUSHROOM]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['dm23sd1-006',ANNIE],['promoy22-028',ANNIE]]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1222}),row.spec);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
  assert.deepEqual([c.cost,c.power,c.race,c.civilizations,c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===id)?.image,row.image);
 }
});

test('Annie untaps the first attacking Dragon, even after a non-Dragon has attacked',()=>{
 const s=field(),annie=add(s,0,'battle',ANNIE,{tapped:true});
 const nonDragon=add(s,0,'battle',FIRE),dragon=add(s,0,'battle',DRAGON);
 attack(s,nonDragon.uid);finishAttack(s);
 assert.equal(nonDragon.tapped,true);
 attack(s,dragon.uid);finishAttack(s);
 assert.equal(dragon.tapped,false);
 assert.equal(annie.tapped,true);
 attack(s,dragon.uid);finishAttack(s);
 assert.equal(dragon.tapped,true);
});

test('Annie arriving after a Dragon attack waits for a new turn',()=>{
 let s=field();
 const first=add(s,0,'battle',DRAGON),next=add(s,0,'battle',DRAGON);
 attack(s,first.uid);finishAttack(s);
 s=JSON.parse(JSON.stringify(s));
 add(s,0,'battle',ANNIE);
 const restored=s.players[0].battle.find(x=>x.uid===next.uid);
 attack(s,restored.uid);finishAttack(s);
 assert.equal(restored.tapped,true);
 act(s,'endTurn');drain(s);
 s.phase='attack';
 act(s,'endTurn');drain(s);
 attack(s,restored.uid);finishAttack(s);
 assert.equal(restored.tapped,false);
});

test('Annie gains power with an allied Dragon and gives speed only to other creatures above the fire threshold',()=>{
 const s=field(),annie=add(s,0,'battle',ANNIE,{entered:s.turn});
 const ally=add(s,0,'battle',GREEN,{entered:s.turn});
 const fire=add(s,0,'battle',FIRE,{entered:s.turn});
 const enemy=add(s,1,'battle',DRAGON);
 const stats=()=>e.effectiveCard(annie,s);
 s.phase='attack';
 assert.equal(stats().power,2000);
 assert.deepEqual(attacks(s,ally),[]);
 const seed=add(s,0,'battle',FIRE_SEED);
 assert.equal(stats().power,5000);
 assert.deepEqual(attacks(s,ally),['player']);
 assert.deepEqual(attacks(s,fire),['player']);
 assert.deepEqual(attacks(s,annie),[]);
 seed.sealed=true;
 assert.equal(stats().power,2000);
 assert.deepEqual(attacks(s,ally),[]);
 assert.ok(has(s,1,'battle',enemy));
});

test('Claw puts a matching creature or Tamaseed into battle and takes a different cost or type into hand',()=>{
 for(const [id,zone] of [[GREEN,'battle'],[GREEN_SEED,'battle'],[MUSHROOM,'hand'],['dm22rp1-034','hand']]){
  const s=field(),attacker=add(s,0,'battle',FIRE);
  add(s,0,'battle',CLAW);
  const revealed=top(s,0,id);
  attack(s,attacker.uid);
  drain(s);
  assert.ok(has(s,0,zone,revealed),id);
  assert.ok(s.log.some(log=>log.type==='reveal'&&log.cardId===CLAW));
 }
});

test('Claw leaves a matching creature on top if it cannot enter, and cannot reveal under Q.Q.QX.',()=>{
 for(const locked of [false,true]){
  const s=field(),attacker=add(s,0,'battle',FIRE);
  add(s,0,'battle',CLAW);
  add(s,1,'battle',locked?QQQX:'dm23ex3-024');
  const revealed=top(s,0,GREEN);
  attack(s,attacker.uid);
  drain(s);
  assert.equal(s.players[0].deck[0].uid,revealed.uid);
  assert.equal(s.log.some(log=>log.type==='reveal'&&log.cardId===CLAW),!locked);
 }
});

test('Claw reads the current attacker after Revolution Change (QA42052)',()=>{
 const s=field(),original=add(s,0,'battle',KATSU),replacement=add(s,0,'hand',SWORD);
 s.finalUsed=[true,false];
 add(s,0,'battle',CLAW);
 const revealed=top(s,0,'dmx22b-008');
 attack(s,original.uid);
 pick(s,true);
 resolve(s,SWORD);
 pick(s,original.uid);
 drain(s);
 assert.ok(has(s,0,'battle',replacement));
 assert.ok(has(s,0,'hand',original));
 assert.ok(has(s,0,'battle',revealed));
});

test('Claw takes the revealed card when Agokui destroys the attacker first (QA42051)',()=>{
 const s=field(),attacker=add(s,0,'battle',FIRE);
 add(s,0,'battle',CLAW);
 add(s,0,'battle',AGOKUI);
 const drawn=top(s,0,FIRE),revealed=inst(GREEN);
 s.players[0].deck.splice(1,0,revealed);
 attack(s,attacker.uid);
 resolve(s,AGOKUI);
 pick(s,true);
 drain(s);
 assert.ok(has(s,0,'grave',attacker));
 assert.ok(has(s,0,'hand',drawn));
 assert.ok(has(s,0,'hand',revealed));
});

test('Porcini can enter tapped or untapped from its S-Trigger',()=>{
 for(const tapped of [true,false]){
  const s=field(1),attacker=add(s,1,'battle',FIRE);
  give(s,0,'shields',[MUSHROOM]);
  attack(s,attacker.uid);
  act(s,'noBlock');
  act(s,'useTrigger',a=>a.cardId===MUSHROOM);
  pick(s,tapped);
  assert.equal(s.players[0].battle.find(x=>x.cardId===MUSHROOM).tapped,tapped);
 }
});

test('Porcini requires a creature target when available, but permits ending the turn or attacking the player when appropriate',()=>{
 const s=field(1),attacker=add(s,1,'battle',FIRE);
 const mushroom=add(s,0,'battle',MUSHROOM),other=add(s,0,'battle',GREEN,{tapped:true});
 s.phase='attack';
 assert.deepEqual(attacks(s,attacker),[other.uid]);
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='endTurn'));
 other.tapped=false;
 assert.deepEqual(attacks(s,attacker),['player']);
 mushroom.tapped=true;
 assert.deepEqual(attacks(s,attacker),[mushroom.uid]);
 mushroom.g35Ignored=s.turn;
 assert.deepEqual(new Set(attacks(s,attacker)),new Set(['player',mushroom.uid]));
});

test('Porcini’s 10000 power and two breaks depend on three nature creatures or Tamaseeds',()=>{
 const s=field(),mushroom=add(s,0,'battle',MUSHROOM);
 const seed=add(s,0,'battle',GREEN_SEED);
 add(s,1,'battle',GREEN);
 assert.equal(e.power(mushroom,false,s),5000);
 add(s,0,'battle',GREEN);
 assert.equal(e.power(mushroom,false,s),10000);
 assert.equal(e.effectiveCard(mushroom,s).breaker,2);
 attack(s,mushroom.uid);finishAttack(s);
 assert.equal(s.players[1].shields.length,3);
 seed.faceDown=true;
 assert.equal(e.power(mushroom,false,s),5000);
 assert.equal(e.effectiveCard(mushroom,s).breaker,undefined);
});
