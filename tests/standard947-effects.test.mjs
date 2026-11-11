import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain,cast} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const SONIAS='dm11-s01',DIRGE='dm13-025',REPRINT='dmc34-030',MIRUMEL='dm14-039',RUMBA='dm27-s04';
const LIGHT='dm01-075',WATER='dm01-083',DARK='dm01-090',FIRE='dm01-097',PLAIN='dm01-108';
const GLAD='dm12-031',BOUNCE='dm01-086',BLOCKER='dm22-038',MEDUSA='dm07-s02',GENMU='dmrp15-km1';
const colors=[LIGHT,WATER,DARK,FIRE,PLAIN];
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const restore=s=>JSON.parse(JSON.stringify(s));
const choices=s=>s.decision.choices.map(c=>c.value?.uid??c.value);
const pick=(s,value)=>act(s,'extended',a=>choices(s)[a.choice]===(value?.uid??value));
const legal=(s,kind,pred=()=>true)=>e.getLegalActions(s).some(a=>a.kind===kind&&pred(a));
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
const power=(s,x)=>e.power(x,false,s);

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

function endTurn(s){
 s.phase='attack';
 act(s,'endTurn');
}

function clearShields(s){
 act(s,'noBlock');
 act(s,'breakShields',a=>a.shields.length===2);
 drain(s);
}

test('Phase 947 verifies four complete names, their limits and the reprint alias',()=>{
 const manifest=read('tools/support-phase-947.json'),refs=read('tools/image-reference-prints.json').prints;
 const catalogue=createCatalogue(snapshot,data.cards,details);
 assert.deepEqual(manifest.cards.map(x=>x.id),[SONIAS,DIRGE,MIRUMEL,RUMBA]);
 assert.deepEqual(manifest.printAliases.map(x=>[x.id,x.canonicalId]),[[REPRINT,DIRGE]]);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,f=row.faces[0],c=e.card(id),canonical=manifest.cards.find(x=>x.id===id);
  const d={...row,status:'complete'};
  assert.deepEqual(standardCardSpec(d,{phase:947}),canonical.spec);
  assert.throws(()=>standardCardSpec({...d,faces:[{...f,abilityText:f.abilityText+'不明な能力。'}]},{phase:947}));
  for(const [key,value] of Object.entries(canonical.spec))assert.deepEqual(c[key],value);
  assert.deepEqual([c.type,c.cost,c.power,c.race,e.civilizations(c),c.manaValue,c.limit],
   [id===DIRGE?'spell':'creature',f.cost,Number(f.powerText),f.race,f.civilizations,id===RUMBA?0:1,4]);
  assert.equal(c.supportBatch,'phase-947');
  assert.ok(row.verification.facesMatched);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(refs.filter(x=>x.id===row.id).map(x=>[x.canonicalId,x.image]),[[id,row.image]]);
  if(!row.canonicalId)assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(catalogue.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  for(const registry of [data,details,snapshot])
   assert.deepEqual(registry.cards.filter(x=>nameKey(x.name)===nameKey(row.name)).map(x=>x.id),[id]);
 }
});

test('Sonias evolves on a friendly Gladiator and may be blocked or break two shields',()=>{
 const s=field(),sonias=put(s,0,'hand',SONIAS),other=put(s,0,'battle',PLAIN);
 put(s,1,'battle',GLAD);
 assert.ok(!legal(s,'play',a=>a.uid===sonias.uid));
 const base=put(s,0,'battle',GLAD),blocker=put(s,1,'battle',BLOCKER);
 act(s,'play',a=>a.uid===sonias.uid);
 assert.ok(!legal(s,'evolve',a=>a.baseUid===other.uid));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.equal(sonias.under[0].uid,base.uid);
 attack(s,sonias.uid);act(s,'block',a=>a.uid===blocker.uid);drain(s);
 assert.ok(has(s,1,'grave',blocker));
 sonias.tapped=false;
 attack(s,sonias.uid);clearShields(s);
 assert.equal(s.players[1].shields.length,3);
});

test('Sonias prevents opposing effect selection while remaining attackable and selectable by its owner',()=>{
 const s=field(1),sonias=put(s,0,'battle',SONIAS,{tapped:true,under:[inst(GLAD)]});
 const ally=put(s,0,'battle',PLAIN),enemy=put(s,1,'battle',PLAIN);
 cast(s,BOUNCE);
 assert.ok(!s.decision.targets.some(x=>(x.uid??x)===sonias.uid));
 assert.ok(s.decision.targets.some(x=>(x.uid??x)===ally.uid));
 drain(s);
 attack(s,enemy.uid,sonias.uid);act(s,'noBlock');drain(s);
 assert.ok(has(s,1,'grave',enemy));
 s.active=0;s.phase='main';
 cast(s,BOUNCE);
 assert.ok(s.decision.targets.some(x=>(x.uid??x)===sonias.uid));
 drain(s);
});

