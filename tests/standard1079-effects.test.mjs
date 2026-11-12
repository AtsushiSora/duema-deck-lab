import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARD_IMAGES} from '../dist/card-images.js';
import {createCatalogue,nameKey} from '../dist/catalogue.js';
import {standardCardSpec} from '../tools/standard-card-spec.mjs';
import {act,attack,cast,data,details,drain,e,give,inst,setup,snapshot} from './target-fixture.mjs';

const GOAT='dm25-011',TAUROS='dm25-018',BALGA='promoy7-022';
const HEAVY='dmex17-033',METAL='dmex17-059',NATURE='dm01-108',BLOCKER='dm01-076';
const DEVIL='dm19-084',LIQUID='dm01-083',CROSS='dm14-110',SAMURAI_GEAR='dm28-033';
const SAMURAI='dm36-098',SAMURAI_EVOLUTION='dm35-033',ARMORED_SAMURAI_GEAR='dm23ex1-058';
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
function pick(s,value){
 act(s,'extended',a=>(s.decision.choices[a.choice].value?.uid??s.decision.choices[a.choice].value)===value);
}
function noBlock(s){
 if(s.decision?.type==='block')act(s,'noBlock');
}
function breakShields(s,n){
 if(s.decision?.type==='breakChoice')act(s,'breakShields',a=>a.shields.length===n);
 else assert.equal(n,1);
 drain(s);
}
function link(s,root,id,partner=root.uid){
 const other=inst(id);
 s.players[0].hand.push(other);
 act(s,'play',a=>a.uid===other.uid);
 assert.equal(s.decision.task.op,'g31_Link');
 assert.deepEqual(s.decision.choices.map(c=>c.value),[root.uid,null]);
 pick(s,partner);
 assert.equal(root.godLinks?.[0]?.uid,partner?other.uid:undefined);
 return other;
}

test('Three verified prints resolve to unique, battle-supported canonical card IDs',()=>{
 const manifest=read('tools/support-phase-1079.json'),cat=createCatalogue(snapshot,data.cards,details);
 const images=read('tools/image-reference-prints.json').prints;
 assert.deepEqual(manifest.cards.map(c=>c.id),[GOAT,TAUROS,BALGA]);
 assert.deepEqual(manifest.printAliases,[]);
 for(const row of manifest.cards){
  const {id}=row,c=e.card(id),f=row.faces[0];
  assert.ok(row.verification.facesMatched&&cat.get(id).supported);
  assert.deepEqual(standardCardSpec({...row,status:'complete'},{phase:1079}),row.spec);
  assert.deepEqual([c.type,c.cost,c.race,c.power,c.civ,c.manaValue,c.limit],
   ['creature',f.cost,f.race,+f.powerText,f.civilizationText,1,4]);
  assert.equal(manifest.regulationVerification.limits[id],4);
  assert.equal(CARD_IMAGES[id],row.image);
  assert.deepEqual(images.filter(r=>r.id===id).map(r=>[r.canonicalId,r.image]),[[id,row.image]]);
  assert.deepEqual(cat.resolveRows([{id,count:1}]),[{id,count:1}]);
  assert.deepEqual(data.cards.filter(x=>nameKey(x.name)===nameKey(c.name)).map(x=>x.id),[id]);
 }
});

test('Goat and Tauros link in either order only with the named partner and combine races, power and combat abilities',()=>{
 for(const [first,second] of [[GOAT,TAUROS],[TAUROS,GOAT]]){
  const s=field(),[root]=give(s,0,'battle',[first,HEAVY,METAL]);
  assert.equal(e.effectiveCard(root,s).breaker,undefined);
  assert.equal(e.power(root,true,s),e.power(root,false,s));
  const other=link(s,root,second);
  assert.equal(s.players[0].battle.length,3);
  assert.equal(e.effectiveCard(root,s).breaker,2);
  assert.equal(e.power(root,false,s),8000);
  assert.equal(e.power(root,true,s),12000);
  assert.ok(e.effectiveCard(root,s).slayer);
  assert.ok(!e.effectiveCard(root,s).g31GodHeavy);
  assert.deepEqual(new Set(e.effectiveCard(root,s).race.split('/')),
   new Set(['グランド・デビル','ゴッド','リキッド・ピープル','ティラノ・ドレイク']));
  const all=physical(s);
  s.active=1;
  cast(s,'dm01-027');
  act(s,'effect',a=>a.targets[0].uid===root.uid);
  act(s,'godLeave',a=>a.uid===other.uid);
  assert.ok(has(s,0,'grave',other));
  assert.ok(has(s,0,'battle',root));
  assert.equal(e.power(root,true,s),e.card(first).power);
  assert.equal(e.effectiveCard(root,s).breaker,undefined);
  assert.deepEqual(physical(s),all.concat(s.players[1].grave.find(x=>x.cardId==='dm01-027').uid).sort());
 }
 const s=field(),[root]=give(s,0,'battle',[GOAT]);
 link(s,root,TAUROS,null);
 assert.equal(s.players[0].battle.length,2);
});

