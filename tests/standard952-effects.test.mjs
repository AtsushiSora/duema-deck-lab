import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const AQUA='dm23-011',GORI='dm23-049',BUBBLE='dm23-009';
const PLAIN='dm01-108',WATER='dm01-083',DREAM='dm32-106',BLOCKER='dm01-082';
const MECHA='dm28-073',DRAW='dm06-085';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);

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

test('Phase 952 verifies three complete names and resolves the promo to the first-print IDs',()=>{
 const m=read('tools/support-phase-952.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[AQUA,GORI,BUBBLE]);
 assert.deepEqual(m.printAliases.map(x=>[x.id,x.canonicalId]),[['promoy5-066',AQUA]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:952}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:952}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-952');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

function announce(s,bio){
 assert.equal(s.decision.task.op,'g34_BioKDeclare951');
 assert.ok(choices(s).includes(bio.uid));
 pick(s,bio);
 assert.equal(s.decision.task.op,'g34_BioT952');
}
const battles=s=>s.log.filter(x=>x.type==='battle');

for(const mode of ['attack','block'])test('Aqua Switch resolves before power comparison and fixes the post-discard hand count '+mode,()=>{
 let s=field(),attacker=put(s,0,'battle',WATER),defender=put(s,1,'battle',BLOCKER,{tapped:mode==='attack'});
 const bio=put(s,0,'hand',AQUA);
 for(let i=0;i<3;i++)put(s,0,'hand',PLAIN);
 attack(s,attacker.uid,mode==='block'?'player':defender.uid);
 act(s,mode==='block'?'block':'noBlock');
 assert.equal(battles(s).length,0);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(AQUA));
 s=restore(s);announce(s,bio);
 assert.equal(battles(s).length,0);
 s=restore(s);pick(s,true);
 assert.ok(has(s,0,'grave',bio)&&has(s,1,'grave',defender)&&has(s,0,'battle',attacker));
 assert.match(battles(s)[0].text,/\(4000\)/);
 const live=s.players[0].battle.find(x=>x.uid===attacker.uid);
 assert.equal(e.power(live,false,s),4000);
 s.phase='main';cast(s,DRAW);
 assert.equal(s.players[0].hand.length,5);
 assert.equal(e.power(live,false,s),4000);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.power(live,false,s),1000);
});

test('Goriyankee grants stackable attack power after both copies are declared',()=>{
 let s=field(),attacker=put(s,0,'battle',DREAM),defender=put(s,1,'battle',BLOCKER,{tapped:true});
 const first=put(s,0,'hand',GORI),second=put(s,0,'hand',GORI),aqua=put(s,0,'hand',AQUA);
 attack(s,attacker.uid,defender.uid);act(s,'noBlock');
 assert.deepEqual(choices(s),[first.uid,second.uid,null]);
 pick(s,second);assert.deepEqual(choices(s),[first.uid,null]);
 s=restore(s);announce(s,first);
 assert.equal(s.decision.task.uid,second.uid);
 pick(s,true);assert.equal(s.decision.task.uid,first.uid);
 pick(s,true);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second)&&has(s,0,'hand',aqua)&&has(s,1,'grave',defender));
 const live=s.players[0].battle.find(x=>x.uid===attacker.uid);
 assert.equal(e.power(live,false,s),2000);
 assert.equal(e.effectiveCard(live,s).attackBonus,8000);
 assert.match(battles(s)[0].text,/\(10000\)/);
 s.phase='attack';act(s,'endTurn');drain(s);
 assert.equal(e.effectiveCard(live,s).attackBonus??0,0);
});

