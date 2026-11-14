import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,data,details,drain,e,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ROCKET='dmr19-032',DAIKON='dm22rp1-048',TOKAGE='dmrp16-s11';
const NATURE='dm01-108',FIRE='dm01-097',SLAYER='dm01-088',SEED='dmsd20-016';
const BIG='dm01-s01',EX_LIFE='dm26rp3-010',GENMU='dmrp15-km1',VAN='dmx13-s02';
const field=(active=0)=>Object.assign(setup(),{active});
const restore=s=>JSON.parse(JSON.stringify(s));
const has=(s,p,zone,x)=>s.players[p][zone].some(card=>card.uid===x.uid);
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const battleLog=s=>s.log.filter(x=>x.type==='battle');
const pick=(s,id,kind)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===id&&(!kind||v?.kind===kind);
});
function attack(s,attacker,target){
 s.phase='attack';
 act(s,'attack',a=>a.uid===attacker.uid&&a.target===target.uid);
 act(s,'noBlock');
}
function fight(s,p,ally,rival){
 s.extTasks=[{op:'g34_Fight240',p,source:'dmrp19-011'}];
 act(s,'toAttack');
 pick(s,ally.uid);
 pick(s,rival.uid);
}

test('all three complete official prints resolve to unique supported names and stable IDs',()=>{
 const m=JSON.parse(readFileSync(new URL('../tools/support-phase-1195.json',import.meta.url)));
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(c=>c.id),[ROCKET,DAIKON,TOKAGE]);
 assert.deepEqual(m.printAliases,[]);
 for(const row of m.cards){
  const live=e.card(row.id),[printed]=row.faces;
  const verified=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(verified.faces,row.faces);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id:row.id,count:1}]);
  assert.equal(catalogue.get(row.id).supported,true);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[row.id]);
  assert.deepEqual([live.type,live.cost,live.power,live.civilizations,live.race,live.manaValue,live.limit],
   ['creature',printed.cost,+printed.powerText,printed.civilizations,printed.race,1,4]);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.equal(CARD_IMAGES[row.id],row.image);
  assert.equal(refs.find(x=>x.id===row.id&&x.canonicalId===row.id)?.image,row.image);
  assert.deepEqual(standardCardSpec(verified,{phase:1195}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(live[key],value);
  const changed={...verified,faces:[{...printed,abilityText:printed.abilityText+'\n未知の能力。'}]};
  assert.throws(()=>standardCardSpec(changed,{phase:1195}));
 }
});

for(const target of ['self','ally'])test('Rocket Man replaces an attack battle by returning '+target,()=>{
 let s=field();
 const rocket=put(s,0,'battle',ROCKET);
 const ally=put(s,0,'battle',NATURE);
 const rival=put(s,1,'battle',SLAYER,{tapped:true});
 const shieldCount=s.players[1].shields.length;
 attack(s,rocket,rival);
 assert.equal(s.decision.task.op,'g393SG_Battle');
 assert.equal(s.decision.player,0);
 assert.deepEqual(s.decision.choices.map(o=>o.value?.uid),[rocket.uid,ally.uid]);
 s=restore(s);
 pick(s,target==='self'?rocket.uid:ally.uid,'returnOwn');
 assert.ok(has(s,0,'hand',target==='self'?rocket:ally));
 assert.ok(has(s,0,'battle',target==='self'?ally:rocket));
 assert.ok(has(s,1,'battle',rival));
 assert.equal(s.players[1].shields.length,shieldCount);
 assert.equal(s.decision,null);
 assert.equal(battleLog(s).length,0);
});

test('Rocket Man also replaces an effect battle on the opposing turn',()=>{
 const s=field();
 const rocket=put(s,1,'battle',ROCKET),rival=put(s,0,'battle',BIG);
 fight(s,0,rival,rocket);
 assert.equal(s.decision.player,1);
 pick(s,rocket.uid,'returnOwn');
 assert.ok(has(s,1,'hand',rocket)&&has(s,0,'battle',rival));
 assert.equal(battleLog(s).length,0);
});

test('Rocket Man cannot use its replacement if no creature can leave',()=>{
 const s=field();
 const rocket=put(s,0,'battle',ROCKET,{g26Stay:true});
 const rival=put(s,1,'battle',NATURE,{tapped:true});
 attack(s,rocket,rival);
 assert.equal(s.decision,null);
 assert.ok(has(s,1,'grave',rival)&&has(s,0,'battle',rocket));
});