test('Goat grants Slayer to its own matching creatures and shares Tauros’s current races only while linked',()=>{
 const s=field();
 const [goat,devil,liquid,unrelated]=give(s,0,'battle',[GOAT,DEVIL,LIQUID,NATURE]);
 const [enemy]=give(s,1,'battle',[DEVIL]);
 assert.ok(e.effectiveCard(goat,s).slayer);
 assert.ok(e.effectiveCard(devil,s).slayer);
 assert.ok(!e.effectiveCard(liquid,s).slayer);
 assert.ok(!e.effectiveCard(enemy,s).slayer);
 assert.ok(!e.effectiveCard(unrelated,s).slayer);
 link(s,goat,TAUROS);
 assert.ok(e.effectiveCard(liquid,s).slayer);
 goat.sealed=true;
 assert.ok(!e.effectiveCard(devil,s).slayer);
 assert.ok(!e.effectiveCard(liquid,s).slayer);
});

test('Tauros grants the same-race ally an extra break until turn end only on an unblocked player attack',()=>{
 for(const mode of ['native','linked','self','unrelated','blocked']){
  const s=field(),[tauros,liquid,devil,unrelated]=give(s,0,'battle',[TAUROS,LIQUID,DEVIL,NATURE]);
  const [blocker]=give(s,1,'battle',[BLOCKER]);
  if(mode==='linked')link(s,tauros,GOAT);
  const attacker=({native:liquid,linked:devil,self:tauros,unrelated,blocked:liquid})[mode];
  attack(s,attacker.uid);
  const extra=mode==='native'||mode==='linked';
  if(mode==='blocked'){
   act(s,'block',a=>a.uid===blocker.uid);
   drain(s);
   assert.equal(s.metrics[0].breaks,0);
  }else{
   noBlock(s);
   breakShields(s,extra?2:1);
   assert.equal(s.metrics[0].breaks,extra?2:1);
   if(extra){
    attacker.tapped=false;
    s.players[0].battle.splice(s.players[0].battle.indexOf(tauros),1);
    attack(s,attacker.uid);
    noBlock(s);
    breakShields(s,2);
    assert.equal(s.metrics[0].breaks,4);
    assert.equal(s.players[1].shields.length,1);
    act(s,'endTurn');
    drain(s);
    assert.ok(!s.extLimits.some(x=>x.kind==='g412ExtraBreak'&&x.ref.uid===attacker.uid));
   }
  }
 }
});

test('Balga’s Accel can deploy a non-evolution Samurai creature or Cross Gear, or be declined',()=>{
 for(const mode of ['creature','gear','armored gear','decline','no gear','blocked']){
  const s=field(),[balga,gear]=give(s,0,'battle',[BALGA,CROSS]);
  const [samurai,samuraiGear,evolution,armoredSamurai,other]=give(s,0,'hand',
   [SAMURAI,SAMURAI_GEAR,SAMURAI_EVOLUTION,ARMORED_SAMURAI_GEAR,NATURE]);
  const [blocker]=give(s,1,'battle',[BLOCKER]);
  if(mode!=='no gear')act(s,'crossGear',a=>a.uid===gear.uid&&a.target===balga.uid);
  const mana=s.players[0].mana.filter(x=>x.tapped).length,all=physical(s);
  attack(s,balga.uid);
  if(mode==='blocked'){
   act(s,'block',a=>a.uid===blocker.uid);
   drain(s);
   assert.equal(s.metrics[0].breaks,0);
  }else{
   noBlock(s);
   if(mode!=='no gear'){
    assert.equal(s.decision.task.op,'g34_Select');
    assert.deepEqual(s.decision.choices.map(c=>c.value?.uid??c.value),[samurai.uid,samuraiGear.uid,armoredSamurai.uid,null]);
    pick(s,({creature:samurai,gear:samuraiGear,'armored gear':armoredSamurai})[mode]?.uid??null);
   }
   breakShields(s,2);
   assert.equal(s.metrics[0].breaks,2);
  }
  assert.equal(has(s,0,'battle',samurai),mode==='creature');
  assert.equal(has(s,0,'battle',samuraiGear),mode==='gear');
  assert.equal(has(s,0,'battle',armoredSamurai),mode==='armored gear');
  assert.ok([evolution,other].every(x=>has(s,0,'hand',x)));
  assert.equal(s.players[0].mana.filter(x=>x.tapped).length,mana);
  assert.deepEqual(physical(s),all);
 }
});
