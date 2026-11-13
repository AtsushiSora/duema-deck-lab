import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,cast,attack,drain,GEN} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const JAGGLA='dmr17-037',PORIN='dmrp07-057',KORO='dmx12b-016',REPRINT='dmx22b-027';
const WATER='dm01-049',FIRE='dm01-097',NATURE='dm01-108',DRAGON='dm01-s08';
const FIRE_TWIN='dmbd16-009',NON_FIRE_DRAGON_TWIN='dm22ex1-070';
const CADDY='dm22rp1-049',STRATO='dm22rp2-048',DESTROY='dm01-027';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const field=()=>Object.assign(setup(),{active:0});
const restore=s=>JSON.parse(JSON.stringify(s));
function put(s,p,zone,id,attrs={}){
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
}
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const pick=(s,uid)=>act(s,'extended',a=>{
 const v=s.decision.choices[a.choice].value;
 return (v?.uid??v)===uid;
});

test('official cards and the Koro reprint resolve to exactly three distinct playable names',()=>{
 const m=read('tools/support-phase-1190.json'),registry=createCatalogue(snapshot,data.cards,details);
 const refs=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(m.cards.map(c=>c.id),[JAGGLA,PORIN,KORO]);
 assert.deepEqual(m.printAliases.map(c=>[c.id,c.canonicalId]),[[REPRINT,KORO]]);
 for(const row of [...m.cards,...m.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),[f]=row.faces;
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(row.name)).map(c=>c.id),[id]);
  assert.deepEqual([c.type,c.cost,c.power,c.civilizations,c.race,c.manaValue,c.limit],
   ['creature',f.cost,Number(f.powerText),f.civilizations.filter(x=>x!=='無色'),f.race,1,4]);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1190}),row.spec);
  for(const [key,value] of Object.entries(row.spec))assert.deepEqual(c[key],value);
  assert.equal(refs.find(ref=>ref.id===row.id&&ref.canonicalId===id)?.image,row.image);
  assert.equal(m.regulationVerification.limits[row.id],4);
  if(!row.canonicalId){
   assert.equal(CARD_IMAGES[id],row.image);
   assert.deepEqual(details.cards.find(c=>c.id===id).faces,row.faces);
  }
  const changed={...f,abilityText:f.abilityText+'\n未知の能力。'};
  assert.throws(()=>standardCardSpec({...row,status:'complete',faces:[changed]},{phase:1190}));
 }
});

test('Jaggla returns itself and another water creature from simultaneous destruction at two shield stacks',()=>{
 const s=field();
 cast(s,JAGGLA);
 const [self]=s.players[0].battle;
 const water=put(s,0,'battle',WATER),other=put(s,0,'battle',FIRE),enemy=put(s,1,'battle',WATER);
 give(s,1,'shields',[NATURE,NATURE]);
 s.players[1].shields[0].shieldStack=[inst(NATURE),inst(NATURE)];
 s.extTasks=[{op:'g34_Sweep',p:1,source:DESTROY,both:true,to:'grave',filter:{creature:true}}];
 act(s,'toAttack');
 drain(s);
 assert.deepEqual(s.players[0].hand.map(x=>x.uid),[self.uid,water.uid]);
 assert.deepEqual(s.players[0].grave.map(x=>x.uid),[other.uid]);
 assert.ok(has(s,1,'grave',enemy));
});

for(const mode of ['three shields','abilities ignored','two shields','owner differs'])test('Jaggla checks live conditions during battle: '+mode,()=>{
 const s=field();
 put(s,1,'battle',JAGGLA);
 if(mode==='abilities ignored')put(s,0,'battle',GEN);
 const water=put(s,1,'battle',WATER,{tapped:true,...(mode==='owner differs'?{cardOwner:0}:{})});
 const attacker=put(s,0,'battle',DRAGON);
 give(s,0,'shields',Array(mode==='three shields'?3:2).fill(NATURE));
 attack(s,attacker.uid,water.uid);
 drain(s);
 assert.ok(mode==='two shields'?has(s,1,'hand',water):
  mode==='owner differs'?has(s,0,'hand',water):has(s,1,'grave',water));
});

test('Porin sends a creature defeated in battle to the bottom even if Porin also loses',()=>{
 const s=field(),a=put(s,0,'battle',PORIN),b=put(s,1,'battle',PORIN,{tapped:true});
 attack(s,a.uid,b.uid);
 drain(s);
 assert.deepEqual(s.players.map(p=>p.deck.at(-1).uid),[a.uid,b.uid]);
 assert.ok(s.players.every(p=>p.grave.length===0));
});

test('Porin only replaces destruction from its own opposing battle and respects ability suppression',()=>{
 for(const mode of ['another attacker','spell','ignored']){
  const s=field(),porin=put(s,0,'battle',PORIN),victim=put(s,1,'battle',WATER,{tapped:true});
  if(mode==='spell'){
   cast(s,DESTROY);
   act(s,'effect',a=>a.targets.some(x=>x.uid===victim.uid));
  }else{
   if(mode==='ignored')porin.g35Ignored=s.turn;
   const attacker=mode==='another attacker'?put(s,0,'battle',DRAGON):porin;
   attack(s,attacker.uid,victim.uid);
  }
  drain(s);
  assert.ok(has(s,1,'grave',victim),mode);
 }
});

