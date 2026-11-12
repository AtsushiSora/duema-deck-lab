import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeBattleData,encodeBattleData} from '../dist/battle-insights.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GRAND='dm24ex1-034',BARI='dm23rp1-012',DECISION='dm23rp3-004';
const NATURE='dm01-108',LIGHT='dm01-075',FIRE='dm01-097',SEED='dmrp22-048';
const COST_SIX='dm01-001',DOUBLE='dm24ex4-038',BLOCKER='dm01-076',DREAMMATE='dm34-052',ONIKAMASU='dmrp01-041',QQX='dmrp07-m01';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const restore=s=>decodeBattleData(encodeBattleData(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,v)=>act(s,'extended',a=>choices(s)[a.choice]===v);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function add(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function shieldAttack(s,attacker){
 attack(s,attacker.uid);
 if(e.getLegalActions(s).some(a=>a.kind==='noBlock'))act(s,'noBlock');
}

test('The three cards and two alternate prints preserve the canonical IDs, official images and limits',()=>{
 const manifest=read('tools/support-phase-1045.json'),catalogue=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(x=>x.id),[GRAND,BARI,DECISION]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[['dm23rp3-12B',DECISION],['dmart21-003',DECISION]]);
 assert.deepEqual(catalogue.resolveRows([DECISION,'dm23rp3-12B','dmart21-003'].map(id=>({id,count:1}))),[{id:DECISION,count:3}]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],base=manifest.cards.find(x=>x.id===id);
  assert.equal(catalogue.get(row.id).id,id);
  assert.ok(catalogue.get(row.id).supported&&row.verification.facesMatched);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,manifest.regulationVerification.limits[row.id]]);
  assert.equal(CARD_IMAGES[id],base.image);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1045}),base.spec);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Grand Maison offers one mode without an allied Dreammate and taps even a protected opponent',()=>{
 const s=field(),spell=add(s,0,'hand',GRAND),protectedEnemy=add(s,1,'battle',ONIKAMASU);
 const nonCreature=add(s,1,'battle',SEED);
 add(s,1,'battle',DREAMMATE);
 const top=s.players[0].deck[0];
 play(s,spell);
 assert.deepEqual(choices(s),[0,1]);
 pick(s,0);
 assert.ok(protectedEnemy.tapped);
 assert.ok(!nonCreature.tapped&&s.players[0].deck[0]===top);
});

test('Grand Maison may use both modes in printed order, counting the mana added before destruction',()=>{
 const s=field(),spell=add(s,0,'hand',GRAND),dreammate=add(s,0,'battle',DREAMMATE);
 const enemy=add(s,1,'battle',COST_SIX),protectedEnemy=add(s,1,'battle',ONIKAMASU);
 give(s,0,'mana',[LIGHT,FIRE,NATURE,NATURE,NATURE]);
 s.players[0].mana[4].faceDown=true;
 const top=s.players[0].deck[0],all=physical(s);
 play(s,spell);
 assert.deepEqual(choices(s),[0,1,2]);
 pick(s,2);
 assert.ok(enemy.tapped&&protectedEnemy.tapped&&!dreammate.tapped);
 assert.equal(s.players[0].mana.length,6);
 assert.ok(has(s,0,'mana',top));
 assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,enemy.uid);
 assert.ok(has(s,1,'grave',enemy)&&has(s,1,'battle',protectedEnemy));
 assert.deepEqual(physical(s),all);
});

test('Grand Maison casts as a free S Trigger and can choose its mana mode independently',()=>{
 const s=Object.assign(field(),{active:1}),attacker=add(s,1,'battle',NATURE);
 const other=add(s,1,'battle',NATURE);
 add(s,0,'battle',DREAMMATE);
 give(s,0,'mana',[]);
 give(s,0,'shields',[GRAND,NATURE]);
 const spell=s.players[0].shields[0],top=s.players[0].deck[0];
 shieldAttack(s,attacker);
 act(s,'useTrigger',a=>a.uid===spell.uid);
 pick(s,1);
 assert.ok(has(s,0,'mana',top)&&!other.tapped);
 assert.ok(has(s,0,'grave',spell));
});