test('returning a creature as the replacement cannot chain into EX Life',()=>{
 const s=field();
 const rocket=put(s,0,'battle',ROCKET);
 const guard=put(s,0,'hand',EX_LIFE);
 act(s,'play',a=>a.uid===guard.uid);
 drain(s);
 const shield=guard.exLifeShieldUid;
 assert.ok(shield);
 const rival=put(s,1,'battle',BIG,{tapped:true});
 attack(s,rocket,rival);
 pick(s,guard.uid,'returnOwn');
 assert.ok(has(s,0,'hand',guard));
 assert.ok(s.players[0].shields.some(x=>x.uid===shield));
});

for(const use of [true,false])test('Daikon League optionally deploys a visible named card from mana: '+use,()=>{
 const s=field();
 const first=put(s,0,'hand',DAIKON);
 const second=put(s,0,'mana',DAIKON,{tapped:true});
 const hidden=put(s,0,'mana',DAIKON,{faceDown:true});
 act(s,'play',a=>a.uid===first.uid);
 assert.equal(s.decision.task.origin,'mana');
 assert.deepEqual(s.decision.choices.map(o=>o.value?.uid??o.value),[second.uid,null]);
 pick(s,use?second.uid:null);
 assert.ok(has(s,0,'battle',first)&&has(s,0,'mana',hidden));
 assert.equal(has(s,0,'battle',second),use);
 if(use)assert.equal(second.tapped,false);
 assert.equal(s.decision,null);
});

for(const mode of ['eligible','below count','cannot leave'])test('Daikon League replaces a battle only if eligible: '+mode,()=>{
 const s=field();
 const daikon=put(s,0,'battle',DAIKON);
 put(s,0,'battle',NATURE);
 if(mode!=='below count')put(s,0,'battle',SEED);
 const rival=put(s,1,'battle',BIG,{tapped:true,...(mode==='cannot leave'?{g26Stay:true}:{})});
 attack(s,daikon,rival);
 if(mode==='eligible'){
  assert.equal(s.decision.choices.length,1);
  pick(s,daikon.uid,'moveBoth');
  assert.ok(has(s,0,'mana',daikon)&&has(s,1,'mana',rival));
  assert.equal(battleLog(s).length,0);
 }else{
  assert.ok(has(s,0,'grave',daikon)&&has(s,1,'battle',rival));
  assert.equal(battleLog(s).length,1);
 }
});

test('Daikon League returns both creatures and evolution bases to their owners',()=>{
 const s=field();
 const daikon=put(s,0,'battle',DAIKON);
 put(s,0,'battle',NATURE);
 put(s,0,'battle',SEED);
 const base=inst(FIRE),foreign=inst(NATURE);
 foreign.cardOwner=0;
 const rival=put(s,1,'battle',BIG,{under:[base,foreign]});
 fight(s,0,daikon,rival);
 pick(s,daikon.uid,'moveBoth');
 assert.ok(has(s,0,'mana',daikon)&&has(s,0,'mana',foreign));
 assert.ok(has(s,1,'mana',rival)&&has(s,1,'mana',base));
 assert.equal(battleLog(s).length,0);
});

test('Tokagemaru grants both permissions, including to itself, and untapped attacks persist through Genmu',()=>{
 const s=field();
 const tokage=put(s,0,'battle',TOKAGE,{entered:s.turn});
 const ally=put(s,0,'battle',NATURE,{entered:s.turn});
 const rival=put(s,1,'battle',FIRE);
 s.phase='attack';
 const can=(unit,target)=>e.getLegalActions(s).some(a=>a.kind==='attack'&&a.uid===unit.uid&&a.target===target);
 assert.ok(can(tokage,rival.uid)&&can(ally,rival.uid));
 put(s,1,'battle',GENMU);
 assert.ok(can(tokage,rival.uid)&&!can(ally,rival.uid));
 ally.entered=s.turn-1;
 assert.ok(can(ally,rival.uid));
 s.players[0].battle=s.players[0].battle.filter(x=>x.uid!==tokage.uid);
 assert.ok(!can(ally,rival.uid));
});