test('Porin and Caddy use the replacement of its controller when that player is active',()=>{
 for(const active of [0,1]){
  const s=field(),porin=put(s,0,'battle',PORIN,{tapped:active===1});
  const victim=put(s,1,'battle',CADDY,{tapped:active===0,cardOwner:1});
  s.active=active;
  attack(s,active===0?porin.uid:victim.uid,active===0?victim.uid:porin.uid);
  drain(s);
  assert.ok(active===0? s.players[1].deck.at(-1).uid===victim.uid:has(s,1,'mana',victim));
  assert.ok(!has(s,1,'grave',victim));
 }
});

test('Porin shares a mandatory bottom option with its controller’s optional Strato replacement',()=>{
 let s=field();
 const porin=put(s,0,'battle',PORIN),victim=put(s,1,'battle',WATER,{tapped:true});
 put(s,0,'battle',STRATO);
 attack(s,porin.uid,victim.uid);
 if(s.decision?.type==='block')act(s,'noBlock');
 assert.deepEqual(e.getLegalActions(s).map(a=>a.kind).sort(),['g47Replace','replaceBattleBottom1190']);
 const alt=restore(s);
 act(s,'replaceBattleBottom1190');
 assert.equal(s.players[1].deck.at(-1).uid,victim.uid);
 act(alt,'g47Replace');
 pick(alt,null);
 assert.equal(alt.players[1].deck.at(-1).uid,victim.uid);
});

test('Porin uses owner choice for evolution stacks and a linked God contributes only one card',()=>{
 for(const linked of [false,true]){
  const s=field(),porin=put(s,0,'battle',PORIN,{buff:10000});
  const base=inst(linked?'dmex17-059':WATER);
  const victim=put(s,1,'battle',linked?'dmex17-033':'dm02-s02',
   {tapped:true,...(linked?{godLinks:[base]}:{under:[base]})});
  const before=e.physicalCards(s).map(x=>x.uid).sort();
  attack(s,porin.uid,victim.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  if(linked){
   act(s,'godLeave',a=>a.uid===base.uid);
   assert.equal(s.players[1].deck.at(-1).uid,base.uid);
   assert.ok(has(s,1,'battle',victim));
  }else{
   assert.equal(s.decision?.task?.op,'g78_BottomOrder');
   pick(s,base.uid);
   drain(s);
   assert.deepEqual(s.players[1].deck.slice(-2).map(x=>x.uid),[base.uid,victim.uid]);
  }
  assert.deepEqual(e.physicalCards(s).map(x=>x.uid).sort(),before);
  assert.equal(s.players[1].grave.length,0);
 }
});

test('Sheva prevents a replaced removal to hand or deck but permits ordinary battle destruction',()=>{
 for(const source of [JAGGLA,PORIN]){
  const s=field();
  for(const id of ['dm24rp4-S07','dm01-001','dm01-s08','dm01-097'])put(s,1,'battle',id);
  const victim=put(s,1,'battle',WATER,{tapped:true});
  const attacker=put(s,0,'battle',source===JAGGLA?DRAGON:PORIN);
  if(source===JAGGLA)put(s,1,'battle',source);
  give(s,0,'shields',[NATURE,NATURE]);
  attack(s,attacker.uid,victim.uid);
  if(s.decision?.type==='block')act(s,'noBlock');
  drain(s);
  assert.ok(has(s,1,'grave',victim));
 }
});

test('Koro counts fire dragon creature faces in only its own graveyard, without rounding power',()=>{
 const s=field(),koro=put(s,0,'battle',KORO);
 const first=put(s,0,'grave',DRAGON);
 put(s,0,'grave',FIRE_TWIN);
 put(s,0,'grave',NON_FIRE_DRAGON_TWIN);
 put(s,0,'grave',FIRE);
 put(s,1,'grave',DRAGON);
 assert.equal(e.power(koro,false,s),5656);
 assert.equal(e.power(koro,true,s),16968);
 assert.equal(e.effectiveCard(koro,s).extraBreak,2);
 s.players[0].grave=s.players[0].grave.filter(x=>x.uid!==first.uid);
 assert.equal(e.power(koro,true,s),11312);
 assert.equal(e.effectiveCard(koro,s).extraBreak,1);
});

for(const ignored of [false,true])test('Koro resolves its real shield break with live graveyard and ability state: '+ignored,()=>{
 const s=field(),koro=put(s,0,'battle',KORO);
 give(s,0,'grave',[DRAGON,FIRE_TWIN,FIRE,NON_FIRE_DRAGON_TWIN]);
 if(ignored)koro.g35Ignored=s.turn;
 attack(s,koro.uid);
 drain(s);
 assert.equal(s.players[1].shields.length,ignored?4:2);
});