test('Dirge boosts the creatures present at resolution and grants each cast its own pre-battle break',()=>{
 let s=field(),a=put(s,0,'battle',LIGHT),ally=put(s,0,'battle',PLAIN),blocker=put(s,1,'battle',BLOCKER);
 cast(s,DIRGE);cast(s,DIRGE);
 const later=put(s,0,'hand',PLAIN);act(s,'play',x=>x.uid===later.uid);
 assert.deepEqual([power(s,a),power(s,ally),power(s,later),power(s,blocker)],[10000,10000,2000,2000]);
 attack(s,a.uid);act(s,'block',x=>x.uid===blocker.uid);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',x=>x.uid===a.uid);
 s=restore(s);
 for(let i=0;i<2;i++){
  assert.equal(s.decision.task.op,'g34_Break497');
  assert.ok(!s.log.some(x=>x.type==='battle'));
  pick(s,s.players[1].shields[0]);
 }
 assert.equal(s.players[1].shields.length,3);
 assert.ok(has(s,1,'grave',blocker));
 endTurn(s);drain(s);
 assert.equal(power(s,s.players[0].battle.find(x=>x.uid===a.uid)),2000);
});

test('Dirge resolves a shield trigger before the next break, even when the blocker leaves',()=>{
 const s=field(),a=put(s,0,'battle',LIGHT),b=put(s,1,'battle',BLOCKER);
 const trigger=inst(BOUNCE);
 s.players[1].shields[0]=trigger;
 cast(s,DIRGE);cast(s,DIRGE);
 attack(s,a.uid);act(s,'block',x=>x.uid===b.uid);
 act(s,'orderEffect',x=>x.uid===a.uid);
 pick(s,trigger);
 act(s,'useTrigger');
 act(s,'effect',x=>x.targets?.[0]?.uid===b.uid);
 assert.ok(has(s,1,'hand',b));
 assert.equal(s.decision.task.op,'g34_Break497');
 pick(s,s.players[1].shields[0]);
 assert.equal(s.players[1].shields.length,3);
 assert.ok(!s.log.some(x=>x.type==='battle'));
});

test('Dirge does not grant a break when the attack targets a creature',()=>{
 const s=field(),a=put(s,0,'battle',LIGHT),victim=put(s,1,'battle',PLAIN,{tapped:true}),b=put(s,1,'battle',BLOCKER);
 cast(s,DIRGE);
 attack(s,a.uid,victim.uid);act(s,'block',x=>x.uid===b.uid);drain(s);
 assert.equal(s.players[1].shields.length,5);
 assert.ok(has(s,1,'grave',b));
});

test('Ignoring the attacker’s abilities suppresses the granted break while the spell’s power bonus persists',()=>{
 const s=field(),a=put(s,0,'battle',LIGHT),b=put(s,1,'battle',BLOCKER);
 cast(s,DIRGE);
 a.g35Ignored=s.turn;
 assert.equal(power(s,a),6000);
 attack(s,a.uid);act(s,'block',x=>x.uid===b.uid);drain(s);
 assert.equal(s.players[1].shields.length,5);
});

for(const controller of [0,1])test('Mirumel offers the drawing player the just-drawn card before normal charge '+controller,()=>{
 let s=field(),mirumel=put(s,controller,'battle',MIRUMEL);
 const drawn=inst(GLAD);
 s.players[1].deck.unshift(drawn);
 endTurn(s);
 assert.equal(s.active,1);
 assert.equal(s.decision.player,1);
 assert.equal(s.decision.task.controller,controller);
 assert.deepEqual(choices(s),[drawn.uid,null]);
 s=restore(s);pick(s,drawn);
 assert.ok(s.players[1].mana.find(x=>x.uid===drawn.uid)?.tapped);
 assert.equal(s.phase,'charge');
 assert.ok(legal(s,'skipCharge'));
 assert.ok(has(s,controller,'battle',mirumel));
});

test('Mirumel can be declined and can attack a creature while its player attack is prohibited',()=>{
 const s=field(1),mirumel=put(s,0,'battle',MIRUMEL),target=put(s,1,'battle',PLAIN,{tapped:true});
 endTurn(s);
 assert.equal(s.decision.player,0);
 pick(s,null);act(s,'skipCharge');
 s.phase='attack';
 assert.ok(!legal(s,'attack',a=>a.uid===mirumel.uid&&a.target==='player'));
 assert.ok(legal(s,'attack',a=>a.uid===mirumel.uid&&a.target===target.uid));
});

