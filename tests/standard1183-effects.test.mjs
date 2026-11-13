import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {e,data,details,snapshot,setup,give,inst,act,attack,drain} from './target-fixture.mjs';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {CARD_IMAGES} from '../dist/card-images.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';

const DRAG='dm08-015',MARE='dm15-046',ELIZABETH='dm30-007',TWIN='dm22ex1-098';
const DRAGON='dm01-s08',EVOLUTION='dmc62-002',NATURE='dm01-108',FIRE='dm01-100';
const DESTROY='dm01-027',BOUNCE='dm01-086',DRAW='dm06-085';
const manifest=JSON.parse(readFileSync(new URL('../tools/support-phase-1183.json',import.meta.url)));
const add=(s,p,zone,id,attrs={})=>{
 const x=Object.assign(inst(id),attrs);
 s.players[p][zone].push(x);
 return x;
};
const value=c=>c.value?.uid??c.value;
const pick=(s,v)=>act(s,'extended',a=>value(s.decision.choices[a.choice])===v);
const has=(s,p,zone,x)=>s.players[p][zone].some(y=>y.uid===x.uid);
const play=(s,x)=>act(s,'play',a=>a.uid===x.uid&&!a.alternative);
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
function field(active=0){
 const s=Object.assign(setup(),{active});
 for(const p of [0,1]){give(s,p,'deck',Array(20).fill(NATURE));give(s,p,'grave',[]);}
 return s;
}
function removeDrag(s,x,spell=DESTROY){
 play(s,add(s,s.active,'hand',spell));
 act(s,'effect',a=>a.targets.some(t=>t.uid===x.uid));
}

test('three complete official definitions use distinct canonical IDs, checked images and copy limits',()=>{
 const registry=createCatalogue(snapshot,data.cards,details);
 const refs=JSON.parse(readFileSync(new URL('../tools/image-reference-prints.json',import.meta.url))).prints;
 assert.equal(manifest.printAliases.length,5);
 assert.deepEqual(manifest.cards.map(c=>c.id),[DRAG,MARE,ELIZABETH]);
 assert.notEqual(nameKey(e.card(ELIZABETH).name),nameKey(e.card(TWIN).name));
 for(const row of manifest.cards){
  const f=row.faces[0],c=e.card(row.id),detail=details.cards.find(x=>x.id===row.id);
  assert.deepEqual(detail.faces,row.faces);
  assert.deepEqual(standardCardSpec(detail,{phase:1183}),row.spec);
  for(const [k,v] of Object.entries(row.spec))assert.deepEqual(c[k],v);
  assert.deepEqual([c.name,c.cost,c.power,c.race,c.manaValue,c.limit],
   [row.name,f.cost,Number(f.powerText),f.race,1,manifest.regulationVerification.limits[row.id]]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[c.id]);
  assert.equal(registry.get(row.id).supported,true);
  assert.equal(CARD_IMAGES[row.id],row.image);
  const extra=structuredClone(detail);
  extra.faces[0].abilityText+='\n未知の能力。';
  assert.throws(()=>standardCardSpec(extra,{phase:1183}));
 }
 const drag=manifest.cards[0];
 assert.equal(e.card(DRAG).text,drag.currentPrint.faces[0].abilityText);
 for(const row of manifest.printAliases){
  assert.equal(row.canonicalId,DRAG);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1183}),drag.spec);
  assert.deepEqual(registry.resolveRows([{id:row.id,count:1}]),[{id:DRAG,count:1}]);
  assert.equal(refs.find(x=>x.id===row.id).image,row.image);
  assert.equal(manifest.regulationVerification.limits[row.id],e.card(DRAG).limit);
 }
});

test('Drag Strike offers only a Dragon from hand and can decline or deploy without mana',()=>{
 for(const accept of [false,true]){
  const s=field(1),source=add(s,0,'battle',DRAG),dragon=add(s,0,'hand',DRAGON);
  add(s,0,'hand',NATURE);
  removeDrag(s,source);
  assert.equal(s.decision.player,0);
  assert.ok(has(s,0,'grave',source));
  assert.deepEqual(s.decision.choices.map(value),[dragon.uid,null]);
  pick(s,accept?dragon.uid:null);
  drain(s);
  assert.equal(has(s,0,'battle',dragon),accept);
  assert.equal(has(s,0,'hand',dragon),!accept);
  assert.ok(s.players[0].mana.every(x=>!x.tapped));
 }
});

test('Drag Strike permits an evolution Dragon with a legal base and resumes the choice from JSON',()=>{
 for(const eligible of [false,true]){
  let s=field(1);
  const source=add(s,0,'battle',DRAG),base=add(s,0,'battle',eligible?DRAGON:NATURE);
  const evolution=add(s,0,'hand',EVOLUTION),spell=add(s,1,'hand',DESTROY),all=physical(s);
  play(s,spell);
  act(s,'effect',a=>a.targets.some(t=>t.uid===source.uid));
  if(eligible){
   pick(s,evolution.uid);
   s=JSON.parse(JSON.stringify(s));
   pick(s,base.uid);
   drain(s);
   assert.equal(s.players[0].battle.find(x=>x.uid===evolution.uid).under[0].uid,base.uid);
  }else{
   assert.equal(s.decision,null);
   assert.ok(has(s,0,'hand',evolution));
  }
  assert.deepEqual(physical(s),all);
 }
});

