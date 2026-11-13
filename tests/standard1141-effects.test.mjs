import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ERIKA='dm26rp2-046',MARIA='dm26rp2-030',DEAD='dm26rp2-020';
const DECISION='dm26rp1-011',ALT='dm26rp1-SEC015',VENOM='dm26rp1-S006';
const LIGHT='dm01-075',NATURE='dm01-108',FIRE='dm01-097',BIG='dm01-001';
const SPELL='dm01-027',PLUS='dm26rp1-065',DRAGON_SIGN='dmr13-016',KATSU='dm26rp2-S011';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const field=()=>{
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(16).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
};
const add=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid);
const legal=(s,kind)=>e.getLegalActions(s).filter(a=>a.kind===kind);
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===value);
const end=s=>{s.phase='attack';act(s,'endTurn');};
const toShield=s=>{if(legal(s,'noBlock').length)act(s,'noBlock');};

test('four canonical cards and five prints agree with the official faces, limits and images',()=>{
 const manifest=read('tools/support-phase-1141.json');
 const refs=read('tools/image-reference-prints.json').prints;
 const registry=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[ERIKA,MARIA,DEAD,DECISION]);
 assert.deepEqual(registry.resolveRows([DECISION,ALT].map(id=>({id,count:1}))),[{id:DECISION,count:2}]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0];
  const canonical=manifest.cards.find(x=>x.id===id);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1141}),canonical.spec);
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(registry.get(row.id).id,id);
  assert.equal(registry.byName.get(nameKey(row.name)).id,id);
  assert.equal(CARD_IMAGES[id],canonical.image);
  assert.ok(refs.some(r=>r.id===row.id&&r.canonicalId===id&&r.image===row.image));
  assert.equal(manifest.regulationVerification.limits[row.id],4);
 }
});

test('Erikatchu cannot attack but can use Super Guardman for an allied creature',()=>{
 const s=field(),erika=add(s,1,'battle',ERIKA),ally=add(s,1,'battle',LIGHT,{tapped:true});
 s.active=1;s.phase='attack';
 assert.ok(!legal(s,'attack').some(a=>a.uid===erika.uid));
 s.active=0;
 const attacker=add(s,0,'battle',NATURE);
 attack(s,attacker.uid,ally.uid);act(s,'noBlock');
 assert.equal(s.decision.task.op,'g393SG_Battle');
 pick(s,erika.uid);
 assert.ok(erika.tapped&&s.players[0].grave.includes(attacker)&&s.players[1].battle.includes(ally));
});

test('Erikatchu can fight an exact opponent entrant from mana or grave, including while tapped',()=>{
 for(const origin of ['grave','mana'])for(const accept of [false,true]){
  const s=field(),erika=add(s,1,'battle',ERIKA,{tapped:true}),entrant=add(s,0,origin,NATURE);
  const other=add(s,0,'battle',NATURE);
  s.extTasks=[{op:'putCreature',p:0,source:ERIKA,uid:entrant.uid,origin}];
  act(s,'toAttack');
  assert.equal(s.decision.task.op,'g34_EntryFight624');
  assert.deepEqual(choices(s),[true,null]);
  pick(s,accept?true:null);
  assert.ok(erika.tapped&&s.players[0].battle.includes(other));
  assert.equal(s.players[0].grave.includes(entrant),accept);
 }
});

test('Erikatchu skips hand entries and does not target a creature protected from being chosen',()=>{
 const s=field();add(s,1,'battle',ERIKA);
 const hand=add(s,0,'hand',NATURE);
 play(s,hand);
 assert.equal(s.decision,null);
 const enemy=add(s,0,'grave','dmrp01-041');
 s.extTasks=[{op:'putCreature',p:0,source:ERIKA,uid:enemy.uid,origin:'grave'}];
 act(s,'toAttack');
 assert.equal(s.decision.task.op,'g34_EntryFight624');
 pick(s,true);
 assert.ok(s.players[0].grave.includes(enemy)&&s.players[0].battle.includes(hand));
});

test('the two judges put both revealed cards on the bottom before the winner gains a shield or mana',()=>{
 for(const [id,zone] of [[MARIA,'shields'],[DEAD,'mana']]){
  const s=field();s.active=1;add(s,0,'battle',id);
  give(s,0,'deck',[SPELL,LIGHT,FIRE,NATURE]);give(s,1,'deck',[SPELL,NATURE,NATURE]);
  const [reveal,reward,draw]=s.players[0].deck,opponent=s.players[1].deck[0];
  end(s);
  assert.equal(s.decision.task.name,'startPowerJudge');
  pick(s,true);
  assert.equal(s.players[0].deck.at(-1),reveal);
  assert.equal(s.players[1].deck.at(-1),opponent);
  assert.ok(s.players[0][zone].includes(reward)&&s.players[0].hand.includes(draw));
  assert.deepEqual(s.players[0].g35Protected,[]);
  assert.deepEqual(s.players[1].g35Protected,[]);
 }
});

test('the judge can be declined or lost to revealed infinite power',()=>{
 for(const accept of [false,true]){
  const s=field();s.active=1;add(s,0,'battle',MARIA);
  give(s,0,'deck',[BIG,LIGHT,FIRE,NATURE]);give(s,1,'deck',[KATSU,NATURE,NATURE]);
  const [top,next]=s.players[0].deck,katsu=s.players[1].deck[0],shields=s.players[0].shields.length;
  end(s);pick(s,accept?true:null);
  assert.equal(s.players[0].shields.length,shields);
  assert.ok(s.players[0].hand.includes(accept?next:top));
  assert.equal(s.players[1].deck[accept?s.players[1].deck.length-1:0],katsu);
 }
});

