import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,data,details,drain,e,give,inst,setup,snapshot,GG} from './target-fixture.mjs';

const ARM='dm14-s02',BAZOOKA='dm14-022',BLADE='dm28-007';
const NATURE='dm01-108',FIRE='dm01-095',FIRE_SPELL='dm01-101',BLOCKER='dm01-076';
const POWER_3000='dm19-090',POWER_6000='dm01-s04';
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const physical=s=>e.physicalCards(s).map(x=>x.uid).sort();
const has=(s,p,z,x)=>s.players[p][z].some(y=>y.uid===x.uid);
function field(){
 const s=setup();
 for(const p of [0,1]){
  give(s,p,'deck',Array(12).fill(NATURE));
  give(s,p,'grave',[]);
 }
 return s;
}
function cross(s,gear,host){
 act(s,'crossGear',a=>a.uid===gear.uid&&a.target===host.uid);
}
function pick(s,value){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function noBlock(s){
 if(s.decision?.type==='block')act(s,'noBlock');
}

test('Six verified prints map to exactly three canonical battle IDs with their own images',()=>{
 const manifest=read('tools/support-phase-1080.json'),cat=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 const ids=[ARM,BAZOOKA,BLADE];
 assert.deepEqual(manifest.cards.map(c=>c.id),ids);
 assert.deepEqual(manifest.printAliases.map(c=>c.id),['dmx14-032','dm24rp3-TR08','dm24ex3-rp3TR8']);
 for(const row of [...manifest.cards,...manifest.printAliases]){
  const id=row.canonicalId??row.id,c=e.card(id),f=row.faces[0],main=manifest.cards.find(c=>c.id===id);
  assert.ok(row.verification.facesMatched&&cat.get(id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1080}),main.spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   [id===BLADE?'creature':'gear',f.cost,f.race,+f.powerText,f.civilizationText,1,4]);
  assert.equal(manifest.regulationVerification.limits[row.id],4);
  assert.deepEqual(cat.resolveRows([{id:row.id,count:1}]),[{id,count:1}]);
  assert.deepEqual(images.filter(r=>r.id===row.id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  if(row.id===id)assert.equal(CARD_IMAGES[id],row.image);
 }
 for(const id of ids)assert.deepEqual(data.cards.filter(c=>nameKey(c.name)===nameKey(e.card(id).name)).map(c=>c.id),[id]);
});

test('Glorious Heavens Arm pays separately to generate and cross, boosts only its host and makes a separate hidden shield',()=>{
 const s=field(),[host,other]=give(s,0,'battle',[NATURE,NATURE]);
 const [arm]=give(s,0,'hand',[ARM]),top=s.players[0].deck[0],all=physical(s);
 act(s,'play',a=>a.uid===arm.uid);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,3);
 assert.ok(!arm.crossedTo);
 assert.equal(e.power(host,false,s),2000);
 cross(s,arm,host);
 assert.equal(s.players[0].mana.filter(x=>x.tapped).length,6);
 assert.equal(e.power(host,false,s),5000);
 assert.equal(e.power(other,false,s),2000);
 attack(s,other.uid);
 noBlock(s);
 drain(s);
 assert.equal(s.players[0].shields.length,5);
 attack(s,host.uid);
 noBlock(s);
 drain(s);
 assert.equal(s.players[0].shields.length,6);
 assert.equal(s.players[0].deck.length,11);
 assert.equal(s.players[0].shields.at(-1).uid,top.uid);
 assert.ok(!s.players[0].shields.at(-1).faceUp);
 assert.equal(s.metrics[0].breaks,2);
 assert.deepEqual(physical(s),all);
});

test('Cross Gear effects need an unblocked player attack by their current host',()=>{
 for(const mode of ['uncrossed','blocked','creature attack']){
  const s=field(),[host,arm,bazooka]=give(s,0,'battle',[NATURE,ARM,BAZOOKA]);
  const [blocker,enemy]=give(s,1,'battle',[BLOCKER,NATURE]);
  enemy.tapped=true;
  const all=physical(s);
  if(mode!=='uncrossed'){
   cross(s,arm,host);
   cross(s,bazooka,host);
  }
  attack(s,host.uid,mode==='creature attack'?enemy.uid:'player');
  if(mode==='blocked')act(s,'block',a=>a.uid===blocker.uid);
  else noBlock(s);
  assert.notEqual(s.decision?.task?.source,BAZOOKA);
  drain(s);
  assert.equal(s.players[0].shields.length,5);
  assert.equal(s.players[0].deck.length,12);
  assert.equal(s.metrics[0].breaks,mode==='uncrossed'?1:0);
  assert.deepEqual(physical(s),all);
 }
});

test('Typhoon Bazooka can bounce an enemy or its own host, and can decline the effect',()=>{
 for(const mode of ['enemy','host','decline']){
  let s=field();
  const [host,bazooka,arm]=give(s,0,'battle',[NATURE,BAZOOKA,ARM]);
  const [enemy]=give(s,1,'battle',[NATURE]);
  const all=physical(s);
  cross(s,bazooka,host);
  cross(s,arm,host);
  attack(s,host.uid);
  noBlock(s);
  assert.equal(s.decision.type,'effectOrder');
  s=JSON.parse(JSON.stringify(s));
  act(s,'orderEffect',a=>a.cardId===BAZOOKA);
  assert.equal(s.decision.task.source,BAZOOKA);
  assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[host.uid,enemy.uid,null]);
  pick(s,mode==='enemy'?enemy.uid:mode==='host'?host.uid:null);
  drain(s);
  assert.equal(has(s,1,'hand',enemy),mode==='enemy');
  assert.equal(has(s,0,'hand',host),mode==='host');
  assert.ok(has(s,0,'battle',bazooka)&&has(s,0,'battle',arm));
  assert.equal(!!s.players[0].battle.find(x=>x.uid===bazooka.uid).crossedTo,mode!=='host');
  assert.equal(s.players[0].shields.length,6);
  assert.equal(s.metrics[0].breaks,mode==='host'?0:1);
  assert.deepEqual(physical(s),all);
 }
});

