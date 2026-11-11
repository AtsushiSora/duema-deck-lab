import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const ESTOOL='dm10-061',BASH='dm32-007',BULCRY='dm31-012',MESSIAH='dm14-s09';
const PLAIN='dm01-108',FIRE='dm01-097',ARMORED='dm03-015',DARKLORD='dmrp14-069',TOTEM='dmrp01-089';
const TRIGGER='dm01-110',GS='dmsd17-014',NEO='dm25rp1-S06',APUL='dmrp22-042';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const uids=xs=>xs.map(x=>x.uid);
const physical=s=>uids(e.physicalCards(s)).sort();
const zone=(s,p,z)=>uids(s.players[p][z]);
const choices=s=>s.decision?.choices??[];
const values=s=>choices(s).map(x=>x.value?.uid??x.value);
const pick=(s,uid)=>act(s,'extended',a=>values(s)[a.choice]===uid);

function field(active=0){
 const s=setup();
 s.active=active;
 for(const p of [0,1]){
  give(s,p,'deck',Array(16).fill(PLAIN));
  give(s,p,'grave',[]);
 }
 return s;
}

function put(s,p,z,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][z].push(x);
 return x;
}

function play(s,id){
 const x=put(s,s.active,'hand',id);
 act(s,'play',a=>a.uid===x.uid);
 return x;
}

function evolve(s,id,base){
 const wrong=put(s,s.active,'battle',PLAIN);
 const foreign=put(s,1-s.active,'battle',base.cardId);
 const x=play(s,id);
 const options=e.getLegalActions(s).filter(a=>a.kind==='evolve').map(a=>a.baseUid);
 assert.ok(options.includes(base.uid));
 assert.ok(!options.includes(wrong.uid)&&!options.includes(foreign.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(uids(s.players[s.active].battle.find(y=>y.uid===x.uid).under),[base.uid]);
 return x;
}

test('Phase 958 verifies four complete names and maps two alternate prints to the original IDs',()=>{
 const m=read('tools/support-phase-958.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(m.cards.map(x=>x.id),[ESTOOL,BASH,BULCRY,MESSIAH]);
 assert.deepEqual(m.printAliases.map(r=>[r.id,r.canonicalId]),[['promoy3-005',ESTOOL],['dmc64-022',BULCRY]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=m.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:958}),canonical.spec);
  assert.throws(()=>standardCardSpec(d,{phase:957}));
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:958}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.race,f.civilizations,1,4]);
  assert.equal(c.supportBatch,'phase-958');
  assert.ok(row.verification.facesMatched);
  assert.equal(m.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(r=>nameKey(r.name)===nameKey(row.name)).map(r=>r.id),[id]);
 }
});

test('Estool enters mana tapped and contributes both colors with mana value one',()=>{
 const s=field(),x=put(s,0,'hand',ESTOOL);
 s.phase='charge';
 act(s,'charge',a=>a.uid===x.uid);
 assert.ok(s.players[0].mana.find(y=>y.uid===x.uid).tapped);
 assert.deepEqual(e.civilizations(e.card(x)),['光','水']);
 assert.equal(e.manaValue(e.card(x)),1);
});

test('Estool first adds a face-down shield, then privately views exactly one opposing shield group',()=>{
 let s=field();
 give(s,1,'shields',[TRIGGER,PLAIN]);
 const [first,second]=s.players[1].shields;
 first.shieldStack=[inst(GS)];
 const opponent=structuredClone(s.players[1].shields),top=s.players[0].deck[0];
 play(s,ESTOOL);
 assert.equal(s.players[0].shields.at(-1).uid,top.uid);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.deepEqual(values(s),[first.uid,second.uid]);
 assert.ok(choices(s).every(x=>!x.cardId));
 const before=physical(s);
 pick(s,first.uid);
 assert.deepEqual(s.decision.task.g585Peek.map(x=>x.id),[TRIGGER,GS]);
 assert.ok(!JSON.stringify(s.log).includes(GS));
 assert.ok(!JSON.stringify(e.observation(s,1)).includes(GS));
 s=restore(s);
 pick(s,null);
 assert.deepEqual(s.players[1].shields,opponent);
 assert.equal(s.decision,null);
 assert.deepEqual(physical(s),before);
});

test('Estool still adds a shield when the opponent has none to inspect',()=>{
 const s=field();
 give(s,1,'shields',[]);
 const top=s.players[0].deck[0];
 play(s,ESTOOL);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].shields.at(-1).uid,top.uid);
});

test('Estool still inspects the opposing shield if shield addition is prohibited',()=>{
 const s=field(),top=s.players[0].deck[0];
 put(s,1,'battle','dmrp22-037');
 play(s,ESTOOL);
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[0].shields.length,5);
 pick(s,s.players[1].shields[0].uid);
 assert.equal(s.decision.task.op,'g34_PeekRead585');
 pick(s,null);
 assert.equal(s.decision,null);
});

test('Bash evolves on an allied Armored Dragon and double breaks during its own attack',()=>{
 const s=field(),x=evolve(s,BASH,put(s,0,'battle',ARMORED));
 give(s,1,'shields',[PLAIN,PLAIN]);
 attack(s,x.uid);
 assert.equal(s.decision.type,'block');
 act(s,'noBlock');
 assert.equal(s.players[1].shields.length,0);
 assert.equal(s.players[1].hand.length,2);
});