for(const mode of ['noBattle','wrongRace','decline','noDiscard','defense','effect'])test('Bio-T leaves the hand alone when its conditions or discard choice do not apply '+mode,()=>{
 const s=field(mode==='defense'?1:0);
 const attacker=put(s,s.active,'battle',mode==='wrongRace'?PLAIN:WATER);
 const defender=put(s,1-s.active,'battle',mode==='defense'?WATER:BLOCKER,{tapped:true});
 const bio=put(s,0,'hand',AQUA);
 if(mode==='effect'){
  s.extTasks=[{op:'g34_FightEnemy240',p:0,source:WATER,fighter:{uid:attacker.uid,incarnation:0}}];
  act(s,'toAttack');
  assert.equal(s.decision.task.op,'g34_FightEnemy240');
  pick(s,defender);
  assert.equal(battles(s).length,1);
 }else{
  attack(s,attacker.uid,mode==='noBattle'?'player':defender.uid);
  act(s,'noBlock');
  if(mode==='decline')pick(s,null);
  if(mode==='noDiscard'){announce(s,bio);pick(s,null);}
 }
 assert.ok(has(s,0,'hand',bio));
 assert.ok(s.log.every(x=>x.type!=='discard'||x.cardId!==AQUA));
 assert.equal(s.decision,null);
 if(mode==='noBattle')assert.equal(s.players[1].shields.length,4);
});

test('Bio-T follows an attack battle after the defender is replaced by Super Guardman',()=>{
 let s=field(),attacker=put(s,0,'battle',WATER),original=put(s,1,'battle',BLOCKER,{tapped:true});
 const bio=put(s,0,'hand',AQUA),guard=put(s,1,'battle',PLAIN,{g34Grants:[{turn:s.turn,superGuardman:true}]});
 put(s,0,'hand',PLAIN);put(s,0,'hand',PLAIN);
 attack(s,attacker.uid,original.uid);act(s,'noBlock');
 assert.equal(s.decision.player,1);
 pick(s,guard);
 s=restore(s);announce(s,bio);pick(s,true);
 assert.ok(has(s,1,'battle',original)&&has(s,1,'grave',guard)&&has(s,0,'battle',attacker));
});

test('Bubble Guy privately takes one card and puts the rest on the bottom in the selected order',()=>{
 let s=field();
 for(let i=0;i<3;i++)put(s,0,'battle',MECHA);
 put(s,1,'battle',MECHA);put(s,0,'mana',MECHA);
 const sealed=put(s,0,'battle',MECHA,{sealed:true});
 s.players[0].seals.push({...inst(PLAIN),faceDown:true,sealOf:sealed.uid});
 give(s,0,'deck',[WATER,AQUA,GORI,PLAIN,PLAIN]);
 const [a,b,c,...rest]=s.players[0].deck;
 cast(s,BUBBLE);
 assert.deepEqual(choices(s),[a.uid,b.uid,c.uid]);
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(GORI));
 assert.ok(!choices(s).includes(null));
 s=restore(s);pick(s,b);
 assert.deepEqual(choices(s),[a.uid,c.uid]);
 pick(s,c);
 assert.ok(has(s,0,'hand',b));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),[...rest,c,a].map(x=>x.uid));
 assert.ok(!s.players[0].g34Protected?.length);
 assert.equal(s.players[0].drawsThisTurn??0,0);
});

test('Bubble Guy has no selection with zero allied Great Mechaos',()=>{
 const s=field();put(s,1,'battle',MECHA);put(s,0,'battle',PLAIN);
 const before=s.players[0].deck.map(x=>x.uid);
 cast(s,BUBBLE);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),before);
});

test('Bubble Guy uses S-Trigger and completes its entry ability for the defending player',()=>{
 const s=field(1),attacker=put(s,1,'battle',PLAIN);
 const bubble=inst(BUBBLE);s.players[0].shields[0]=bubble;
 put(s,0,'battle',MECHA);
 const top=s.players[0].deck[0];
 attack(s,attacker.uid);act(s,'noBlock');act(s,'useTrigger');
 assert.equal(s.decision.player,0);pick(s,top);
 assert.ok(has(s,0,'battle',bubble)&&has(s,0,'hand',top));
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});