test('Blade Gurenoh Max evolves from a tapped Fire creature in mana and destroys a tapped enemy with at most 3000 current power',()=>{
 const s=field(),[blade]=give(s,0,'hand',[BLADE]);
 const [base,spell,nature]=[FIRE,FIRE_SPELL,NATURE].map(id=>inst(id));
 base.tapped=true;
 assert.equal(e.card(spell).type,'spell');
 assert.ok(e.card(spell).civ.includes('火'));
 s.players[0].mana.push(base,spell,nature);
 give(s,0,'battle',[FIRE,POWER_3000])[1].tapped=true;
 const [eligible,untapped,pumped,tooBig]=give(s,1,'battle',[POWER_3000,NATURE,NATURE,POWER_6000]);
 eligible.tapped=pumped.tapped=tooBig.tapped=true;
 pumped.powerModifiers=[{amount:2000}];
 const all=physical(s);
 assert.equal(e.power(eligible,false,s),3000);
 assert.equal(e.power(pumped,false,s),4000);
 act(s,'play',a=>a.uid===blade.uid);
 assert.equal(s.decision.type,'evolution');
 assert.ok(!e.getLegalActions(s).some(a=>[spell.uid,nature.uid,s.players[0].battle[0].uid].includes(a.baseUid)));
 act(s,'evolve',a=>a.baseUid===base.uid);
 assert.deepEqual(blade.under.map(x=>x.uid),[base.uid]);
 assert.ok(!blade.tapped&&!has(s,0,'mana',base));
 attack(s,blade.uid);
 noBlock(s);
 assert.equal(s.decision.task.source,BLADE);
 assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[eligible.uid]);
 assert.equal(s.metrics[0].breaks,0);
 pick(s,eligible.uid);
 drain(s);
 assert.ok(has(s,1,'grave',eligible));
 assert.ok([untapped,pumped,tooBig].every(x=>has(s,1,'battle',x)));
 assert.equal(s.metrics[0].breaks,1);
 assert.deepEqual(physical(s),all);
});

test('Blade Gurenoh Max does not trigger on a blocked attack or one targeting a creature',()=>{
 for(const mode of ['blocked','creature attack']){
  const s=field(),[blade]=give(s,0,'battle',[BLADE]);
  blade.under=[inst(FIRE)];
  const [blocker,enemy,target]=give(s,1,'battle',[BLOCKER,POWER_3000,NATURE]);
  enemy.tapped=target.tapped=true;
  attack(s,blade.uid,mode==='creature attack'?target.uid:'player');
  if(mode==='blocked')act(s,'block',a=>a.uid===blocker.uid);
  else noBlock(s);
  drain(s);
  assert.ok(has(s,1,'battle',enemy));
  assert.equal(s.metrics[0].breaks,0);
 }
});

test('GG does not suppress the effects triggered after the defender declines to block',()=>{
 const s=field(),[blade,arm]=give(s,0,'battle',[BLADE,ARM]);
 const [gg,enemy]=give(s,1,'battle',[GG,POWER_3000]);
 blade.under=[inst(FIRE)];
 gg.under=[inst(NATURE)];
 enemy.tapped=true;
 cross(s,arm,blade);
 attack(s,blade.uid);
 noBlock(s);
 assert.equal(s.decision.type,'effectOrder');
 act(s,'orderEffect',a=>a.cardId===BLADE);
 pick(s,enemy.uid);
 drain(s);
 assert.ok(has(s,1,'grave',enemy));
 assert.equal(s.players[0].shields.length,6);
 assert.equal(s.metrics[0].breaks,1);
});