test('Tokagemaru substitutes for an ally and its win offers exactly one shield break',()=>{
 const s=field();
 const tokage=put(s,0,'battle',TOKAGE,{tapped:true});
 const ally=put(s,0,'battle',FIRE);
 const van=put(s,1,'battle',VAN,{tapped:true});
 const before=s.players[1].shields.length;
 attack(s,ally,van);
 pick(s,tokage.uid,'proxy');
 assert.ok(tokage.tapped&&has(s,0,'battle',ally)&&has(s,0,'battle',tokage));
 assert.ok(has(s,1,'hand',van));
 assert.equal(s.decision.task.op,'g34_Break278');
 pick(s,s.players[1].shields[0].uid);
 drain(s);
 assert.equal(s.players[1].shields.length,before-1);
});

test('Tokagemaru can break a shield after winning against a creature that cannot be destroyed',()=>{
 const s=field();
 const tokage=put(s,0,'battle',TOKAGE);
 const rival=put(s,1,'battle',NATURE,{tapped:true});
 s.extLimits=[{kind:'g409AttackEffect',player:1,ref:{uid:rival.uid,incarnation:0},
  effect:'destroySafe',expires:'end',who:0}];
 attack(s,tokage,rival);
 assert.ok(has(s,1,'battle',rival));
 assert.equal(s.decision.task.op,'g34_Break278');
 const shield=s.players[1].shields[0];
 pick(s,shield.uid);
 drain(s);
 assert.ok(has(s,1,'hand',shield));
});

test('a player can choose either of their battle replacements when one is mandatory',()=>{
 const s=field();
 const rocket=put(s,0,'battle',ROCKET),tokage=put(s,0,'battle',TOKAGE);
 const rival=put(s,1,'battle',BIG);
 fight(s,0,rocket,rival);
 const choices=s.decision.choices.map(o=>[o.value?.uid,o.value?.kind]);
 assert.deepEqual(choices,[[rocket.uid,'returnOwn'],[tokage.uid,'returnOwn'],[tokage.uid,'proxy']]);
 pick(s,tokage.uid,'proxy');
 assert.ok(has(s,0,'battle',rocket)&&has(s,1,'grave',rival));
 pick(s,null);
});

test('two Tokagemaru can decline in turn order, and a chosen replacement never chains',()=>{
 const s=field(1);
 const ally=put(s,1,'battle',FIRE),rival=put(s,0,'battle',FIRE);
 const tokage=put(s,1,'battle',TOKAGE),other=put(s,0,'battle',TOKAGE);
 fight(s,1,ally,rival);
 assert.equal(s.decision.player,1);
 assert.ok(s.decision.choices.some(o=>o.value?.uid===tokage.uid));
 pick(s,null);
 assert.equal(s.decision.player,0);
 pick(s,other.uid,'proxy');
 assert.ok(has(s,1,'grave',ally)&&has(s,0,'battle',rival)&&has(s,1,'battle',tokage));
 assert.equal(s.decision.task.op,'g34_Break278');
 pick(s,null);
 assert.equal(s.decision,null);
});

test('Tokagemaru cannot substitute in a same-side battle and equal power produces no win trigger',()=>{
 const s=field();
 const first=put(s,0,'battle',TOKAGE),second=put(s,0,'battle',TOKAGE);
 put(s,0,'battle',TOKAGE);
 s.extTasks=[{op:'g34_FightPair586',p:0,source:'dmrp19-011',who:'self'}];
 act(s,'toAttack');
 pick(s,first.uid);
 pick(s,second.uid);
 assert.equal(s.decision,null);
 assert.ok(has(s,0,'grave',first)&&has(s,0,'grave',second));
});

for(const active of [0,1])test('turn priority resolves competing mandatory and optional battle replacements: '+active,()=>{
 const s=field(active);
 const rocket=put(s,0,'battle',ROCKET),ally=put(s,1,'battle',FIRE);
 const tokage=put(s,1,'battle',TOKAGE);
 fight(s,active,active?ally:rocket,active?rocket:ally);
 assert.equal(s.decision.player,active);
 if(active){
  pick(s,tokage.uid,'proxy');
  assert.ok(has(s,0,'grave',rocket));
  assert.equal(s.decision.task.op,'g34_Break278');
  pick(s,null);
 }else{
  pick(s,rocket.uid,'returnOwn');
  assert.ok(has(s,0,'hand',rocket)&&has(s,1,'battle',ally));
  assert.equal(s.decision,null);
 }
});