test('Mirumel triggers once for each card drawn in the turn draw step, including additional draws',()=>{
 const s=field(1);
 put(s,0,'battle',MEDUSA,{under:[inst(WATER)]});
 put(s,1,'battle',MIRUMEL);
 endTurn(s);
 assert.equal(s.decision.task.op,'g34_StartDraw729');
 pick(s,true);
 assert.equal(s.players[0].hand.length,2);
 act(s,'orderEffect',a=>a.cardId===MIRUMEL);
 for(let i=0;i<2;i++)pick(s,s.players[0].hand[0]);
 assert.equal(s.players[0].hand.length,0);
});

test('Mirumel ignores effect draws and stops offering mana when its abilities are ignored',()=>{
 const s=field();
 put(s,0,'battle',MIRUMEL);
 cast(s,'dm01-080');act(s,'draw',a=>a.n===1);
 assert.equal(s.players[0].mana.length,50);
 assert.equal(s.decision,null);
 assert.equal(s.players[0].hand.length,1);
 put(s,1,'battle',GENMU);
 endTurn(s);
 assert.equal(s.decision,null);
 assert.equal(s.players[1].hand.length,1);
});

function roombaField(mana,copies=1){
 const s=field(),attacker=put(s,0,'battle',PLAIN);
 give(s,0,'mana',mana);
 for(let i=0;i<copies;i++)put(s,1,'battle',RUMBA);
 return {s,attacker};
}

test('Rumba counts tapped mana civilizations and accepts the exact number of untapped cards without a color requirement',()=>{
 let {s,attacker}=roombaField([LIGHT,WATER,DARK,LIGHT,LIGHT]);
 s.players[0].mana[1].tapped=true;
 s.players[0].mana[2].tapped=true;
 attack(s,attacker.uid);
 assert.equal(s.decision.player,0);
 assert.equal(s.decision.task.n,2);
 const [first,second]=s.players[0].mana.slice(-2);
 pick(s,first);
 assert.equal(first.tapped,false);
 s=restore(s);pick(s,second);
 assert.deepEqual(s.players[0].mana.map(x=>x.tapped),[false,true,true,true,true]);
 act(s,'noBlock');drain(s);
 assert.equal(s.players[1].shields.length,4);
});

for(const enough of [true,false])test('Rumba ends a declared attack with the attacker still tapped '+enough,()=>{
 const {s,attacker}=roombaField(Array(enough?5:2).fill(LIGHT));
 attack(s,attacker.uid);
 if(enough){pick(s,s.players[0].mana[0]);pick(s,null);}
 assert.ok(attacker.tapped);
 assert.ok(s.log.some(x=>x.type==='attack'));
 assert.equal(s.decision,null);
 assert.equal(s.attack,null);
 assert.equal(s.players[1].shields.length,5);
 assert.ok(s.players[0].mana.every(x=>!x.tapped));
});

test('Two Rumbas impose separate payments that both resolve before blocking',()=>{
 const {s,attacker}=roombaField(Array(8).fill(LIGHT),2);
 attack(s,attacker.uid);
 assert.equal(s.decision.player,1);
 act(s,'orderEffect',x=>x.cardId===RUMBA);
 for(let i=0;i<8;i++)pick(s,s.players[0].mana[i]);
 assert.ok(s.players[0].mana.every(x=>x.tapped));
 assert.equal(s.decision.type,'block');
});

test('Rumba has no payment when all five civilizations are present and does not tax a creature attack',()=>{
 for(const playerAttack of [true,false]){
  const {s,attacker}=roombaField(playerAttack?colors:[]);
  const victim=put(s,1,'battle',WATER,{tapped:true});
  attack(s,attacker.uid,playerAttack?'player':victim.uid);
  assert.equal(s.decision.type,'block');
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
 }
});

test('Rumba enters mana tapped, produces zero mana, and breaks two shields as an attacker',()=>{
 const s=field(),charged=put(s,0,'hand',RUMBA);
 s.phase='charge';
 act(s,'charge',a=>a.uid===charged.uid);
 assert.ok(s.players[0].mana.find(x=>x.uid===charged.uid)?.tapped);
 assert.equal(e.manaValue(e.card(RUMBA)),0);
 const body=put(s,0,'battle',RUMBA);
 attack(s,body.uid);clearShields(s);
 assert.equal(s.players[1].shields.length,3);
});