for(const mode of ['one','element','decline'])test('Barrispark Shield Trigger Plus after '+mode,()=>{
 const s=Object.assign(field(),{active:1});
 const attacker=add(s,1,'battle',mode==='one'?NATURE:DOUBLE);
 const ally=add(s,1,'battle',NATURE),seed=add(s,1,'battle',SEED);
 give(s,0,'mana',[]);
 give(s,0,'shields',[BARI,NATURE]);
 const source=s.players[0].shields[0],top=s.players[0].deck[0],all=physical(s);
 shieldAttack(s,attacker);
 act(s,'useTrigger',a=>a.uid===source.uid);
 assert.ok(ally.tapped&&!seed.tapped);
 if(mode==='one')assert.equal(s.decision,null);
 else{
  assert.ok(choices(s).includes(seed.uid)&&choices(s).includes(null));
  pick(s,mode==='element'?seed.uid:null);
 }
 assert.equal(has(s,0,'shields',top),mode==='decline');
 assert.equal(has(s,1,'shields',seed),mode==='element');
 assert.ok(has(s,0,'grave',source));
 assert.deepEqual(physical(s),all);
});

test('Barrispark paid cast taps the opponent and does not run the Plus effect',()=>{
 const s=field(),spell=add(s,0,'hand',BARI),enemy=add(s,1,'battle',NATURE);
 s.players[0].brokenThisTurn=2;
 play(s,spell);
 assert.ok(enemy.tapped&&has(s,0,'grave',spell));
 assert.equal(s.players[0].shields.length,5);
 assert.equal(s.decision,null);
});

test('Decision preselects both modes and resolves destruction before deploying a blocker',()=>{
 let s=field(),spell=add(s,0,'hand',DECISION);
 const blocker=add(s,0,'hand',BLOCKER),other=add(s,0,'hand',NATURE),enemy=add(s,1,'battle',NATURE),all=physical(s);
 play(s,spell);
 pick(s,1);
 assert.deepEqual(choices(s),[0,1,2]);
 assert.ok(has(s,0,'hand',blocker)&&has(s,1,'battle',enemy));
 s=restore(s);
 pick(s,0);
 assert.deepEqual(choices(s),[enemy.uid]);
 pick(s,enemy.uid);
 assert.deepEqual(choices(s),[blocker.uid]);
 pick(s,blocker.uid);
 assert.ok(has(s,0,'battle',blocker)&&has(s,0,'hand',other)&&has(s,1,'grave',enemy));
 assert.deepEqual(physical(s),all);
});

test('Decision may choose the same private shield and grave mode twice',()=>{
 const s=field(),spell=add(s,0,'hand',DECISION),all=physical(s);
 const [a,b,c,d]=s.players[0].deck;
 play(s,spell);
 pick(s,2);
 pick(s,2);
 assert.deepEqual(choices(s),[a.uid,b.uid]);
 pick(s,b.uid);
 assert.deepEqual(choices(s),[c.uid,d.uid]);
 pick(s,c.uid);
 assert.ok(has(s,0,'shields',b)&&has(s,0,'shields',c)&&has(s,0,'grave',a)&&has(s,0,'grave',d));
 assert.deepEqual(physical(s),all);
});

for(const creature of [false,true])test('Decision grants its shield trigger only after an allied creature entered '+creature,()=>{
 const s=field();
 const earlier=add(s,0,'hand',creature?NATURE:SEED);
 play(s,earlier);
 drain(s);
 assert.equal(s.players[0].enteredThisTurn||0,Number(creature));
 s.active=1;
 const attacker=add(s,1,'battle',NATURE);
 add(s,1,'battle',QQX);
 give(s,0,'mana',[]);
 give(s,0,'shields',[DECISION,NATURE]);
 const spell=s.players[0].shields[0],top=s.players[0].deck[0];
 shieldAttack(s,attacker);
 assert.equal(e.getLegalActions(s).some(a=>a.kind==='useTrigger'&&a.uid===spell.uid),creature);
 if(!creature)return;
 act(s,'useTrigger',a=>a.uid===spell.uid);
 pick(s,2);
 pick(s,2);
 assert.ok(has(s,0,'grave',spell)&&s.players[0].deck[0]===top);
});