test('Drag Strike checks the actual destination of the departing source',()=>{
 for(const mode of ['bounce','replacement']){
  const s=field(1),source=add(s,0,'battle',DRAG),dragon=add(s,0,'hand',DRAGON);
  if(mode==='replacement'){
   add(s,0,'battle','dmrp04s-m02');
   s.players[0].shields[0].faceUp=true;
  }
  removeDrag(s,source,mode==='bounce'?BOUNCE:DESTROY);
  if(mode==='replacement')act(s,'replaceSavak',a=>a.shieldCard===s.players[0].shields[0].uid);
  assert.equal(s.decision,null);
  assert.ok(has(s,0,mode==='bounce'?'hand':'battle',source));
  assert.ok(has(s,0,'hand',dragon));
 }
});

test('Dark Mare requires its own graveyard copy and affects only a tapped enemy for the turn',()=>{
 for(const count of [0,1,2]){
  const s=field(),source=add(s,0,'hand',MARE),own=add(s,0,'battle',DRAGON,{tapped:true});
  const large=add(s,1,'battle',DRAGON,{tapped:true}),ready=add(s,1,'battle',DRAGON);
  add(s,1,'grave',MARE);
  give(s,0,'grave',Array(count).fill(MARE));
  const before=e.power(large,false,s);
  play(s,source);
  if(count){
   assert.deepEqual(s.decision.choices.map(value),[large.uid]);
   pick(s,large.uid);
   assert.equal(e.power(large,false,s),before-2000);
   s.phase='attack';act(s,'endTurn');drain(s);
  }else assert.equal(s.decision,null);
  assert.equal(e.power(large,false,s),before);
  assert.equal(e.power(ready,false,s),before);
  assert.equal(e.power(own,false,s),before);
 }
});

test('Dark Mare destroys a tapped enemy reduced to zero power',()=>{
 const s=field(),zero=add(s,1,'battle',NATURE,{tapped:true});
 add(s,0,'grave',MARE);
 play(s,add(s,0,'hand',MARE));pick(s,zero.uid);drain(s);
 assert.ok(has(s,1,'grave',zero));
});

test('Elizabeth grants S-Trigger to a shield spell only as it reaches its controller’s hand',()=>{
 for(const [source,shield,expected] of [[ELIZABETH,DRAW,true],[TWIN,DRAW,true],[ELIZABETH,NATURE,false],[null,DRAW,false]]){
  const s=field(1),attacker=add(s,1,'battle',FIRE);
  if(source)add(s,0,'battle',source);
  give(s,0,'shields',[shield]);
  const [x]=s.players[0].shields,all=physical(s);
  attack(s,attacker.uid);act(s,'noBlock');
  if(expected){
   assert.equal(s.decision?.type,'trigger');
   act(s,'useTrigger',a=>a.uid===x.uid);
   drain(s);
   assert.ok(has(s,0,'grave',x));
   assert.equal(s.players[0].hand.length,2);
   assert.equal(s.metrics[0].triggers,1);
   assert.ok(s.players[0].mana.every(m=>!m.tapped));
  }else{
   assert.equal(s.decision,null);
   assert.ok(has(s,0,'hand',x));
  }
  assert.deepEqual(physical(s),all);
 }
});

test('Elizabeth can grant S-Trigger on an effect that moves a shield directly to hand',()=>{
 const s=field(),mover=add(s,0,'battle','dmr02-027');
 add(s,1,'battle',ELIZABETH);
 give(s,1,'shields',[DRAW,NATURE]);
 const [shield]=s.players[1].shields;
 attack(s,mover.uid);pick(s,shield.uid);
 assert.equal(s.decision?.type,'trigger');
 act(s,'useTrigger',a=>a.uid===shield.uid);drain(s);
 assert.ok(has(s,1,'grave',shield));
 assert.equal(s.metrics[1].triggers,1);
});

test('The single-face grant and the Twinpact grant differ when checking a spell still in shields',()=>{
 for(const source of [ELIZABETH,TWIN]){
  const s=field(),base=add(s,0,'battle','dm01-083');
  add(s,0,'battle','dm32-097');
  add(s,1,'battle',source);
  give(s,1,'shields',[DRAW]);
  const [shield]=s.players[1].shields;
  play(s,add(s,0,'hand','dm10-017'));
  act(s,'evolve',a=>a.baseUid===base.uid);
  pick(s,shield.uid);
  assert.equal(has(s,1,'grave',shield),source===TWIN);
  assert.equal(has(s,1,'shields',shield),source===ELIZABETH);
  if(source===ELIZABETH)assert.equal(shield.faceUp,true);
 }
});

test('Drag Strike does not trigger when it goes to the graveyard as an evolution base or seal',()=>{
 for(const origin of ['under','seal']){
  const s=field(origin==='under'?1:0),host=add(s,0,'battle',EVOLUTION),dragon=add(s,0,'hand',DRAGON);
  const drag=inst(DRAG);
  if(origin==='under'){
   host.under=[drag];
   removeDrag(s,host);
  }else{
   host.sealed=true;
   drag.faceDown=true;
   drag.sealOf=host.uid;
   s.players[0].seals.push(drag);
   play(s,add(s,0,'hand','dmr17-081'));
   drain(s);
  }
  assert.equal(s.decision,null);
  assert.ok(has(s,0,'grave',drag));
  assert.ok(has(s,0,'hand',dragon));
 }
});