test('Deadman grants all five civilizations to mana without increasing printed mana or tapping a mono-color charge',()=>{
 const s=field(),dead=add(s,0,'battle',DEAD);
 give(s,0,'mana',[NATURE,NATURE]);
 const [first,second]=s.players[0].mana;
 second.faceDown=true;
 assert.deepEqual(e.manaColors(e.card(first),s,0),['光','水','闇','火','自然']);
 assert.ok(e.paymentPool(s,0).every(x=>x.paymentAllColors));
 assert.ok(e.paymentPool(s,1).every(x=>!x.paymentAllColors));
 const charged=add(s,0,'hand',NATURE);
 s.phase='charge';act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(s.players[0].mana.includes(charged)&&!charged.tapped);
 assert.equal(e.manaValue(e.card(charged)),1);
 dead.sealed=true;
 assert.deepEqual(e.manaColors(e.card(first),s,0),['自然']);
 assert.ok(e.paymentPool(s,0).every(x=>!x.paymentAllColors));
});

test('Decision preselects both modes then deploys before fighting, with both players as possible targets',()=>{
 const s=field(),spell=add(s,0,'hand',DECISION),hand=add(s,0,'hand',NATURE);
 const grave=add(s,0,'grave',LIGHT),tooExpensive=add(s,0,'grave',BIG),enemy=add(s,1,'battle',NATURE);
 play(s,spell);pick(s,1);
 assert.equal(s.decision.task.op,'g34_Choose');
 assert.ok(!s.players[0].battle.length);
 pick(s,0);
 assert.deepEqual(new Set(choices(s)),new Set([hand.uid,grave.uid]));
 pick(s,grave.uid);
 assert.deepEqual(new Set(choices(s)),new Set([grave.uid,enemy.uid]));
 pick(s,grave.uid);pick(s,enemy.uid);
 assert.ok(s.players[0].grave.includes(grave)&&s.players[1].grave.includes(enemy));
 assert.ok(s.players[0].grave.includes(tooExpensive)&&s.players[0].grave.includes(spell));
});

test('Decision can choose the same deployment mode twice and rechecks both zones',()=>{
 const s=field(),spell=add(s,0,'hand',DECISION),hand=add(s,0,'hand',NATURE),grave=add(s,0,'grave',LIGHT);
 play(s,spell);pick(s,0);pick(s,0);pick(s,hand.uid);
 assert.deepEqual(choices(s),[grave.uid]);
 pick(s,grave.uid);
 assert.deepEqual(s.players[0].battle,[hand,grave]);
});

test('Decision chooses as many creatures as possible but no battle occurs without a second creature',()=>{
 const s=field(),spell=add(s,0,'hand',DECISION),only=add(s,1,'battle',NATURE);
 play(s,spell);pick(s,1);pick(s,1);
 assert.deepEqual(choices(s),[only.uid]);pick(s,only.uid);pick(s,only.uid);
 assert.equal(s.decision,null);
 assert.deepEqual(s.players[1].battle,[only]);
 assert.ok(s.players[0].grave.includes(spell));
});

test('Decision sees effective power before a shield leaves, including the Venom Rumble timing in QA 48477',()=>{
 for(const power of [4000,5000]){
  const s=field();s.active=1;
  const venom=add(s,0,'battle',VENOM,{powerModifiers:[{amount:power-4000}]});
  const attacker=add(s,1,'battle',NATURE);
  give(s,0,'shields',[DECISION,NATURE]);
  const spell=s.players[0].shields[0];
  attack(s,attacker.uid);toShield(s);
  assert.ok(e.power(venom,false,s)>=8000);
  assert.equal(legal(s,'useTrigger').some(a=>a.uid===spell.uid),power===5000);
  if(power===5000){act(s,'useTrigger',a=>a.uid===spell.uid);pick(s,2);pick(s,2);drain(s);assert.ok(s.players[0].grave.includes(spell));}
  else assert.ok(s.players[0].hand.includes(spell));
 }
 assert.equal(e.card(DECISION).trigger,undefined);
});

test('a nested Plus One Hand resolves before the second break, and the previously declared trigger waits',()=>{
 const s=field();
 add(s,0,'battle',BIG);
 give(s,0,'shields',[DECISION,DRAGON_SIGN]);give(s,1,'shields',[PLUS,NATURE]);
 const [spell,sign]=s.players[0].shields,[plus,other]=s.players[1].shields;
 s.extTasks=[{op:'g34_Break497',p:0,source:DECISION,n:2,owner:'self'}];
 act(s,'toAttack');pick(s,spell.uid);pick(s,sign.uid);
 act(s,'useTrigger',a=>a.uid===spell.uid);act(s,'useTrigger',a=>a.uid===sign.uid);
 assert.equal(s.decision.type,'triggerOrder');
 act(s,'orderTrigger',a=>a.uid===spell.uid);
 pick(s,2);pick(s,2);pick(s,plus.uid);
 assert.equal(s.decision.uid,plus.uid);
 act(s,'useTrigger',a=>a.uid===plus.uid);
 assert.ok(s.players[1].shields.includes(other));
 assert.ok(s.players[0].hand.includes(sign));
 act(s,'extended');
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,other.uid);drain(s);
 assert.ok(s.players[1].grave.includes(plus)&&s.players[1].hand.includes(other));
 assert.ok(s.players[0].grave.includes(spell)&&s.players[0].grave.includes(sign));
});