test('Bash makes the attacking player choose a creature at its current power',()=>{
 let s=field(1);
 put(s,0,'battle',BASH);
 const attacker=put(s,1,'battle','dm01-s08');
 const boundary=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:5000}]});
 const over=put(s,1,'battle',PLAIN,{powerModifiers:[{amount:6000}]});
 const small=put(s,1,'battle',PLAIN);
 const own=put(s,0,'battle',PLAIN);
 const before=physical(s);
 attack(s,attacker.uid);
 assert.equal(s.decision.player,1);
 assert.deepEqual(values(s),[boundary.uid,small.uid]);
 s=restore(s);
 pick(s,boundary.uid);
 assert.ok(zone(s,1,'grave').includes(boundary.uid));
 assert.ok(zone(s,1,'battle').includes(over.uid)&&zone(s,1,'battle').includes(attacker.uid));
 assert.ok(zone(s,0,'battle').includes(own.uid));
 act(s,'noBlock');
 assert.deepEqual(physical(s),before);
});

test('Bash can destroy the attacker before the attack reaches blocking',()=>{
 const s=field(1),attacker=put(s,1,'battle',FIRE);
 put(s,0,'battle',BASH);
 attack(s,attacker.uid);
 assert.deepEqual(values(s),[attacker.uid]);
 pick(s,attacker.uid);
 assert.ok(zone(s,1,'grave').includes(attacker.uid));
 assert.equal(s.attack,null);
 assert.equal(s.players[0].shields.length,5);
});

test('Bash cannot force destruction when all enemy creatures exceed 7000',()=>{
 const s=field(1),attacker=put(s,1,'battle',ARMORED);
 put(s,0,'battle',BASH);
 attack(s,attacker.uid);
 assert.equal(s.decision.type,'block');
});

for(const accept of [true,false])test('Bulcry evolves and may deploy a non-evolution Dark Lord on attack '+accept,()=>{
 let s=field();
 const x=evolve(s,BULCRY,put(s,0,'battle',DARKLORD));
 const target=put(s,0,'grave',DARKLORD),evolution=put(s,0,'grave','dmc58-003');
 put(s,0,'grave',PLAIN);
 put(s,1,'grave',DARKLORD);
 give(s,1,'shields',[PLAIN,PLAIN]);
 const mana=s.players[0].mana.filter(y=>y.tapped).length,before=physical(s);
 attack(s,x.uid);
 assert.deepEqual(values(s),[target.uid,null]);
 s=restore(s);
 pick(s,accept?target.uid:null);
 assert.ok(zone(s,0,accept?'battle':'grave').includes(target.uid));
 assert.ok(zone(s,0,'grave').includes(evolution.uid));
 assert.equal(s.players[0].mana.filter(y=>y.tapped).length,mana);
 act(s,'noBlock');
 assert.equal(s.players[1].hand.length,2);
 assert.deepEqual(physical(s),before);
});

for(const asEvolution of [false,true])test('Bulcry may deploy a graveyard G-NEO with or without evolution '+asEvolution,()=>{
 const s=field(),x=put(s,0,'battle',BULCRY),base=put(s,0,'battle',DARKLORD);
 const neo=put(s,0,'grave',NEO);
 attack(s,x.uid);
 assert.deepEqual(values(s),[neo.uid,null]);
 pick(s,neo.uid);
 assert.ok(values(s).includes(base.uid)&&values(s).includes(null));
 pick(s,asEvolution?base.uid:null);
 const deployed=s.players[0].battle.find(y=>y.uid===neo.uid);
 assert.equal(e.isEvolution(deployed),asEvolution);
 if(asEvolution)assert.deepEqual(uids(deployed.under),[base.uid]);
});

test('Bulcry cannot deploy from a locked graveyard',()=>{
 const s=field(),x=put(s,0,'battle',BULCRY),neo=put(s,0,'grave',NEO);
 put(s,1,'battle',APUL);
 attack(s,x.uid);
 assert.equal(s.decision.type,'block');
 assert.ok(zone(s,0,'grave').includes(neo.uid));
});

test('Messiah triple breaks stacked shields, suppresses S Triggers, and allows G Strike',()=>{
 let s=field();
 const x=evolve(s,MESSIAH,put(s,0,'battle',TOTEM));
 give(s,1,'shields',[TRIGGER,TRIGGER,GS,TRIGGER]);
 const [a,b,c,untouched]=s.players[1].shields;
 const stack=inst(TRIGGER);
 a.shieldStack=[stack];
 const before=physical(s);
 attack(s,x.uid);
 act(s,'noBlock');
 assert.equal(s.decision.type,'breakChoice');
 s=restore(s);
 act(s,'breakShields',a=>a.shields.length===3&&!a.shields.includes(untouched.uid));
 assert.equal(s.decision.task.op,'gsDeclare');
 assert.deepEqual(s.triggers.undeclared,[]);
 pick(s,false);
 assert.deepEqual(zone(s,1,'hand'),[a.uid,stack.uid,b.uid,c.uid]);
 assert.deepEqual(zone(s,1,'shields'),[untouched.uid]);
 assert.deepEqual(physical(s),before);
});

for(const ignored of [false,true])test('S Trigger works for a different attacker or a silenced Messiah '+ignored,()=>{
 const s=field(),x=put(s,0,'battle',MESSIAH,ignored?{g35Ignored:s.turn}:{});
 const attacker=ignored?x:put(s,0,'battle',PLAIN);
 give(s,1,'shields',ignored?[TRIGGER,TRIGGER,TRIGGER]:[TRIGGER]);
 attack(s,attacker.uid);
 act(s,'noBlock');
 assert.ok(e.getLegalActions(s).some(a=>a.kind==='useTrigger'));
});
